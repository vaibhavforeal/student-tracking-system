import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { hashPassword } from '../utils/password';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

/** Wraps async route handlers so thrown errors are forwarded to Express error middleware */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

/** Safely extract a single string from req.query (which can be string | string[] | ParsedQs) */
function qs(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

/** Safely extract a single string from req.params (typed as string|string[] in newer Express types) */
function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(authorize('admin'));

// ─── MULTER CONFIG (Photo Uploads) ────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/photos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
  },
});

// POST /api/admin/upload/photo — Upload a student photo
router.post('/upload/photo', upload.single('photo'), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No photo file provided' });
    return;
  }
  const photoUrl = `/uploads/photos/${req.file.filename}`;
  res.json({ photoUrl });
}));

// ─── DEPARTMENTS ──────────────────────────────────────

// GET /api/admin/departments
router.get('/departments', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const departments = await prisma.department.findMany({
    where: { deletedAt: null },
    include: {
      _count: {
        select: {
          batches: true,
          courseDepartments: { where: { deletedAt: null } },
          staff: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });
  res.json({ departments });
}));

// POST /api/admin/departments
router.post('/departments', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, code } = req.body;
  if (!name || !code) {
    res.status(400).json({ error: 'Name and code are required' });
    return;
  }
  const upperCode = code.toUpperCase();

  // Check if a non-deleted department with this code already exists
  const existing = await prisma.department.findUnique({ where: { code: upperCode } });
  if (existing && !existing.deletedAt) {
    res.status(409).json({ error: `A department with code "${upperCode}" already exists` });
    return;
  }
  // If the code exists but is soft-deleted, permanently remove it first
  if (existing && existing.deletedAt) {
    await prisma.department.delete({ where: { id: existing.id } });
  }

  // Create department and backfill CourseDepartment rows for all mandatory courses
  const department = await prisma.$transaction(async (tx) => {
    const dept = await tx.department.create({ data: { name, code: upperCode } });

    // Backfill: create empty CourseDepartment rows for every mandatory course
    const mandatoryCourses = await tx.course.findMany({
      where: { isMandatory: true, deletedAt: null },
      select: { id: true },
    });

    if (mandatoryCourses.length > 0) {
      await tx.courseDepartment.createMany({
        data: mandatoryCourses.map((c) => ({
          courseId: c.id,
          departmentId: dept.id,
        })),
      });
    }

    return { ...dept, _mandatoryCount: mandatoryCourses.length };
  });

  res.status(201).json({ department });
}));

// GET /api/admin/departments/:id
router.get('/departments/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const department = await prisma.department.findFirst({
    where: { id: param(req.params.id), deletedAt: null },
    include: {
      batches: { where: { deletedAt: null } },
      courseDepartments: {
        where: { deletedAt: null },
        include: { course: { select: { id: true, code: true, name: true, type: true, semester: true, credits: true, isMandatory: true } } },
      },
      staff: { where: { deletedAt: null }, include: { user: { select: { name: true, email: true } } } },
    },
  });
  if (!department) { res.status(404).json({ error: 'Department not found' }); return; }
  res.json({ department });
}));

// PUT /api/admin/departments/:id
router.put('/departments/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, code } = req.body;
  const department = await prisma.department.update({
    where: { id: param(req.params.id) },
    data: { ...(name && { name }), ...(code && { code: code.toUpperCase() }) },
  });
  res.json({ department });
}));

// DELETE /api/admin/departments/:id (soft delete)
router.delete('/departments/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await prisma.department.update({
    where: { id: param(req.params.id) },
    data: { deletedAt: new Date() },
  });
  res.json({ message: 'Department deleted' });
}));

// ─── BATCHES ──────────────────────────────────────────

// GET /api/admin/batches
router.get('/batches', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const departmentId = qs(req.query.departmentId);
  const batches = await prisma.batch.findMany({
    where: {
      deletedAt: null,
      ...(departmentId && { departmentId }),
    },
    include: {
      department: { select: { name: true, code: true } },
      _count: { select: { sections: true, students: true } },
    },
    orderBy: { startYear: 'desc' },
  });
  res.json({ batches });
}));

// POST /api/admin/batches
router.post('/batches', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, departmentId, degree, startYear, endYear } = req.body;
  if (!name || !departmentId || !degree || !startYear || !endYear) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }
  const batch = await prisma.batch.create({
    data: { name, departmentId, degree, startYear: parseInt(startYear), endYear: parseInt(endYear) },
  });
  res.status(201).json({ batch });
}));

// GET /api/admin/batches/:id
router.get('/batches/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const batch = await prisma.batch.findFirst({
    where: { id: param(req.params.id), deletedAt: null },
    include: {
      department: { select: { name: true, code: true } },
      sections: { where: { deletedAt: null } },
    },
  });
  if (!batch) { res.status(404).json({ error: 'Batch not found' }); return; }
  res.json({ batch });
}));

// PUT /api/admin/batches/:id
router.put('/batches/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, departmentId, degree, startYear, endYear } = req.body;
  const batch = await prisma.batch.update({
    where: { id: param(req.params.id) },
    data: {
      ...(name && { name }), ...(departmentId && { departmentId }),
      ...(degree && { degree }),
      ...(startYear && { startYear: parseInt(startYear) }),
      ...(endYear && { endYear: parseInt(endYear) }),
    },
  });
  res.json({ batch });
}));

// DELETE /api/admin/batches/:id
router.delete('/batches/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await prisma.batch.update({ where: { id: param(req.params.id) }, data: { deletedAt: new Date() } });
  res.json({ message: 'Batch deleted' });
}));

// ─── SECTIONS ─────────────────────────────────────────

// GET /api/admin/sections
router.get('/sections', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const batchId = qs(req.query.batchId);
  const sections = await prisma.section.findMany({
    where: {
      deletedAt: null,
      ...(batchId && { batchId }),
    },
    include: {
      batch: { select: { name: true, degree: true, startYear: true, endYear: true, department: { select: { name: true } } } },
      _count: { select: { students: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json({ sections });
}));

// POST /api/admin/sections
router.post('/sections', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, batchId } = req.body;
  if (!name || !batchId) { res.status(400).json({ error: 'Name and batch are required' }); return; }
  const section = await prisma.section.create({ data: { name, batchId } });
  res.status(201).json({ section });
}));

// PUT /api/admin/sections/:id
router.put('/sections/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, batchId } = req.body;
  const section = await prisma.section.update({
    where: { id: param(req.params.id) },
    data: { ...(name && { name }), ...(batchId && { batchId }) },
  });
  res.json({ section });
}));

// DELETE /api/admin/sections/:id
router.delete('/sections/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await prisma.section.update({ where: { id: param(req.params.id) }, data: { deletedAt: new Date() } });
  res.json({ message: 'Section deleted' });
}));

// ─── COURSES ──────────────────────────────────────────

