import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { hashPassword } from '../utils/password';

const router = Router();
const prisma = new PrismaClient();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(authorize('admin'));

// ─── DEPARTMENTS ──────────────────────────────────────

// GET /api/admin/departments
router.get('/departments', async (req: Request, res: Response): Promise<void> => {
  const departments = await prisma.department.findMany({
    where: { deletedAt: null },
    include: { _count: { select: { batches: true, courses: true, staff: true } } },
    orderBy: { name: 'asc' },
  });
  res.json({ departments });
});

// POST /api/admin/departments
router.post('/departments', async (req: Request, res: Response): Promise<void> => {
  const { name, code } = req.body;
  if (!name || !code) {
    res.status(400).json({ error: 'Name and code are required' });
    return;
  }
  const department = await prisma.department.create({ data: { name, code: code.toUpperCase() } });
  res.status(201).json({ department });
});

// GET /api/admin/departments/:id
router.get('/departments/:id', async (req: Request, res: Response): Promise<void> => {
  const department = await prisma.department.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: {
      batches: { where: { deletedAt: null } },
      courses: { where: { deletedAt: null } },
      staff: { where: { deletedAt: null }, include: { user: { select: { name: true, email: true } } } },
    },
  });
  if (!department) { res.status(404).json({ error: 'Department not found' }); return; }
  res.json({ department });
});

// PUT /api/admin/departments/:id
router.put('/departments/:id', async (req: Request, res: Response): Promise<void> => {
  const { name, code } = req.body;
  const department = await prisma.department.update({
    where: { id: req.params.id },
    data: { ...(name && { name }), ...(code && { code: code.toUpperCase() }) },
  });
  res.json({ department });
});

// DELETE /api/admin/departments/:id (soft delete)
router.delete('/departments/:id', async (req: Request, res: Response): Promise<void> => {
  await prisma.department.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() },
  });
  res.json({ message: 'Department deleted' });
});

// ─── BATCHES ──────────────────────────────────────────

// GET /api/admin/batches
router.get('/batches', async (req: Request, res: Response): Promise<void> => {
  const { departmentId } = req.query;
  const batches = await prisma.batch.findMany({
    where: {
      deletedAt: null,
      ...(departmentId && { departmentId: departmentId as string }),
    },
    include: {
      department: { select: { name: true, code: true } },
      _count: { select: { sections: true, students: true } },
    },
    orderBy: { startYear: 'desc' },
  });
  res.json({ batches });
});

// POST /api/admin/batches
router.post('/batches', async (req: Request, res: Response): Promise<void> => {
  const { name, departmentId, degree, startYear, endYear } = req.body;
  if (!name || !departmentId || !degree || !startYear || !endYear) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }
  const batch = await prisma.batch.create({
    data: { name, departmentId, degree, startYear: parseInt(startYear), endYear: parseInt(endYear) },
  });
  res.status(201).json({ batch });
});

// GET /api/admin/batches/:id
router.get('/batches/:id', async (req: Request, res: Response): Promise<void> => {
  const batch = await prisma.batch.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: {
      department: { select: { name: true, code: true } },
      sections: { where: { deletedAt: null } },
    },
  });
  if (!batch) { res.status(404).json({ error: 'Batch not found' }); return; }
  res.json({ batch });
});

// PUT /api/admin/batches/:id
router.put('/batches/:id', async (req: Request, res: Response): Promise<void> => {
  const { name, departmentId, degree, startYear, endYear } = req.body;
  const batch = await prisma.batch.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name }), ...(departmentId && { departmentId }),
      ...(degree && { degree }),
      ...(startYear && { startYear: parseInt(startYear) }),
      ...(endYear && { endYear: parseInt(endYear) }),
    },
  });
  res.json({ batch });
});

// DELETE /api/admin/batches/:id
router.delete('/batches/:id', async (req: Request, res: Response): Promise<void> => {
  await prisma.batch.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  res.json({ message: 'Batch deleted' });
});

