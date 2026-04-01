import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/** Safely extract a single string from req.query */
function qs(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

// All student routes require authentication + student role
router.use(authenticate);
router.use(authorize('student'));

// ─── Helper: find student record from JWT userId ─────────────
async function findStudent(userId: string) {
  return prisma.student.findFirst({
    where: { userId, deletedAt: null },
  });
}

// ─── GET /api/student/profile ────────────────────────────────
// Full profile — excludes health data per privacy rules
router.get('/profile', async (req: Request, res: Response): Promise<void> => {
  const student = await prisma.student.findFirst({
    where: { userId: req.user!.userId, deletedAt: null },
    include: {
      user: { select: { email: true, name: true, avatarUrl: true } },
      batch: {
        select: {
          name: true, degree: true, startYear: true, endYear: true,
          department: { select: { name: true, code: true } },
        },
      },
      section: { select: { name: true } },
      skills: { orderBy: { category: 'asc' } },
      parents: true,
      financialAid: { orderBy: { academicYear: 'desc' } },
      previousEducation: { orderBy: { yearOfPass: 'asc' } },
      hobbies: true,
      // health is intentionally EXCLUDED — admin/teacher only
    },
  });

  if (!student) {
    res.status(404).json({ error: 'Student profile not found' });
    return;
  }

  res.json({ student });
});

// ─── GET /api/student/dashboard-stats ────────────────────────
// Summary numbers for the student dashboard cards
router.get('/dashboard-stats', async (req: Request, res: Response): Promise<void> => {
  const student = await findStudent(req.user!.userId);
  if (!student) { res.status(404).json({ error: 'Student profile not found' }); return; }

  // Total courses the student has marks or attendance for
  const [markCourses, attendanceCourses] = await Promise.all([
    prisma.mark.findMany({
      where: { studentId: student.id },
      select: { courseId: true },
      distinct: ['courseId'],
    }),
    prisma.attendance.findMany({
      where: { studentId: student.id },
      select: { courseId: true },
      distinct: ['courseId'],
    }),
  ]);

  const allCourseIds = [...new Set([
    ...markCourses.map((m) => m.courseId),
    ...attendanceCourses.map((a) => a.courseId),
  ])];

  // Overall attendance %
  const [totalClasses, presentClasses] = await Promise.all([
    prisma.attendance.count({ where: { studentId: student.id } }),
    prisma.attendance.count({ where: { studentId: student.id, status: 'present' } }),
  ]);
  const lateClasses = await prisma.attendance.count({
    where: { studentId: student.id, status: 'late' },
  });

  const attendancePercent = totalClasses > 0
    ? Math.round(((presentClasses + lateClasses) / totalClasses) * 100)
    : 0;

  // Average marks %
  const marks = await prisma.mark.findMany({
    where: { studentId: student.id },
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

  res.json({
    stats: {
      attendancePercent,
      avgMarksPercent,
      totalCourses: allCourseIds.length,
      currentSemester: student.semester,
      totalClasses,
      presentClasses,
      lateClasses,
      absentClasses: totalClasses - presentClasses - lateClasses,
    },
  });
});

// ─── GET /api/student/marks ──────────────────────────────────
// All marks, optionally filtered by ?semester=
router.get('/marks', async (req: Request, res: Response): Promise<void> => {
  const student = await findStudent(req.user!.userId);
  if (!student) { res.status(404).json({ error: 'Student profile not found' }); return; }

  const semester = qs(req.query.semester);

  const where: any = { studentId: student.id };
  if (semester) where.semester = parseInt(semester);

  const marks = await prisma.mark.findMany({
    where,
    include: {
      course: { select: { id: true, code: true, name: true, credits: true, type: true } },
      grader: {
        select: {
          user: { select: { name: true } },
        },
      },
    },
    orderBy: [{ semester: 'asc' }, { courseId: 'asc' }, { assessmentType: 'asc' }],
  });

  // Group by course for frontend convenience
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

  // Get distinct semesters for filter dropdown
  const semesters = await prisma.mark.findMany({
    where: { studentId: student.id },
    select: { semester: true },
    distinct: ['semester'],
    orderBy: { semester: 'asc' },
  });

  res.json({
    courseMarks: Object.values(byCourse),
    semesters: semesters.map((s) => s.semester),
    totalAssessments: marks.length,
  });
});

// ─── GET /api/student/attendance ─────────────────────────────
// Attendance records, optionally filtered by ?courseId= and ?month= (YYYY-MM)
router.get('/attendance', async (req: Request, res: Response): Promise<void> => {
  const student = await findStudent(req.user!.userId);
  if (!student) { res.status(404).json({ error: 'Student profile not found' }); return; }

  const courseId = qs(req.query.courseId);
  const month = qs(req.query.month); // format: YYYY-MM

  const where: any = { studentId: student.id };
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
    where: { studentId: student.id },
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
    where: { studentId: student.id },
    select: { course: { select: { id: true, code: true, name: true } } },
    distinct: ['courseId'],
  });

  res.json({
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

// ─── SKILL ENHANCEMENT COURSES ──────────────────────────

// GET /api/student/skill-courses — Browse all active skill courses
router.get('/skill-courses', async (req: Request, res: Response): Promise<void> => {
  const student = await findStudent(req.user!.userId);
  if (!student) { res.status(404).json({ error: 'Student profile not found' }); return; }

  const categoryId = qs(req.query.categoryId);
  const difficulty = qs(req.query.difficulty);
  const search = qs(req.query.search);

  const skillCourses = await prisma.skillCourse.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(categoryId && { categoryId }),
      ...(difficulty && { difficulty: difficulty as any }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    include: {
      category: { select: { id: true, name: true } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get this student's enrollments to mark which courses they're in
  const myEnrollments = await prisma.skillCourseEnrollment.findMany({
    where: { studentId: student.id },
    select: { skillCourseId: true, status: true },
  });
  const enrollmentMap: Record<string, string> = {};
  myEnrollments.forEach((e: { skillCourseId: string; status: string }) => { enrollmentMap[e.skillCourseId] = e.status; });

  // Get categories for filter dropdown
  const categories = await prisma.skillCourseCategory.findMany({ orderBy: { name: 'asc' } });

  res.json({
    skillCourses: skillCourses.map((sc) => ({
      ...sc,
      myStatus: enrollmentMap[sc.id] || null,
    })),
    categories,
  });
});

// GET /api/student/skill-courses/my — Get my enrolled courses
router.get('/skill-courses/my', async (req: Request, res: Response): Promise<void> => {
  const student = await findStudent(req.user!.userId);
  if (!student) { res.status(404).json({ error: 'Student profile not found' }); return; }

  const enrollments = await prisma.skillCourseEnrollment.findMany({
    where: { studentId: student.id },
    include: {
      skillCourse: {
        include: { category: { select: { id: true, name: true } } },
      },
    },
    orderBy: { enrolledAt: 'desc' },
  });

  res.json({ enrollments });
});

// POST /api/student/skill-courses/:id/enroll — Self-enroll
router.post('/skill-courses/:id/enroll', async (req: Request, res: Response): Promise<void> => {
  const student = await findStudent(req.user!.userId);
  if (!student) { res.status(404).json({ error: 'Student profile not found' }); return; }

  const courseId = req.params.id as string;

  // Verify course exists and is active
  const course = await prisma.skillCourse.findFirst({
    where: { id: courseId, deletedAt: null, isActive: true },
  });
  if (!course) { res.status(404).json({ error: 'Skill course not found or inactive' }); return; }

  // Check if already enrolled
  const existing = await prisma.skillCourseEnrollment.findUnique({
    where: { studentId_skillCourseId: { studentId: student.id, skillCourseId: courseId } },
  });
  if (existing) {
    if (existing.status === 'enrolled') {
      res.status(409).json({ error: 'Already enrolled in this course' }); return;
    }
    // If previously dropped or completed, re-enroll
    const updated = await prisma.skillCourseEnrollment.update({
      where: { id: existing.id },
      data: { status: 'enrolled', enrolledAt: new Date(), completedAt: null },
    });
    res.json({ enrollment: updated }); return;
  }

  const enrollment = await prisma.skillCourseEnrollment.create({
    data: { studentId: student.id, skillCourseId: courseId },
  });
  res.status(201).json({ enrollment });
});

// PUT /api/student/skill-courses/:id/drop — Drop a course
router.put('/skill-courses/:id/drop', async (req: Request, res: Response): Promise<void> => {
  const student = await findStudent(req.user!.userId);
  if (!student) { res.status(404).json({ error: 'Student profile not found' }); return; }

  const enrollment = await prisma.skillCourseEnrollment.findUnique({
    where: { studentId_skillCourseId: { studentId: student.id, skillCourseId: req.params.id as string } },
  });
  if (!enrollment || enrollment.status !== 'enrolled') {
    res.status(400).json({ error: 'No active enrollment found for this course' }); return;
  }

  const updated = await prisma.skillCourseEnrollment.update({
    where: { id: enrollment.id },
    data: { status: 'dropped' },
  });
  res.json({ enrollment: updated });
});

// PUT /api/student/skill-courses/:id/complete — Mark as completed
router.put('/skill-courses/:id/complete', async (req: Request, res: Response): Promise<void> => {
  const student = await findStudent(req.user!.userId);
  if (!student) { res.status(404).json({ error: 'Student profile not found' }); return; }

  const enrollment = await prisma.skillCourseEnrollment.findUnique({
    where: { studentId_skillCourseId: { studentId: student.id, skillCourseId: req.params.id as string } },
  });
  if (!enrollment || enrollment.status !== 'enrolled') {
    res.status(400).json({ error: 'No active enrollment found for this course' }); return;
  }

  const updated = await prisma.skillCourseEnrollment.update({
    where: { id: enrollment.id },
    data: { status: 'completed', completedAt: new Date() },
  });
  res.json({ enrollment: updated });
});

export default router;