// GET /api/admin/courses
router.get('/courses', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const departmentId = qs(req.query.departmentId);
  const semester = qs(req.query.semester);
  const needsSyllabus = qs(req.query.needsSyllabus); // departmentId filter for "needs syllabus" view

  const where: any = { deletedAt: null };
  if (semester) where.semester = parseInt(semester);
  if (departmentId) {
    where.courseDepartments = { some: { departmentId, deletedAt: null } };
  }

  const courses = await prisma.course.findMany({
    where,
    include: {
      courseDepartments: {
        where: { deletedAt: null },
        include: {
          department: { select: { id: true, name: true, code: true } },
          _count: { select: { units: true } },
        },
      },
    },
    orderBy: [{ semester: 'asc' }, { name: 'asc' }],
  });

  // Enrich each course with department names and needsSyllabusCount
  const enriched = courses.map((c) => {
    const needsSyllabusCount = c.courseDepartments.filter((cd) => cd._count.units === 0).length;
    return {
      ...c,
      departments: c.courseDepartments.map((cd) => cd.department),
      needsSyllabusCount,
    };
  });

  // Optional: filter to only courses that need syllabus for a specific department
  const result = needsSyllabus
    ? enriched.filter((c) =>
        c.courseDepartments.some((cd) => cd.departmentId === needsSyllabus && cd._count.units === 0)
      )
    : enriched;

  res.json({ courses: result });
}));

// POST /api/admin/courses
router.post('/courses', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { code, name, credits, semester, type, isMandatory, departments } = req.body;
  if (!code || !name || !credits || !semester || !type) {
    res.status(400).json({ error: 'code, name, credits, semester, and type are required' });
    return;
  }
  if (!Array.isArray(departments) || departments.length === 0) {
    res.status(400).json({ error: 'At least one department entry is required' });
    return;
  }

  const mandatory = isMandatory === true || isMandatory === 'true';

  // Department-specific: must have exactly one department entry
  if (!mandatory && departments.length !== 1) {
    res.status(400).json({ error: 'Department-specific courses must have exactly one department' });
    return;
  }

  const upperCode = code.toUpperCase();

  // Check if a non-deleted course with this code already exists
  const existing = await prisma.course.findUnique({ where: { code: upperCode } });
  if (existing && !existing.deletedAt) {
    res.status(409).json({ error: `A course with code "${upperCode}" already exists` });
    return;
  }
  // If the code exists but is soft-deleted, permanently remove it first
  if (existing && existing.deletedAt) {
    await prisma.course.delete({ where: { id: existing.id } });
  }

  const course = await prisma.$transaction(async (tx) => {
    // Create the course
    const newCourse = await tx.course.create({
      data: {
        code: upperCode,
        name,
        credits: parseInt(credits),
        semester: parseInt(semester),
        type,
        isMandatory: mandatory,
      },
    });

    // Build set of provided department IDs
    const providedDeptIds = new Set(departments.map((d: any) => d.departmentId));

    // If mandatory, find all departments and auto-create missing ones
    if (mandatory) {
      const allDepts = await tx.department.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });
      for (const dept of allDepts) {
        if (!providedDeptIds.has(dept.id)) {
          // Auto-create empty CourseDepartment ("needs syllabus" state)
          await tx.courseDepartment.create({
            data: { courseId: newCourse.id, departmentId: dept.id },
          });
        }
      }
    }

    // Create CourseDepartment rows for provided departments (with optional syllabus)
    for (const dept of departments) {
      const cd = await tx.courseDepartment.create({
        data: { courseId: newCourse.id, departmentId: dept.departmentId },
      });

      // Create syllabus units + topics if provided
      if (Array.isArray(dept.units)) {
        for (const unit of dept.units) {
          const su = await tx.syllabusUnit.create({
            data: {
              courseDepartmentId: cd.id,
              number: parseInt(unit.number),
              title: unit.title,
              hours: unit.hours ? parseInt(unit.hours) : null,
            },
          });
          if (Array.isArray(unit.topics)) {
            await tx.syllabusTopic.createMany({
              data: unit.topics.map((t: any, idx: number) => ({
                unitId: su.id,
                order: t.order ?? idx + 1,
                title: t.title,
                description: t.description || null,
              })),
            });
          }
        }
      }
    }

    return newCourse;
  });

  // Return the full course with departments
  const full = await prisma.course.findUnique({
    where: { id: course.id },
    include: {
      courseDepartments: {
        where: { deletedAt: null },
        include: {
          department: { select: { id: true, name: true, code: true } },
          units: { include: { topics: { orderBy: { order: 'asc' } } }, orderBy: { number: 'asc' } },
        },
      },
    },
  });

  res.status(201).json({ course: full });
}));

// PUT /api/admin/courses/:id — edit shared fields only
router.put('/courses/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { code, name, credits, semester, type } = req.body;

  // Reject attempts to change isMandatory
  if (req.body.isMandatory !== undefined) {
    res.status(400).json({ error: 'Cannot change isMandatory after course creation' });
    return;
  }

  const course = await prisma.course.update({
    where: { id: param(req.params.id) },
    data: {
      ...(code && { code: code.toUpperCase() }),
      ...(name && { name }),
      ...(credits && { credits: parseInt(credits) }),
      ...(semester && { semester: parseInt(semester) }),
      ...(type && { type }),
    },
    include: {
      courseDepartments: {
        where: { deletedAt: null },
        include: {
          department: { select: { id: true, name: true, code: true } },
          _count: { select: { units: true } },
        },
      },
    },
  });
  res.json({ course });
}));

// DELETE /api/admin/courses/:id (soft delete course + its CourseDepartment rows)
router.delete('/courses/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.course.update({ where: { id: param(req.params.id) }, data: { deletedAt: now } });
    await tx.courseDepartment.updateMany({
      where: { courseId: param(req.params.id), deletedAt: null },
      data: { deletedAt: now },
    });
  });
  res.json({ message: 'Course deleted' });
}));

// PUT /api/admin/courses/:courseId/departments/:departmentId/syllabus — full replace syllabus
router.put('/courses/:courseId/departments/:departmentId/syllabus', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const courseId = param(req.params.courseId);
  const departmentId = param(req.params.departmentId);
  const { units } = req.body;

  if (!Array.isArray(units)) {
    res.status(400).json({ error: 'units array is required' });
    return;
  }

  // Find or create the CourseDepartment row
  let cd = await prisma.courseDepartment.findFirst({
    where: { courseId, departmentId, deletedAt: null },
  });

  if (!cd) {
    // Verify both course and department exist
    const [course, dept] = await Promise.all([
      prisma.course.findFirst({ where: { id: courseId, deletedAt: null } }),
      prisma.department.findFirst({ where: { id: departmentId, deletedAt: null } }),
    ]);
    if (!course) { res.status(404).json({ error: 'Course not found' }); return; }
    if (!dept) { res.status(404).json({ error: 'Department not found' }); return; }

    cd = await prisma.courseDepartment.create({
      data: { courseId, departmentId },
    });
  }

  // Full replace: delete all existing units (cascade deletes topics), then recreate
  await prisma.$transaction(async (tx) => {
    await tx.syllabusUnit.deleteMany({ where: { courseDepartmentId: cd!.id } });

    for (const unit of units) {
      const su = await tx.syllabusUnit.create({
        data: {
          courseDepartmentId: cd!.id,
          number: parseInt(unit.number),
          title: unit.title,
          hours: unit.hours ? parseInt(unit.hours) : null,
        },
      });
      if (Array.isArray(unit.topics)) {
        await tx.syllabusTopic.createMany({
          data: unit.topics.map((t: any, idx: number) => ({
            unitId: su.id,
            order: t.order ?? idx + 1,
            title: t.title,
            description: t.description || null,
          })),
        });
      }
    }
  });

  // Return updated syllabus
  const updated = await prisma.courseDepartment.findUnique({
    where: { id: cd.id },
    include: {
      department: { select: { id: true, name: true, code: true } },
      units: { include: { topics: { orderBy: { order: 'asc' } } }, orderBy: { number: 'asc' } },
    },
  });

  res.json({ courseDepartment: updated });
}));

