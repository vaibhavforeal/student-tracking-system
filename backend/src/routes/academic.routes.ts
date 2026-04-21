import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/** Safely extract a single string from req.query */
function qs(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

/** Safely extract a single string from req.params */
function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

// All academic routes require authentication (any role)
router.use(authenticate);

// ─── Helper: enforce students can only view their own data ───
async function enforceStudentAccess(req: Request, res: Response, studentId: string): Promise<boolean> {
  if (req.user!.role === 'admin' || req.user!.role === 'teacher') {
    return true; // admin & teacher can view any student
  }

  // Student role — must match their own record
  const student = await prisma.student.findFirst({
    where: { userId: req.user!.userId, deletedAt: null },
    select: { id: true },
  });

  if (!student || student.id !== studentId) {
    res.status(403).json({ error: 'You can only view your own academic data' });
    return false;
  }
  return true;
}

// ─── GET /api/academic/students/:studentId/summary ──────────
// Academic summary stats (attendance %, marks %, courses, semester)
router.get('/students/:studentId/summary', async (req: Request, res: Response): Promise<void> => {
  const studentId = param(req.params.studentId);

  if (!(await enforceStudentAccess(req, res, studentId))) return;

  const student = await prisma.student.findFirst({
    where: { id: studentId, deletedAt: null },
    select: {
      id: true, enrollmentNo: true, firstName: true, lastName: true,
      semester: true, status: true,
      batch: { select: { name: true, degree: true, startYear: true, endYear: true, department: { select: { name: true, code: true } } } },
      section: { select: { name: true } },
    },
  });

  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }

  // Total courses the student has marks or attendance for
  const [markCourses, attendanceCourses] = await Promise.all([
    prisma.mark.findMany({
      where: { studentId },
      select: { courseId: true },
      distinct: ['courseId'],
    }),
    prisma.attendance.findMany({
      where: { studentId },
      select: { courseId: true },
      distinct: ['courseId'],
    }),
  ]);

  const allCourseIds = [...new Set([
    ...markCourses.map((m) => m.courseId),
    ...attendanceCourses.map((a) => a.courseId),
  ])];

  // Overall attendance %
  const [totalClasses, presentClasses, lateClasses] = await Promise.all([
    prisma.attendance.count({ where: { studentId } }),
    prisma.attendance.count({ where: { studentId, status: 'present' } }),
    prisma.attendance.count({ where: { studentId, status: 'late' } }),
  ]);

  const attendancePercent = totalClasses > 0
    ? Math.round(((presentClasses + lateClasses) / totalClasses) * 100)
    : 0;

  // Average marks %
  const marks = await prisma.mark.findMany({
    where: { studentId },
    select: { marksObtained: true, maxMarks: true },
  });

  let avgMarksPercent = 0;
  if (marks.length > 0) {
    const totalPercent = marks.reduce((sum, m) => {
      const pct = Number(m.maxMarks) > 0 ? (Number(m.marksObtained) / Number(m.maxMarks)) * 100 : 0;
      return sum + pct;
    }, 0);
    avgMarksPercent = Math.round(totalPercent / marks.length);
  }

  // Distinct semesters with data
  const semestersWithMarks = await prisma.mark.findMany({
    where: { studentId },
    select: { semester: true },
    distinct: ['semester'],
    orderBy: { semester: 'asc' },
  });

  res.json({
    student,
    stats: {
      attendancePercent,
      avgMarksPercent,
      totalCourses: allCourseIds.length,
      currentSemester: student.semester,
      totalClasses,
      presentClasses,
      lateClasses,
      absentClasses: totalClasses - presentClasses - lateClasses,
      totalAssessments: marks.length,
      semesters: semestersWithMarks.map((s) => s.semester),
    },
  });
});

