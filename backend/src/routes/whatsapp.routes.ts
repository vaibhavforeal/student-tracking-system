/**
 * WhatsApp API Routes
 * Endpoints for sending attendance reports via WhatsApp to parents.
 */
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import {
  isWhatsAppConfigured,
  formatPhoneNumber,
  uploadMedia,
  sendDocument,
  sendTemplateWithDocument,
  parseWhatsAppError,
} from '../services/whatsapp.service';
import {
  generateAttendancePDF,
  StudentAttendanceData,
  CourseAttendance,
} from '../services/attendanceReport.generator';

const router = Router();
const prisma = new PrismaClient();

/** Safely extract a single string from req.query */
function qs(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

// All routes require authentication + admin or teacher role
router.use(authenticate);
router.use(authorize('admin', 'teacher'));

// ═══════════════════════════════════════════════════════
// GET /api/whatsapp/status — check if WhatsApp is configured
// ═══════════════════════════════════════════════════════
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  res.json({
    configured: isWhatsAppConfigured(),
    message: isWhatsAppConfigured()
      ? 'WhatsApp API is configured and ready'
      : 'WhatsApp API credentials are not set. Please configure WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env',
  });
});

// ═══════════════════════════════════════════════════════
// POST /api/whatsapp/send-attendance/:studentId
// Send attendance report PDF to a student's parents
// ═══════════════════════════════════════════════════════
router.post('/send-attendance/:studentId', async (req: Request, res: Response): Promise<void> => {
  const studentId = req.params.studentId as string;
  const { parentIds } = req.body; // optional: specific parent IDs

  if (!isWhatsAppConfigured()) {
    res.status(503).json({ error: 'WhatsApp API is not configured' });
    return;
  }

  // 1. Fetch student with attendance & parents
  const student = await prisma.student.findFirst({
    where: { id: studentId, deletedAt: null },
    include: {
      batch: { select: { name: true, degree: true, department: { select: { name: true } } } },
      section: { select: { name: true } },
      parents: true,
      attendance: {
        include: { course: { select: { code: true, name: true } } },
      },
    },
  });

  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }

  // Filter parents if specific IDs provided
  const parents = parentIds && parentIds.length > 0
    ? student.parents.filter((p) => parentIds.includes(p.id))
    : student.parents;

  if (parents.length === 0) {
    res.status(400).json({ error: 'No parent records found for this student' });
    return;
  }

  // 2. Build attendance data per course
  const courseMap: Record<string, CourseAttendance> = {};
  let overallPresent = 0;
  let overallTotal = 0;

  student.attendance.forEach((a) => {
    const key = a.courseId;
    if (!courseMap[key]) {
      courseMap[key] = {
        courseCode: a.course.code,
        courseName: a.course.name,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        percentage: '0',
      };
    }
    courseMap[key].total++;
    overallTotal++;
    if (a.status === 'present') {
      courseMap[key].present++;
      overallPresent++;
    } else if (a.status === 'absent') {
      courseMap[key].absent++;
    } else if (a.status === 'late') {
      courseMap[key].late++;
    }
  });

  const courses = Object.values(courseMap).map((c) => ({
    ...c,
    percentage: c.total > 0 ? ((c.present / c.total) * 100).toFixed(1) : '0.0',
  }));

  const overallPercentage = overallTotal > 0
    ? ((overallPresent / overallTotal) * 100).toFixed(1)
    : '0.0';

  if (courses.length === 0) {
    res.status(400).json({ error: 'No attendance data found for this student' });
    return;
  }

  // 3. Generate PDF
  const attendanceData: StudentAttendanceData = {
    studentName: `${student.firstName} ${student.lastName}`,
    enrollmentNo: student.enrollmentNo,
    batchName: student.batch.name,
    sectionName: student.section.name,
    semester: student.semester,
    degree: student.batch.degree,
    departmentName: student.batch.department.name,
    courses,
    overallPresent,
    overallTotal,
    overallPercentage,
  };

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateAttendancePDF(attendanceData);
  } catch (err) {
    console.error('PDF generation failed:', err);
    res.status(500).json({ error: 'Failed to generate attendance report PDF' });
    return;
  }

  // 4. Upload PDF to WhatsApp
  let mediaId: string;
  try {
    mediaId = await uploadMedia(
      pdfBuffer,
      'application/pdf',
      `attendance_${student.enrollmentNo}.pdf`,
    );
  } catch (err) {
    const msg = parseWhatsAppError(err);
    console.error('WhatsApp media upload failed:', msg);
    res.status(502).json({ error: `Failed to upload PDF to WhatsApp: ${msg}` });
    return;
  }

  // 5. Send to each parent
  const results: Array<{
    parentName: string;
    phone: string;
    status: 'sent' | 'failed';
    error?: string;
  }> = [];

  for (const parent of parents) {
    const phone = formatPhoneNumber(parent.phone);

    try {
      // Try sending as a template message (for business-initiated conversations)
      await sendTemplateWithDocument(phone, mediaId, `attendance_${student.enrollmentNo}.pdf`, {
        parentName: parent.name,
        studentName: `${student.firstName} ${student.lastName}`,
        enrollmentNo: student.enrollmentNo,
        attendancePct: overallPercentage,
      });

      // Log success
      await prisma.notificationLog.create({
        data: {
          studentId: student.id,
          parentId: parent.id,
          channel: 'whatsapp',
          type: 'attendance_report',
          status: 'sent',
          sentTo: phone,
          mediaType: 'pdf',
          sentBy: req.user!.userId,
        },
      });

      results.push({ parentName: parent.name, phone, status: 'sent' });
    } catch (err) {
      const errMsg = parseWhatsAppError(err);
      console.error(`Failed to send WhatsApp to ${parent.name} (${phone}):`, errMsg);

      // Try fallback: send as plain document (within 24-hour window)
      try {
        await sendDocument(
          phone,
          mediaId,
          `attendance_${student.enrollmentNo}.pdf`,
          `Attendance Report for ${student.firstName} ${student.lastName} (${student.enrollmentNo}) — Overall: ${overallPercentage}%`,
        );

        await prisma.notificationLog.create({
          data: {
            studentId: student.id,
            parentId: parent.id,
            channel: 'whatsapp',
            type: 'attendance_report',
            status: 'sent',
            sentTo: phone,
            mediaType: 'pdf',
            sentBy: req.user!.userId,
          },
        });

        results.push({ parentName: parent.name, phone, status: 'sent' });
      } catch (fallbackErr) {
        const fallbackMsg = parseWhatsAppError(fallbackErr);

        await prisma.notificationLog.create({
          data: {
            studentId: student.id,
            parentId: parent.id,
            channel: 'whatsapp',
            type: 'attendance_report',
            status: 'failed',
            sentTo: phone,
            mediaType: 'pdf',
            errorMsg: fallbackMsg,
            sentBy: req.user!.userId,
          },
        });

        results.push({ parentName: parent.name, phone, status: 'failed', error: fallbackMsg });
      }
    }
  }

  res.json({
    student: `${student.firstName} ${student.lastName}`,
    overallAttendance: `${overallPercentage}%`,
    results,
  });
});