// ─── STAFF ────────────────────────────────────────────

// GET /api/admin/staff
router.get('/staff', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const departmentId = qs(req.query.departmentId);
  const staff = await prisma.staff.findMany({
    where: {
      deletedAt: null,
      ...(departmentId && { departmentId }),
    },
    include: {
      user: { select: { name: true, email: true, isActive: true } },
      department: { select: { name: true, code: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ staff });
}));

// POST /api/admin/staff
router.post('/staff', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { employeeId, name, email, password, departmentId, designation, phone } = req.body;
  const validDesignations = ['HOD', 'Professor', 'Assistant Professor', 'Teacher'];
  if (!employeeId || !name || !email || !password || !designation || !phone) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }
  if (!validDesignations.includes(designation)) {
    res.status(400).json({ error: `Designation must be one of: ${validDesignations.join(', ')}` });
    return;
  }
  if (designation === 'HOD' && !departmentId) {
    res.status(400).json({ error: 'Department is required for HOD designation' });
    return;
  }
  const finalDepartmentId = designation === 'HOD' ? departmentId : null;

  // Check for existing staff with same employee ID
  const existingStaffByEmpId = await prisma.staff.findUnique({ where: { employeeId } });
  if (existingStaffByEmpId && !existingStaffByEmpId.deletedAt) {
    res.status(409).json({ error: `A staff member with employee ID "${employeeId}" already exists` });
    return;
  }

  // Check for existing user with same email
  const existingUserByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingUserByEmail && !existingUserByEmail.deletedAt) {
    res.status(409).json({ error: `A user with email "${email}" already exists` });
    return;
  }

  // Create user + staff in a transaction, cleaning up any soft-deleted conflicts first
  const result = await prisma.$transaction(async (tx) => {
    // Remove soft-deleted staff with same employee ID
    if (existingStaffByEmpId && existingStaffByEmpId.deletedAt) {
      await tx.classAssignment.deleteMany({ where: { staffId: existingStaffByEmpId.id } });
      await tx.staff.delete({ where: { id: existingStaffByEmpId.id } });
      // Also clean up the orphaned user
      await tx.user.delete({ where: { id: existingStaffByEmpId.userId } }).catch(() => {});
    }
    // Remove soft-deleted user with same email
    if (existingUserByEmail && existingUserByEmail.deletedAt) {
      // Remove any staff/student linked to this user first
      await tx.staff.deleteMany({ where: { userId: existingUserByEmail.id } });
      await tx.student.deleteMany({ where: { userId: existingUserByEmail.id } });
      await tx.user.delete({ where: { id: existingUserByEmail.id } });
    }

    const user = await tx.user.create({
      data: {
        email, name,
        passwordHash: await hashPassword(password),
        role: 'teacher',
      },
    });
    const staff = await tx.staff.create({
      data: { employeeId, userId: user.id, departmentId: finalDepartmentId, designation, phone },
    });
    return { user, staff };
  });

  res.status(201).json({
    staff: { ...result.staff, user: { name: result.user.name, email: result.user.email } },
  });
}));

// PUT /api/admin/staff/:id
router.put('/staff/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, email, departmentId, designation, phone } = req.body;
  const validDesignations = ['HOD', 'Professor', 'Assistant Professor', 'Teacher'];

  const existingStaff = await prisma.staff.findUnique({ where: { id: param(req.params.id) } });
  if (!existingStaff) { res.status(404).json({ error: 'Staff not found' }); return; }

  if (designation && !validDesignations.includes(designation)) {
    res.status(400).json({ error: `Designation must be one of: ${validDesignations.join(', ')}` });
    return;
  }

  // Determine the effective designation (new or existing)
  const effectiveDesignation = designation || existingStaff.designation;
  if (effectiveDesignation === 'HOD' && designation && !departmentId && !existingStaff.departmentId) {
    res.status(400).json({ error: 'Department is required for HOD designation' });
    return;
  }

  // If designation is changing away from HOD, clear department; if changing to HOD, require department
  const staffUpdateData: any = {};
  if (designation) staffUpdateData.designation = designation;
  if (phone) staffUpdateData.phone = phone;
  if (effectiveDesignation === 'HOD') {
    if (departmentId) staffUpdateData.departmentId = departmentId;
  } else {
    staffUpdateData.departmentId = null;
  }

  await prisma.$transaction(async (tx) => {
    if (name || email) {
      await tx.user.update({
        where: { id: existingStaff.userId },
        data: { ...(name && { name }), ...(email && { email }) },
      });
    }
    await tx.staff.update({
      where: { id: param(req.params.id) },
      data: staffUpdateData,
    });
  });

  const staff = await prisma.staff.findUnique({
    where: { id: param(req.params.id) },
    include: { user: { select: { name: true, email: true } }, department: { select: { name: true } } },
  });
  res.json({ staff });
}));

// DELETE /api/admin/staff/:id
router.delete('/staff/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const staff = await prisma.staff.findUnique({ where: { id: param(req.params.id) } });
  if (!staff) { res.status(404).json({ error: 'Staff not found' }); return; }
  await prisma.$transaction(async (tx) => {
    await tx.classAssignment.deleteMany({ where: { staffId: param(req.params.id) as string } });
    await tx.staff.update({ where: { id: param(req.params.id) }, data: { deletedAt: new Date() } });
    await tx.user.update({ where: { id: staff.userId }, data: { deletedAt: new Date(), isActive: false } });
  });
  res.json({ message: 'Staff deleted' });
}));

// ─── STUDENTS ─────────────────────────────────────────

// GET /api/admin/students
router.get('/students', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const batchId = qs(req.query.batchId);
  const sectionId = qs(req.query.sectionId);
  const status = qs(req.query.status);
  const search = qs(req.query.search);
  const page = parseInt(qs(req.query.page) || '1');
  const limit = parseInt(qs(req.query.limit) || '20');
  const skip = (page - 1) * limit;

  const where: any = {
    deletedAt: null,
    ...(batchId && { batchId }),
    ...(sectionId && { sectionId }),
    ...(status && { status }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { enrollmentNo: { contains: search, mode: 'insensitive' } },
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
        health: { select: { bloodGroup: true, diseases: true, allergies: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.student.count({ where }),
  ]);

  res.json({ students, total, page, totalPages: Math.ceil(total / limit) });
}));

