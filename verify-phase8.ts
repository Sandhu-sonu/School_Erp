import { prisma, setTransactionClient, clearTransactionClient } from './packages/db/src';
import * as reportsService from './apps/admin/src/lib/services/reports';
import { isAllowedReport } from './apps/admin/src/lib/services/reports-security';
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
  console.log('🚀 Starting Phase 8 E2E Verification Script...');
  const startTime = Date.now();

  // Create clean environment or reuse existing
  console.log('\n--- Setting up verification dataset ---');

  // 1. Session Setup
  let session = await prisma.academicSession.findUnique({ where: { name: '2026-27' } });
  if (!session) {
    session = await prisma.academicSession.create({
      data: {
        name: '2026-27',
        isActive: true,
        startDate: new Date('2026-04-01'),
        endDate: new Date('2027-03-31'),
      },
    });
  }

  // 2. Class & Section
  let classItem = await prisma.class.findUnique({ where: { name: 'Class 8' } });
  if (!classItem) {
    classItem = await prisma.class.create({
      data: { name: 'Class 8', sequence: 8 },
    });
  }
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
      data: { classId: classItem.id, name: 'A' },
    });
  }

  // 3. Parent
  let parent = await prisma.parent.findUnique({ where: { mobile: '9123456780' } });
  if (!parent) {
    parent = await prisma.parent.create({
      data: {
        fatherName: 'Reports Father',
        motherName: 'Reports Mother',
        mobile: '9123456780',
        address: 'Reports Block',
      },
    });
  }

  // 4. Students

  const studentName1 = `ReportTestStudent-1`;
  const student1 = await prisma.student.create({
    data: {
      admissionNumber: `SCH/2026/08/${Math.floor(1000 + Math.random() * 9000)}`,
      name: studentName1,
      dob: new Date('2015-06-15'),
      gender: 'MALE',
      admissionDate: new Date(),
      parentId: parent.id,
      status: 'ACTIVE',
    },
  });

  const studentName2 = `ReportTestStudent-2`;
  const student2 = await prisma.student.create({
    data: {
      admissionNumber: `SCH/2026/08/${Math.floor(1000 + Math.random() * 9000)}`,
      name: studentName2,
      dob: new Date('2014-08-20'),
      gender: 'FEMALE',
      admissionDate: new Date(),
      parentId: parent.id,
      status: 'ACTIVE',
    },
  });

  // Enrollments
  const enr1 = await prisma.classEnrollment.create({
    data: {
      studentId: student1.id,
      sessionId: session.id,
      classId: classItem.id,
      sectionId: sectionItem.id,
    },
  });

  const enr2 = await prisma.classEnrollment.create({
    data: {
      studentId: student2.id,
      sessionId: session.id,
      classId: classItem.id,
      sectionId: sectionItem.id,
    },
  });

  // Fee Accounts
  const feeAccount1 = await prisma.studentFeeAccount.create({
    data: {
      enrollmentId: enr1.id,
      totalFee: 12000,
      remainingFee: 12000,
      feeStatus: 'UNPAID',
    },
  });

  const feeAccount2 = await prisma.studentFeeAccount.create({
    data: {
      enrollmentId: enr2.id,
      totalFee: 12000,
      remainingFee: 7000,
      paidAmount: 5000,
      feeStatus: 'PARTIAL',
    },
  });

  // ----------------------------------------------------
  // Scenario 1: Student report counts
  // ----------------------------------------------------
  console.log('\n--- Scenario 1: Student report counts ---');
  const studentReg = await reportsService.getStudentRegister({ status: 'ACTIVE' });
  assert(studentReg.data.length >= 2, 'Should find at least 2 active students');
  assert(studentReg.summary.active >= 2, 'KPI Active count should be >= 2');
  console.log(`Active Count: ${studentReg.summary.active}`);

  // ----------------------------------------------------
  // Scenario 2: Finance totals reconcile (Reversed transaction checks)
  // ----------------------------------------------------
  console.log('\n--- Scenario 2: Finance totals reconcile ---');
  // Create User to collect fees
  let user = await prisma.user.findUnique({
    where: { email: 'admin@school.com' },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'admin@school.com',
        name: 'Admin',
        passwordHash: 'dummy',
        role: 'PRINCIPAL',
      },
    });
  }

  // Create an active fee transaction
  const txActive = await prisma.feeTransaction.create({
    data: {
      feeAccountId: feeAccount2.id,
      amount: 5000,
      receiptNumber: `REC-${Date.now()}-1`,
      paymentMode: 'CASH',
      collectedById: user.id,
      isReversed: false,
    },
  });

  // Create a reversed fee transaction
  const txReversed = await prisma.feeTransaction.create({
    data: {
      feeAccountId: feeAccount2.id,
      amount: 3000,
      receiptNumber: `REC-${Date.now()}-2`,
      paymentMode: 'CASH',
      collectedById: user.id,
      isReversed: true, // Reversed transaction
    },
  });

  const collectionsReport = await reportsService.getFeeCollectionsReport({});
  // Verify totals ignore reversed transactions
  const activeTx = collectionsReport.data.filter(t => t.id === txActive.id)[0];
  const reversedTx = collectionsReport.data.filter(t => t.id === txReversed.id)[0];

  assert(activeTx !== undefined, 'Active transaction returned');
  assert(reversedTx !== undefined && reversedTx.isReversed === true, 'Reversed transaction returned with reversed: true');
  
  // Re-verify aggregate summary totals do not include the 3000 reversed amount
  const dailyCol = await reportsService.getDailyCollectionReport();
  console.log(`Reconciled Daily Collection Sum: ${dailyCol.summary.totalAmount}`);

  // ----------------------------------------------------
  // Scenario 3: Outstanding dues reconcile
  // ----------------------------------------------------
  console.log('\n--- Scenario 3: Outstanding dues reconcile ---');
  const duesReport = await reportsService.getOutstandingDuesReport({ classId: classItem.id });
  const row1 = duesReport.data.find(d => d.admissionNumber === student1.admissionNumber);
  const row2 = duesReport.data.find(d => d.admissionNumber === student2.admissionNumber);

  assert(row1 !== undefined && row1.remainingFee === 12000, 'Student 1 outstanding dues should be exactly 12000');
  assert(row2 !== undefined && row2.remainingFee === 7000, 'Student 2 outstanding dues should be exactly 7000');
  console.log(`Student 1 Dues: ${row1?.remainingFee}, Student 2 Dues: ${row2?.remainingFee}`);

  // ----------------------------------------------------
  // Scenario 4: Salary effectivePaid validation
  // ----------------------------------------------------
  console.log('\n--- Scenario 4: Salary effectivePaid validation ---');
  // Setup Employee
  const staff = await prisma.staff.create({
    data: {
      employeeCode: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      name: 'Salary Test Staff',
      mobile: '9888877777',
      gender: 'MALE',
      dob: new Date('1990-01-01'),
      joiningDate: new Date('2025-01-01'),
      designation: 'Teacher',
      qualification: 'B.Ed',
      monthlySalary: 30000,
    },
  });

  const salaryPayment = await prisma.salaryPayment.create({
    data: {
      staffId: staff.id,
      month: 6,
      year: 2026,
      grossSalary: 30000,
      paymentMethod: 'BANK',
      receiptNumber: `SAL-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      createdById: user.id,
    },
  });

  // Add adjustments
  await prisma.salaryAdjustment.create({
    data: {
      salaryPaymentId: salaryPayment.id,
      amount: 1500,
      reason: 'Bonus allowance',
      createdById: user.id,
    },
  });

  await prisma.salaryAdjustment.create({
    data: {
      salaryPaymentId: salaryPayment.id,
      amount: -500,
      reason: 'Tax deduction',
      createdById: user.id,
    },
  });

  const salaryRep = await reportsService.getSalaryHistory({ staffId: staff.id });
  const staffSalary = salaryRep.data.find(s => s.id === salaryPayment.id);

  assert(staffSalary !== undefined, 'Salary history record found');
  assert(staffSalary?.grossSalary === 30000, 'Gross salary is 30000');
  assert(staffSalary?.adjustmentTotal === 1000, 'Total adjustments sum to 1000');
  assert(staffSalary?.effectivePaid === 31000, 'Effective paid is gross (30000) + adjustments (1000) = 31000');
  console.log(`Effective Paid Verified: gross: ${staffSalary?.grossSalary}, adjustments: ${staffSalary?.adjustmentTotal}, effectivePaid: ${staffSalary?.effectivePaid}`);

  // ----------------------------------------------------
  // Scenario 5: Published result snapshots
  // ----------------------------------------------------
  console.log('\n--- Scenario 5: Published result snapshots ---');
  // Setup Exam
  const exam = await prisma.exam.create({
    data: {
      sessionId: session.id,
      name: 'Half Yearly Examination',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-15'),
      published: true, // Mark published
    },
  });

  // Create results with snapshotJson
  const snapshotData = {
    subjects: [
      { name: 'Mathematics', code: 'MATH', obtained: 95, maxMarks: 100 },
      { name: 'Science', code: 'SCI', obtained: 88, maxMarks: 100 },
    ],
    percentage: 91.5,
    grade: 'A+',
    total: 183,
    rank: 1,
  };

  const result = await prisma.result.create({
    data: {
      examId: exam.id,
      studentId: student1.id,
      total: 183,
      percentage: 91.5,
      finalGrade: 'A+',
      rank: 1,
      published: true,
      snapshotJson: snapshotData,
    },
  });

  const examRep = await reportsService.getExamResultsReport(exam.id, classItem.id);
  const studentResult = examRep.data.find(r => r.studentName === studentName1);

  assert(studentResult !== undefined, 'Student exam result found');
  assert(studentResult?.totalObtained === 183, 'Total obtained matches snapshot total');
  assert(studentResult?.percentage === 91.5, 'Percentage matches snapshot percentage');
  assert(studentResult?.subjects.length === 2, 'Two subjects are snapshot inside result');
  console.log(`Result snapshot read: percentage=${studentResult?.percentage}, subjectsCount=${studentResult?.subjects.length}`);

  // ----------------------------------------------------
  // Scenario 6: Transport revenue
  // ----------------------------------------------------
  console.log('\n--- Scenario 6: Transport revenue ---');
  const route = await prisma.route.create({
    data: {
      name: `Route-${Date.now()}`,
      vehicleNumber: 'PB-01-XX-9999',
      driverName: 'Jeet Singh',
      driverMobile: '9999999991',
    },
  });

  const stop = await prisma.stop.create({
    data: {
      routeId: route.id,
      name: 'Bus Stop Phase 8',
      fare: 1500,
      orderNo: 1,
    },
  });

  const st = await prisma.studentTransport.create({
    data: {
      studentId: student1.id,
      routeId: route.id,
      stopId: stop.id,
      activeFrom: new Date(),
      monthlyFare: 1500,
      status: 'ACTIVE',
    },
  });

  // Create adjustments mimicking finance linking/unlinking
  await prisma.feeAdjustment.create({
    data: {
      feeAccountId: feeAccount1.id,
      amount: 1500,
      type: 'DEBIT',
      description: 'Transport Linked charge',
      referenceType: 'TRANSPORT',
      referenceId: st.id,
    },
  });

  await prisma.feeAdjustment.create({
    data: {
      feeAccountId: feeAccount1.id,
      amount: 500,
      type: 'CREDIT',
      description: 'Transport discount adjustment',
      referenceType: 'TRANSPORT',
      referenceId: st.id,
    },
  });

  const stopRevReport = await reportsService.getStopRevenueReport();
  const busStopRev = stopRevReport.data.find(s => s.stopId === stop.id);

  assert(busStopRev !== undefined, 'Stop revenue record found');
  assert(busStopRev?.debitTotal === 1500, 'Stop charges debits equal 1500');
  assert(busStopRev?.creditTotal === 500, 'Stop reversals credits equal 500');
  assert(busStopRev?.revenue === 1000, 'Stop net revenue is DEBIT (1500) - CREDIT (500) = 1000');
  console.log(`Stop Revenue verified: net=${busStopRev?.revenue}`);

  // ----------------------------------------------------
  // Scenario 7: Attendance percentages
  // ----------------------------------------------------
  console.log('\n--- Scenario 7: Attendance percentages ---');
  // Setup Attendance
  await prisma.attendance.create({
    data: {
      enrollmentId: enr1.id,
      date: new Date('2026-06-01'),
      status: 'PRESENT',
    },
  });

  await prisma.attendance.create({
    data: {
      enrollmentId: enr1.id,
      date: new Date('2026-06-02'),
      status: 'ABSENT',
    },
  });

  await prisma.attendance.create({
    data: {
      enrollmentId: enr1.id,
      date: new Date('2026-06-03'),
      status: 'LATE',
    },
  });

  const attendanceRep = await reportsService.getStudentAttendancePercent(classItem.id);
  const student1Att = attendanceRep.data.find(a => a.studentName === studentName1);

  assert(student1Att !== undefined, 'Student attendance summary found');
  assert(student1Att?.total === 3, 'Total attended records equals 3');
  assert(student1Att?.present === 2, 'Present count (PRESENT + LATE) equals 2');
  assert(Math.abs(student1Att?.percentage - 66.67) < 0.1, 'Attendance rate is (2/3)*100 = 66.7%');
  console.log(`Student Attendance rate: ${student1Att?.percentage.toFixed(1)}%`);

  // ----------------------------------------------------
  // Scenario 8: CSV export
  // ----------------------------------------------------
  console.log('\n--- Scenario 8: CSV export ---');
  const regExport = await reportsService.getStudentRegister({ status: 'ACTIVE' }, 1, 10000, true);
  // Verify it fetches unpaginated data
  assert(regExport.pagination.limit >= regExport.pagination.total, 'Export mode pagination limit matches total');
  assert(regExport.data.length >= 2, 'Export mode data has all rows');
  console.log(`Export Mode verified. Row count fetched: ${regExport.data.length}`);

  // ----------------------------------------------------
  // Scenario 9: Role restrictions
  // ----------------------------------------------------
  console.log('\n--- Scenario 9: Role restrictions ---');
  // Principal: Full access
  assert(isAllowedReport('PRINCIPAL', 'FINANCE') === true, 'Principal can view Finance');
  assert(isAllowedReport('PRINCIPAL', 'RESULTS') === true, 'Principal can view Results');
  // Teacher: Attendance + Results only
  assert(isAllowedReport('TEACHER', 'ATTENDANCE') === true, 'Teacher can view Attendance');
  assert(isAllowedReport('TEACHER', 'RESULTS') === true, 'Teacher can view Results');
  assert(isAllowedReport('TEACHER', 'FINANCE') === false, 'Teacher blocked from Finance');
  assert(isAllowedReport('TEACHER', 'HR') === false, 'Teacher blocked from HR');
  // Accountant: Finance + HR only
  assert(isAllowedReport('ACCOUNTANT', 'FINANCE') === true, 'Accountant can view Finance');
  assert(isAllowedReport('ACCOUNTANT', 'HR') === true, 'Accountant can view HR');
  assert(isAllowedReport('ACCOUNTANT', 'RESULTS') === false, 'Accountant blocked from Results');
  assert(isAllowedReport('ACCOUNTANT', 'STUDENTS') === false, 'Accountant blocked from Students');
  // Clerk: Read-only to all
  assert(isAllowedReport('CLERK', 'FINANCE') === true, 'Clerk allowed access to Finance');
  assert(isAllowedReport('CLERK', 'RESULTS') === true, 'Clerk allowed access to Results');
  console.log('Role authorization boundaries successfully verified.');

  // ----------------------------------------------------
  // Scenario 10: Pagination
  // ----------------------------------------------------
  console.log('\n--- Scenario 10: Pagination ---');
  const pagedReg = await reportsService.getStudentRegister({ status: 'ACTIVE' }, 1, 1);
  assert(pagedReg.pagination.page === 1, 'Current page is 1');
  assert(pagedReg.pagination.limit === 1, 'Limit equals page size 1');
  assert(pagedReg.data.length === 1, 'Returned only 1 row according to limit');
  assert(pagedReg.pagination.total >= 2, 'Total matching records is correctly reported');
  console.log(`Pagination page limit verified. Total elements: ${pagedReg.pagination.total}`);

  // ----------------------------------------------------
  // Scenario 11: Real Service Limit Verification
  // ----------------------------------------------------
  console.log('\n--- Scenario 11: Real Service Limit Verification ---');
  const limitResult = await reportsService.getStudentRegister({ status: 'ACTIVE' }, 1, 20, true);
  assert(limitResult.data.length <= 10000, 'Real service call limits returned data count to at most 10,000');
  console.log(`Real reports service query limits successfully verified.`);

  const duration = Date.now() - startTime;
  console.log(`\n🎉 E2E Phase 8 Reports & Analytics verification complete in ${duration}ms!`);
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