// ─── SECTIONS ─────────────────────────────────────────

// GET /api/admin/sections
router.get('/sections', async (req: Request, res: Response): Promise<void> => {
  const { batchId } = req.query;
  const sections = await prisma.section.findMany({
    where: {
      deletedAt: null,
      ...(batchId && { batchId: batchId as string }),
    },
    include: {
      batch: { select: { name: true, degree: true, startYear: true, endYear: true, department: { select: { name: true } } } },
      _count: { select: { students: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json({ sections });
});

// POST /api/admin/sections
router.post('/sections', async (req: Request, res: Response): Promise<void> => {
  const { name, batchId } = req.body;
  if (!name || !batchId) { res.status(400).json({ error: 'Name and batch are required' }); return; }
  const section = await prisma.section.create({ data: { name, batchId } });
  res.status(201).json({ section });
});

// PUT /api/admin/sections/:id
router.put('/sections/:id', async (req: Request, res: Response): Promise<void> => {
  const { name, batchId } = req.body;
  const section = await prisma.section.update({
    where: { id: req.params.id },
    data: { ...(name && { name }), ...(batchId && { batchId }) },
  });
  res.json({ section });
});

// DELETE /api/admin/sections/:id
router.delete('/sections/:id', async (req: Request, res: Response): Promise<void> => {
  await prisma.section.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  res.json({ message: 'Section deleted' });
});

// ─── COURSES ──────────────────────────────────────────

// GET /api/admin/courses
router.get('/courses', async (req: Request, res: Response): Promise<void> => {
  const { departmentId, semester } = req.query;
  const courses = await prisma.course.findMany({
    where: {
      deletedAt: null,
      ...(departmentId && { departmentId: departmentId as string }),
      ...(semester && { semester: parseInt(semester as string) }),
    },
    include: { department: { select: { name: true, code: true } } },
    orderBy: [{ semester: 'asc' }, { name: 'asc' }],
  });
  res.json({ courses });
});

// POST /api/admin/courses
router.post('/courses', async (req: Request, res: Response): Promise<void> => {
  const { code, name, credits, semester, type, departmentId } = req.body;
  if (!code || !name || !credits || !semester || !type || !departmentId) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }
  const course = await prisma.course.create({
    data: { code: code.toUpperCase(), name, credits: parseInt(credits), semester: parseInt(semester), type, departmentId },
  });
  res.status(201).json({ course });
});

// PUT /api/admin/courses/:id
router.put('/courses/:id', async (req: Request, res: Response): Promise<void> => {
  const { code, name, credits, semester, type, departmentId } = req.body;
  const course = await prisma.course.update({
    where: { id: req.params.id },
    data: {
      ...(code && { code: code.toUpperCase() }), ...(name && { name }),
      ...(credits && { credits: parseInt(credits) }),
      ...(semester && { semester: parseInt(semester) }),
      ...(type && { type }), ...(departmentId && { departmentId }),
    },
  });
  res.json({ course });
});

// DELETE /api/admin/courses/:id
router.delete('/courses/:id', async (req: Request, res: Response): Promise<void> => {
  await prisma.course.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  res.json({ message: 'Course deleted' });
});

// ─── STAFF ────────────────────────────────────────────

// GET /api/admin/staff
router.get('/staff', async (req: Request, res: Response): Promise<void> => {
  const { departmentId } = req.query;
  const staff = await prisma.staff.findMany({
    where: {
      deletedAt: null,
      ...(departmentId && { departmentId: departmentId as string }),
    },
    include: {
      user: { select: { name: true, email: true, isActive: true } },
      department: { select: { name: true, code: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ staff });
});

// POST /api/admin/staff
router.post('/staff', async (req: Request, res: Response): Promise<void> => {
  const { employeeId, name, email, password, departmentId, designation, phone } = req.body;
  if (!employeeId || !name || !email || !password || !departmentId || !designation || !phone) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  // Create user + staff in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email, name,
        passwordHash: await hashPassword(password),
        role: 'teacher',
      },
    });
    const staff = await tx.staff.create({
      data: { employeeId, userId: user.id, departmentId, designation, phone },
    });
    return { user, staff };
  });

  res.status(201).json({
    staff: { ...result.staff, user: { name: result.user.name, email: result.user.email } },
  });
});

// PUT /api/admin/staff/:id
router.put('/staff/:id', async (req: Request, res: Response): Promise<void> => {
  const { name, email, departmentId, designation, phone } = req.body;

  const existingStaff = await prisma.staff.findUnique({ where: { id: req.params.id } });
  if (!existingStaff) { res.status(404).json({ error: 'Staff not found' }); return; }

  await prisma.$transaction(async (tx) => {
    if (name || email) {
      await tx.user.update({
        where: { id: existingStaff.userId },
        data: { ...(name && { name }), ...(email && { email }) },
      });
    }
    await tx.staff.update({
      where: { id: req.params.id },
      data: { ...(departmentId && { departmentId }), ...(designation && { designation }), ...(phone && { phone }) },
    });
  });

  const staff = await prisma.staff.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { name: true, email: true } }, department: { select: { name: true } } },
  });
  res.json({ staff });
});