// POST /api/admin/students
router.post('/students', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    enrollmentNo, email, firstName, lastName,
    dob, gender, phone, address, batchId, sectionId, semester,
  } = req.body;

  if (!enrollmentNo || !email || !firstName || !lastName || !dob || !gender || !phone || !address || !batchId || !sectionId || !semester) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  // Check for existing student with same enrollment number
  const existingStudent = await prisma.student.findUnique({ where: { enrollmentNo } });
  if (existingStudent && !existingStudent.deletedAt) {
    res.status(409).json({ error: `A student with enrollment number "${enrollmentNo}" already exists` });
    return;
  }

  // Check for existing user with same email
  const existingUserByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingUserByEmail && !existingUserByEmail.deletedAt) {
    res.status(409).json({ error: `A user with email "${email}" already exists` });
    return;
  }

  // Auto-generate password from DOB in DDMMYYYY format
  const dobDate = new Date(dob);
  const dd = String(dobDate.getDate()).padStart(2, '0');
  const mm = String(dobDate.getMonth() + 1).padStart(2, '0');
  const yyyy = String(dobDate.getFullYear());
  const autoPassword = `${dd}${mm}${yyyy}`;

  const result = await prisma.$transaction(async (tx) => {
    // Remove soft-deleted student with same enrollment number
    if (existingStudent && existingStudent.deletedAt) {
      // Clean up sub-entities
      await tx.studentHealth.deleteMany({ where: { studentId: existingStudent.id } });
      await tx.studentSkill.deleteMany({ where: { studentId: existingStudent.id } });
      await tx.parent.deleteMany({ where: { studentId: existingStudent.id } });
      await tx.financialAid.deleteMany({ where: { studentId: existingStudent.id } });
      await tx.previousEducation.deleteMany({ where: { studentId: existingStudent.id } });
      await tx.studentHobby.deleteMany({ where: { studentId: existingStudent.id } });
      await tx.mark.deleteMany({ where: { studentId: existingStudent.id } });
      await tx.attendance.deleteMany({ where: { studentId: existingStudent.id } });
      await tx.student.delete({ where: { id: existingStudent.id } });
      // Clean up orphaned user
      await tx.user.delete({ where: { id: existingStudent.userId } }).catch(() => {});
    }
    // Remove soft-deleted user with same email
    if (existingUserByEmail && existingUserByEmail.deletedAt) {
      await tx.staff.deleteMany({ where: { userId: existingUserByEmail.id } });
      await tx.student.deleteMany({ where: { userId: existingUserByEmail.id } });
      await tx.user.delete({ where: { id: existingUserByEmail.id } });
    }

    const user = await tx.user.create({
      data: {
        email, name: `${firstName} ${lastName}`,
        passwordHash: await hashPassword(autoPassword),
        role: 'student',
      },
    });
    const student = await tx.student.create({
      data: {
        enrollmentNo, userId: user.id, firstName, lastName,
        dob: new Date(dob), gender, phone, address,
        batchId, sectionId, semester: parseInt(semester),
        ...(req.body.photoUrl && { photoUrl: req.body.photoUrl }),
      },
    });
    return { user, student };
  });

  res.status(201).json({ student: result.student });
}));

// GET /api/admin/students/:id
router.get('/students/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const student = await prisma.student.findFirst({
    where: { id: param(req.params.id), deletedAt: null },
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
}));

// PUT /api/admin/students/:id
router.put('/students/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { firstName, lastName, email, dob, gender, phone, address, batchId, sectionId, semester, status } = req.body;

  const existing = await prisma.student.findUnique({ where: { id: param(req.params.id) } });
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
      where: { id: param(req.params.id) },
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
    where: { id: param(req.params.id) },
    include: {
      user: { select: { email: true, name: true } },
      batch: { select: { name: true } },
      section: { select: { name: true } },
    },
  });
  res.json({ student });
}));

// DELETE /api/admin/students/:id
router.delete('/students/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const student = await prisma.student.findUnique({ where: { id: param(req.params.id) } });
  if (!student) { res.status(404).json({ error: 'Student not found' }); return; }
  await prisma.$transaction(async (tx) => {
    await tx.student.update({ where: { id: param(req.params.id) }, data: { deletedAt: new Date() } });
    await tx.user.update({ where: { id: student.userId }, data: { deletedAt: new Date(), isActive: false } });
  });
  res.json({ message: 'Student deleted' });
}));

// ─── STUDENT SUB-ENTITIES ─────────────────────────────

// Health
router.put('/students/:id/health', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { bloodGroup, diseases, allergies, emergencyContactName, emergencyContactPhone } = req.body;
  const health = await prisma.studentHealth.upsert({
    where: { studentId: param(req.params.id) },
    update: { bloodGroup, diseases, allergies, emergencyContactName, emergencyContactPhone },
    create: {
      studentId: param(req.params.id), bloodGroup, diseases: diseases || [],
      allergies: allergies || [], emergencyContactName, emergencyContactPhone,
    },
  });
  res.json({ health });
}));

// Skills
router.post('/students/:id/skills', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { category, name, level } = req.body;
  const skill = await prisma.studentSkill.create({
    data: { studentId: param(req.params.id), category, name, level },
  });
  res.status(201).json({ skill });
}));

router.delete('/students/:studentId/skills/:skillId', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await prisma.studentSkill.delete({ where: { id: param(req.params.skillId) } });
  res.json({ message: 'Skill deleted' });
}));

// Parents
router.post('/students/:id/parents', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, relation, phone, email, occupation, annualIncome } = req.body;
  const parent = await prisma.parent.create({
    data: { studentId: param(req.params.id), name, relation, phone, email, occupation, annualIncome },
  });
  res.status(201).json({ parent });
}));

router.put('/students/:studentId/parents/:parentId', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parent = await prisma.parent.update({
    where: { id: param(req.params.parentId) },
    data: req.body,
  });
  res.json({ parent });
}));

router.delete('/students/:studentId/parents/:parentId', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await prisma.parent.delete({ where: { id: param(req.params.parentId) } });
  res.json({ message: 'Parent deleted' });
}));

// Financial Aid
router.post('/students/:id/financial-aid', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { type, amount, status, academicYear } = req.body;
  const aid = await prisma.financialAid.create({
    data: { studentId: param(req.params.id), type, amount, status, academicYear },
  });
  res.status(201).json({ aid });
}));

router.put('/students/:studentId/financial-aid/:aidId', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const aid = await prisma.financialAid.update({
    where: { id: param(req.params.aidId) },
    data: req.body,
  });
  res.json({ aid });
}));

