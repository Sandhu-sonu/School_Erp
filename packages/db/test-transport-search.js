const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Checking active sessions...");
  const activeSessions = await prisma.academicSession.findMany({
    where: { isActive: true }
  });
  console.log("Active sessions:", JSON.stringify(activeSessions, null, 2));

  console.log("Searching enrollments for 'az'...");
  const enrollments = await prisma.classEnrollment.findMany({
    where: {
      isArchived: false,
      student: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: 'az', mode: 'insensitive' } },
          { admissionNumber: { contains: 'az', mode: 'insensitive' } }
        ]
      }
    },
    include: {
      student: true,
      session: true,
      class: true,
      section: true
    }
  });
  console.log("Found enrollments count:", enrollments.length);
  for (const e of enrollments) {
    console.log(`Enrollment ID: ${e.id}, Student: ${e.student.name}, Session: ${e.session.name} (Active: ${e.session.isActive}), Class: ${e.class.name}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
