import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const departments = await prisma.department.findMany({ where: { deletedAt: null }, select: { id: true, name: true, code: true } });
  console.log('=== DEPARTMENTS ===');
  console.log(JSON.stringify(departments, null, 2));

  const batches = await prisma.batch.findMany({ where: { deletedAt: null }, select: { id: true, name: true, degree: true, departmentId: true, startYear: true, endYear: true } });
  console.log('\n=== BATCHES ===');
  console.log(JSON.stringify(batches, null, 2));

  const sections = await prisma.section.findMany({ where: { deletedAt: null }, select: { id: true, name: true, batchId: true } });
  console.log('\n=== SECTIONS ===');
  console.log(JSON.stringify(sections, null, 2));

  await prisma.$disconnect();
}
check();
