import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import PDFDocument from 'pdfkit';

const router = Router();
const prisma = new PrismaClient();

/** Safely extract a single string from req.query */
function qs(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

// Reports accessible by admin and teacher
router.use(authenticate);
router.use(authorize('admin', 'teacher'));

// ─── Helper: Convert array of objects to CSV string ──
function toCSV(data: Record<string, any>[], fields: string[]): string {
  const header = fields.join(',');
  const rows = data.map(row =>
    fields.map(f => {
      const val = row[f] ?? '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

// ─── Helper: Create styled PDF table ─────────────────
function createPDFTable(
  doc: PDFKit.PDFDocument,
  title: string,
  subtitle: string,
  headers: string[],
  rows: string[][],
  columnWidths?: number[]
) {
  // Header with branding
  doc.fontSize(20).fillColor('#1f2937').text('N.E.S.I.A.S', { align: 'center' });
  doc.fontSize(10).fillColor('#6b7280').text('Student Tracking System', { align: 'center' });
  doc.moveDown(0.5);

  // Title
  doc.fontSize(16).fillColor('#0ea5e9').text(title, { align: 'center' });
  doc.fontSize(9).fillColor('#9ca3af').text(subtitle, { align: 'center' });
  doc.moveDown(1);

  // Table
  const startX = 40;
  let y = doc.y;
  const colCount = headers.length;
  const pageWidth = doc.page.width - 80;
  const colW = columnWidths || headers.map(() => pageWidth / colCount);
  const rowHeight = 22;

  // Header row
  doc.rect(startX, y, pageWidth, rowHeight).fill('#f0f9ff');
  let x = startX;
  headers.forEach((h, i) => {
    doc.fontSize(8).fillColor('#374151').text(h, x + 4, y + 6, { width: colW[i] - 8 });
    x += colW[i];
  });
  y += rowHeight;

  // Data rows
  rows.forEach((row, rowIdx) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 40;
    }
    if (rowIdx % 2 === 1) {
      doc.rect(startX, y, pageWidth, rowHeight).fill('#f9fafb');
    }
    x = startX;
    row.forEach((cell, i) => {
      doc.fontSize(7).fillColor('#4b5563').text(cell ?? '', x + 4, y + 6, { width: colW[i] - 8 });
      x += colW[i];
    });
    y += rowHeight;
  });

  // Line under table
  doc.moveTo(startX, y).lineTo(startX + pageWidth, y).strokeColor('#e5e7eb').stroke();

  // Footer
  doc.moveDown(2);
  doc.fontSize(7).fillColor('#9ca3af').text(
    `Generated on ${new Date().toLocaleString()} — STS Reports`,
    { align: 'center' }
  );
}

// ═══════════════════════════════════════════════════════
// GET /api/reports/student-performance
// ═══════════════════════════════════════════════════════
router.get('/student-performance', async (req: Request, res: Response): Promise<void> => {
  const batchId = qs(req.query.batchId);
  const sectionId = qs(req.query.sectionId);
  const semester = qs(req.query.semester);
  const academicYear = qs(req.query.academicYear);
  const format = qs(req.query.format) || 'csv';

  // Build student filter
  const studentWhere: any = { deletedAt: null };
  if (batchId) studentWhere.batchId = batchId;
  if (sectionId) studentWhere.sectionId = sectionId;

  // If teacher, scope to assigned sections
  if (req.user!.role === 'teacher') {
    const staff = await prisma.staff.findFirst({ where: { userId: req.user!.userId, deletedAt: null } });
    if (!staff) { res.status(403).json({ error: 'Staff profile not found' }); return; }
    const assignments = await prisma.classAssignment.findMany({
      where: { staffId: staff.id },
      select: { sectionId: true },
    });
    const sectionIds = [...new Set(assignments.map(a => a.sectionId))];
    if (sectionId && !sectionIds.includes(sectionId)) {
      res.status(403).json({ error: 'Not assigned to this section' }); return;
    }
    studentWhere.sectionId = sectionId ? sectionId : { in: sectionIds };
  }

  const students = await prisma.student.findMany({
    where: studentWhere,
    include: {
      batch: { select: { name: true, degree: true } },
      section: { select: { name: true } },
      marks: {
        where: {
          ...(semester ? { semester: parseInt(semester) } : {}),
          ...(academicYear ? { academicYear } : {}),
        },
        include: { course: { select: { code: true, name: true } } },
      },
    },
    orderBy: { enrollmentNo: 'asc' },
  });

  // Build report data
  const reportData = students.map(s => {
    const totalMarks = s.marks.reduce((sum, m) => sum + Number(m.marksObtained), 0);
    const totalMax = s.marks.reduce((sum, m) => sum + Number(m.maxMarks), 0);
    const percentage = totalMax > 0 ? ((totalMarks / totalMax) * 100).toFixed(2) : 'N/A';
    return {
      'Enrollment No': s.enrollmentNo,
      'Name': `${s.firstName} ${s.lastName}`,
      'Batch': s.batch.name,
      'Section': s.section.name,
      'Semester': s.semester,
      'Total Marks': totalMarks,
      'Max Marks': totalMax,
      'Percentage': percentage,
      'Assessments Count': s.marks.length,
    };
  });

  if (format === 'pdf') {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="student-performance.pdf"');
    doc.pipe(res);

    const fields = ['Enrollment No', 'Name', 'Batch', 'Section', 'Semester', 'Total Marks', 'Max Marks', 'Percentage'];
    const widths = [80, 90, 60, 50, 50, 60, 55, 60];
    createPDFTable(
      doc,
      'Student Performance Report',
      `Generated: ${new Date().toLocaleDateString()} ${semester ? `| Semester ${semester}` : ''} ${academicYear ? `| AY ${academicYear}` : ''}`,
      fields,
      reportData.map(r => fields.map(f => String(r[f as keyof typeof r]))),
      widths
    );
    doc.end();
    return;
  }

  // CSV
  const fields = ['Enrollment No', 'Name', 'Batch', 'Section', 'Semester', 'Total Marks', 'Max Marks', 'Percentage', 'Assessments Count'];
  const csv = toCSV(reportData, fields);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="student-performance.csv"');
  res.send(csv);
});

// ═══════════════════════════════════════════════════════
// GET /api/reports/attendance
// ═══════════════════════════════════════════════════════
router.get('/attendance', async (req: Request, res: Response): Promise<void> => {
  const batchId = qs(req.query.batchId);
  const sectionId = qs(req.query.sectionId);
  const courseId = qs(req.query.courseId);
  const format = qs(req.query.format) || 'csv';

  const studentWhere: any = { deletedAt: null };
  if (batchId) studentWhere.batchId = batchId;
  if (sectionId) studentWhere.sectionId = sectionId;

  // Teacher scoping
  if (req.user!.role === 'teacher') {
    const staff = await prisma.staff.findFirst({ where: { userId: req.user!.userId, deletedAt: null } });
    if (!staff) { res.status(403).json({ error: 'Staff profile not found' }); return; }
    const assignments = await prisma.classAssignment.findMany({
      where: { staffId: staff.id },
      select: { sectionId: true },
    });
    const sectionIds = [...new Set(assignments.map(a => a.sectionId))];
    studentWhere.sectionId = sectionId ? sectionId : { in: sectionIds };
  }

  const students = await prisma.student.findMany({
    where: studentWhere,
    include: {
      batch: { select: { name: true } },
      section: { select: { name: true } },
      attendance: {
        where: courseId ? { courseId } : {},
        include: { course: { select: { code: true, name: true } } },
      },
    },
    orderBy: { enrollmentNo: 'asc' },
  });

  const reportData = students.map(s => {
    const total = s.attendance.length;
    const present = s.attendance.filter(a => a.status === 'present').length;
    const absent = s.attendance.filter(a => a.status === 'absent').length;
    const late = s.attendance.filter(a => a.status === 'late').length;
    const pct = total > 0 ? ((present / total) * 100).toFixed(2) : 'N/A';
    return {
      'Enrollment No': s.enrollmentNo,
      'Name': `${s.firstName} ${s.lastName}`,
      'Batch': s.batch.name,
      'Section': s.section.name,
      'Total Classes': total,
      'Present': present,
      'Absent': absent,
      'Late': late,
      'Attendance %': pct,
    };
  });

  if (format === 'pdf') {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.pdf"');
    doc.pipe(res);
    const fields = ['Enrollment No', 'Name', 'Batch', 'Section', 'Total Classes', 'Present', 'Absent', 'Late', 'Attendance %'];
    const widths = [80, 90, 55, 45, 55, 45, 45, 35, 60];
    createPDFTable(doc, 'Attendance Report',
      `Generated: ${new Date().toLocaleDateString()}`,
      fields,
      reportData.map(r => fields.map(f => String(r[f as keyof typeof r]))),
      widths
    );
    doc.end();
    return;
  }

  const fields = ['Enrollment No', 'Name', 'Batch', 'Section', 'Total Classes', 'Present', 'Absent', 'Late', 'Attendance %'];
  const csv = toCSV(reportData, fields);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.csv"');
  res.send(csv);
});

// ═══════════════════════════════════════════════════════
// GET /api/reports/marks
// ═══════════════════════════════════════════════════════
router.get('/marks', async (req: Request, res: Response): Promise<void> => {
  const batchId = qs(req.query.batchId);
  const sectionId = qs(req.query.sectionId);
  const courseId = qs(req.query.courseId);
  const semester = qs(req.query.semester);
  const academicYear = qs(req.query.academicYear);
  const format = qs(req.query.format) || 'csv';

  const marksWhere: any = {};
  if (courseId) marksWhere.courseId = courseId;
  if (semester) marksWhere.semester = parseInt(semester);
  if (academicYear) marksWhere.academicYear = academicYear;

  // Student scoping
  const studentWhere: any = { deletedAt: null };
  if (batchId) studentWhere.batchId = batchId;
  if (sectionId) studentWhere.sectionId = sectionId;

  if (req.user!.role === 'teacher') {
    const staff = await prisma.staff.findFirst({ where: { userId: req.user!.userId, deletedAt: null } });
    if (!staff) { res.status(403).json({ error: 'Staff profile not found' }); return; }
    const assignments = await prisma.classAssignment.findMany({
      where: { staffId: staff.id },
      select: { sectionId: true },
    });
    const sectionIds = [...new Set(assignments.map(a => a.sectionId))];
    studentWhere.sectionId = sectionId ? sectionId : { in: sectionIds };
  }

  const studentIds = (await prisma.student.findMany({ where: studentWhere, select: { id: true } }))
    .map(s => s.id);
  marksWhere.studentId = { in: studentIds };

  const marks = await prisma.mark.findMany({
    where: marksWhere,
    include: {
      student: { select: { enrollmentNo: true, firstName: true, lastName: true } },
      course: { select: { code: true, name: true } },
    },
    orderBy: [{ student: { enrollmentNo: 'asc' } }, { course: { code: 'asc' } }],
  });

  const reportData = marks.map(m => ({
    'Enrollment No': m.student.enrollmentNo,
    'Student Name': `${m.student.firstName} ${m.student.lastName}`,
    'Course Code': m.course.code,
    'Course Name': m.course.name,
    'Assessment Type': m.assessmentType,
    'Marks Obtained': Number(m.marksObtained),
    'Max Marks': Number(m.maxMarks),
    'Percentage': ((Number(m.marksObtained) / Number(m.maxMarks)) * 100).toFixed(2),
    'Semester': m.semester,
    'Academic Year': m.academicYear,
    'Remarks': m.remarks || '',
  }));

  if (format === 'pdf') {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="marks-report.pdf"');
    doc.pipe(res);
    const fields = ['Enrollment No', 'Student Name', 'Course Code', 'Assessment Type', 'Marks Obtained', 'Max Marks', 'Percentage', 'Semester'];
    const widths = [90, 100, 80, 90, 80, 70, 70, 60];
    createPDFTable(doc, 'Marks Report',
      `Generated: ${new Date().toLocaleDateString()} ${semester ? `| Sem ${semester}` : ''} ${academicYear ? `| AY ${academicYear}` : ''}`,
      fields,
      reportData.map(r => fields.map(f => String(r[f as keyof typeof r]))),
      widths
    );
    doc.end();
    return;
  }

  const fields = ['Enrollment No', 'Student Name', 'Course Code', 'Course Name', 'Assessment Type', 'Marks Obtained', 'Max Marks', 'Percentage', 'Semester', 'Academic Year', 'Remarks'];
  const csv = toCSV(reportData, fields);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="marks-report.csv"');
  res.send(csv);
});

// ═══════════════════════════════════════════════════════
// GET /api/reports/batch-summary
// ═══════════════════════════════════════════════════════
router.get('/batch-summary', async (req: Request, res: Response): Promise<void> => {
  const format = qs(req.query.format) || 'csv';

  const batches = await prisma.batch.findMany({
    where: { deletedAt: null },
    include: {
      department: { select: { name: true } },
      _count: { select: { students: true, sections: true } },
      students: {
        where: { deletedAt: null },
        select: {
          status: true,
          marks: { select: { marksObtained: true, maxMarks: true } },
          attendance: { select: { status: true } },
        },
      },
    },
    orderBy: { startYear: 'desc' },
  });

  const reportData = batches.map(b => {
    const active = b.students.filter(s => s.status === 'active').length;
    const totalMarks = b.students.reduce((sum, s) =>
      sum + s.marks.reduce((ms, m) => ms + Number(m.marksObtained), 0), 0);
    const totalMax = b.students.reduce((sum, s) =>
      sum + s.marks.reduce((ms, m) => ms + Number(m.maxMarks), 0), 0);
    const avgPct = totalMax > 0 ? ((totalMarks / totalMax) * 100).toFixed(2) : 'N/A';
    const totalAttendance = b.students.reduce((sum, s) => sum + s.attendance.length, 0);
    const totalPresent = b.students.reduce((sum, s) =>
      sum + s.attendance.filter(a => a.status === 'present').length, 0);
    const attendPct = totalAttendance > 0 ? ((totalPresent / totalAttendance) * 100).toFixed(2) : 'N/A';

    return {
      'Batch': b.name,
      'Department': b.department.name,
      'Degree': b.degree,
      'Duration': `${b.startYear}-${b.endYear}`,
      'Total Students': b._count.students,
      'Active Students': active,
      'Sections': b._count.sections,
      'Avg Performance %': avgPct,
      'Avg Attendance %': attendPct,
    };
  });

  if (format === 'pdf') {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="batch-summary.pdf"');
    doc.pipe(res);
    const fields = ['Batch', 'Department', 'Degree', 'Duration', 'Total Students', 'Active Students', 'Sections', 'Avg Performance %', 'Avg Attendance %'];
    const widths = [80, 90, 60, 65, 75, 75, 55, 90, 90];
    createPDFTable(doc, 'Batch Summary Report',
      `Generated: ${new Date().toLocaleDateString()}`,
      fields,
      reportData.map(r => fields.map(f => String(r[f as keyof typeof r]))),
      widths
    );
    doc.end();
    return;
  }

  const fields = ['Batch', 'Department', 'Degree', 'Duration', 'Total Students', 'Active Students', 'Sections', 'Avg Performance %', 'Avg Attendance %'];
  const csv = toCSV(reportData, fields);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="batch-summary.csv"');
  res.send(csv);
});

// ═══════════════════════════════════════════════════════
// GET /api/reports/analytics-data — aggregated data for charts
// ═══════════════════════════════════════════════════════
router.get('/analytics-data', async (req: Request, res: Response): Promise<void> => {
  // 1. Average marks per course
  const courses = await prisma.course.findMany({
    where: { deletedAt: null },
    include: {
      marks: { select: { marksObtained: true, maxMarks: true } },
    },
  });
  const coursePerformance = courses.map(c => ({
    name: c.code,
    fullName: c.name,
    avgPercentage: c.marks.length > 0
      ? parseFloat(((c.marks.reduce((s, m) => s + Number(m.marksObtained), 0) /
          c.marks.reduce((s, m) => s + Number(m.maxMarks), 0)) * 100).toFixed(1))
      : 0,
    totalStudents: c.marks.length,
  })).filter(c => c.totalStudents > 0);

  // 2. Attendance trend (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const attendanceRecords = await prisma.attendance.findMany({
    where: { date: { gte: sixMonthsAgo } },
    select: { date: true, status: true },
  });
  const monthMap: Record<string, { total: number; present: number }> = {};
  attendanceRecords.forEach(a => {
    const key = `${a.date.getFullYear()}-${String(a.date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[key]) monthMap[key] = { total: 0, present: 0 };
    monthMap[key].total++;
    if (a.status === 'present') monthMap[key].present++;
  });
  const attendanceTrend = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      attendanceRate: parseFloat(((data.present / data.total) * 100).toFixed(1)),
      totalRecords: data.total,
    }));

  // 3. Student status distribution
  const statusCounts = await prisma.student.groupBy({
    by: ['status'],
    where: { deletedAt: null },
    _count: true,
  });
  const statusDistribution = statusCounts.map(s => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s._count,
  }));

  // 4. Batch-wise performance
  const batches = await prisma.batch.findMany({
    where: { deletedAt: null },
    include: {
      students: {
        where: { deletedAt: null },
        select: {
          marks: { select: { marksObtained: true, maxMarks: true } },
        },
      },
    },
  });
  const batchPerformance = batches.map(b => {
    const totalMarks = b.students.reduce((sum, s) =>
      sum + s.marks.reduce((ms, m) => ms + Number(m.marksObtained), 0), 0);
    const totalMax = b.students.reduce((sum, s) =>
      sum + s.marks.reduce((ms, m) => ms + Number(m.maxMarks), 0), 0);
    return {
      name: b.name,
      avgPercentage: totalMax > 0 ? parseFloat(((totalMarks / totalMax) * 100).toFixed(1)) : 0,
      studentCount: b.students.length,
    };
  }).filter(b => b.studentCount > 0);

  res.json({
    coursePerformance,
    attendanceTrend,
    statusDistribution,
    batchPerformance,
  });
});

export default router;
