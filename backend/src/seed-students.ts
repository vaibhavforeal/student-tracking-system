import { PrismaClient } from '@prisma/client';
import { hashPassword } from './utils/password';

const prisma = new PrismaClient();

interface StudentEntry {
  enrollmentNo: string;
  name: string;
  phone: string;
  address: string;
  classSec: string;
  semester: number;
  gender: string;
  dob: string; // DD-MM-YYYY
}

const students: StudentEntry[] = [
  { enrollmentNo: 'U06NE24M01', name: 'Hrishikesh D K', phone: '919938378333', address: 'Shivamogga', classSec: 'IIBBA/A', semester: 3, gender: 'M', dob: '16-08-2006' },
  { enrollmentNo: 'U06NE24M02', name: 'Rithu Ekkeri', phone: '919938378334', address: 'Shivamogga', classSec: 'IIBCOM/A', semester: 2, gender: 'F', dob: '13-09-2006' },
  { enrollmentNo: 'U06NE24M03', name: 'Tarun Goyal', phone: '919938378335', address: 'Shivamogga', classSec: 'IIBCOM/B', semester: 3, gender: 'M', dob: '06-04-2006' },
  { enrollmentNo: 'U06NE24M04', name: 'Vachan G K', phone: '919938378336', address: 'Shivamogga', classSec: 'IIBBA/A', semester: 2, gender: 'M', dob: '26-05-2006' },
  { enrollmentNo: 'U06NE24M05', name: 'Nithin P', phone: '919938378337', address: 'Bhadravathi', classSec: 'IIBBA/A', semester: 3, gender: 'M', dob: '16-08-2006' },
  { enrollmentNo: 'U06NE24M06', name: 'Sathya Priya', phone: '919938378338', address: 'Bhadravathi', classSec: 'IIBBA/A', semester: 3, gender: 'F', dob: '12-09-2006' },
  { enrollmentNo: 'U06NE24M07', name: 'Seema Prakash', phone: '919938378339', address: 'Shivamogga', classSec: 'IIBBA/A', semester: 3, gender: 'F', dob: '07-04-2006' },
  { enrollmentNo: 'U06NE24M08', name: 'Tejas R', phone: '919938378340', address: 'Bhadravathi', classSec: 'IIBCOM/B', semester: 2, gender: 'M', dob: '27-05-2006' },
  { enrollmentNo: 'U06NE24M09', name: 'Priyanka P', phone: '919938378341', address: 'Bhadravathi', classSec: 'IIBCOM/A', semester: 2, gender: 'F', dob: '14-08-2006' },
  { enrollmentNo: 'U06NE24M10', name: 'Pannaga E', phone: '919938378342', address: 'Bhadravathi', classSec: 'IIBCOM/A', semester: 3, gender: 'F', dob: '10-02-2006' },
];

// Mapping Class/Sec → batch + section using existing DB IDs
// IIBBA = 2nd year BBA → Batch "BBA 2024-25"
// IIBCOM = 2nd year BCOM → Batch "B.com 2024-25"
const batchMap: Record<string, string> = {
  'IIBBA': '5340b5ed-7bec-4390-96d1-aff6af1b2917',
  'IIBCOM': '3dec26c5-b3bb-491c-b481-a5ac63de7a70',
};

const sectionMap: Record<string, string> = {
  'IIBBA/A': 'b59ab4a4-a98e-4b60-bdc3-74cf7d1007a0',
  'IIBCOM/A': '9426e3e7-cb66-414a-b014-7af5a70359a5',
  'IIBCOM/B': '10695013-c38d-4f2e-9aca-fc64705541c5',
};

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function parseDob(dobStr: string): Date {
  const [dd, mm, yyyy] = dobStr.split('-').map(Number);
  return new Date(yyyy, mm - 1, dd);
}

async function seedStudents() {
  console.log('🌱 Seeding students...\n');

  let created = 0;
  let skipped = 0;

  for (const student of students) {
    const { firstName, lastName } = parseName(student.name);
    const email = `${student.enrollmentNo.toLowerCase()}@sts.com`;
    const dob = parseDob(student.dob);

    // Password = DOB in DDMMYYYY format (matches existing student creation logic)
    const password = student.dob.replace(/-/g, '');

    const batchKey = student.classSec.split('/')[0];
    const batchId = batchMap[batchKey];
    const sectionId = sectionMap[student.classSec];

    if (!batchId || !sectionId) {
      console.error(`❌ No batch/section mapping for: ${student.classSec}`);
      continue;
    }

    const genderValue = student.gender === 'M' ? 'male' : 'female';

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && !existingUser.deletedAt) {
      console.log(`⏭️  Skipped (email exists): ${student.name} <${email}>`);
      skipped++;
      continue;
    }

    // Check if enrollment number already exists
    const existingStudent = await prisma.student.findUnique({ where: { enrollmentNo: student.enrollmentNo } });
    if (existingStudent && !existingStudent.deletedAt) {
      console.log(`⏭️  Skipped (enrollment exists): ${student.name} (${student.enrollmentNo})`);
      skipped++;
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Clean up soft-deleted conflicts
        if (existingStudent && existingStudent.deletedAt) {
          await tx.studentHealth.deleteMany({ where: { studentId: existingStudent.id } });
          await tx.studentSkill.deleteMany({ where: { studentId: existingStudent.id } });
          await tx.parent.deleteMany({ where: { studentId: existingStudent.id } });
          await tx.financialAid.deleteMany({ where: { studentId: existingStudent.id } });
          await tx.previousEducation.deleteMany({ where: { studentId: existingStudent.id } });
          await tx.studentHobby.deleteMany({ where: { studentId: existingStudent.id } });
          await tx.mark.deleteMany({ where: { studentId: existingStudent.id } });
          await tx.attendance.deleteMany({ where: { studentId: existingStudent.id } });
          await tx.student.delete({ where: { id: existingStudent.id } });
          await tx.user.delete({ where: { id: existingStudent.userId } }).catch(() => {});
        }
        if (existingUser && existingUser.deletedAt) {
          await tx.staff.deleteMany({ where: { userId: existingUser.id } });
          await tx.student.deleteMany({ where: { userId: existingUser.id } });
          await tx.user.delete({ where: { id: existingUser.id } });
        }

        const user = await tx.user.create({
          data: {
            email,
            name: student.name,
            passwordHash: await hashPassword(password),
            role: 'student',
          },
        });

        await tx.student.create({
          data: {
            enrollmentNo: student.enrollmentNo,
            userId: user.id,
            firstName,
            lastName,
            dob,
            gender: genderValue,
            phone: student.phone,
            address: student.address,
            batchId,
            sectionId,
            semester: student.semester,
            status: 'active',
          },
        });
      });

      console.log(`✅ ${student.enrollmentNo} | ${student.name} | ${student.classSec} | Sem ${student.semester} | DOB: ${student.dob} | Password: ${password}`);
      created++;
    } catch (err: any) {
      console.error(`❌ Failed: ${student.name} — ${err.message}`);
    }
  }

  console.log(`\n🎉 Done! Created: ${created}, Skipped: ${skipped}\n`);
  await prisma.$disconnect();
}

seedStudents().catch((e) => {
  console.error('❌ Seed failed:', e);
  prisma.$disconnect();
  process.exit(1);
});
