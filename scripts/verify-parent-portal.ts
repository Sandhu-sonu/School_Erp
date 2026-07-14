import { prisma } from '@school-erp/db';
import { hashPassword } from '@school-erp/utils';
import { 
  getParentProfile, 
  getStudentDashboardSummary, 
  getStudentFees, 
  getStudentResults 
} from '../apps/admin/src/lib/services/parent-portal';

async function runTests() {
  console.log('🚀 Starting Parent Portal Verification & Service Tests...\n');

  // 1. Create or find test Parent & Sibling student records
  console.log('Step 1: Preparing database test records...');
  
  let parent = await prisma.parent.findUnique({
    where: { mobile: '9876543210' }
  });

  if (!parent) {
    parent = await prisma.parent.create({
      data: {
        fatherName: 'Rajesh Kumar',
        motherName: 'Sunita Devi',
        mobile: '9876543210',
        passwordHash: hashPassword('123456'),
        address: '123, Sector 15, Noida, UP'
      }
    });
  }

  // Find or create a session, class, and section
  let session = await prisma.academicSession.findFirst({ where: { isActive: true } });
  if (!session) {
    session = await prisma.academicSession.create({
      data: {
        name: '2026-27',
        isActive: true,
        startDate: new Date('2026-04-01'),
        endDate: new Date('2027-03-31')
      }
    });
  }

  let testClass = await prisma.class.findFirst();
  if (!testClass) {
    testClass = await prisma.class.create({
      data: {
        name: 'Class 10',
        sequence: 10
      }
    });
  }

  let section = await prisma.section.findFirst({ where: { classId: testClass.id } });
  if (!section) {
    section = await prisma.section.create({
      data: {
        classId: testClass.id,
        name: 'A'
      }
    });
  }

  // Create student linked to parent
  let student = await prisma.student.findFirst({
    where: { parentId: parent.id }
  });

  if (!student) {
    student = await prisma.student.create({
      data: {
        name: 'Aarav Kumar',
        admissionNumber: 'SCH-2026-9999',
        dob: new Date('2012-05-15'),
        gender: 'MALE',
        parentId: parent.id
      }
    });
  }

  // Ensure active class enrollment
  let enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId: student.id, sessionId: session.id, isArchived: false }
  });

  if (!enrollment) {
    enrollment = await prisma.classEnrollment.create({
      data: {
        studentId: student.id,
        classId: testClass.id,
        sectionId: section.id,
        sessionId: session.id,
        isArchived: false
      }
    });
  }

  // Ensure student fee account exists
  let feeAccount = await prisma.studentFeeAccount.findUnique({
    where: { enrollmentId: enrollment.id }
  });

  if (!feeAccount) {
    feeAccount = await prisma.studentFeeAccount.create({
      data: {
        enrollmentId: enrollment.id,
        totalFee: 15000.00,
        paidAmount: 5000.00,
        discount: 500.00,
        waiver: 0.00,
        remainingFee: 9500.00,
        feeStatus: 'PARTIAL'
      }
    });
  }

  // 2. Fetch parent profile
  console.log('\nStep 2: Testing getParentProfile...');
  const fetchedProfile = await getParentProfile('9876543210');
  if (!fetchedProfile) {
    throw new Error('❌ getParentProfile returned null');
  }
  console.log(`✔ Found parent: ${fetchedProfile.fatherName}, Children: ${fetchedProfile.students.length}`);

  // 3. Fetch student dashboard summary
  console.log('\nStep 3: Testing getStudentDashboardSummary...');
  const dashboardSummary = await getStudentDashboardSummary(student.id);
  console.log(`✔ Loaded dashboard summary for student: ${dashboardSummary.student.name}`);
  console.log(`✔ Class details: ${dashboardSummary.enrollment.class} - ${dashboardSummary.enrollment.section}`);
  console.log(`✔ Fee Summary remaining balance: ₹${dashboardSummary.feeSummary?.remainingFee}`);

  // 4. Fetch detailed fees
  console.log('\nStep 4: Testing getStudentFees...');
  const fees = await getStudentFees(student.id);
  console.log(`✔ Fee Account status: ${fees.feeAccount?.feeStatus}`);
  console.log(`✔ Billed: ₹${fees.feeAccount?.totalFee}, Remaining: ₹${fees.feeAccount?.remainingFee}`);

  // 5. Fetch published exam results
  console.log('\nStep 5: Testing getStudentResults...');
  const results = await getStudentResults(student.id);
  console.log(`✔ Loaded ${results.length} published exam results sheets.`);

  console.log('\n🎉 ALL PARENT PORTAL SERVICE INTEGRATION TESTS PASSED SUCCESSFULLY!');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Verification Failed:', err);
    process.exit(1);
  });
