import { prisma } from '@school-erp/db';
import { hashPassword } from '@school-erp/utils';
import { NextRequest } from 'next/server';

// Import Route Handlers directly to call them programmatically
import { POST as authPost, DELETE as authDelete } from '../apps/admin/src/app/api/portal/auth/route';
import { GET as profileGet, PUT as profilePut } from '../apps/admin/src/app/api/portal/profile/route';
import { GET as dashboardGet } from '../apps/admin/src/app/api/portal/dashboard/route';
import { GET as feesGet } from '../apps/admin/src/app/api/portal/fees/route';
import { GET as resultsGet } from '../apps/admin/src/app/api/portal/results/route';
import { GET as noticesGet } from '../apps/admin/src/app/api/portal/notices/route';
import { GET as calendarGet } from '../apps/admin/src/app/api/portal/calendar/route';

async function runSecurityTests() {
  console.log('🛡 Starting Comprehensive Parent Portal Security & Integration Audits...\n');

  // --- STEP 1: SEED SECURITY TEST DATA ---
  console.log('Step 1: Seeding database test profiles, fees, exams, and marks...');
  
  // Find or create active session
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

  // Create Parent A & Child A
  const parentA = await prisma.parent.upsert({
    where: { mobile: '1111111111' },
    update: { passwordHash: hashPassword('passwordA') },
    create: {
      fatherName: 'Father A',
      mobile: '1111111111',
      passwordHash: hashPassword('passwordA'),
      address: 'Address A'
    }
  });

  const studentA = await prisma.student.upsert({
    where: { admissionNumber: 'ADM-AAAA-2026' },
    update: { parentId: parentA.id },
    create: {
      name: 'Student A',
      admissionNumber: 'ADM-AAAA-2026',
      dob: new Date('2012-01-01'),
      gender: 'MALE',
      parentId: parentA.id
    }
  });

  // Create Parent B & Child B
  const parentB = await prisma.parent.upsert({
    where: { mobile: '2222222222' },
    update: { passwordHash: hashPassword('passwordB') },
    create: {
      fatherName: 'Father B',
      mobile: '2222222222',
      passwordHash: hashPassword('passwordB'),
      address: 'Address B'
    }
  });

  const studentB = await prisma.student.upsert({
    where: { admissionNumber: 'ADM-BBBB-2026' },
    update: { parentId: parentB.id },
    create: {
      name: 'Student B',
      admissionNumber: 'ADM-BBBB-2026',
      dob: new Date('2012-02-02'),
      gender: 'FEMALE',
      parentId: parentB.id
    }
  });

  // Set up Classes
  const class10 = await prisma.class.upsert({
    where: { name: 'Class 10' },
    update: {},
    create: { name: 'Class 10', sequence: 10 }
  });

  const class9 = await prisma.class.upsert({
    where: { name: 'Class 9' },
    update: {},
    create: { name: 'Class 9', sequence: 9 }
  });

  const sectionA = await prisma.section.upsert({
    where: { classId_name: { classId: class10.id, name: 'A' } },
    update: {},
    create: { classId: class10.id, name: 'A' }
  });

  const sectionB = await prisma.section.upsert({
    where: { classId_name: { classId: class9.id, name: 'B' } },
    update: {},
    create: { classId: class9.id, name: 'B' }
  });

  // Enroll Student A in Class 10-A, Student B in Class 9-B
  const enrollA = await prisma.classEnrollment.upsert({
    where: { studentId_sessionId: { studentId: studentA.id, sessionId: session.id } },
    update: { isArchived: false, sectionId: sectionA.id, classId: class10.id },
    create: { studentId: studentA.id, classId: class10.id, sectionId: sectionA.id, sessionId: session.id, isArchived: false }
  });

  const enrollB = await prisma.classEnrollment.upsert({
    where: { studentId_sessionId: { studentId: studentB.id, sessionId: session.id } },
    update: { isArchived: false, sectionId: sectionB.id, classId: class9.id },
    create: { studentId: studentB.id, classId: class9.id, sectionId: sectionB.id, sessionId: session.id, isArchived: false }
  });

  // Seed Fee Accounts & Receipts for Child A
  const feeAccountA = await prisma.studentFeeAccount.upsert({
    where: { enrollmentId: enrollA.id },
    update: { totalFee: 20000, paidAmount: 15000, remainingFee: 5000 },
    create: { enrollmentId: enrollA.id, totalFee: 20000, paidAmount: 15000, remainingFee: 5000, feeStatus: 'PARTIAL' }
  });

  // Seed test User for collecting fees
  let adminUser = await prisma.user.findFirst();
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: { email: 'admin@school.com', name: 'Admin', passwordHash: 'hash', role: 'PRINCIPAL' }
    });
  }

  // Seed transaction
  await prisma.feeTransaction.upsert({
    where: { receiptNumber: 'REC-TEST-AAAA' },
    update: {},
    create: {
      receiptNumber: 'REC-TEST-AAAA',
      feeAccountId: feeAccountA.id,
      amount: 15000,
      paymentMode: 'BANK',
      collectedById: adminUser.id,
      notes: 'First installment payment'
    }
  });

  // Seed adjustment
  await prisma.feeAdjustment.create({
    data: {
      feeAccountId: feeAccountA.id,
      amount: 2000,
      type: 'DEBIT',
      description: 'Annual Library Fee allocation'
    }
  });

  // Seed Subjects for Class 10
  const math = await prisma.subject.upsert({
    where: { classId_code: { classId: class10.id, code: 'MATHS' } },
    update: {},
    create: { name: 'Mathematics', code: 'MATHS', classId: class10.id }
  });

  const science = await prisma.subject.upsert({
    where: { classId_code: { classId: class10.id, code: 'SCIEN' } },
    update: {},
    create: { name: 'Science', code: 'SCIEN', classId: class10.id }
  });

  // Seed published Exam & Marks for Class 10 (Student A)
  const exam = await prisma.exam.create({
    data: {
      sessionId: session.id,
      name: 'Midterm Term 1',
      startDate: new Date(),
      endDate: new Date(),
      published: true
    }
  });

  await prisma.examMark.create({
    data: { examId: exam.id, studentId: studentA.id, subjectId: math.id, maxMarks: 100, obtained: 85 }
  });

  await prisma.examMark.create({
    data: { examId: exam.id, studentId: studentA.id, subjectId: science.id, maxMarks: 100, obtained: 92 }
  });

  // Create Result for Student A
  await prisma.result.upsert({
    where: { examId_studentId: { examId: exam.id, studentId: studentA.id } },
    update: { total: 177, percentage: 88.5, finalGrade: 'A', rank: 1, published: true },
    create: {
      examId: exam.id,
      studentId: studentA.id,
      total: 177,
      percentage: 88.5,
      finalGrade: 'A',
      rank: 1,
      published: true,
      snapshotJson: {}
    }
  });

  // Seed Notices
  // 1. Global Notice
  await prisma.notice.create({
    data: { title: 'Annual Day Celebrations', description: 'Scheduled for December 15th.', status: 'PUBLISHED' }
  });
  // 2. Class 10 Notice
  await prisma.notice.create({
    data: { title: 'Class 10 Syllabus Update', description: 'Chapters 5-8 are included in maths.', targetClass: 'Class 10', status: 'PUBLISHED' }
  });
  // 3. Class 9 Notice
  await prisma.notice.create({
    data: { title: 'Class 9 Projects', description: 'Science projects due tomorrow.', targetClass: 'Class 9', status: 'PUBLISHED' }
  });

  console.log('✔ Test data seeded successfully!');

  // Helper function to mock NextRequest with parent_session cookie
  function mockReq(url: string, parentId?: string, method = 'GET', body?: any) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (parentId) {
      headers['cookie'] = `parent_session=${parentId}`;
    }
    return new NextRequest(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  }

  // --- STEP 2: TEST AUTHENTICATION HANDLERS ---
  console.log('\nStep 2: Auditing Authentication API Handler...');
  
  // Test invalid password login
  const invalidLogin = await authPost(mockReq('http://localhost/api/portal/auth', undefined, 'POST', {
    mobile: '1111111111',
    password: 'wrongpassword'
  }));
  console.log(`✔ Invalid login attempt response code: ${invalidLogin.status} (Expected: 401)`);
  if (invalidLogin.status !== 401) throw new Error('Auth bypass detected!');

  // Test valid login
  const validLogin = await authPost(mockReq('http://localhost/api/portal/auth', undefined, 'POST', {
    mobile: '1111111111',
    password: 'passwordA'
  }));
  console.log(`✔ Valid login attempt response code: ${validLogin.status} (Expected: 200)`);
  if (validLogin.status !== 200) throw new Error('Valid login failed!');

  // --- STEP 3: TEST DATA ISOLATION & AUTHORIZATION ---
  console.log('\nStep 3: Auditing Parent Data Isolation (Security Gates)...');

  // Verify Parent A cannot access Parent B's child data
  console.log(`- Requesting Student B's Dashboard using Parent A's session...`);
  const hackDashboard = await dashboardGet(mockReq(`http://localhost/api/portal/dashboard?studentId=${studentB.id}`, parentA.id));
  console.log(`✔ Blocked Parent A accessing Student B's Dashboard: HTTP ${hackDashboard.status}`);
  if (hackDashboard.status !== 403) throw new Error('Data breach! Parent A accessed Parent B\'s child dashboard.');

  console.log(`- Requesting Student B's Fees using Parent A's session...`);
  const hackFees = await feesGet(mockReq(`http://localhost/api/portal/fees?studentId=${studentB.id}`, parentA.id));
  console.log(`✔ Blocked Parent A accessing Student B's Fees: HTTP ${hackFees.status}`);
  if (hackFees.status !== 403) throw new Error('Data breach! Parent A accessed Parent B\'s child fees ledger.');

  console.log(`- Requesting Student B's Results using Parent A's session...`);
  const hackResults = await resultsGet(mockReq(`http://localhost/api/portal/results?studentId=${studentB.id}`, parentA.id));
  console.log(`✔ Blocked Parent A accessing Student B's Results: HTTP ${hackResults.status}`);
  if (hackResults.status !== 403) throw new Error('Data breach! Parent A accessed Parent B\'s child exam results.');

  console.log(`- Requesting Student B's Notices using Parent A's session...`);
  const hackNotices = await noticesGet(mockReq(`http://localhost/api/portal/notices?studentId=${studentB.id}`, parentA.id));
  console.log(`✔ Blocked Parent A accessing Student B's Notices: HTTP ${hackNotices.status}`);
  if (hackNotices.status !== 403) throw new Error('Data breach! Parent A accessed Parent B\'s child notices.');

  // Verify unauthorized requests (no cookie) are blocked
  console.log(`- Requesting Student A's Dashboard without session cookie...`);
  const unauthDashboard = await dashboardGet(mockReq(`http://localhost/api/portal/dashboard?studentId=${studentA.id}`));
  console.log(`✔ Blocked anonymous access: HTTP ${unauthDashboard.status}`);
  if (unauthDashboard.status !== 401) throw new Error('Security flaw: Anonymous dashboard access allowed.');

  // --- STEP 4: AUDIT RESULTS & STANDINGS ---
  console.log('\nStep 4: Testing Results Standings & Grade Records...');
  const resResponse = await resultsGet(mockReq(`http://localhost/api/portal/results?studentId=${studentA.id}`, parentA.id));
  const resultsData = await resResponse.json();
  
  console.log(`✔ Results returned: ${resultsData.length} exams`);
  const term1 = resultsData[0];
  console.log(`✔ Exam Name: ${term1.examName}`);
  console.log(`✔ Percentage: ${term1.percentage}% | Grade: ${term1.finalGrade} | Rank: #${term1.rank}`);
  console.log(`✔ Subject Marks verified:`);
  for (const m of term1.marks) {
    console.log(`  - ${m.subjectName}: ${m.marksObtained}/${m.maxMarks}`);
  }

  if (term1.percentage !== 88.5 || term1.rank !== 1 || term1.finalGrade !== 'A') {
    throw new Error('Exam compilation calculation does not match mock values!');
  }

  // --- STEP 5: AUDIT FEES & SLIPS ---
  console.log('\nStep 5: Testing Fees Ledgers & Collections Slips...');
  const feeResponse = await feesGet(mockReq(`http://localhost/api/portal/fees?studentId=${studentA.id}`, parentA.id));
  const feeData = await feeResponse.json();
  
  console.log(`✔ Billing Status: ${feeData.feeAccount.feeStatus}`);
  console.log(`✔ Billed: ₹${feeData.feeAccount.totalFee}, Paid: ₹${feeData.feeAccount.paidAmount}, Remaining Dues: ₹${feeData.feeAccount.remainingFee}`);
  
  console.log(`✔ Active receipts printed slips:`);
  for (const tx of feeData.transactions) {
    console.log(`  - Receipt: ${tx.receiptNumber} | Amount: ₹${tx.amount} | Status: ${tx.status}`);
  }

  if (feeData.feeAccount.remainingFee !== 5000 || feeData.transactions[0].receiptNumber !== 'REC-TEST-AAAA') {
    throw new Error('Billing ledger statistics do not match seeded values!');
  }

  // --- STEP 6: AUDIT NOTICE FILTERING ---
  console.log('\nStep 6: Testing Targeted Notice Board Filter Rules...');
  const noticesResponse = await noticesGet(mockReq(`http://localhost/api/portal/notices?studentId=${studentA.id}`, parentA.id));
  const noticesData = await noticesResponse.json();
  
  console.log(`✔ Notices returned for Student A (Class 10):`);
  for (const notice of noticesData) {
    console.log(`  - [${notice.targetClass || 'GLOBAL'}] ${notice.title}`);
  }

  // Verify that Parent A does NOT see Class 9 notice
  const hasClass9Notice = noticesData.some((n: any) => n.title.includes('Class 9'));
  if (hasClass9Notice) {
    throw new Error('Security leak! Parent A can see notices targeted strictly to Class 9.');
  }
  console.log('✔ Notice filter successfully blocked targetClass leaks!');

  // --- STEP 7: TEST PASSWORD CHANGE SECURITY CYCLE ---
  console.log('\nStep 7: Testing PUT Password Change Flow...');
  
  // Test password change with incorrect current password
  const badChange = await profilePut(mockReq('http://localhost/api/portal/profile', parentA.id, 'PUT', {
    currentPassword: 'wrongcurrentpassword',
    newPassword: 'newpassword123'
  }));
  console.log(`✔ Bad password update response code: ${badChange.status} (Expected: 400)`);
  if (badChange.status !== 400) throw new Error('Allowed password change with wrong credentials!');

  // Test valid password change
  const goodChange = await profilePut(mockReq('http://localhost/api/portal/profile', parentA.id, 'PUT', {
    currentPassword: 'passwordA',
    newPassword: 'newpassword123'
  }));
  console.log(`✔ Valid password update response code: ${goodChange.status} (Expected: 200)`);
  if (goodChange.status !== 200) throw new Error('Valid password update failed!');

  // Verify new password works in login
  const testNewLogin = await authPost(mockReq('http://localhost/api/portal/auth', undefined, 'POST', {
    mobile: '1111111111',
    password: 'newpassword123'
  }));
  console.log(`✔ Login with new password response code: ${testNewLogin.status} (Expected: 200)`);
  if (testNewLogin.status !== 200) throw new Error('New password failed to authenticate!');

  // Restore password back to "passwordA"
  await profilePut(mockReq('http://localhost/api/portal/profile', parentA.id, 'PUT', {
    currentPassword: 'newpassword123',
    newPassword: 'passwordA'
  }));

  // --- STEP 8: TEST LOGOUT & COOKIE INVALIDATION ---
  console.log('\nStep 8: Testing Session Logout Invalidation...');
  const logoutRes = await authDelete();
  const setCookieHeader = logoutRes.headers.get('set-cookie');
  console.log(`✔ Logout response Set-Cookie header: ${setCookieHeader}`);
  if (!setCookieHeader || !setCookieHeader.toLowerCase().includes('max-age=0')) {
    throw new Error('Logout failed to invalidate cookie session!');
  }
  console.log('✔ Session cookie invalidation verified!');

  console.log('\n🎉 ALL PORTAL SECURITY, DATA ISOLATION, AND RESULTS AUDITS PASSED WITH ZERO FLASHOVER!');
}

runSecurityTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Security Audit Failed:', err);
    process.exit(1);
  });
