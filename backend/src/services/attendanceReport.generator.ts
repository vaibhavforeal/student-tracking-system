/**
 * Attendance Report PDF Generator
 * Generates a per-student attendance PDF buffer using pdfkit.
 */
import PDFDocument from 'pdfkit';

export interface CourseAttendance {
  courseCode: string;
  courseName: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: string;
}

export interface StudentAttendanceData {
  studentName: string;
  enrollmentNo: string;
  batchName: string;
  sectionName: string;
  semester: number;
  degree: string;
  departmentName: string;
  courses: CourseAttendance[];
  overallPresent: number;
  overallTotal: number;
  overallPercentage: string;
}

/**
 * Generate a PDF buffer for a single student's attendance report.
 */
export function generateAttendancePDF(data: StudentAttendanceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ─── Header / Branding ─────────────────────
    doc.fontSize(22).fillColor('#1f2937').text('N.E.S.I.A.S', { align: 'center' });
    doc.fontSize(10).fillColor('#6b7280').text('Student Tracking System', { align: 'center' });
    doc.moveDown(0.3);

    // Title
    doc.fontSize(16).fillColor('#7c3aed').text('Attendance Report', { align: 'center' });
    doc
      .fontSize(9)
      .fillColor('#9ca3af')
      .text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, { align: 'center' });
    doc.moveDown(0.8);

    // ─── Student Info Card ─────────────────────
    const infoBoxY = doc.y;
    const pageWidth = doc.page.width - 80;
    doc.rect(40, infoBoxY, pageWidth, 70).fill('#f5f3ff').stroke();

    doc.fontSize(12).fillColor('#374151');
    doc.text(`Student: ${data.studentName}`, 55, infoBoxY + 10);
    doc.text(`Enrollment: ${data.enrollmentNo}`, 55, infoBoxY + 28);

    doc.fontSize(10).fillColor('#6b7280');
    doc.text(`${data.degree} • ${data.batchName} • ${data.sectionName} • Semester ${data.semester}`, 55, infoBoxY + 48);

    doc.text(`Department: ${data.departmentName}`, 320, infoBoxY + 10);

    doc.y = infoBoxY + 85;

    // ─── Attendance Table ─────────────────────
    const startX = 40;
    let y = doc.y;
    const headers = ['Course', 'Total', 'Present', 'Absent', 'Late', 'Attendance %'];
    const colW = [180, 60, 65, 60, 50, 100];
    const rowHeight = 24;

    // Table header
    doc.rect(startX, y, pageWidth, rowHeight).fill('#ede9fe');
    let x = startX;
    headers.forEach((h, i) => {
      doc.fontSize(9).fillColor('#4c1d95').text(h, x + 5, y + 7, { width: colW[i] - 10 });
      x += colW[i];
    });
    y += rowHeight;

    // Data rows
    data.courses.forEach((course, rowIdx) => {
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 40;
      }
      if (rowIdx % 2 === 0) {
        doc.rect(startX, y, pageWidth, rowHeight).fill('#faf5ff');
      }

      const pct = parseFloat(course.percentage);
      const pctColor = pct < 75 ? '#dc2626' : pct < 85 ? '#f59e0b' : '#16a34a';

      x = startX;
      const rowData = [
        `${course.courseCode} — ${course.courseName}`,
        String(course.total),
        String(course.present),
        String(course.absent),
        String(course.late),
        `${course.percentage}%`,
      ];
      rowData.forEach((cell, i) => {
        const color = i === 5 ? pctColor : '#4b5563';
        const weight = i === 5 ? 'bold' : 'normal';
        doc.fontSize(8).fillColor(color);
        if (i === 5) doc.font('Helvetica-Bold');
        else doc.font('Helvetica');
        doc.text(cell, x + 5, y + 7, { width: colW[i] - 10 });
        x += colW[i];
      });
      y += rowHeight;
    });

    // Line under table
    doc.moveTo(startX, y).lineTo(startX + pageWidth, y).strokeColor('#e5e7eb').stroke();
    y += 15;

    // ─── Overall Summary ─────────────────────
    const overallPct = parseFloat(data.overallPercentage);
    const overallColor = overallPct < 75 ? '#dc2626' : overallPct < 85 ? '#f59e0b' : '#16a34a';
    const statusEmoji = overallPct < 75 ? '⚠️' : '✅';

    doc.rect(startX, y, pageWidth, 50).fill('#f0fdf4').stroke();
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#1f2937');
    doc.text(`Overall Attendance: ${data.overallPercentage}% (${data.overallPresent}/${data.overallTotal})`, startX + 15, y + 10);

    doc.font('Helvetica').fontSize(10).fillColor(overallColor);
    const statusText = overallPct >= 75
      ? `${statusEmoji}  Attendance above 75% — Good standing`
      : `${statusEmoji}  Attendance below 75% — Requires attention`;
    doc.text(statusText, startX + 15, y + 30);

    // Low-attendance course warnings
    const lowCourses = data.courses.filter(c => parseFloat(c.percentage) < 75);
    if (lowCourses.length > 0) {
      doc.y = y + 65;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#dc2626');
      doc.text(`⚠️ Low Attendance Courses (below 75%):`, startX);
      doc.font('Helvetica').fontSize(9).fillColor('#7f1d1d');
      lowCourses.forEach(c => {
        doc.text(`  • ${c.courseCode} — ${c.courseName}: ${c.percentage}%`, startX + 10);
      });
    }

    // ─── Footer ────────────────────────────────
    doc.moveDown(3);
    doc.font('Helvetica').fontSize(7).fillColor('#9ca3af');
    doc.text(
      `This is a system-generated report from the Student Tracking System. Generated on ${new Date().toLocaleString('en-IN')}`,
      { align: 'center' },
    );

    doc.end();
  });
}