// DELETE /api/admin/staff/:id
router.delete('/staff/:id', async (req: Request, res: Response): Promise<void> => {
  const staff = await prisma.staff.findUnique({ where: { id: req.params.id } });
  if (!staff) { res.status(404).json({ error: 'Staff not found' }); return; }
  await prisma.$transaction(async (tx) => {
    await tx.classAssignment.deleteMany({ where: { staffId: req.params.id as string } });
    await tx.staff.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    await tx.user.update({ where: { id: staff.userId }, data: { deletedAt: new Date(), isActive: false } });
  });
  res.json({ message: 'Staff deleted' });
});

// ─── STUDENTS ─────────────────────────────────────────

// GET /api/admin/students
router.get('/students', async (req: Request, res: Response): Promise<void> => {
  const { batchId, sectionId, status, search } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const where: any = {
    deletedAt: null,
    ...(batchId && { batchId: batchId as string }),
    ...(sectionId && { sectionId: sectionId as string }),
    ...(status && { status: status as string }),
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
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.student.count({ where }),
  ]);

  res.json({ students, total, page, totalPages: Math.ceil(total / limit) });
});

// POST /api/admin/students
router.post('/students', async (req: Request, res: Response): Promise<void> => {
  const {
    enrollmentNo, email, password, firstName, lastName,
    dob, gender, phone, address, batchId, sectionId, semester,
  } = req.body;

  if (!enrollmentNo || !email || !password || !firstName || !lastName || !dob || !gender || !phone || !address || !batchId || !sectionId || !semester) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email, name: `${firstName} ${lastName}`,
        passwordHash: await hashPassword(password),
        role: 'student',
      },
    });
    const student = await tx.student.create({
      data: {
        enrollmentNo, userId: user.id, firstName, lastName,
        dob: new Date(dob), gender, phone, address,
        batchId, sectionId, semester: parseInt(semester),
      },
    });
    return { user, student };
  });

  res.status(201).json({ student: result.student });
});

// GET /api/admin/students/:id
router.get('/students/:id', async (req: Request, res: Response): Promise<void> => {
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
  if (!student) { res.status(404).json({ error: 'Student not found' }); return; }
  res.json({ student });
});

