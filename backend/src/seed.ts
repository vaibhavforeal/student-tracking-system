import { PrismaClient } from '@prisma/client';
import { hashPassword } from './utils/password';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...\n');

  // ─── Default Admin User ──────────────────────────────
  const adminEmail = 'admin@sts.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await hashPassword('admin123'),
        role: 'admin',
        name: 'System Administrator',
      },
    });
    console.log(`✅ Admin user created: ${admin.email} (password: admin123)`);
  } else {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
  }

  // ─── Sample Department ───────────────────────────────
  const existingDept = await prisma.department.findUnique({ where: { code: 'CSE' } });
  if (!existingDept) {
    const dept = await prisma.department.create({
      data: { name: 'Computer Science & Engineering', code: 'CSE' },
    });
    console.log(`✅ Sample department created: ${dept.name} (${dept.code})`);

    // Sample batch
    const batch = await prisma.batch.create({
      data: {
        name: 'CSE 2024-28',
        departmentId: dept.id,
        degree: 'B.Tech',
        startYear: 2024,
        endYear: 2028,
      },
    });
    console.log(`✅ Sample batch created: ${batch.name}`);

    // Sample sections
    const sectionA = await prisma.section.create({
      data: { name: 'Section A', batchId: batch.id },
    });
    const sectionB = await prisma.section.create({
      data: { name: 'Section B', batchId: batch.id },
    });
    console.log(`✅ Sample sections created: ${sectionA.name}, ${sectionB.name}`);

    // Sample course
    const course = await prisma.course.create({
      data: {
        code: 'CS101',
        name: 'Introduction to Programming',
        credits: 4,
        semester: 1,
        type: 'theory',
        departmentId: dept.id,
      },
    });
    console.log(`✅ Sample course created: ${course.code} - ${course.name}`);
  } else {
    console.log(`ℹ️  Sample data already exists`);
  }

  console.log('\n🎉 Seeding complete!\n');
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error('❌ Seed failed:', e);
  prisma.$disconnect();
  process.exit(1);
});
