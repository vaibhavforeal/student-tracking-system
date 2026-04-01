import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

const router = Router();
const prisma = new PrismaClient();

// Initialize Gemini
const genAI = config.geminiApiKey
  ? new GoogleGenerativeAI(config.geminiApiKey)
  : null;

// AI routes accessible by admin only
router.use(authenticate);
router.use(authorize('admin'));

/** Helper: call Gemini API for analysis */
async function analyzeWithGemini(prompt: string): Promise<string> {
  if (!genAI) {
    return 'Gemini API key is not configured. Please add GEMINI_API_KEY to your .env file to enable AI analytics.';
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error: any) {
    console.error('Gemini API error:', error.message, error.status || '');
    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
      return '⚠️ **Rate Limit Exceeded**\n\nYour Gemini API free tier quota has been exceeded. Please wait a minute and try again, or upgrade to a paid plan at https://aistudio.google.com for higher limits.';
    }
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('401')) {
      return '⚠️ **Invalid API Key**\n\nThe Gemini API key is invalid. Please check your GEMINI_API_KEY in the .env file and restart the backend server.';
    }
    if (error.message?.includes('fetch failed') || error.message?.includes('ENOTFOUND')) {
      return '⚠️ **Network Error**\n\nCould not connect to the Gemini API. Please check your internet connection and try again.';
    }
    return `⚠️ **AI Analysis Failed**\n\n${error.message}. Please try again later.`;
  }
}