router.delete('/students/:studentId/financial-aid/:aidId', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await prisma.financialAid.delete({ where: { id: param(req.params.aidId) } });
  res.json({ message: 'Financial aid deleted' });
}));

// Previous Education
router.post('/students/:id/previous-education', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { level, institution, board, percentage, yearOfPass } = req.body;
  if (!level || !institution || !percentage || !yearOfPass) {
    res.status(400).json({ error: 'Level, institution, percentage, and year of passing are required' });
    return;
  }
  const edu = await prisma.previousEducation.create({
    data: { studentId: param(req.params.id), level, institution, board, percentage: parseFloat(percentage), yearOfPass: parseInt(yearOfPass) },
  });
  res.status(201).json({ education: edu });
}));

router.put('/students/:studentId/previous-education/:eduId', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { level, institution, board, percentage, yearOfPass } = req.body;
  const edu = await prisma.previousEducation.update({
    where: { id: param(req.params.eduId) },
    data: {
      ...(level && { level }), ...(institution && { institution }),
      ...(board !== undefined && { board }), ...(percentage && { percentage: parseFloat(percentage) }),
      ...(yearOfPass && { yearOfPass: parseInt(yearOfPass) }),
    },
  });
  res.json({ education: edu });
}));

router.delete('/students/:studentId/previous-education/:eduId', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await prisma.previousEducation.delete({ where: { id: param(req.params.eduId) } });
  res.json({ message: 'Education record deleted' });
}));

// Hobbies & Strengths
router.post('/students/:id/hobbies', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { type, name } = req.body;
  if (!type || !name) {
    res.status(400).json({ error: 'Type and name are required' });
    return;
  }
  const hobby = await prisma.studentHobby.create({
    data: { studentId: param(req.params.id), type, name },
  });
  res.status(201).json({ hobby });
}));

router.delete('/students/:studentId/hobbies/:hobbyId', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await prisma.studentHobby.delete({ where: { id: param(req.params.hobbyId) } });
  res.json({ message: 'Hobby deleted' });
}));

// ─── USERS (Admin management) ─────────────────────────

// GET /api/admin/users
router.get('/users', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const role = qs(req.query.role);
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
}));

// PUT /api/admin/users/:id/toggle-active
router.put('/users/:id/toggle-active', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const targetId = param(req.params.id);

  // Prevent admin from deactivating themselves
  if (targetId === req.user?.userId) {
    res.status(403).json({ error: 'You cannot deactivate your own account' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  // If trying to deactivate an admin, ensure at least one other active admin remains
  if (user.role === 'admin' && user.isActive) {
    const activeAdminCount = await prisma.user.count({
      where: { role: 'admin', isActive: true, deletedAt: null },
    });
    if (activeAdminCount <= 1) {
      res.status(403).json({ error: 'Cannot deactivate the last active administrator' });
      return;
    }
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { isActive: !user.isActive },
    select: { id: true, email: true, isActive: true },
  });
  res.json({ user: updated });
}));

// ─── DASHBOARD STATS ──────────────────────────────────

// GET /api/admin/dashboard/stats
router.get('/dashboard/stats', asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
}));

// ─── CLASS ASSIGNMENTS ────────────────────────────────

// GET /api/admin/class-assignments
router.get('/class-assignments', asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
}));

// POST /api/admin/class-assignments
router.post('/class-assignments', asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
}));

// DELETE /api/admin/class-assignments/:id
router.delete('/class-assignments/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await prisma.classAssignment.delete({ where: { id: param(req.params.id) as string } });
  res.json({ message: 'Assignment deleted' });
}));

// ─── TRASH / RESTORE ──────────────────────────────────

// GET /api/admin/trash — List all soft-deleted items
router.get('/trash', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const [departments, batches, sections, courses, staff, students] = await Promise.all([
    prisma.department.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    }),
    prisma.batch.findMany({
      where: { deletedAt: { not: null } },
      include: { department: { select: { name: true } } },
      orderBy: { deletedAt: 'desc' },
    }),
    prisma.section.findMany({
      where: { deletedAt: { not: null } },
      include: { batch: { select: { name: true } } },
      orderBy: { deletedAt: 'desc' },
    }),
    prisma.course.findMany({
      where: { deletedAt: { not: null } },
      include: {
        courseDepartments: {
          include: { department: { select: { name: true, code: true } } },
        },
      },
      orderBy: { deletedAt: 'desc' },
    }),
    prisma.staff.findMany({
      where: { deletedAt: { not: null } },
      include: { user: { select: { name: true, email: true } }, department: { select: { name: true } } },
      orderBy: { deletedAt: 'desc' },
    }),
    prisma.student.findMany({
      where: { deletedAt: { not: null } },
      include: {
        user: { select: { email: true } },
        batch: { select: { name: true, degree: true } },
        section: { select: { name: true } },
      },
      orderBy: { deletedAt: 'desc' },
    }),
  ]);

  res.json({ departments, batches, sections, courses, staff, students });
}));

// PUT /api/admin/departments/:id/restore
router.put('/departments/:id/restore', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await prisma.department.update({
    where: { id: param(req.params.id) },
    data: { deletedAt: null },
  });
  res.json({ message: 'Department restored' });
}));

// PUT /api/admin/batches/:id/restore
router.put('/batches/:id/restore', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await prisma.batch.update({
    where: { id: param(req.params.id) },
    data: { deletedAt: null },
  });
  res.json({ message: 'Batch restored' });
}));

// PUT /api/admin/sections/:id/restore
router.put('/sections/:id/restore', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await prisma.section.update({
    where: { id: param(req.params.id) },
    data: { deletedAt: null },
  });
  res.json({ message: 'Section restored' });
}));

// PUT /api/admin/courses/:id/restore
router.put('/courses/:id/restore', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    await tx.course.update({
      where: { id: param(req.params.id) },
      data: { deletedAt: null },
    });
    // Also restore related CourseDepartment rows
    await tx.courseDepartment.updateMany({
      where: { courseId: param(req.params.id) },
      data: { deletedAt: null },
    });
  });
  res.json({ message: 'Course restored' });
}));

// PUT /api/admin/staff/:id/restore
router.put('/staff/:id/restore', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const staff = await prisma.staff.findUnique({ where: { id: param(req.params.id) } });
  if (!staff) { res.status(404).json({ error: 'Staff not found' }); return; }
  await prisma.$transaction(async (tx) => {
    await tx.staff.update({ where: { id: param(req.params.id) }, data: { deletedAt: null } });
    await tx.user.update({ where: { id: staff.userId }, data: { deletedAt: null, isActive: true } });
  });
  res.json({ message: 'Staff restored' });
}));

// PUT /api/admin/students/:id/restore
router.put('/students/:id/restore', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const student = await prisma.student.findUnique({ where: { id: param(req.params.id) } });
  if (!student) { res.status(404).json({ error: 'Student not found' }); return; }
  await prisma.$transaction(async (tx) => {
    await tx.student.update({ where: { id: param(req.params.id) }, data: { deletedAt: null } });
    await tx.user.update({ where: { id: student.userId }, data: { deletedAt: null, isActive: true } });
  });
  res.json({ message: 'Student restored' });
}));

