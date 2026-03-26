import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// All teacher routes require authentication + teacher or admin role
router.use(authenticate);
router.use(authorize('teacher', 'admin'));

// ─── STUDENTS (scoped to teacher's assigned sections) ──

// GET /api/teacher/students — list students from teacher's assigned sections
router.get('/students', async (req: Request, res: Response): Promise<void> => {
  const { search } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  // Find sections assigned to this teacher (via staff → classAssignment)
  const staff = await prisma.staff.findFirst({
    where: { userId: req.user!.userId, deletedAt: null },
  });

  if (!staff) {
    res.status(403).json({ error: 'Staff profile not found' });
    return;
  }

  const assignments = await prisma.classAssignment.findMany({
    where: { staffId: staff.id },
    select: { sectionId: true },
  });

  const assignedSectionIds = [...new Set(assignments.map((a) => a.sectionId))];

  if (assignedSectionIds.length === 0) {
    res.json({ students: [], total: 0, page, totalPages: 0 });
    return;
  }

  const where: any = {
    deletedAt: null,
    sectionId: { in: assignedSectionIds },
    ...(search && {
      OR: [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { enrollmentNo: { contains: search as string, mode: 'insensitive' } },
      ],
    }),
  };

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        user: { select: { email: true } },
        batch: { select: { name: true, degree: true, department: { select: { name: true } } } },
        section: { select: { name: true } },
      },
      orderBy: { firstName: 'asc' },
      skip,
      take: limit,
    }),
    prisma.student.count({ where }),
  ]);

  res.json({ students, total, page, totalPages: Math.ceil(total / limit) });
});

// GET /api/teacher/students/:id — full student detail
router.get('/students/:id', async (req: Request, res: Response): Promise<void> => {
  // Verify teacher has access to this student's section
  const staff = await prisma.staff.findFirst({
    where: { userId: req.user!.userId, deletedAt: null },
  });

  if (!staff) {
    res.status(403).json({ error: 'Staff profile not found' });
    return;
  }

  const student = await prisma.student.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: {
      user: { select: { email: true, name: true } },
      batch: { select: { name: true, degree: true, department: { select: { name: true } } } },
      section: { select: { name: true } },
      health: true,
      skills: true,
      parents: true,
      financialAid: true,
      previousEducation: true,
      hobbies: true,
    },
  });

  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }

  // Check section access
  const hasAccess = await prisma.classAssignment.findFirst({
    where: { staffId: staff.id, sectionId: student.sectionId },
  });

  if (!hasAccess && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'You do not have access to this student' });
    return;
  }

  res.json({ student });
});

// ─── STUDENT SUB-ENTITY ROUTES ───────────────────────

// Helper: verify teacher access to a student
async function verifyTeacherAccess(req: Request, res: Response): Promise<string | null> {
  const staff = await prisma.staff.findFirst({
    where: { userId: req.user!.userId, deletedAt: null },
  });
  if (!staff) {
    res.status(403).json({ error: 'Staff profile not found' });
    return null;
  }

  const student = await prisma.student.findFirst({
    where: { id: req.params.id || req.params.studentId, deletedAt: null },
    select: { sectionId: true },
  });
  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return null;
  }

  if (req.user!.role !== 'admin') {
    const hasAccess = await prisma.classAssignment.findFirst({
      where: { staffId: staff.id, sectionId: student.sectionId },
    });
    if (!hasAccess) {
      res.status(403).json({ error: 'You do not have access to this student' });
      return null;
    }
  }

  return staff.id;
}

// Health
router.put('/students/:id/health', async (req: Request, res: Response): Promise<void> => {
  const staffId = await verifyTeacherAccess(req, res);
  if (!staffId) return;

  const { bloodGroup, diseases, allergies, emergencyContactName, emergencyContactPhone } = req.body;
  const health = await prisma.studentHealth.upsert({
    where: { studentId: req.params.id },
    update: { bloodGroup, diseases, allergies, emergencyContactName, emergencyContactPhone },
    create: {
      studentId: req.params.id, bloodGroup, diseases: diseases || [],
      allergies: allergies || [], emergencyContactName, emergencyContactPhone,
    },
  });
  res.json({ health });
});