// ═══════════════════════════════════════════════════════
// POST /api/ai/performance-trend
// Analyze a student's or batch's performance trend
// ═══════════════════════════════════════════════════════
router.post('/performance-trend', async (req: Request, res: Response): Promise<void> => {
  const { studentId, batchId } = req.body;

  let data: any;
  let context: string;

  if (studentId) {
    // Single student analysis
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        batch: { select: { name: true, degree: true } },
        section: { select: { name: true } },
        marks: {
          include: { course: { select: { code: true, name: true } } },
          orderBy: [{ semester: 'asc' }, { createdAt: 'asc' }],
        },
        attendance: {
          select: { status: true, date: true },
        },
      },
    });

    if (!student) { res.status(404).json({ error: 'Student not found' }); return; }

    const totalAttendance = student.attendance.length;
    const presentCount = student.attendance.filter(a => a.status === 'present').length;

    data = {
      name: `${student.firstName} ${student.lastName}`,
      enrollmentNo: student.enrollmentNo,
      batch: student.batch.name,
      section: student.section.name,
      semester: student.semester,
      marks: student.marks.map(m => ({
        course: `${m.course.code} - ${m.course.name}`,
        type: m.assessmentType,
        obtained: Number(m.marksObtained),
        max: Number(m.maxMarks),
        percentage: ((Number(m.marksObtained) / Number(m.maxMarks)) * 100).toFixed(1),
        semester: m.semester,
      })),
      attendanceRate: totalAttendance > 0 ? ((presentCount / totalAttendance) * 100).toFixed(1) : 'No data',
    };

    context = `Analyze the performance trend of student "${data.name}" (${data.enrollmentNo}), currently in semester ${data.semester}, batch ${data.batch}, section ${data.section}.`;
  } else {
    // Batch-level analysis
    const batchFilter = batchId ? { batchId } : {};
    const students = await prisma.student.findMany({
      where: { deletedAt: null, ...batchFilter },
      include: {
        marks: { select: { marksObtained: true, maxMarks: true, semester: true, assessmentType: true } },
        attendance: { select: { status: true } },
      },
    });

    data = {
      totalStudents: students.length,
      avgMarks: students.map(s => {
        const total = s.marks.reduce((sum, m) => sum + Number(m.marksObtained), 0);
        const max = s.marks.reduce((sum, m) => sum + Number(m.maxMarks), 0);
        return max > 0 ? (total / max) * 100 : null;
      }).filter(v => v !== null),
    };

    context = `Analyze the overall performance trend of ${data.totalStudents} students ${batchId ? 'in this batch' : 'across all batches'}.`;
  }

  const prompt = `You are an academic analytics assistant for a college. ${context}

Here is the student data in JSON format:
${JSON.stringify(data, null, 2)}

Please provide:
1. **Performance Summary**: Overall assessment of the student/batch performance
2. **Trend Analysis**: Whether marks are improving, declining, or stable across semesters/assessments
3. **Strengths**: Subjects or areas where performance is strong
4. **Areas for Improvement**: Subjects or areas needing attention
5. **Recommendations**: Actionable suggestions for improvement

Keep the analysis concise, professional, and data-driven. Use bullet points where appropriate. Format your response in markdown.`;

  const analysis = await analyzeWithGemini(prompt);

  res.json({
    type: 'performance_trend',
    analysis,
    generatedAt: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════════════
// POST /api/ai/at-risk-students
// Identify students who may be at risk of failing
// ═══════════════════════════════════════════════════════
router.post('/at-risk-students', async (req: Request, res: Response): Promise<void> => {
  const { batchId, sectionId } = req.body;

  const where: any = { deletedAt: null, status: 'active' };
  if (batchId) where.batchId = batchId;
  if (sectionId) where.sectionId = sectionId;

  const students = await prisma.student.findMany({
    where,
    include: {
      batch: { select: { name: true } },
      section: { select: { name: true } },
      marks: {
        select: { marksObtained: true, maxMarks: true, assessmentType: true },
        include: { course: { select: { code: true, name: true } } },
      },
      attendance: { select: { status: true } },
    },
    orderBy: { enrollmentNo: 'asc' },
  });

  // Pre-compute risk indicators
  const riskData = students.map(s => {
    const totalMarks = s.marks.reduce((sum, m) => sum + Number(m.marksObtained), 0);
    const totalMax = s.marks.reduce((sum, m) => sum + Number(m.maxMarks), 0);
    const marksPercentage = totalMax > 0 ? (totalMarks / totalMax) * 100 : null;
    const totalAttendance = s.attendance.length;
    const present = s.attendance.filter(a => a.status === 'present').length;
    const attendanceRate = totalAttendance > 0 ? (present / totalAttendance) * 100 : null;

    // Flag as potentially at risk if marks < 40% or attendance < 75%
    const isAtRisk = (marksPercentage !== null && marksPercentage < 40) ||
                     (attendanceRate !== null && attendanceRate < 75);

    return {
      name: `${s.firstName} ${s.lastName}`,
      enrollmentNo: s.enrollmentNo,
      batch: s.batch.name,
      section: s.section.name,
      semester: s.semester,
      marksPercentage: marksPercentage ? parseFloat(marksPercentage.toFixed(1)) : 'No data',
      attendanceRate: attendanceRate ? parseFloat(attendanceRate.toFixed(1)) : 'No data',
      isAtRisk,
      weakSubjects: s.marks
        .filter(m => (Number(m.marksObtained) / Number(m.maxMarks)) * 100 < 40)
        .map(m => m.course.code),
    };
  });

  const atRiskStudents = riskData.filter(s => s.isAtRisk);

  const prompt = `You are an academic analytics assistant for a college. Analyze the following student data and identify students at risk of academic failure.

At-Risk Students (marks < 40% or attendance < 75%):
${JSON.stringify(atRiskStudents, null, 2)}

Total students analyzed: ${students.length}
Students flagged at risk: ${atRiskStudents.length}

Please provide:
1. **Risk Summary**: Overview of the at-risk situation
2. **Critical Cases**: Students needing immediate intervention (list by name and enrollment number)
3. **Common Patterns**: Shared characteristics among at-risk students
4. **Intervention Strategies**: Specific, actionable recommendations for each risk category
5. **Early Warning Indicators**: Signs to watch for in other students

Format your response in markdown. Be specific and data-driven.`;

  const analysis = await analyzeWithGemini(prompt);

  res.json({
    type: 'at_risk_students',
    summary: {
      totalAnalyzed: students.length,
      atRiskCount: atRiskStudents.length,
      riskPercentage: ((atRiskStudents.length / students.length) * 100).toFixed(1),
    },
    atRiskStudents: atRiskStudents.slice(0, 20), // Return top 20 for the UI table
    analysis,
    generatedAt: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════════════
// POST /api/ai/class-comparison
// Compare performance across sections or batches
// ═══════════════════════════════════════════════════════
router.post('/class-comparison', async (req: Request, res: Response): Promise<void> => {
  const sections = await prisma.section.findMany({
    where: { deletedAt: null },
    include: {
      batch: { select: { name: true, degree: true } },
      students: {
        where: { deletedAt: null },
        select: {
          marks: { select: { marksObtained: true, maxMarks: true } },
          attendance: { select: { status: true } },
        },
      },
    },
  });

  const comparisonData = sections.map(s => {
    const studentCount = s.students.length;
    const allMarks = s.students.flatMap(st => st.marks);
    const totalObtained = allMarks.reduce((sum, m) => sum + Number(m.marksObtained), 0);
    const totalMax = allMarks.reduce((sum, m) => sum + Number(m.maxMarks), 0);
    const avgPerformance = totalMax > 0 ? parseFloat(((totalObtained / totalMax) * 100).toFixed(1)) : 0;

    const allAttendance = s.students.flatMap(st => st.attendance);
    const totalPresent = allAttendance.filter(a => a.status === 'present').length;
    const avgAttendance = allAttendance.length > 0
      ? parseFloat(((totalPresent / allAttendance.length) * 100).toFixed(1)) : 0;

    return {
      section: s.name,
      batch: s.batch.name,
      degree: s.batch.degree,
      studentCount,
      avgPerformance,
      avgAttendance,
      totalAssessments: allMarks.length,
    };
  }).filter(s => s.studentCount > 0);

  const prompt = `You are an academic analytics assistant for a college. Compare the performance of different class sections.

Section-wise Performance Data:
${JSON.stringify(comparisonData, null, 2)}

Please provide:
1. **Comparison Overview**: Which sections are performing best and worst
2. **Performance Rankings**: Rank sections by academic performance and attendance
3. **Gap Analysis**: Identify significant performance gaps between sections
4. **Recommendations**: Suggestions for underperforming sections
5. **Best Practices**: What top-performing sections might be doing differently

Format your response in markdown with tables where appropriate. Be concise and actionable.`;

  const analysis = await analyzeWithGemini(prompt);

  res.json({
    type: 'class_comparison',
    comparisonData,
    analysis,
    generatedAt: new Date().toISOString(),
  });
});

export default router;