// ─── TRASH CLEAR / PERMANENT DELETE ───────────────────

// DELETE /api/admin/trash/clear — Permanently delete ALL soft-deleted items
router.delete('/trash/clear', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    // ── 1. Gather soft-deleted IDs ──────────────────────────
    const deletedStudents = await tx.student.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true, userId: true },
    });
    const deletedStudentIds = deletedStudents.map((s) => s.id);
    const deletedStudentUserIds = deletedStudents.map((s) => s.userId);

    const deletedStaff = await tx.staff.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true, userId: true },
    });
    const deletedStaffIds = deletedStaff.map((s) => s.id);
    const deletedStaffUserIds = deletedStaff.map((s) => s.userId);

    const deletedCourses = await tx.course.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true },
    });
    const deletedCourseIds = deletedCourses.map((c) => c.id);

    const deletedSections = await tx.section.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true },
    });
    const deletedSectionIds = deletedSections.map((s) => s.id);

    const deletedBatches = await tx.batch.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true },
    });
    const deletedBatchIds = deletedBatches.map((b) => b.id);

    const deletedDepartments = await tx.department.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true },
    });
    const deletedDepartmentIds = deletedDepartments.map((d) => d.id);

    // ── 2. Clean up student sub-entities ────────────────────
    if (deletedStudentIds.length > 0) {
      await tx.mark.deleteMany({ where: { studentId: { in: deletedStudentIds } } });
      await tx.attendance.deleteMany({ where: { studentId: { in: deletedStudentIds } } });
      await tx.studentHealth.deleteMany({ where: { studentId: { in: deletedStudentIds } } });
      await tx.studentSkill.deleteMany({ where: { studentId: { in: deletedStudentIds } } });
      await tx.parent.deleteMany({ where: { studentId: { in: deletedStudentIds } } });
      await tx.financialAid.deleteMany({ where: { studentId: { in: deletedStudentIds } } });
      await tx.previousEducation.deleteMany({ where: { studentId: { in: deletedStudentIds } } });
      await tx.studentHobby.deleteMany({ where: { studentId: { in: deletedStudentIds } } });
    }

    // ── 3. Clean up staff-related entities (marks graded by, attendance marked by, class assignments) ──
    if (deletedStaffIds.length > 0) {
      await tx.mark.deleteMany({ where: { gradedBy: { in: deletedStaffIds } } });
      await tx.attendance.deleteMany({ where: { markedBy: { in: deletedStaffIds } } });
      await tx.classAssignment.deleteMany({ where: { staffId: { in: deletedStaffIds } } });
    }

    // ── 4. Delete soft-deleted students & staff ─────────────
    if (deletedStudentIds.length > 0) {
      await tx.student.deleteMany({ where: { id: { in: deletedStudentIds } } });
    }
    if (deletedStaffIds.length > 0) {
      await tx.staff.deleteMany({ where: { id: { in: deletedStaffIds } } });
    }

    // ── 5. Clean up course-related entities & delete courses ─
    if (deletedCourseIds.length > 0) {
      await tx.mark.deleteMany({ where: { courseId: { in: deletedCourseIds } } });
      await tx.attendance.deleteMany({ where: { courseId: { in: deletedCourseIds } } });
      await tx.classAssignment.deleteMany({ where: { courseId: { in: deletedCourseIds } } });
      await tx.course.deleteMany({ where: { id: { in: deletedCourseIds } } });
    }

    // ── 6. Delete sections (only those with no remaining student references) ─
    if (deletedSectionIds.length > 0) {
      // Check for ANY remaining students referencing these sections (active or soft-deleted)
      const sectionsWithStudents = await tx.student.findMany({
        where: { sectionId: { in: deletedSectionIds } },
        select: { sectionId: true },
        distinct: ['sectionId'],
      });
      const blockedSectionIds = new Set(sectionsWithStudents.map((s) => s.sectionId));
      const safeSectionIds = deletedSectionIds.filter((id) => !blockedSectionIds.has(id));

      if (safeSectionIds.length > 0) {
        await tx.classAssignment.deleteMany({ where: { sectionId: { in: safeSectionIds } } });
        await tx.section.deleteMany({ where: { id: { in: safeSectionIds } } });
      }
    }

    // ── 7. Delete batches (only those with no remaining child references) ─
    if (deletedBatchIds.length > 0) {
      const batchesWithStudents = await tx.student.findMany({
        where: { batchId: { in: deletedBatchIds } },
        select: { batchId: true },
        distinct: ['batchId'],
      });
      const batchesWithSections = await tx.section.findMany({
        where: { batchId: { in: deletedBatchIds } },
        select: { batchId: true },
        distinct: ['batchId'],
      });
      const blockedBatchIds = new Set([
        ...batchesWithStudents.map((s) => s.batchId),
        ...batchesWithSections.map((s) => s.batchId),
      ]);
      const safeBatchIds = deletedBatchIds.filter((id) => !blockedBatchIds.has(id));

      if (safeBatchIds.length > 0) {
        await tx.batch.deleteMany({ where: { id: { in: safeBatchIds } } });
      }
    }

    // ── 8. Delete departments (only those with no remaining child references) ─
    if (deletedDepartmentIds.length > 0) {
      const deptsWithBatches = await tx.batch.findMany({
        where: { departmentId: { in: deletedDepartmentIds } },
        select: { departmentId: true },
        distinct: ['departmentId'],
      });
      const deptsWithCourses = await tx.courseDepartment.findMany({
        where: { departmentId: { in: deletedDepartmentIds } },
        select: { departmentId: true },
        distinct: ['departmentId'],
      });
      const deptsWithStaff = await tx.staff.findMany({
        where: { departmentId: { in: deletedDepartmentIds } },
        select: { departmentId: true },
        distinct: ['departmentId'],
      });
      const blockedDeptIds = new Set([
        ...deptsWithBatches.map((b) => b.departmentId),
        ...deptsWithCourses.map((c) => c.departmentId),
        ...deptsWithStaff.filter((s) => s.departmentId).map((s) => s.departmentId as string),
      ]);
      const safeDeptIds = deletedDepartmentIds.filter((id) => !blockedDeptIds.has(id));

      if (safeDeptIds.length > 0) {
        await tx.department.deleteMany({ where: { id: { in: safeDeptIds } } });
      }
    }

    // ── 9. Clean up orphaned user accounts ──────────────────
    const allUserIds = [...deletedStudentUserIds, ...deletedStaffUserIds];
    if (allUserIds.length > 0) {
      await tx.user.deleteMany({ where: { id: { in: allUserIds }, deletedAt: { not: null } } });
    }
  }, { timeout: 30000 });

  res.json({ message: 'Trash cleared successfully' });
}));