// PUT /api/admin/students/:id
router.put('/students/:id', async (req: Request, res: Response): Promise<void> => {
  const { firstName, lastName, email, dob, gender, phone, address, batchId, sectionId, semester, status } = req.body;

  const existing = await prisma.student.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: 'Student not found' }); return; }

  await prisma.$transaction(async (tx) => {
    if (email || firstName || lastName) {
      const name = (firstName || existing.firstName) + ' ' + (lastName || existing.lastName);
      await tx.user.update({
        where: { id: existing.userId },
        data: { ...(email && { email }), name },
      });
    }
    await tx.student.update({
      where: { id: req.params.id },
      data: {
        ...(firstName && { firstName }), ...(lastName && { lastName }),
        ...(dob && { dob: new Date(dob) }), ...(gender && { gender }),
        ...(phone && { phone }), ...(address && { address }),
        ...(batchId && { batchId }), ...(sectionId && { sectionId }),
        ...(semester && { semester: parseInt(semester) }),
        ...(status && { status }),
      },
    });
  });

  const student = await prisma.student.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { email: true, name: true } },
      batch: { select: { name: true } },
      section: { select: { name: true } },
    },
  });
  res.json({ student });
});

// DELETE /api/admin/students/:id
router.delete('/students/:id', async (req: Request, res: Response): Promise<void> => {
  const student = await prisma.student.findUnique({ where: { id: req.params.id } });
  if (!student) { res.status(404).json({ error: 'Student not found' }); return; }
  await prisma.$transaction(async (tx) => {
    await tx.student.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    await tx.user.update({ where: { id: student.userId }, data: { deletedAt: new Date(), isActive: false } });
  });
  res.json({ message: 'Student deleted' });
});

// ─── STUDENT SUB-ENTITIES ─────────────────────────────

// Health
router.put('/students/:id/health', async (req: Request, res: Response): Promise<void> => {
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

// Skills
router.post('/students/:id/skills', async (req: Request, res: Response): Promise<void> => {
  const { category, name, level } = req.body;
  const skill = await prisma.studentSkill.create({
    data: { studentId: req.params.id, category, name, level },
  });
  res.status(201).json({ skill });
});

router.delete('/students/:studentId/skills/:skillId', async (req: Request, res: Response): Promise<void> => {
  await prisma.studentSkill.delete({ where: { id: req.params.skillId } });
  res.json({ message: 'Skill deleted' });
});

// Parents
router.post('/students/:id/parents', async (req: Request, res: Response): Promise<void> => {
  const { name, relation, phone, email, occupation, annualIncome } = req.body;
  const parent = await prisma.parent.create({
    data: { studentId: req.params.id, name, relation, phone, email, occupation, annualIncome },
  });
  res.status(201).json({ parent });
});

router.put('/students/:studentId/parents/:parentId', async (req: Request, res: Response): Promise<void> => {
  const parent = await prisma.parent.update({
    where: { id: req.params.parentId },
    data: req.body,
  });
  res.json({ parent });
});

router.delete('/students/:studentId/parents/:parentId', async (req: Request, res: Response): Promise<void> => {
  await prisma.parent.delete({ where: { id: req.params.parentId } });
  res.json({ message: 'Parent deleted' });
});

// Financial Aid
router.post('/students/:id/financial-aid', async (req: Request, res: Response): Promise<void> => {
  const { type, amount, status, academicYear } = req.body;
  const aid = await prisma.financialAid.create({
    data: { studentId: req.params.id, type, amount, status, academicYear },
  });
  res.status(201).json({ aid });
});

router.put('/students/:studentId/financial-aid/:aidId', async (req: Request, res: Response): Promise<void> => {
  const aid = await prisma.financialAid.update({
    where: { id: req.params.aidId },
    data: req.body,
  });
  res.json({ aid });
});

router.delete('/students/:studentId/financial-aid/:aidId', async (req: Request, res: Response): Promise<void> => {
  await prisma.financialAid.delete({ where: { id: req.params.aidId } });
  res.json({ message: 'Financial aid deleted' });
});

// Previous Education
router.post('/students/:id/previous-education', async (req: Request, res: Response): Promise<void> => {
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
  await prisma.previousEducation.delete({ where: { id: req.params.eduId } });
  res.json({ message: 'Education record deleted' });
});

// Hobbies & Strengths
router.post('/students/:id/hobbies', async (req: Request, res: Response): Promise<void> => {
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
  await prisma.studentHobby.delete({ where: { id: req.params.hobbyId } });
  res.json({ message: 'Hobby deleted' });
});

// ─── USERS (Admin management) ─────────────────────────

// GET /api/admin/users
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  const { role } = req.query;
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(role && { role: role as any }),
    },
    select: {
      id: true, email: true, role: true, name: true,
      avatarUrl: true, isActive: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ users });
});