// Previous Education
router.post('/students/:id/previous-education', async (req: Request, res: Response): Promise<void> => {
  const staffId = await verifyTeacherAccess(req, res);
  if (!staffId) return;

  const { level, institution, board, percentage, yearOfPass } = req.body;
  if (!level || !institution || !percentage || !yearOfPass) {
    res.status(400).json({ error: 'Level, institution, percentage, and year of passing are required' });
    return;
  }
  const edu = await prisma.previousEducation.create({
    data: { studentId: req.params.id, level, institution, board, percentage: parseFloat(percentage), yearOfPass: parseInt(yearOfPass) },
  });
  res.status(201).json({ education: edu });
});

router.put('/students/:studentId/previous-education/:eduId', async (req: Request, res: Response): Promise<void> => {
  const staffId = await verifyTeacherAccess(req, res);
  if (!staffId) return;

  const { level, institution, board, percentage, yearOfPass } = req.body;
  const edu = await prisma.previousEducation.update({
    where: { id: req.params.eduId },
    data: {
      ...(level && { level }), ...(institution && { institution }),
      ...(board !== undefined && { board }), ...(percentage && { percentage: parseFloat(percentage) }),
      ...(yearOfPass && { yearOfPass: parseInt(yearOfPass) }),
    },
  });
  res.json({ education: edu });
});

router.delete('/students/:studentId/previous-education/:eduId', async (req: Request, res: Response): Promise<void> => {
  const staffId = await verifyTeacherAccess(req, res);
  if (!staffId) return;

  await prisma.previousEducation.delete({ where: { id: req.params.eduId } });
  res.json({ message: 'Education record deleted' });
});

// Skills
router.post('/students/:id/skills', async (req: Request, res: Response): Promise<void> => {
  const staffId = await verifyTeacherAccess(req, res);
  if (!staffId) return;

  const { category, name, level } = req.body;
  const skill = await prisma.studentSkill.create({
    data: { studentId: req.params.id, category, name, level },
  });
  res.status(201).json({ skill });
});

router.delete('/students/:studentId/skills/:skillId', async (req: Request, res: Response): Promise<void> => {
  const staffId = await verifyTeacherAccess(req, res);
  if (!staffId) return;

  await prisma.studentSkill.delete({ where: { id: req.params.skillId } });
  res.json({ message: 'Skill deleted' });
});

// Hobbies & Strengths
router.post('/students/:id/hobbies', async (req: Request, res: Response): Promise<void> => {
  const staffId = await verifyTeacherAccess(req, res);
  if (!staffId) return;

  const { type, name } = req.body;
  if (!type || !name) {
    res.status(400).json({ error: 'Type and name are required' });
    return;
  }
  const hobby = await prisma.studentHobby.create({
    data: { studentId: req.params.id, type, name },
  });
  res.status(201).json({ hobby });
});

router.delete('/students/:studentId/hobbies/:hobbyId', async (req: Request, res: Response): Promise<void> => {
  const staffId = await verifyTeacherAccess(req, res);
  if (!staffId) return;

  await prisma.studentHobby.delete({ where: { id: req.params.hobbyId } });
  res.json({ message: 'Hobby deleted' });
});

// ─── TEACHER DASHBOARD & HELPERS ─────────────────────

// GET /api/teacher/my-courses — teacher's assigned courses+sections
router.get('/my-courses', async (req: Request, res: Response): Promise<void> => {
  const staff = await prisma.staff.findFirst({
    where: { userId: req.user!.userId, deletedAt: null },
  });
  if (!staff) { res.status(403).json({ error: 'Staff profile not found' }); return; }

  const assignments = await prisma.classAssignment.findMany({
    where: { staffId: staff.id },
    include: {
      course: { select: { id: true, code: true, name: true, semester: true, type: true } },
      section: { select: { id: true, name: true, batch: { select: { name: true, degree: true, startYear: true, endYear: true } } } },
    },
  });
  res.json({ assignments, staffId: staff.id });
});

