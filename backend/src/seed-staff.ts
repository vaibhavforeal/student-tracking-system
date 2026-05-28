import { PrismaClient } from '@prisma/client';
import { hashPassword } from './utils/password';

const prisma = new PrismaClient();

interface StaffEntry {
  name: string;
  email: string;
  phone: string;
  designation: string;
}

const staffList: StaffEntry[] = [
  { name: 'Sujatha R', email: 'sujatha@gmail.com', phone: '7586941230', designation: 'Professor' },
  { name: 'Abishek', email: 'abhishek@gmail.com', phone: '8546791023', designation: 'Professor' },
  { name: 'Ganesh Bhat', email: 'ganesh@gmail.com', phone: '7468591023', designation: 'Professor' },
  { name: 'Venkatesh', email: 'venkatesh@gmail.com', phone: '9124587360', designation: 'Professor' },
  { name: 'Akash', email: 'akash@gmail.com', phone: '945711100', designation: 'Professor' },
  { name: 'Eashwar S M', email: 'eashwar@gmail.com', phone: '941000255', designation: 'Professor' },
  { name: 'Vinay', email: 'vinay@gmail.com', phone: '7666555522', designation: 'Professor' },
  { name: 'Sangeetha', email: 'sangeetha@gmail.com', phone: '7584692103', designation: 'Professor' },
  { name: 'Rachana', email: 'rachana@gmail.com', phone: '955551110', designation: 'Professor' },
  { name: 'Gururaj N', email: 'gururaj@gmail.com', phone: '9457861230', designation: 'Professor' },
  { name: 'Harini', email: 'harini@gmail.com', phone: '9457861230', designation: 'Professor' },
  { name: 'Ramyashree', email: 'ramyashree@gmail.com', phone: '9457861230', designation: 'Professor' },
  { name: 'Arunkumar M S', email: 'arunkumar@gmail.com', phone: '9457861230', designation: 'Professor' },
  { name: 'Madhuri PA', email: 'madhuri@gmail.com', phone: '9457861230', designation: 'Professor' },
  { name: 'Ranganath', email: 'ranganath@gmail.com', phone: '9457861230', designation: 'Professor' },
  { name: 'Gopal B S', email: 'gopal@gmail.com', phone: '9457861230', designation: 'Professor' },
  { name: 'Sinchana D K', email: 'sinchana@gmail.com', phone: '9457861230', designation: 'Professor' },
];

async function seedStaff() {
  console.log('🌱 Seeding staff members...\n');

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < staffList.length; i++) {
    const entry = staffList[i];
    const employeeId = `STAFF${String(i + 1).padStart(3, '0')}`;

    // Password = first letter of name (lowercase) + "123"
    const password = entry.name.charAt(0).toLowerCase() + '123';

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email: entry.email } });
    if (existingUser && !existingUser.deletedAt) {
      console.log(`⏭️  Skipped (email exists): ${entry.name} <${entry.email}>`);
      skipped++;
      continue;
    }

    // Check if employeeId already exists
    const existingStaff = await prisma.staff.findUnique({ where: { employeeId } });
    if (existingStaff && !existingStaff.deletedAt) {
      console.log(`⏭️  Skipped (employee ID exists): ${entry.name} (${employeeId})`);
      skipped++;
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Clean up soft-deleted conflicts
        if (existingStaff && existingStaff.deletedAt) {
          await tx.classAssignment.deleteMany({ where: { staffId: existingStaff.id } });
          await tx.staff.delete({ where: { id: existingStaff.id } });
          await tx.user.delete({ where: { id: existingStaff.userId } }).catch(() => {});
        }
        if (existingUser && existingUser.deletedAt) {
          await tx.staff.deleteMany({ where: { userId: existingUser.id } });
          await tx.student.deleteMany({ where: { userId: existingUser.id } });
          await tx.user.delete({ where: { id: existingUser.id } });
        }

        const user = await tx.user.create({
          data: {
            email: entry.email,
            name: entry.name,
            passwordHash: await hashPassword(password),
            role: 'teacher',
          },
        });

        await tx.staff.create({
          data: {
            employeeId,
            userId: user.id,
            departmentId: null,
            designation: entry.designation,
            phone: entry.phone,
          },
        });
      });

      console.log(`✅ Created: ${entry.name} <${entry.email}> | ID: ${employeeId} | Password: ${password}`);
      created++;
    } catch (err: any) {
      console.error(`❌ Failed: ${entry.name} — ${err.message}`);
    }
  }

  console.log(`\n🎉 Done! Created: ${created}, Skipped: ${skipped}\n`);
  await prisma.$disconnect();
}

seedStaff().catch((e) => {
  console.error('❌ Seed failed:', e);
  prisma.$disconnect();
  process.exit(1);
});