// PUT /api/admin/users/:id/toggle-active
router.put('/users/:id/toggle-active', async (req: Request, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: !user.isActive },
    select: { id: true, email: true, isActive: true },
  });
  res.json({ user: updated });
});

// ─── DASHBOARD STATS ──────────────────────────────────

// GET /api/admin/dashboard/stats
router.get('/dashboard/stats', async (req: Request, res: Response): Promise<void> => {
  const [
    totalStudents, totalStaff, totalDepartments,
    totalBatches, totalCourses, totalSections,
    activeStudents, inactiveStudents,
  ] = await Promise.all([
    prisma.student.count({ where: { deletedAt: null } }),
    prisma.staff.count({ where: { deletedAt: null } }),
    prisma.department.count({ where: { deletedAt: null } }),
    prisma.batch.count({ where: { deletedAt: null } }),
    prisma.course.count({ where: { deletedAt: null } }),
    prisma.section.count({ where: { deletedAt: null } }),
    prisma.student.count({ where: { deletedAt: null, status: 'active' } }),
    prisma.student.count({ where: { deletedAt: null, status: { not: 'active' } } }),
  ]);

  res.json({
    stats: {
      totalStudents, totalStaff, totalDepartments,
      totalBatches, totalCourses, totalSections,
      activeStudents, inactiveStudents,
    },
  });
});

// ─── CLASS ASSIGNMENTS ────────────────────────────────

// GET /api/admin/class-assignments
router.get('/class-assignments', async (req: Request, res: Response): Promise<void> => {
  const assignments = await prisma.classAssignment.findMany({
    where: { staff: { deletedAt: null } },
    include: {
      staff: { select: { id: true, employeeId: true, user: { select: { name: true } } } },
      course: { select: { id: true, code: true, name: true } },
      section: { select: { id: true, name: true, batch: { select: { name: true, degree: true } } } },
    },
    orderBy: { academicYear: 'desc' },
  });
  res.json({ assignments });
});

// POST /api/admin/class-assignments
router.post('/class-assignments', async (req: Request, res: Response): Promise<void> => {
  const { staffId, courseId, sectionId, academicYear } = req.body;
  if (!staffId || !courseId || !sectionId || !academicYear) {
    res.status(400).json({ error: 'staffId, courseId, sectionId, and academicYear are required' });
    return;
  }

  // Check for duplicate
  const existing = await prisma.classAssignment.findFirst({
    where: { staffId, courseId, sectionId, academicYear },
  });
  if (existing) {
    res.status(409).json({ error: 'This assignment already exists' });
    return;
  }

  const assignment = await prisma.classAssignment.create({
    data: { staffId, courseId, sectionId, academicYear },
    include: {
      staff: { select: { id: true, employeeId: true, user: { select: { name: true } } } },
      course: { select: { id: true, code: true, name: true } },
      section: { select: { id: true, name: true, batch: { select: { name: true, degree: true } } } },
    },
  });
  res.status(201).json({ assignment });
});

// DELETE /api/admin/class-assignments/:id
router.delete('/class-assignments/:id', async (req: Request, res: Response): Promise<void> => {
  await prisma.classAssignment.delete({ where: { id: req.params.id as string } });
  res.json({ message: 'Assignment deleted' });
});

export default router;