// GET /api/teacher/dashboard-stats
router.get('/dashboard-stats', async (req: Request, res: Response): Promise<void> => {
  const staff = await prisma.staff.findFirst({
    where: { userId: req.user!.userId, deletedAt: null },
  });
  if (!staff) { res.status(403).json({ error: 'Staff profile not found' }); return; }

  const assignments = await prisma.classAssignment.findMany({
    where: { staffId: staff.id },
    select: { sectionId: true, courseId: true },
  });

  const sectionIds = [...new Set(assignments.map((a) => a.sectionId))];
  const courseIds = [...new Set(assignments.map((a) => a.courseId))];

  const totalStudents = sectionIds.length > 0
    ? await prisma.student.count({ where: { sectionId: { in: sectionIds }, deletedAt: null } })
    : 0;

  res.json({
    stats: {
      totalSections: sectionIds.length,
      totalCourses: courseIds.length,
      totalStudents,
      totalAssignments: assignments.length,
    },
  });
});

// ─── ATTENDANCE ──────────────────────────────────────

// GET /api/teacher/attendance — list attendance (by course, section, date)
router.get('/attendance', async (req: Request, res: Response): Promise<void> => {
  const { courseId, sectionId, date } = req.query;
  const staff = await prisma.staff.findFirst({ where: { userId: req.user!.userId, deletedAt: null } });
  if (!staff) { res.status(403).json({ error: 'Staff profile not found' }); return; }

  // Verify access
  if (courseId && sectionId) {
    const hasAccess = await prisma.classAssignment.findFirst({
      where: { staffId: staff.id, courseId: courseId as string, sectionId: sectionId as string },
    });
    if (!hasAccess && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Not assigned to this course/section' }); return;
    }
  }

  // Get students in the section
  const students = sectionId
    ? await prisma.student.findMany({
        where: { sectionId: sectionId as string, deletedAt: null },
        select: { id: true, enrollmentNo: true, firstName: true, lastName: true },
        orderBy: { firstName: 'asc' },
      })
    : [];

  // Get existing records for the date
  const where: any = { markedBy: staff.id };
  if (courseId) where.courseId = courseId as string;
  if (date) where.date = new Date(date as string);

  const records = await prisma.attendance.findMany({
    where,
    include: {
      student: { select: { enrollmentNo: true, firstName: true, lastName: true } },
      course: { select: { code: true, name: true } },
    },
    orderBy: { date: 'desc' },
    take: 500,
  });

  res.json({ students, records });
});

// POST /api/teacher/attendance/bulk — bulk mark attendance
router.post('/attendance/bulk', async (req: Request, res: Response): Promise<void> => {
  const { courseId, sectionId, date, entries } = req.body;
  // entries = [{ studentId, status }]

  if (!courseId || !sectionId || !date || !Array.isArray(entries) || entries.length === 0) {
    res.status(400).json({ error: 'courseId, sectionId, date, and entries are required' }); return;
  }

  const staff = await prisma.staff.findFirst({ where: { userId: req.user!.userId, deletedAt: null } });
  if (!staff) { res.status(403).json({ error: 'Staff profile not found' }); return; }

  const hasAccess = await prisma.classAssignment.findFirst({
    where: { staffId: staff.id, courseId, sectionId },
  });
  if (!hasAccess && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Not assigned to this course/section' }); return;
  }

  const attendanceDate = new Date(date);

  // Upsert each entry: delete existing for this date/course/student, then create
  for (const entry of entries) {
    await prisma.attendance.deleteMany({
      where: { studentId: entry.studentId, courseId, date: attendanceDate },
    });
    await prisma.attendance.create({
      data: {
        studentId: entry.studentId,
        courseId,
        date: attendanceDate,
        status: entry.status,
        markedBy: staff.id,
      },
    });
  }

  res.json({ message: `Attendance marked for ${entries.length} students` });
});

// PUT /api/teacher/attendance/:id
router.put('/attendance/:id', async (req: Request, res: Response): Promise<void> => {
  const { status } = req.body;
  const record = await prisma.attendance.update({
    where: { id: req.params.id as string },
    data: { status },
  });
  res.json({ record });
});

