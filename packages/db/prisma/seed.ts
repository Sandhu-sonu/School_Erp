import { PrismaClient } from '@prisma/client';
import { scryptSync, randomBytes } from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  console.log('Seeding database...');

  // 1. Create Receipt Sequence
  const receiptSeq = await prisma.receiptSequence.upsert({
    where: { prefix: 'REC-' },
    update: {},
    create: {
      prefix: 'REC-',
      currentValue: 0,
    },
  });
  console.log('Receipt sequence seeded:', receiptSeq.prefix);

  // 2. Create Users
  const principalPassword = hashPassword('AdminPass123');
  const clerkPassword = hashPassword('ClerkPass123');
  const accountantPassword = hashPassword('AccountantPass123');
  const teacherPassword = hashPassword('TeacherPass123');

  const principal = await prisma.user.upsert({
    where: { email: 'principal@school.erp' },
    update: {},
    create: {
      email: 'principal@school.erp',
      passwordHash: principalPassword,
      name: 'Dr. Jane Doe',
      role: 'PRINCIPAL',
      status: 'ACTIVE',
    },
  });

  const clerk = await prisma.user.upsert({
    where: { email: 'clerk@school.erp' },
    update: {},
    create: {
      email: 'clerk@school.erp',
      passwordHash: clerkPassword,
      name: 'John Clerk',
      role: 'CLERK',
      status: 'ACTIVE',
    },
  });

  const accountant = await prisma.user.upsert({
    where: { email: 'accountant@school.erp' },
    update: {},
    create: {
      email: 'accountant@school.erp',
      passwordHash: accountantPassword,
      name: 'Alice Accountant',
      role: 'ACCOUNTANT',
      status: 'ACTIVE',
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@school.erp' },
    update: {},
    create: {
      email: 'teacher@school.erp',
      passwordHash: teacherPassword,
      name: 'Bob Teacher',
      role: 'TEACHER',
      status: 'ACTIVE',
    },
  });

  console.log('Users seeded:', {
    principal: principal.email,
    clerk: clerk.email,
    accountant: accountant.email,
    teacher: teacher.email,
  });

  // 3. Create active Academic Session
  const session = await prisma.academicSession.upsert({
    where: { name: '2026-27' },
    update: {},
    create: {
      name: '2026-27',
      isActive: true,
      startDate: new Date('2026-04-01T00:00:00Z'),
      endDate: new Date('2027-03-31T23:59:59Z'),
    },
  });
  console.log('Academic session seeded:', session.name);

  // 4. Create Admission Sequence for this session
  await prisma.admissionSequence.upsert({
    where: {
      sessionId_year: {
        sessionId: session.id,
        year: 2026,
      },
    },
    update: {},
    create: {
      sessionId: session.id,
      year: 2026,
      currentValue: 0,
    },
  });
  console.log('Admission sequence for 2026 initialized.');

  // 5. Create Classes and Sections
  const classesList = [
    { name: 'Nursery', sequence: 1 },
    { name: 'LKG', sequence: 2 },
    { name: 'UKG', sequence: 3 },
    { name: 'Class 1', sequence: 4 },
    { name: 'Class 2', sequence: 5 },
    { name: 'Class 3', sequence: 6 },
    { name: 'Class 4', sequence: 7 },
    { name: 'Class 5', sequence: 8 },
    { name: 'Class 6', sequence: 9 },
    { name: 'Class 7', sequence: 10 },
    { name: 'Class 8', sequence: 11 },
    { name: 'Class 9', sequence: 12 },
    { name: 'Class 10', sequence: 13 },
    { name: 'Class 11', sequence: 14 },
    { name: 'Class 12', sequence: 15 },
  ];

  for (const classItem of classesList) {
    const dbClass = await prisma.class.upsert({
      where: { name: classItem.name },
      update: {},
      create: {
        name: classItem.name,
        sequence: classItem.sequence,
      },
    });

    // Create sections A, B, C for each class
    for (const sectionName of ['A', 'B', 'C']) {
      await prisma.section.upsert({
        where: {
          classId_name: {
            classId: dbClass.id,
            name: sectionName,
          },
        },
        update: {},
        create: {
          classId: dbClass.id,
          name: sectionName,
        },
      });
    }

    // Create default FeePlan for each class
    await prisma.feePlan.upsert({
      where: {
        sessionId_classId: {
          sessionId: session.id,
          classId: dbClass.id,
        },
      },
      update: {},
      create: {
        sessionId: session.id,
        classId: dbClass.id,
        tuitionFee: 12000.00, // example base annual fee
        admissionFee: 5000.00,
      },
    });
  }
  console.log('Classes, sections, and default fee plans seeded.');

  // 6. Create default Subjects
  const subjectsList = [
    { name: 'Mathematics', code: 'MATH' },
    { name: 'English', code: 'ENG' },
    { name: 'Science', code: 'SCI' },
    { name: 'Social Studies', code: 'SST' },
    { name: 'Hindi', code: 'HIN' },
  ];

  const class10 = await prisma.class.findFirst({ where: { name: 'Class 10' } });
  if (class10) {
    for (const sub of subjectsList) {
      await prisma.subject.upsert({
        where: {
          classId_code: {
            classId: class10.id,
            code: sub.code,
          },
        },
        update: {},
        create: {
          name: sub.name,
          code: sub.code,
          classId: class10.id,
        },
      });
    }
    console.log('Subjects seeded for Class 10.');
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
