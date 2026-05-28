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

// ─── System instruction to prevent hallucination ──────
const SYSTEM_INSTRUCTION = `You are an academic analytics assistant embedded in a college student management system.

CRITICAL RULES — you MUST follow these at all times:
1. ONLY reference data that is explicitly provided in the user message. NEVER invent, fabricate, or assume student names, enrollment numbers, marks, percentages, attendance figures, subject names, or any other data points.
2. If the provided data is empty or contains no records, say exactly: "There is not enough data to perform this analysis. Please ensure marks and attendance records have been entered in the system."
3. When quoting numbers, copy them exactly from the provided JSON — do not round, recalculate, or approximate unless explicitly asked.
4. Do not reference students, courses, batches, or sections that do not appear in the provided data.
5. If a field shows "No data", acknowledge it as missing — do not guess what it might be.
6. Keep your analysis grounded in the actual numbers. Every claim must be traceable to a specific data point in the input.
7. Format your response in clean markdown with headers, bullet points, and bold text for emphasis.`;

/** Helper: call Gemini API for analysis */
async function analyzeWithGemini(prompt: string): Promise<string> {
  if (!genAI) {
    return 'Gemini API key is not configured. Please add GEMINI_API_KEY to your .env file to enable AI analytics.';
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
    });
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
  try {
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

      context = `Analyze the performance trend of student "${data.name}" (Enrollment: ${data.enrollmentNo}), currently in semester ${data.semester}, batch "${data.batch}", section "${data.section}".`;
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

      const studentSummaries = students.map(s => {
        const total = s.marks.reduce((sum, m) => sum + Number(m.marksObtained), 0);
        const max = s.marks.reduce((sum, m) => sum + Number(m.maxMarks), 0);
        const presentCount = s.attendance.filter(a => a.status === 'present').length;
        return {
          name: `${s.firstName} ${s.lastName}`,
          enrollmentNo: s.enrollmentNo,
          marksPercentage: max > 0 ? parseFloat(((total / max) * 100).toFixed(1)) : null,
          totalAssessments: s.marks.length,
          attendanceRate: s.attendance.length > 0
            ? parseFloat(((presentCount / s.attendance.length) * 100).toFixed(1)) : null,
        };
      });

      data = {
        totalStudents: students.length,
        students: studentSummaries,
      };

      context = `Analyze the overall performance trend of ${data.totalStudents} students ${batchId ? 'in this batch' : 'across all batches'}.`;
    }

    // Log the actual data for debugging
    console.log(`[AI] performance-trend data: ${JSON.stringify(data).substring(0, 500)}...`);

    // Handle empty data
    if (!data.marks?.length && !data.students?.length && !data.totalStudents) {
      res.json({
        type: 'performance_trend',
        analysis: '📊 **No Data Available**\n\nThere are no marks or attendance records in the system yet. Please ensure that assessment scores and attendance have been recorded before running this analysis.',
        generatedAt: new Date().toISOString(),
      });
      return;
    }

    const prompt = `${context}

Below is the EXACT data from the database. Analyze ONLY this data — do not invent or assume any additional information:

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

Based STRICTLY on the above data, provide:
1. **Performance Summary**: Overall assessment based on the actual numbers above
2. **Trend Analysis**: Whether marks are improving, declining, or stable (only if multi-semester data exists — if not, state that trend analysis requires more data)
3. **Strengths**: Subjects/areas where performance is strong (reference actual course names and percentages from the data)
4. **Areas for Improvement**: Subjects/areas needing attention (reference actual course names and percentages)
5. **Recommendations**: Actionable suggestions based on the specific weaknesses found

IMPORTANT: Every student name, percentage, and course you mention MUST appear in the JSON above. If data is insufficient for any section, explicitly say so instead of guessing.`;

    const analysis = await analyzeWithGemini(prompt);

    res.json({
      type: 'performance_trend',
      analysis,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('AI performance-trend error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate performance trend analysis' });
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/ai/at-risk-students
// Identify students who may be at risk of failing
// ═══════════════════════════════════════════════════════
router.post('/at-risk-students', async (req: Request, res: Response): Promise<void> => {
  try {
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

    // Log for debugging
    console.log(`[AI] at-risk-students: ${students.length} total, ${atRiskStudents.length} at risk`);

    // Handle no students case
    if (students.length === 0) {
      res.json({
        type: 'at_risk_students',
        summary: { totalAnalyzed: 0, atRiskCount: 0, riskPercentage: '0.0' },
        atRiskStudents: [],
        analysis: '📊 **No Students Found**\n\nNo active students were found in the system. Please ensure students have been added and their status is set to "active".',
        generatedAt: new Date().toISOString(),
      });
      return;
    }

    // Handle no at-risk students
    if (atRiskStudents.length === 0) {
      res.json({
        type: 'at_risk_students',
        summary: {
          totalAnalyzed: students.length,
          atRiskCount: 0,
          riskPercentage: '0.0',
        },
        atRiskStudents: [],
        analysis: `✅ **No At-Risk Students Detected**\n\nAll ${students.length} active students currently meet the minimum thresholds (marks ≥ 40% and attendance ≥ 75%). No immediate intervention is needed.\n\n**Note:** Students without any marks or attendance records were not flagged. Ensure all assessments and attendance are recorded for accurate analysis.`,
        generatedAt: new Date().toISOString(),
      });
      return;
    }

    const prompt = `Analyze the following at-risk student data from our college management system.

EXACT DATA FROM DATABASE — analyze ONLY these students, do NOT invent any additional students or data points:

At-Risk Students (marks < 40% or attendance < 75%):
\`\`\`json
${JSON.stringify(atRiskStudents, null, 2)}
\`\`\`

Statistics:
- Total students analyzed: ${students.length}
- Students flagged at risk: ${atRiskStudents.length}
- Risk rate: ${((atRiskStudents.length / students.length) * 100).toFixed(1)}%

Based STRICTLY on the above data, provide:
1. **Risk Summary**: Overview using the exact numbers above (${atRiskStudents.length} out of ${students.length})
2. **Critical Cases**: List the actual students from the data above who need immediate intervention — use their EXACT names and enrollment numbers from the JSON
3. **Common Patterns**: What do the at-risk students above share? (same batch? same section? similar marks range?)
4. **Intervention Strategies**: Specific recommendations for the patterns you identified
5. **Monitoring Plan**: How to track these specific students going forward

IMPORTANT: Only mention student names that appear in the JSON. Only quote percentages that appear in the JSON. If a student has "No data" for marks or attendance, say so explicitly.`;

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
  } catch (err: any) {
    console.error('AI at-risk-students error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate at-risk analysis' });
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/ai/class-comparison
// Compare performance across sections or batches
// ═══════════════════════════════════════════════════════
router.post('/class-comparison', async (req: Request, res: Response): Promise<void> => {
  try {
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

    // Log for debugging
    console.log(`[AI] class-comparison: ${comparisonData.length} sections with data`);

    // Handle empty data
    if (comparisonData.length === 0) {
      res.json({
        type: 'class_comparison',
        comparisonData: [],
        analysis: '📊 **No Class Data Available**\n\nNo sections with active students were found. Please ensure that sections have been created, students assigned, and marks/attendance recorded.',
        generatedAt: new Date().toISOString(),
      });
      return;
    }

    const prompt = `Compare the performance of different class sections based on this data from our college management system.

EXACT DATA FROM DATABASE — compare ONLY these sections, do NOT invent any additional sections or data:

\`\`\`json
${JSON.stringify(comparisonData, null, 2)}
\`\`\`

There are exactly ${comparisonData.length} sections with data. Their names are: ${comparisonData.map(s => `"${s.section}" (${s.batch})`).join(', ')}.

Based STRICTLY on the above data, provide:
1. **Comparison Overview**: Which of these specific sections are performing best and worst — use the EXACT section names and percentages from the JSON
2. **Performance Rankings**: Rank the ${comparisonData.length} sections above by academic performance and attendance — use a markdown table with the actual numbers
3. **Gap Analysis**: What is the gap between the highest and lowest performing sections? Quote the exact percentages
4. **Recommendations**: What should underperforming sections focus on?
5. **Best Practices**: What might top-performing sections be doing well?

IMPORTANT: Only reference section names that appear in the JSON. Only quote percentages that appear in the JSON. If a section has 0% performance or attendance, note that it may indicate missing data rather than poor performance.`;

    const analysis = await analyzeWithGemini(prompt);

    res.json({
      type: 'class_comparison',
      comparisonData,
      analysis,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('AI class-comparison error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate class comparison analysis' });
  }
});

export default router;