// ─── MARKS ───────────────────────────────────────────

// GET /api/teacher/marks — list marks (filter by course, section, assessmentType)
router.get('/marks', async (req: Request, res: Response): Promise<void> => {
  const { courseId, sectionId, assessmentType } = req.query;
  const staff = await prisma.staff.findFirst({ where: { userId: req.user!.userId, deletedAt: null } });
  if (!staff) { res.status(403).json({ error: 'Staff profile not found' }); return; }

  // Verify access
  if (courseId && sectionId) {
    const hasAccess = await prisma.classAssignment.findFirst({
      where: { staffId: staff.id, courseId: courseId as string, sectionId: sectionId as string },
    });
    if (!hasAccess && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Not assigned to this course/section' }); return;
    }
  }

  // Get students in section
  const students = sectionId
    ? await prisma.student.findMany({
        where: { sectionId: sectionId as string, deletedAt: null },
        select: { id: true, enrollmentNo: true, firstName: true, lastName: true, semester: true },
        orderBy: { firstName: 'asc' },
      })
    : [];

  // Get existing marks
  const where: any = { gradedBy: staff.id };
  if (courseId) where.courseId = courseId as string;
  if (assessmentType) where.assessmentType = assessmentType as string;
  // If sectionId provided, filter by students in that section
  if (sectionId) {
    const studentIds = students.map((s) => s.id);
    where.studentId = { in: studentIds };
  }

  const marks = await prisma.mark.findMany({
    where,
    include: {
      student: { select: { enrollmentNo: true, firstName: true, lastName: true } },
      course: { select: { code: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ students, marks });
});

// POST /api/teacher/marks/bulk — bulk add/update marks
router.post('/marks/bulk', async (req: Request, res: Response): Promise<void> => {
  const { courseId, sectionId, assessmentType, maxMarks, semester, academicYear, entries } = req.body;
  // entries = [{ studentId, marksObtained, remarks? }]

  if (!courseId || !assessmentType || !maxMarks || !semester || !academicYear || !Array.isArray(entries)) {
    res.status(400).json({ error: 'Missing required fields' }); return;
  }

  const staff = await prisma.staff.findFirst({ where: { userId: req.user!.userId, deletedAt: null } });
  if (!staff) { res.status(403).json({ error: 'Staff profile not found' }); return; }

  if (sectionId) {
    const hasAccess = await prisma.classAssignment.findFirst({
      where: { staffId: staff.id, courseId, sectionId },
    });
    if (!hasAccess && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Not assigned to this course/section' }); return;
    }
  }

  for (const entry of entries) {
    if (entry.marksObtained === '' || entry.marksObtained === null || entry.marksObtained === undefined) continue;

    // Check if mark exists for this student+course+assessmentType+academicYear
    const existing = await prisma.mark.findFirst({
      where: { studentId: entry.studentId, courseId, assessmentType, academicYear },
    });

    if (existing) {
      await prisma.mark.update({
        where: { id: existing.id },
        data: {
          marksObtained: parseFloat(entry.marksObtained),
          maxMarks: parseFloat(maxMarks),
          remarks: entry.remarks || null,
        },
      });
    } else {
      await prisma.mark.create({
        data: {
          studentId: entry.studentId,
          courseId,
          assessmentType,
          marksObtained: parseFloat(entry.marksObtained),
          maxMarks: parseFloat(maxMarks),
          semester: parseInt(semester),
          academicYear,
          gradedBy: staff.id,
          remarks: entry.remarks || null,
        },
      });
    }
  }

  res.json({ message: `Marks saved for ${entries.filter((e: any) => e.marksObtained !== '' && e.marksObtained !== null).length} students` });
});

// DELETE /api/teacher/marks/:id
router.delete('/marks/:id', async (req: Request, res: Response): Promise<void> => {
  await prisma.mark.delete({ where: { id: req.params.id as string } });
  res.json({ message: 'Mark deleted' });
});

export default router;
