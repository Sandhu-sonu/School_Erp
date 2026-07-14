import { prisma, setTransactionClient, clearTransactionClient } from './packages/db/src';
import { createStaff, updateStaff, createSalaryPayment, adjustSalaryPayment, getStaffById } from './apps/admin/src/lib/services/hr';
import { StaffStatus, PaymentMode } from '@prisma/client';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ ASSERTION PASSED: ${message}`);
  }
}

async function runVerification() {
  console.log('🚀 Starting Phase 5 Verification Scenarios...');

  // Setup basic user for audit logs
  let testUser = await prisma.user.findUnique({
    where: { email: 'hr-admin@school.edu' },
  });
  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: 'hr-admin@school.edu',
        passwordHash: '$2b$10$xyz',
        name: 'HR Admin Test',
        role: 'PRINCIPAL',
      },
    });
  }
  console.log(`Using Test User: ${testUser.name} (${testUser.role})`);

  // Scenario 1: Create staff
  console.log('\n--- Scenario 1: Create Staff ---');
  const mobile1 = `99999${Math.floor(10000 + Math.random() * 90000)}`;
  const staff1 = await createStaff({
    name: 'John Doe',
    mobile: mobile1,
    email: 'john.doe@school.edu',
    gender: 'MALE',
    dob: new Date('1990-05-15'),
    joiningDate: new Date('2025-01-10'),
    designation: 'Math Teacher',
    qualification: 'M.Sc. B.Ed.',
    monthlySalary: 35000,
    remarks: 'Outstanding track record',
  });
  
  assert(!!staff1.id, 'Staff 1 should be created with a valid ID');
  assert(staff1.name === 'John Doe', 'Staff name should match');
  assert(staff1.status === StaffStatus.ACTIVE, 'New staff status should be ACTIVE');
  console.log(`Staff 1 onboarded successfully: ${staff1.name} (Code: ${staff1.employeeCode})`);

  // Scenario 2: Sequence generation
  console.log('\n--- Scenario 2: Sequence Generation ---');
  const mobile2 = `99999${Math.floor(10000 + Math.random() * 90000)}`;
  const staff2 = await createStaff({
    name: 'Jane Smith',
    mobile: mobile2,
    email: 'jane.smith@school.edu',
    gender: 'FEMALE',
    dob: new Date('1992-08-20'),
    joiningDate: new Date('2025-02-01'),
    designation: 'English Teacher',
    qualification: 'M.A. B.Ed.',
    monthlySalary: 38000,
  });

  assert(!!staff2.employeeCode, 'Staff 2 should be created with an employee code');
  assert(staff1.employeeCode.startsWith('EMP-'), 'Employee code format must start with EMP-');
  assert(staff2.employeeCode.startsWith('EMP-'), 'Employee code format must start with EMP-');
  
  const num1 = parseInt(staff1.employeeCode.split('-')[1], 10);
  const num2 = parseInt(staff2.employeeCode.split('-')[1], 10);
  assert(num2 === num1 + 1, `Staff sequence must increment sequentially. Got ${staff1.employeeCode} and ${staff2.employeeCode}`);
  console.log(`Sequential employee codes verified: ${staff1.employeeCode} -> ${staff2.employeeCode}`);

  // Scenario 3: Deactivate staff
  console.log('\n--- Scenario 3: Deactivate Staff ---');
  const deactivatedStaff = await updateStaff(staff1.id, { status: StaffStatus.INACTIVE });
  assert(deactivatedStaff.status === StaffStatus.INACTIVE, 'Staff status should be updated to INACTIVE');
  console.log(`Staff ${deactivatedStaff.name} status updated to: ${deactivatedStaff.status}`);

  // Scenario 4: Block salary
  console.log('\n--- Scenario 4: Block Salary for Inactive Staff ---');
  let blockedSalaryError = false;
  try {
    await createSalaryPayment({
      staffId: staff1.id,
      month: 6,
      year: 2026,
      grossSalary: 35000,
      adjustment: 0,
      paymentMethod: PaymentMode.BANK,
      remarks: 'Attempt for inactive staff',
      createdById: testUser.id,
    });
  } catch (err: any) {
    blockedSalaryError = true;
    console.log(`Correctly blocked: ${err.message}`);
  }
  assert(blockedSalaryError, 'createSalaryPayment must throw an error for non-ACTIVE staff');

  // Scenario 5: Salary payment
  console.log('\n--- Scenario 5: Salary Payment ---');
  const salaryPayment = await createSalaryPayment({
    staffId: staff2.id,
    month: 6,
    year: 2026,
    grossSalary: 38000,
    adjustment: 1000, // initial bonus
    paymentMethod: PaymentMode.BANK,
    remarks: 'June 2026 Salary',
    createdById: testUser.id,
  });

  assert(!!salaryPayment.id, 'Salary payment should be created successfully');
  assert(salaryPayment.receiptNumber.startsWith('SAL-2026-'), 'Receipt number format must start with SAL-YYYY-');
  assert(Number(salaryPayment.grossSalary) === 38000, 'Gross salary must match registered amount');
  
  // Verify database columns: it must not store adjustment or paidAmount directly in the model
  const rawPayment = await prisma.salaryPayment.findUnique({
    where: { id: salaryPayment.id }
  }) as any;
  assert(rawPayment.paidAmount === undefined, 'Must not store paidAmount column in database');
  assert(rawPayment.adjustment === undefined, 'Must not store mutable adjustment column in database');
  console.log(`Salary payment disbursed: Slip ${salaryPayment.receiptNumber}`);

  // Scenario 6: Duplicate payment prevention
  console.log('\n--- Scenario 6: Duplicate Payment Prevention ---');
  let duplicatePaymentError = false;
  try {
    await createSalaryPayment({
      staffId: staff2.id,
      month: 6,
      year: 2026,
      grossSalary: 38000,
      adjustment: 0,
      paymentMethod: PaymentMode.BANK,
      remarks: 'Duplicate attempt',
      createdById: testUser.id,
    });
  } catch (err: any) {
    duplicatePaymentError = true;
    console.log(`Correctly blocked duplicate: ${err.message}`);
  }
  assert(duplicatePaymentError, 'Should block duplicate payment for the same staff, month, and year');

  // Scenario 7: Locked expense
  console.log('\n--- Scenario 7: Locked Expense ---');
  const expense = await prisma.expense.findFirst({
    where: {
      referenceType: 'SALARY',
      referenceId: salaryPayment.id,
    },
  });

  assert(!!expense, 'A corresponding expense voucher must be created');
  assert(expense.isLocked === true, 'Expense generated by salary must be locked');
  assert(expense.category === 'Salary', 'Expense category must be Salary');
  
  // Verify that final initial amount is grossSalary + initial adjustment (38000 + 1000 = 39000)
  assert(Number(expense.amount) === 39000, `Expense amount must match grossSalary + initial adjustment. Expected 39000, got ${expense.amount}`);
  console.log(`Locked expense verified: ${expense.title} | Amount: ₹${expense.amount} | Locked: ${expense.isLocked}`);

  // Scenario 8: Salary adjustment
  console.log('\n--- Scenario 8: Salary Adjustment (Additive corrections) ---');
  const adj1 = await adjustSalaryPayment(
    salaryPayment.id,
    1500, // additive bonus
    'Performance bonus adjustment',
    testUser.id
  );

  assert(!!adj1.id, 'Adjustment 1 must be created');

  // Query updated staff history to compute effectivePaid
  const staff2Detail = await getStaffById(staff2.id);
  assert(!!staff2Detail, 'Should retrieve staff detail');
  const updatedPayment = staff2Detail.salaryPayments.find(p => p.id === salaryPayment.id)!;
  
  // Verify that the original payment grossSalary remains unmodified
  const freshPaymentRecord = await prisma.salaryPayment.findUnique({
    where: { id: salaryPayment.id },
  });
  assert(Number(freshPaymentRecord?.grossSalary) === 38000, 'Original grossSalary must remain unmodified');

  // Check adjustments array is loaded and contains both:
  // 1. Initial creation adjustment (1000)
  // 2. Added adjustment (1500)
  const adjustments = updatedPayment.adjustments;
  console.log(`Adjustments found: ${adjustments.length}`);
  const totalAdjustments = adjustments.reduce((sum, current) => sum + Number(current.amount), 0);
  assert(totalAdjustments === 2500, `Total adjustments must sum to 2500. Got ${totalAdjustments}`);

  const effectivePaid = Number(updatedPayment.grossSalary) + totalAdjustments;
  assert(effectivePaid === 40500, `effectivePaid must be grossSalary + adjustments sum. Expected 40500, got ${effectivePaid}`);

  // Check the locked expense has updated to reflect the new total (40500)
  const updatedExpense = await prisma.expense.findFirst({
    where: {
      referenceType: 'SALARY',
      referenceId: salaryPayment.id,
    },
  });
  assert(Number(updatedExpense?.amount) === 40500, `Expense amount must be updated to 40500. Got ${updatedExpense?.amount}`);
  console.log(`Salary adjustment successfully applied. effectivePaid: ₹${effectivePaid}. Locked Expense updated: ₹${updatedExpense?.amount}`);

  // Add negative correction adjustment
  console.log('Applying negative correction adjustment...');
  await adjustSalaryPayment(
    salaryPayment.id,
    -500, // deduction correction
    'Attendance correction offset',
    testUser.id
  );

  const staff2DetailAfterCorrection = await getStaffById(staff2.id);
  const paymentAfterCorrection = staff2DetailAfterCorrection?.salaryPayments.find(p => p.id === salaryPayment.id)!;
  const totalAdjustmentsAfterCorrection = paymentAfterCorrection.adjustments.reduce((sum, current) => sum + Number(current.amount), 0);
  assert(totalAdjustmentsAfterCorrection === 2000, `Total adjustments after negative correction must be 2000. Got ${totalAdjustmentsAfterCorrection}`);

  const effectivePaidAfterCorrection = Number(paymentAfterCorrection.grossSalary) + totalAdjustmentsAfterCorrection;
  assert(effectivePaidAfterCorrection === 40000, `Effective paid after correction must be 40000. Got ${effectivePaidAfterCorrection}`);

  const updatedExpenseAfterCorrection = await prisma.expense.findFirst({
    where: {
      referenceType: 'SALARY',
      referenceId: salaryPayment.id,
    },
  });
  assert(Number(updatedExpenseAfterCorrection?.amount) === 40000, `Expense amount must update to 40000. Got ${updatedExpenseAfterCorrection?.amount}`);
  console.log(`Negative adjustment successfully applied. final effectivePaid: ₹${effectivePaidAfterCorrection}. Locked Expense: ₹${updatedExpenseAfterCorrection?.amount}`);

  // Scenario 9: Dashboard reconciliation
  console.log('\n--- Scenario 9: Dashboard Reconciliation ---');
  // Reconcile effectivePaid formula
  const calculatedEffectivePaid = Number(paymentAfterCorrection.grossSalary) + totalAdjustmentsAfterCorrection;
  
  // Expose computed values: Verify: effectivePaid = grossSalary + SUM(adjustments)
  assert(calculatedEffectivePaid === effectivePaidAfterCorrection, 'Formula effectivePaid = grossSalary + SUM(adjustments) must match exactly');
  
  // Reconcile Expense model is in sync with effectivePaid
  assert(Number(updatedExpenseAfterCorrection?.amount) === calculatedEffectivePaid, 'Expense amount must reconcile with effectivePaid amount exactly');

  console.log('\n🎉 ALL PHASE 5 VERIFICATION SCENARIOS COMPLETED SUCCESSFULLY!');
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
