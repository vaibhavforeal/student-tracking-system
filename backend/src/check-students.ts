import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const students = await prisma.student.findMany({
    where: { deletedAt: null },
    include: {
      batch: { include: { department: true } },
      section: true,
    }
  });
  console.log(`Total active/non-deleted students: ${students.length}`);
  students.forEach(s => {
    console.log(`- ${s.firstName} ${s.lastName} (${s.enrollmentNo}): Sem ${s.semester}, Batch: ${s.batch.name}, Dept: ${s.batch.department.code}, Sec: ${s.section.name}, Status: ${s.status}`);
  });

  const courses = await prisma.course.findMany({
    where: { deletedAt: null },
    include: {
      courseDepartments: { include: { department: true } }
    }
  });
  console.log(`\nTotal courses: ${courses.length}`);
  courses.forEach(c => {
    const semStr = c.courseDepartments.map(cd => `${cd.department.code} (Sem ${cd.semester})`).join(', ');
    console.log(`- ${c.name} (${c.code}): ${semStr}, Type: ${c.type}`);
  });

  await prisma.$disconnect();
}
check();