// DELETE /api/admin/trash/:type/:id — Permanently delete a single soft-deleted item
router.delete('/trash/:type/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const type = param(req.params.type);
  const id = param(req.params.id);

  await prisma.$transaction(async (tx) => {
    switch (type) {
      case 'departments': {
        // Check for active children
        const activeBatches = await tx.batch.count({ where: { departmentId: id, deletedAt: null } });
        const activeCourseDepts = await tx.courseDepartment.count({ where: { departmentId: id, deletedAt: null } });
        const activeStaff = await tx.staff.count({ where: { departmentId: id, deletedAt: null } });
        if (activeBatches > 0 || activeCourseDepts > 0 || activeStaff > 0) {
          throw new Error('Cannot delete department — it still has active batches, courses, or staff');
        }
        // Clean up any soft-deleted courseDepartment rows for this department
        await tx.courseDepartment.deleteMany({ where: { departmentId: id } });
        await tx.department.delete({ where: { id } });
        break;
      }

      case 'batches': {
        const activeStudents = await tx.student.count({ where: { batchId: id, deletedAt: null } });
        const activeSections = await tx.section.count({ where: { batchId: id, deletedAt: null } });
        if (activeStudents > 0 || activeSections > 0) {
          throw new Error('Cannot delete batch — it still has active students or sections');
        }
        await tx.batch.delete({ where: { id } });
        break;
      }

      case 'sections': {
        const activeStudents = await tx.student.count({ where: { sectionId: id, deletedAt: null } });
        if (activeStudents > 0) {
          throw new Error('Cannot delete section — it still has active students');
        }
        await tx.classAssignment.deleteMany({ where: { sectionId: id } });
        await tx.section.delete({ where: { id } });
        break;
      }

      case 'courses':
        await tx.mark.deleteMany({ where: { courseId: id } });
        await tx.attendance.deleteMany({ where: { courseId: id } });
        await tx.classAssignment.deleteMany({ where: { courseId: id } });
        await tx.course.delete({ where: { id } });
        break;

      case 'staff': {
        const staffItem = await tx.staff.findUnique({ where: { id } });
        if (!staffItem) { throw new Error('Staff not found'); }
        await tx.mark.deleteMany({ where: { gradedBy: id } });
        await tx.attendance.deleteMany({ where: { markedBy: id } });
        await tx.classAssignment.deleteMany({ where: { staffId: id } });
        await tx.staff.delete({ where: { id } });
        await tx.user.delete({ where: { id: staffItem.userId } }).catch(() => {});
        break;
      }

      case 'students': {
        const studentItem = await tx.student.findUnique({ where: { id } });
        if (!studentItem) { throw new Error('Student not found'); }
        await tx.mark.deleteMany({ where: { studentId: id } });
        await tx.attendance.deleteMany({ where: { studentId: id } });
        await tx.studentHealth.deleteMany({ where: { studentId: id } });
        await tx.studentSkill.deleteMany({ where: { studentId: id } });
        await tx.parent.deleteMany({ where: { studentId: id } });
        await tx.financialAid.deleteMany({ where: { studentId: id } });
        await tx.previousEducation.deleteMany({ where: { studentId: id } });
        await tx.studentHobby.deleteMany({ where: { studentId: id } });
        await tx.student.delete({ where: { id } });
        await tx.user.delete({ where: { id: studentItem.userId } }).catch(() => {});
        break;
      }

      default:
        throw new Error(`Unknown entity type: ${type}`);
    }
  });

  res.json({ message: `${type.slice(0, -1)} permanently deleted` });
}));

// ─── SKILL COURSE CATEGORIES ─────────────────────────

// GET /api/admin/skill-course-categories
router.get('/skill-course-categories', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const categories = await prisma.skillCourseCategory.findMany({
    include: { _count: { select: { skillCourses: true } } },
    orderBy: { name: 'asc' },
  });
  res.json({ categories });
}));

// POST /api/admin/skill-course-categories
router.post('/skill-course-categories', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body;
  if (!name) { res.status(400).json({ error: 'Category name is required' }); return; }
  const existing = await prisma.skillCourseCategory.findUnique({ where: { name } });
  if (existing) { res.status(409).json({ error: `Category "${name}" already exists` }); return; }
  const category = await prisma.skillCourseCategory.create({ data: { name } });
  res.status(201).json({ category });
}));

// DELETE /api/admin/skill-course-categories/:id
router.delete('/skill-course-categories/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const courseCount = await prisma.skillCourse.count({ where: { categoryId: param(req.params.id), deletedAt: null } });
  if (courseCount > 0) {
    res.status(409).json({ error: 'Cannot delete category — it has active skill courses' });
    return;
  }
  await prisma.skillCourseCategory.delete({ where: { id: param(req.params.id) } });
  res.json({ message: 'Category deleted' });
}));

// ─── SKILL ENHANCEMENT COURSES ───────────────────────

// GET /api/admin/skill-courses
router.get('/skill-courses', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const categoryId = qs(req.query.categoryId);
  const difficulty = qs(req.query.difficulty);
  const skillCourses = await prisma.skillCourse.findMany({
    where: {
      deletedAt: null,
      ...(categoryId && { categoryId }),
      ...(difficulty && { difficulty: difficulty as any }),
    },
    include: {
      category: { select: { id: true, name: true } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ skillCourses });
}));

// POST /api/admin/skill-courses
router.post('/skill-courses', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { title, description, categoryId, difficulty, duration, provider, link } = req.body;
  if (!title || !description || !categoryId || !difficulty || !duration) {
    res.status(400).json({ error: 'Title, description, category, difficulty, and duration are required' });
    return;
  }
  const skillCourse = await prisma.skillCourse.create({
    data: { title, description, categoryId, difficulty, duration, provider: provider || null, link: link || null },
    include: { category: { select: { id: true, name: true } } },
  });
  res.status(201).json({ skillCourse });
}));

// PUT /api/admin/skill-courses/:id
router.put('/skill-courses/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { title, description, categoryId, difficulty, duration, provider, link, isActive } = req.body;
  const skillCourse = await prisma.skillCourse.update({
    where: { id: param(req.params.id) },
    data: {
      ...(title && { title }), ...(description && { description }),
      ...(categoryId && { categoryId }), ...(difficulty && { difficulty }),
      ...(duration && { duration }),
      ...(provider !== undefined && { provider: provider || null }),
      ...(link !== undefined && { link: link || null }),
      ...(isActive !== undefined && { isActive }),
    },
    include: { category: { select: { id: true, name: true } } },
  });
  res.json({ skillCourse });
}));

// DELETE /api/admin/skill-courses/:id (soft-delete)
router.delete('/skill-courses/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await prisma.skillCourse.update({
    where: { id: param(req.params.id) },
    data: { deletedAt: new Date() },
  });
  res.json({ message: 'Skill course deleted' });
}));