// ─── GET /api/academic/students/:studentId/marks ────────────
// Marks grouped by course, optionally filtered by ?semester=
router.get('/students/:studentId/marks', async (req: Request, res: Response): Promise<void> => {
  const studentId = param(req.params.studentId);

  if (!(await enforceStudentAccess(req, res, studentId))) return;

  const student = await prisma.student.findFirst({
    where: { id: studentId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, enrollmentNo: true },
  });
  if (!student) { res.status(404).json({ error: 'Student not found' }); return; }

  const semester = qs(req.query.semester);
  const where: any = { studentId };
  if (semester) where.semester = parseInt(semester);

  const marks = await prisma.mark.findMany({
    where,
    include: {
      course: { select: { id: true, code: true, name: true, credits: true, type: true } },
      grader: { select: { user: { select: { name: true } } } },
    },
    orderBy: [{ semester: 'asc' }, { courseId: 'asc' }, { assessmentType: 'asc' }],
  });

  // Group by course
  const byCourse: Record<string, {
    course: any;
    semester: number;
    academicYear: string;
    assessments: any[];
    averagePercent: number;
  }> = {};

  for (const m of marks) {
    const key = `${m.courseId}-${m.semester}`;
    if (!byCourse[key]) {
      byCourse[key] = {
        course: m.course,
        semester: m.semester,
        academicYear: m.academicYear,
        assessments: [],
        averagePercent: 0,
      };
    }
    byCourse[key].assessments.push({
      id: m.id,
      assessmentType: m.assessmentType,
      marksObtained: Number(m.marksObtained),
      maxMarks: Number(m.maxMarks),
      percentage: Number(m.maxMarks) > 0
        ? Math.round((Number(m.marksObtained) / Number(m.maxMarks)) * 100)
        : 0,
      remarks: m.remarks,
      gradedBy: m.grader?.user?.name || 'Unknown',
      academicYear: m.academicYear,
    });
  }

  // Calculate per-course averages
  for (const key of Object.keys(byCourse)) {
    const group = byCourse[key];
    if (group.assessments.length > 0) {
      const totalPct = group.assessments.reduce((s, a) => s + a.percentage, 0);
      group.averagePercent = Math.round(totalPct / group.assessments.length);
    }
  }

  // Get distinct semesters
  const semesters = await prisma.mark.findMany({
    where: { studentId },
    select: { semester: true },
    distinct: ['semester'],
    orderBy: { semester: 'asc' },
  });

  res.json({
    student,
    courseMarks: Object.values(byCourse),
    semesters: semesters.map((s) => s.semester),
    totalAssessments: marks.length,
  });
});

// ─── GET /api/academic/students/:studentId/attendance ────────
// Attendance records, optionally filtered by ?courseId= and ?month= (YYYY-MM)
router.get('/students/:studentId/attendance', async (req: Request, res: Response): Promise<void> => {
  const studentId = param(req.params.studentId);

  if (!(await enforceStudentAccess(req, res, studentId))) return;

  const student = await prisma.student.findFirst({
    where: { id: studentId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, enrollmentNo: true },
  });
  if (!student) { res.status(404).json({ error: 'Student not found' }); return; }

  const courseId = qs(req.query.courseId);
  const month = qs(req.query.month);

  const where: any = { studentId };
  if (courseId) where.courseId = courseId;
  if (month) {
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 0, 23, 59, 59);
    where.date = { gte: start, lte: end };
  }

  const records = await prisma.attendance.findMany({
    where,
    include: {
      course: { select: { id: true, code: true, name: true } },
      marker: { select: { user: { select: { name: true } } } },
    },
    orderBy: { date: 'desc' },
  });

  // Per-course summary
  const allRecords = await prisma.attendance.findMany({
    where: { studentId },
    include: {
      course: { select: { id: true, code: true, name: true } },
    },
  });

  const courseSummary: Record<string, {
    courseId: string;
    courseCode: string;
    courseName: string;
    total: number;
    present: number;
    absent: number;
    late: number;
    percentage: number;
  }> = {};

  for (const r of allRecords) {
    if (!courseSummary[r.courseId]) {
      courseSummary[r.courseId] = {
        courseId: r.courseId,
        courseCode: r.course.code,
        courseName: r.course.name,
        total: 0, present: 0, absent: 0, late: 0, percentage: 0,
      };
    }
    const cs = courseSummary[r.courseId];
    cs.total++;
    if (r.status === 'present') cs.present++;
    else if (r.status === 'absent') cs.absent++;
    else if (r.status === 'late') cs.late++;
  }

  for (const cs of Object.values(courseSummary)) {
    cs.percentage = cs.total > 0 ? Math.round(((cs.present + cs.late) / cs.total) * 100) : 0;
  }

  // Get distinct courses for filter
  const courses = await prisma.attendance.findMany({
    where: { studentId },
    select: { course: { select: { id: true, code: true, name: true } } },
    distinct: ['courseId'],
  });

  res.json({
    student,
    records: records.map((r) => ({
      id: r.id,
      date: r.date,
      status: r.status,
      courseCode: r.course.code,
      courseName: r.course.name,
      courseId: r.courseId,
      markedBy: r.marker?.user?.name || 'Unknown',
    })),
    courseSummary: Object.values(courseSummary),
    courses: courses.map((c) => c.course),
    totalRecords: records.length,
  });
});

export default router;
