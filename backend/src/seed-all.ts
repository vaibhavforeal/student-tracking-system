import { PrismaClient } from '@prisma/client';
import { hashPassword } from './utils/password';

const prisma = new PrismaClient();

async function seedAll() {
  console.log('🌱 Starting full database recovery and seeding...\n');

  // 1. Seed Admin Users
  const adminsToSeed = [
    { email: 'admin@sts.com', name: 'System Administrator' },
    { email: 'admin@nes.com', name: 'NES Administrator' }
  ];

  for (const adminData of adminsToSeed) {
    const existingAdmin = await prisma.user.findFirst({ where: { email: { equals: adminData.email, mode: 'insensitive' } } });
    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          email: adminData.email,
          passwordHash: await hashPassword('admin123'),
          role: 'admin',
          name: adminData.name,
        },
      });
      console.log(`✅ Admin user created: ${adminData.email} (password: admin123)`);
    }
  }

  // 2. Seed Departments
  const departments = [
    { name: 'Computer Science & Engineering', code: 'CSE' },
    { name: 'Bachelor of Business Administration', code: 'BBA' },
    { name: 'Bachelor of Commerce', code: 'B.COM' },
    { name: 'Bachelor of Computer Applications', code: 'BCA' }
  ];

  const deptMap: Record<string, string> = {};
  for (const d of departments) {
    let dept = await prisma.department.findUnique({ where: { code: d.code } });
    if (!dept) {
      dept = await prisma.department.create({
        data: { name: d.name, code: d.code }
      });
      console.log(`✅ Department created: ${d.name} (${d.code})`);
    }
    deptMap[d.code] = dept.id;
  }

  // 3. Seed Batches (using the exact UUIDs expected by seed-students.ts)
  const batches = [
    {
      id: '5340b5ed-7bec-4390-96d1-aff6af1b2917',
      name: 'BBA 2024-25',
      departmentId: deptMap['BBA'],
      degree: 'BBA',
      startYear: 2024,
      endYear: 2027
    },
    {
      id: '3dec26c5-b3bb-491c-b481-a5ac63de7a70',
      name: 'B.com 2024-25',
      departmentId: deptMap['B.COM'],
      degree: 'B.Com',
      startYear: 2024,
      endYear: 2027
    },
    {
      name: 'CSE 2024-28',
      departmentId: deptMap['CSE'],
      degree: 'B.Tech',
      startYear: 2024,
      endYear: 2028
    }
  ];

  const batchMap: Record<string, string> = {};
  for (const b of batches) {
    let batch;
    if ('id' in b) {
      batch = await prisma.batch.findUnique({ where: { id: b.id } });
      if (!batch) {
        batch = await prisma.batch.create({ data: b });
        console.log(`✅ Batch created: ${b.name} (UUID: ${b.id})`);
      }
    } else {
      batch = await prisma.batch.findFirst({ where: { name: b.name } });
      if (!batch) {
        batch = await prisma.batch.create({ data: b });
        console.log(`✅ Batch created: ${b.name}`);
      }
    }
    batchMap[b.name] = batch.id;
  }

  // 4. Seed Sections (using exact UUIDs from seed-students.ts)
  const sections = [
    {
      id: 'b59ab4a4-a98e-4b60-bdc3-74cf7d1007a0',
      name: 'Section A',
      batchId: batchMap['BBA 2024-25']
    },
    {
      id: '9426e3e7-cb66-414a-b014-7af5a70359a5',
      name: 'Section A',
      batchId: batchMap['B.com 2024-25']
    },
    {
      id: '10695013-c38d-4f2e-9aca-fc64705541c5',
      name: 'Section B',
      batchId: batchMap['B.com 2024-25']
    },
    {
      name: 'Section A',
      batchId: batchMap['CSE 2024-28']
    },
    {
      name: 'Section B',
      batchId: batchMap['CSE 2024-28']
    }
  ];

  for (const s of sections) {
    let sec;
    if ('id' in s) {
      sec = await prisma.section.findUnique({ where: { id: s.id } });
      if (!sec) {
        await prisma.section.create({ data: s });
        console.log(`✅ Section created: ${s.name} (UUID: ${s.id})`);
      }
    } else {
      sec = await prisma.section.findFirst({ where: { name: s.name, batchId: s.batchId } });
      if (!sec) {
        await prisma.section.create({ data: s });
        console.log(`✅ Section created: ${s.name}`);
      }
    }
  }

  // 5. Seed Courses
  const coursesToSeed = [
    { code: 'CS101', name: 'Introduction to Programming', credits: 4, type: 'theory', semester: 1, depts: ['CSE'] },
    { code: 'SMD0210', name: 'Business Regulations', credits: 4, type: 'theory', semester: 4, depts: ['BBA'] },
    { code: '0030', name: 'Hindi IV', credits: 3, type: 'theory', semester: 4, depts: ['BBA', 'B.COM', 'BCA'] },
    { code: '0020', name: 'Sanskrit IV', credits: 3, type: 'theory', semester: 4, depts: ['BBA', 'B.COM', 'BCA'] },
    { code: '0010', name: 'Kannada IV', credits: 3, type: 'theory', semester: 4, depts: ['BBA', 'B.COM', 'BCA'] },
    { code: '0080', name: 'English IV', credits: 3, type: 'theory', semester: 4, depts: ['BBA', 'B.COM', 'BCA'] },
    { code: '0230', name: 'Fundamentals of Insurance', credits: 3, type: 'theory', semester: 4, depts: ['BBA'] },
    { code: '0240', name: 'Production and Operations Management', credits: 4, type: 'theory', semester: 4, depts: ['BBA'] },
    { code: 'BS-ELE', name: 'Business Skills', credits: 2, type: 'elective', semester: 4, depts: ['BBA'] },
    { code: 'CAB-ELE', name: 'Computer Applications for Business', credits: 2, type: 'elective', semester: 4, depts: ['BBA'] },
    { code: '0220', name: 'Business Statistics II', credits: 4, type: 'theory', semester: 4, depts: ['BBA'] },
    { code: '0210', name: 'Corporate Accounting II', credits: 4, type: 'theory', semester: 4, depts: ['B.COM'] }
  ];

  for (const c of coursesToSeed) {
    const existing = await prisma.course.findUnique({ where: { code: c.code } });
    if (!existing) {
      const course = await prisma.course.create({
        data: {
          code: c.code,
          name: c.name,
          credits: c.credits,
          type: c.type as any
        }
      });
      console.log(`✅ Course created: ${c.name} (${c.code})`);

      for (const code of c.depts) {
        const dId = deptMap[code];
        if (dId) {
          await prisma.courseDepartment.create({
            data: {
              courseId: course.id,
              departmentId: dId,
              semester: c.semester
            }
          });
        }
      }
    }
  }

  console.log('\n🎉 Core recovery seed complete! Now calling student and staff seeds...\n');
}

seedAll()
  .then(() => {
    // Run seed-staff and seed-students scripts next
    const { exec } = require('child_process');
    exec('npx ts-node src/seed-staff.ts', (err: any, stdout: any, stderr: any) => {
      console.log(stdout);
      if (err) console.error(err);
      
      exec('npx ts-node src/seed-students.ts', (err2: any, stdout2: any, stderr2: any) => {
        console.log(stdout2);
        if (err2) console.error(err2);
        console.log('🏁 Database is fully recovered and populated!');
      });
    });
  })
  .catch((e) => {
    console.error('❌ Database recovery seeding failed:', e);
    process.exit(1);
  });