// GET /api/admin/skill-courses/:id/enrollments
router.get('/skill-courses/:id/enrollments', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const enrollments = await prisma.skillCourseEnrollment.findMany({
    where: { skillCourseId: param(req.params.id) },
    include: {
      student: {
        select: {
          id: true, enrollmentNo: true, firstName: true, lastName: true,
          batch: { select: { name: true } },
          section: { select: { name: true } },
        },
      },
    },
    orderBy: { enrolledAt: 'desc' },
  });
  res.json({ enrollments });
}));

// ─── SEMESTER PROMOTION ───────────────────────────────

// POST /api/admin/students/promote — Bulk promote students
router.post('/students/promote', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { batchId, sectionId, fromSemester, toSemester, autoGraduate } = req.body;
  const dryRun = qs(req.query.dryRun) === 'true';

  if (!batchId || !fromSemester || !toSemester) {
    res.status(400).json({ error: 'batchId, fromSemester, and toSemester are required' });
    return;
  }

  const from = parseInt(fromSemester);
  const to = parseInt(toSemester);

  if (to <= from) {
    res.status(400).json({ error: 'toSemester must be greater than fromSemester' });
    return;
  }

  const where: any = {
    deletedAt: null,
    status: 'active',
    batchId,
    semester: from,
    ...(sectionId && { sectionId }),
  };

  // Find eligible students
  const students = await prisma.student.findMany({
    where,
    select: {
      id: true, enrollmentNo: true, firstName: true, lastName: true,
      semester: true,
      batch: { select: { name: true, degree: true } },
      section: { select: { name: true } },
    },
    orderBy: { firstName: 'asc' },
  });

  if (students.length === 0) {
    res.json({ message: 'No eligible students found', students: [], promoted: 0 });
    return;
  }

  if (dryRun) {
    res.json({
      dryRun: true,
      students,
      eligible: students.length,
      fromSemester: from,
      toSemester: to,
    });
    return;
  }

  // Execute promotion
  const studentIds = students.map((s) => s.id);

  const updateData: any = { semester: to };

  // If autoGraduate is true and toSemester > 8, mark as graduated
  if (autoGraduate && to > 8) {
    updateData.status = 'graduated';
  }

  await prisma.student.updateMany({
    where: { id: { in: studentIds } },
    data: updateData,
  });

  res.json({
    message: `Successfully promoted ${students.length} student(s) from semester ${from} to ${to}`,
    promoted: students.length,
    studentIds,
    fromSemester: from,
    toSemester: to,
    graduated: autoGraduate && to > 8,
  });
}));

// POST /api/admin/students/:id/promote — Promote a single student
router.post('/students/:id/promote', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const student = await prisma.student.findFirst({
    where: { id: param(req.params.id), deletedAt: null },
  });

  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }

  if (student.status !== 'active') {
    res.status(400).json({ error: `Cannot promote student with status "${student.status}"` });
    return;
  }

  const newSemester = student.semester + 1;
  const autoGraduate = req.body.autoGraduate;
  const updateData: any = { semester: newSemester };

  if (autoGraduate && newSemester > 8) {
    updateData.status = 'graduated';
  }

  const updated = await prisma.student.update({
    where: { id: student.id },
    data: updateData,
    include: {
      batch: { select: { name: true } },
      section: { select: { name: true } },
    },
  });

  res.json({
    message: `Student promoted to semester ${newSemester}`,
    student: updated,
  });
}));

// ─── STUDENT FEEDBACK / SPACE FOR THOUGHT ────────────────

// GET /api/admin/feedback — List all student feedback
router.get('/feedback', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const status = qs(req.query.status); // 'unread' | 'read' | 'archived' | 'all'
  const category = qs(req.query.category);
  const search = qs(req.query.search);
  const page = parseInt(qs(req.query.page) || '1');
  const limit = parseInt(qs(req.query.limit) || '20');
  const skip = (page - 1) * limit;

  const where: any = {};

  if (status === 'unread') {
    where.isRead = false;
    where.isArchived = false;
  } else if (status === 'read') {
    where.isRead = true;
    where.isArchived = false;
  } else if (status === 'archived') {
    where.isArchived = true;
  } else {
    // 'all' — no filter, but exclude archived by default
    where.isArchived = false;
  }

  if (category && category !== 'all') {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { subject: { contains: search, mode: 'insensitive' } },
      { message: { contains: search, mode: 'insensitive' } },
      { student: { firstName: { contains: search, mode: 'insensitive' } } },
      { student: { lastName: { contains: search, mode: 'insensitive' } } },
      { student: { enrollmentNo: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [feedbacks, total, unreadCount] = await Promise.all([
    prisma.studentFeedback.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            enrollmentNo: true,
            semester: true,
            batch: { select: { name: true, department: { select: { name: true } } } },
            section: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.studentFeedback.count({ where }),
    prisma.studentFeedback.count({ where: { isRead: false, isArchived: false } }),
  ]);

  res.json({ feedbacks, total, page, totalPages: Math.ceil(total / limit), unreadCount });
}));

// GET /api/admin/feedback/:id — View single feedback
router.get('/feedback/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const feedback = await prisma.studentFeedback.findUnique({
    where: { id: param(req.params.id) },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          enrollmentNo: true,
          semester: true,
          phone: true,
          batch: { select: { name: true, department: { select: { name: true } } } },
          section: { select: { name: true } },
          user: { select: { email: true } },
        },
      },
    },
  });

  if (!feedback) { res.status(404).json({ error: 'Feedback not found' }); return; }

  // Auto-mark as read when admin views
  if (!feedback.isRead) {
    await prisma.studentFeedback.update({
      where: { id: feedback.id },
      data: { isRead: true },
    });
    feedback.isRead = true;
  }

  res.json({ feedback });
}));

// PUT /api/admin/feedback/:id/reply — Reply to feedback
router.put('/feedback/:id/reply', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { reply } = req.body;
  if (!reply) { res.status(400).json({ error: 'Reply message is required' }); return; }

  const feedback = await prisma.studentFeedback.update({
    where: { id: param(req.params.id) },
    data: { adminReply: reply, repliedAt: new Date(), isRead: true },
  });

  res.json({ feedback });
}));

// PUT /api/admin/feedback/:id/archive — Archive / unarchive feedback
router.put('/feedback/:id/archive', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const existing = await prisma.studentFeedback.findUnique({ where: { id: param(req.params.id) } });
  if (!existing) { res.status(404).json({ error: 'Feedback not found' }); return; }

  const feedback = await prisma.studentFeedback.update({
    where: { id: param(req.params.id) },
    data: { isArchived: !existing.isArchived },
  });

  res.json({ feedback, message: feedback.isArchived ? 'Feedback archived' : 'Feedback unarchived' });
}));

// PUT /api/admin/feedback/:id/read — Toggle read status
router.put('/feedback/:id/read', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const existing = await prisma.studentFeedback.findUnique({ where: { id: param(req.params.id) } });
  if (!existing) { res.status(404).json({ error: 'Feedback not found' }); return; }

  const feedback = await prisma.studentFeedback.update({
    where: { id: param(req.params.id) },
    data: { isRead: !existing.isRead },
  });

  res.json({ feedback });
}));

export default router;

