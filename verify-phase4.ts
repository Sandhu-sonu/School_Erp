import { prisma, setTransactionClient, clearTransactionClient } from './packages/db/src';
import { upsertFeePlan, collectFee, reverseTransaction } from './apps/admin/src/lib/services/finance';
import { registerStudent } from './apps/admin/src/lib/services/admissions';
import { PaymentMode } from '@prisma/client';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ ASSERTION PASSED: ${message}`);
  }
}

async function runVerification() {
  console.log('🚀 Starting Phase 4 Verification Scenarios...');

  // Setup basic user for audit logs
  let testUser = await prisma.user.findUnique({
    where: { email: 'finance-clerk@school.edu' },
  });
  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: 'finance-clerk@school.edu',
        passwordHash: '$2b$10$xyz',
        name: 'Finance Clerk Test',
        role: 'PRINCIPAL',
      },
    });
  }

  // 1. Create Academic Session & Class & Section
  console.log('\n--- Scenario 1: Setup Session & Class & Section ---');
  let session = await prisma.academicSession.findUnique({
    where: { name: '2026-27' },
  });
  if (!session) {
    session = await prisma.academicSession.create({
      data: {
        name: '2026-27',
        isActive: true,
        startDate: new Date('2026-04-01'),
        endDate: new Date('2027-03-31'),
      },
    });
  } else {
    // Make sure it is active
    session = await prisma.academicSession.update({
      where: { id: session.id },
      data: { isActive: true },
    });
  }
  console.log(`Using Session: ${session.name} (Active: ${session.isActive})`);

  let classItem = await prisma.class.findUnique({
    where: { name: 'Class 10' },
  });
  if (!classItem) {
    classItem = await prisma.class.create({
      data: {
        name: 'Class 10',
        sequence: 12,
      },
    });
  }
  console.log(`Using Class: ${classItem.name}`);

  let sectionItem = await prisma.section.findUnique({
    where: {
      classId_name: {
        classId: classItem.id,
        name: 'A',
      },
    },
  });
  if (!sectionItem) {
    sectionItem = await prisma.section.create({
      data: {
        classId: classItem.id,
        name: 'A',
      },
    });
  }
  console.log(`Using Section: ${sectionItem.name}`);

  // Create Parent
  const parentMobile = '9876543210';
  let parent = await prisma.parent.findUnique({
    where: { mobile: parentMobile },
  });
  if (!parent) {
    parent = await prisma.parent.create({
      data: {
        fatherName: 'Father Test',
        motherName: 'Mother Test',
        mobile: parentMobile,
      },
    });
  }
  console.log(`Using Parent: ${parent.fatherName} (${parent.mobile})`);

  // Create Fee Structure
  console.log('\n--- Scenario 2: Create Fee Structure ---');
  const tuitionFee = 12000.00;
  const admissionFee = 3000.00;
  const annualCharges = 1500.00;
  const activityCharges = 500.00;
  
  const plan = await upsertFeePlan(
    session.id,
    classItem.id,
    tuitionFee,
    admissionFee,
    annualCharges,
    activityCharges
  );
  console.log('Upserted FeePlan details:', JSON.stringify(plan));
  assert(Number(plan.tuitionFee) === tuitionFee, 'FeePlan Tuition Fee matches');
  assert(Number(plan.admissionFee) === admissionFee, 'FeePlan Admission Fee matches');
  assert(Number(plan.annualCharges) === annualCharges, 'FeePlan Annual Charges matches');
  assert(Number(plan.activityCharges) === activityCharges, 'FeePlan Activity Charges matches');

  // Generate student fee (Register Student)
  console.log('\n--- Scenario 3: Snap Fee Structure at Student Admission ---');
  const dobStr = '2016-05-15';
  const student = await registerStudent({
    name: 'Jane Doe',
    dob: dobStr,
    gender: 'Female',
    parentId: parent.id,
    classId: classItem.id,
    sectionId: sectionItem.id,
  });
  console.log(`Registered Student: ${student.name} (Admn No: ${student.admissionNumber})`);

  // Fetch created student fee account
  const enrollments = await prisma.classEnrollment.findMany({
    where: { studentId: student.id, sessionId: session.id },
    include: { feeAccount: true },
  });
  assert(enrollments.length === 1, 'Student class enrollment exists');
  const enrollment = enrollments[0];
  const feeAccount = enrollment.feeAccount;
  assert(feeAccount !== null, 'FeeAccount was created');
  
  const expectedTotalBase = tuitionFee + admissionFee + annualCharges + activityCharges;
  console.log(`Expected Snap Total Fee: ₹${expectedTotalBase.toFixed(2)}, Account Total: ₹${Number(feeAccount!.totalFee).toFixed(2)}`);
  assert(Number(feeAccount!.totalFee) === expectedTotalBase, 'FeeAccount snap total fee matches structural sum');
  assert(Number(feeAccount!.remainingFee) === expectedTotalBase, 'FeeAccount outstanding balance matches snap total');
  assert(feeAccount!.feeStatus === 'UNPAID', 'FeeStatus is initially UNPAID');

  // Collect partial payment
  console.log('\n--- Scenario 4: Collect Partial Payment ---');
  const partialAmt = 5000.00;
  const tx1 = await collectFee(
    enrollment.id,
    partialAmt,
    0, // discount
    0, // waiver
    PaymentMode.CASH,
    testUser.id,
    'Partial payment test'
  );
  console.log(`Collected partial payment. Receipt: ${tx1.receiptNumber}, Amount: ₹${Number(tx1.amount).toFixed(2)}`);
  
  // Reload fee account
  let updatedAccount = await prisma.studentFeeAccount.findUniqueOrThrow({
    where: { id: feeAccount!.id },
  });
  const expectedRemaining1 = expectedTotalBase - partialAmt;
  console.log(`Paid: ₹${Number(updatedAccount.paidAmount).toFixed(2)}, Remaining: ₹${Number(updatedAccount.remainingFee).toFixed(2)}`);
  assert(Number(updatedAccount.paidAmount) === partialAmt, 'Paid amount updated to partial');
  assert(Number(updatedAccount.remainingFee) === expectedRemaining1, 'Remaining dues balance decremented correctly');
  assert(updatedAccount.feeStatus === 'PARTIAL', 'FeeStatus updated to PARTIAL');

  // Collect full payment
  console.log('\n--- Scenario 5: Collect Full Payment ---');
  const remainingAmt = expectedRemaining1;
  const tx2 = await collectFee(
    enrollment.id,
    remainingAmt,
    0,
    0,
    PaymentMode.UPI,
    testUser.id,
    'Full payment test'
  );
  console.log(`Collected full payment. Receipt: ${tx2.receiptNumber}, Amount: ₹${Number(tx2.amount).toFixed(2)}`);

  updatedAccount = await prisma.studentFeeAccount.findUniqueOrThrow({
    where: { id: feeAccount!.id },
  });
  console.log(`Paid: ₹${Number(updatedAccount.paidAmount).toFixed(2)}, Remaining: ₹${Number(updatedAccount.remainingFee).toFixed(2)}`);
  assert(Number(updatedAccount.paidAmount) === expectedTotalBase, 'Paid amount updated to total base fee');
  assert(Number(updatedAccount.remainingFee) === 0, 'Remaining dues balance is zero');
  assert(updatedAccount.feeStatus === 'PAID', 'FeeStatus updated to PAID');

  // Verify Receipt Sequences
  console.log('\n--- Scenario 6: Receipt Sequence Format (SCH-YYYY-XXXXX) ---');
  console.log(`Receipt 1 Number: ${tx1.receiptNumber}`);
  console.log(`Receipt 2 Number: ${tx2.receiptNumber}`);
  const currentYear = new Date().getFullYear();
  const formatRegex = new RegExp(`^SCH-${currentYear}-\\d{5}$`);
  assert(formatRegex.test(tx1.receiptNumber), 'Receipt 1 matches format SCH-YYYY-00001');
  assert(formatRegex.test(tx2.receiptNumber), 'Receipt 2 matches format SCH-YYYY-00001');
  
  // Duplicate click block (Negative dues checks)
  console.log('\n--- Scenario 7: Concurrency & Duplicate submit protection ---');
  try {
    console.log('Attempting to collect ₹1000.00 when balance is ₹0.00...');
    await collectFee(
      enrollment.id,
      1000.00,
      0,
      0,
      PaymentMode.CASH,
      testUser.id,
      'Duplicate click bypass test'
    );
    assert(false, 'Should throw error when collecting above remaining dues');
  } catch (err: any) {
    console.log(`Expected validation caught error: "${err.message}"`);
    assert(true, 'Prevented negative balance collection successfully');
  }

  // Transport fee generation
  console.log('\n--- Scenario 8: Transport Optional & Auto-add Billing (Refactored in Phase 7) ---');
  console.log('Skipping Phase 4 transport tests since transport schema was refactored for Phase 7.');

  // Discount & Waiver Adjustment Flow + Reversal
  console.log('\n--- Scenario 9: Discount, Waiver, and Reversal Flow ---');
  const student3 = await registerStudent({
    name: 'Alice Smith',
    dob: dobStr,
    gender: 'Female',
    parentId: parent.id,
    classId: classItem.id,
    sectionId: sectionItem.id,
  });

  const enrollments3 = await prisma.classEnrollment.findMany({
    where: { studentId: student3.id, sessionId: session.id },
    include: { feeAccount: true },
  });
  const enrollment3 = enrollments3[0];

  const payAmt = 3000.00;
  const discAmt = 1000.00;
  const waivAmt = 500.00;
  console.log(`Collecting transaction with adjustments: pay=${payAmt}, discount=${discAmt}, waiver=${waivAmt}...`);
  const tx3 = await collectFee(
    enrollment3.id,
    payAmt,
    discAmt,
    waivAmt,
    PaymentMode.CHEQUE,
    testUser.id,
    'Discount & waiver test'
  );

  let updatedAccount3 = await prisma.studentFeeAccount.findUniqueOrThrow({
    where: { enrollmentId: enrollment3.id },
  });
  const expectedRemaining3 = expectedTotalBase - payAmt - discAmt - waivAmt;
  console.log(`Paid: ₹${Number(updatedAccount3.paidAmount).toFixed(2)}, Disc: ₹${Number(updatedAccount3.discount).toFixed(2)}, Waiv: ₹${Number(updatedAccount3.waiver).toFixed(2)}, Remaining: ₹${Number(updatedAccount3.remainingFee).toFixed(2)}`);
  
  assert(Number(updatedAccount3.paidAmount) === payAmt, 'Paid amount matches');
  assert(Number(updatedAccount3.discount) === discAmt, 'Discount matches');
  assert(Number(updatedAccount3.waiver) === waivAmt, 'Waiver matches');
  assert(Number(updatedAccount3.remainingFee) === expectedRemaining3, 'Remaining dues decremented by total adjustments');
  assert(updatedAccount3.feeStatus === 'PARTIAL', 'Fee status is PARTIAL');

  // Reversal Execution
  console.log(`Executing reversal for receipt ${tx3.receiptNumber} due to clerical error...`);
  await reverseTransaction(tx3.id, testUser.id, 'Clerical correction required');
  
  updatedAccount3 = await prisma.studentFeeAccount.findUniqueOrThrow({
    where: { enrollmentId: enrollment3.id },
  });
  console.log(`After reversal: Paid: ₹${Number(updatedAccount3.paidAmount).toFixed(2)}, Disc: ₹${Number(updatedAccount3.discount).toFixed(2)}, Waiv: ₹${Number(updatedAccount3.waiver).toFixed(2)}, Remaining: ₹${Number(updatedAccount3.remainingFee).toFixed(2)}`);
  assert(Number(updatedAccount3.paidAmount) === 0, 'Reversal restored paidAmount to 0');
  assert(Number(updatedAccount3.discount) === 0, 'Reversal restored discount to 0');
  assert(Number(updatedAccount3.waiver) === 0, 'Reversal restored waiver to 0');
  assert(Number(updatedAccount3.remainingFee) === expectedTotalBase, 'Reversal restored remaining dues to total base');
  assert(updatedAccount3.feeStatus === 'UNPAID', 'Reversal restored fee status to UNPAID');

  console.log('\n🌟 Phase 4 Verification Suite COMPLETED successfully!');
}

async function main() {
  try {
    await prisma.$transaction(async (tx) => {
      setTransactionClient(tx);
      await runVerification();
      throw new Error('ROLLBACK');
    }, {
      timeout: 30000
    });
  } catch (err: any) {
    clearTransactionClient();
    if (err.message === 'ROLLBACK') {
      console.log('✅ Rollback successful. Database state preserved.');
    } else {
      console.error('❌ Verification failed:', err);
      process.exit(1);
    }
  }
}

main();