// ═══════════════════════════════════════════════════════
// POST /api/whatsapp/send-attendance-bulk
// Send attendance reports for multiple students
// ═══════════════════════════════════════════════════════
router.post('/send-attendance-bulk', async (req: Request, res: Response): Promise<void> => {
  const { sectionId, studentIds } = req.body;

  if (!isWhatsAppConfigured()) {
    res.status(503).json({ error: 'WhatsApp API is not configured' });
    return;
  }

  // Admin-only for bulk
  if (req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Only admins can send bulk attendance reports' });
    return;
  }

  if (!sectionId && (!studentIds || studentIds.length === 0)) {
    res.status(400).json({ error: 'Either sectionId or studentIds is required' });
    return;
  }

  // Get students
  const where: any = { deletedAt: null };
  if (sectionId) where.sectionId = sectionId;
  if (studentIds && studentIds.length > 0) where.id = { in: studentIds };

  const students = await prisma.student.findMany({
    where,
    include: {
      batch: { select: { name: true, degree: true, department: { select: { name: true } } } },
      section: { select: { name: true } },
      parents: true,
      attendance: {
        include: { course: { select: { code: true, name: true } } },
      },
    },
  });

  let totalSent = 0;
  let totalFailed = 0;
  const details: Array<{
    studentName: string;
    enrollmentNo: string;
    parentsSent: number;
    parentsFailed: number;
  }> = [];

  for (const student of students) {
    if (student.parents.length === 0 || student.attendance.length === 0) {
      details.push({
        studentName: `${student.firstName} ${student.lastName}`,
        enrollmentNo: student.enrollmentNo,
        parentsSent: 0,
        parentsFailed: 0,
      });
      continue;
    }

    // Build attendance data
    const courseMap: Record<string, any> = {};
    let overallPresent = 0;
    let overallTotal = 0;

    student.attendance.forEach((a) => {
      if (!courseMap[a.courseId]) {
        courseMap[a.courseId] = {
          courseCode: a.course.code,
          courseName: a.course.name,
          total: 0, present: 0, absent: 0, late: 0, percentage: '0',
        };
      }
      courseMap[a.courseId].total++;
      overallTotal++;
      if (a.status === 'present') { courseMap[a.courseId].present++; overallPresent++; }
      else if (a.status === 'absent') courseMap[a.courseId].absent++;
      else if (a.status === 'late') courseMap[a.courseId].late++;
    });

    const courses = Object.values(courseMap).map((c: any) => ({
      ...c,
      percentage: c.total > 0 ? ((c.present / c.total) * 100).toFixed(1) : '0.0',
    }));

    const overallPercentage = overallTotal > 0
      ? ((overallPresent / overallTotal) * 100).toFixed(1)
      : '0.0';

    // Generate PDF
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateAttendancePDF({
        studentName: `${student.firstName} ${student.lastName}`,
        enrollmentNo: student.enrollmentNo,
        batchName: student.batch.name,
        sectionName: student.section.name,
        semester: student.semester,
        degree: student.batch.degree,
        departmentName: student.batch.department.name,
        courses,
        overallPresent,
        overallTotal,
        overallPercentage,
      });
    } catch {
      continue;
    }

    // Upload PDF
    let mediaId: string;
    try {
      mediaId = await uploadMedia(pdfBuffer, 'application/pdf', `attendance_${student.enrollmentNo}.pdf`);
    } catch {
      continue;
    }

    let studentSent = 0;
    let studentFailed = 0;

    // Send to each parent
    for (const parent of student.parents) {
      const phone = formatPhoneNumber(parent.phone);
      try {
        await sendTemplateWithDocument(phone, mediaId, `attendance_${student.enrollmentNo}.pdf`, {
          parentName: parent.name,
          studentName: `${student.firstName} ${student.lastName}`,
          enrollmentNo: student.enrollmentNo,
          attendancePct: overallPercentage,
        });
        await prisma.notificationLog.create({
          data: {
            studentId: student.id, parentId: parent.id, channel: 'whatsapp',
            type: 'attendance_report', status: 'sent', sentTo: phone,
            mediaType: 'pdf', sentBy: req.user!.userId,
          },
        });
        studentSent++;
        totalSent++;
      } catch (err) {
        // Fallback to plain document
        try {
          await sendDocument(phone, mediaId, `attendance_${student.enrollmentNo}.pdf`,
            `Attendance Report: ${student.firstName} ${student.lastName} — ${overallPercentage}%`);
          await prisma.notificationLog.create({
            data: {
              studentId: student.id, parentId: parent.id, channel: 'whatsapp',
              type: 'attendance_report', status: 'sent', sentTo: phone,
              mediaType: 'pdf', sentBy: req.user!.userId,
            },
          });
          studentSent++;
          totalSent++;
        } catch (fallbackErr) {
          await prisma.notificationLog.create({
            data: {
              studentId: student.id, parentId: parent.id, channel: 'whatsapp',
              type: 'attendance_report', status: 'failed', sentTo: phone,
              mediaType: 'pdf', errorMsg: parseWhatsAppError(fallbackErr),
              sentBy: req.user!.userId,
            },
          });
          studentFailed++;
          totalFailed++;
        }
      }
    }

    details.push({
      studentName: `${student.firstName} ${student.lastName}`,
      enrollmentNo: student.enrollmentNo,
      parentsSent: studentSent,
      parentsFailed: studentFailed,
    });
  }

  res.json({
    totalStudents: students.length,
    totalMessagesSent: totalSent,
    totalFailed,
    details,
  });
});

// ═══════════════════════════════════════════════════════
// GET /api/whatsapp/notification-logs — view sent notifications
// ═══════════════════════════════════════════════════════
router.get('/notification-logs', async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(qs(req.query.page) || '1');
  const limit = parseInt(qs(req.query.limit) || '30');
  const status = qs(req.query.status);
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.status = status;

  const [logs, total] = await Promise.all([
    prisma.notificationLog.findMany({
      where,
      include: {
        student: { select: { firstName: true, lastName: true, enrollmentNo: true } },
        parent: { select: { name: true, relation: true, phone: true } },
      },
      orderBy: { sentAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notificationLog.count({ where }),
  ]);

  res.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
});

export default router;
