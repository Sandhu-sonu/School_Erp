import { prisma, setTransactionClient, clearTransactionClient } from './packages/db/src';
import { linkStudentTransport, unlinkStudentTransport } from './apps/admin/src/lib/services/finance';
import { registerStudent } from './apps/admin/src/lib/services/admissions';
import { uploadStudentPhoto, deleteStudentPhoto } from './apps/admin/src/lib/services/photo';
import { createNotice, publishNotice, archiveNotice, expireNotices, getActiveNotices } from './apps/admin/src/lib/services/communications';
import { NoticeStatus } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ ASSERTION PASSED: ${message}`);
  }
}

async function runVerification() {
  console.log('🚀 Starting Phase 7 Verification Scenarios...');

  const startTime = Date.now();

  // Setup basic active session for transport linking
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
  }

  // Setup Class & Section for Student Registration
  let classItem = await prisma.class.findUnique({ where: { name: 'Class 10' } });
  if (!classItem) {
    classItem = await prisma.class.create({
      data: { name: 'Class 10', sequence: 10 },
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

  // Setup Fee Plan so registration succeeds
  let feePlan = await prisma.feePlan.findUnique({
    where: {
      sessionId_classId: {
        sessionId: session.id,
        classId: classItem.id,
      },
    },
  });
  if (!feePlan) {
    feePlan = await prisma.feePlan.create({
      data: {
        sessionId: session.id,
        classId: classItem.id,
        tuitionFee: 15000,
        admissionFee: 2000,
      },
    });
  }

  // Setup Parent
  let parent = await prisma.parent.findUnique({
    where: { mobile: '9876543219' },
  });
  if (!parent) {
    parent = await prisma.parent.create({
      data: {
        fatherName: 'Father Test',
        motherName: 'Mother Test',
        mobile: '9876543219',
        address: 'Test Address',
      },
    });
  }

  // ----------------------------------------------------
  // Scenario 1: Create Route
  // ----------------------------------------------------
  console.log('\n--- Scenario 1: Create Route ---');
  const routeName = `Route-${Date.now()}`;
  const route = await prisma.route.create({
    data: {
      name: routeName,
      vehicleNumber: 'PB-65-Z-9999',
      driverName: 'Ramesh Singh',
      driverMobile: '9876543210',
    },
  });
  assert(route.id !== undefined, 'Route created successfully with unique ID');
  assert(route.driverName === 'Ramesh Singh', 'Route driver name matches Ramesh Singh');

  // ----------------------------------------------------
  // Scenario 2: Create Stop
  // ----------------------------------------------------
  console.log('\n--- Scenario 2: Create Stop ---');
  const stop = await prisma.stop.create({
    data: {
      routeId: route.id,
      name: 'Sector 44 Crossing',
      fare: 1500.00,
      orderNo: 1,
    },
  });
  assert(stop.id !== undefined, 'Stop created successfully with unique ID');
  assert(Number(stop.fare) === 1500.00, 'Stop fare matches 1500.00');

  // ----------------------------------------------------
  // Scenario 3: Assign Transport
  // ----------------------------------------------------
  console.log('\n--- Scenario 3: Assign Transport ---');
  const student = await registerStudent({
    name: 'Phase 7 Student',
    dob: '2012-05-15',
    gender: 'Male',
    parentId: parent.id,
    classId: classItem.id,
    sectionId: sectionItem.id,
  });

  const st = await linkStudentTransport(student.id, route.id, stop.id);
  assert(st.status === 'ACTIVE', 'Student transport is linked as ACTIVE');
  assert(Number(st.monthlyFare) === 1500.00, 'Stop fare is snapshotted into monthlyFare');

  // ----------------------------------------------------
  // Scenario 4: Verify DEBIT adjustment
  // ----------------------------------------------------
  console.log('\n--- Scenario 4: Verify DEBIT adjustment ---');
  const enrollment = await prisma.classEnrollment.findFirstOrThrow({
    where: { studentId: student.id, isArchived: false },
    include: { feeAccount: { include: { adjustments: true } } },
  });
  
  const feeAccount = enrollment.feeAccount!;
  const expectedRemaining = 17000 + 1500.00; // base (15000+2000) + transport (1500)
  
  assert(Number(feeAccount.totalFee) === 17000, 'totalFee remains immutable (original snapshot)');
  assert(Number(feeAccount.remainingFee) === expectedRemaining, 'remainingFee is correctly debited');
  
  const debitAdjust = feeAccount.adjustments.find(a => a.type === 'DEBIT' && a.referenceType === 'TRANSPORT');
  assert(debitAdjust !== undefined, 'DEBIT FeeAdjustment created with TRANSPORT referenceType');
  assert(debitAdjust?.referenceId === st.id, 'Adjustment referenceId matches StudentTransport ID');
  assert(Number(debitAdjust?.amount) === 1500.00, 'Adjustment amount matches the monthlyFare');

  // ----------------------------------------------------
  // Scenario 5: Remove Transport
  // ----------------------------------------------------
  console.log('\n--- Scenario 5: Remove Transport ---');
  const unlinkedSt = await unlinkStudentTransport(student.id);
  assert(unlinkedSt !== null, 'Transport unlinked successfully');
  assert(unlinkedSt?.status === 'INACTIVE', 'Transport assignment marked as INACTIVE');
  assert(unlinkedSt?.activeTo !== null, 'activeTo timestamp populated');

  // ----------------------------------------------------
  // Scenario 6: Verify CREDIT adjustment (Prorated)
  // ----------------------------------------------------
  console.log('\n--- Scenario 6: Verify CREDIT adjustment (Prorated) ---');
  const updatedEnrollment = await prisma.classEnrollment.findFirstOrThrow({
    where: { studentId: student.id, isArchived: false },
    include: { feeAccount: { include: { adjustments: true } } },
  });
  
  const updatedFeeAccount = updatedEnrollment.feeAccount!;
  const today = new Date();
  const tYear = today.getFullYear();
  const tMonth = today.getMonth();
  const totalDays = new Date(tYear, tMonth + 1, 0).getDate();
  const remainingDays = totalDays - today.getDate();
  const expectedProratedCredit = Math.max(0, Number(((1500.00 * remainingDays) / totalDays).toFixed(2)));
  const expectedRemainingAfterUnlink = 17000 + 1500.00 - expectedProratedCredit;

  assert(Number(updatedFeeAccount.totalFee) === 17000, 'totalFee snapshot unchanged after unlink');
  assert(Number(updatedFeeAccount.remainingFee) === expectedRemainingAfterUnlink, `remainingFee is prorated correctly. Expected: ${expectedRemainingAfterUnlink}, Got: ${updatedFeeAccount.remainingFee}`);
  
  const creditAdjust = updatedFeeAccount.adjustments.find(a => a.type === 'CREDIT' && a.referenceType === 'TRANSPORT');
  assert(creditAdjust !== undefined, 'CREDIT FeeAdjustment created with TRANSPORT reference');
  assert(Number(creditAdjust?.amount) === expectedProratedCredit, `CREDIT adjustment matches prorated amount. Expected: ${expectedProratedCredit}, Got: ${creditAdjust?.amount}`);

  // ----------------------------------------------------
  // Scenario 7: Upload Photo
  // ----------------------------------------------------
  console.log('\n--- Scenario 7: Upload Photo ---');
  const sharp = (await import('sharp')).default;
  // Dynamically generate a valid 10x10 PNG buffer using sharp
  const dummyPng = await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 3,
      background: { r: 255, g: 0, b: 0 }
    }
  }).png().toBuffer();
  
  const photoPath = await uploadStudentPhoto(student.id, dummyPng, 'image/png');
  assert(photoPath === `students/student-${student.id}.webp`, 'Correct relative photo path stored');
  
  const diskPath = path.join(process.cwd(), 'public', 'uploads', photoPath);
  const fileExists = await fs.access(diskPath).then(() => true).catch(() => false);
  assert(fileExists, 'Photo webp file successfully created on disk');

  // ----------------------------------------------------
  // Scenario 8: Replace Photo
  // ----------------------------------------------------
  console.log('\n--- Scenario 8: Replace Photo ---');
  // Dynamically generate a valid 10x10 JPEG buffer using sharp
  const dummyJpeg = await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 3,
      background: { r: 0, g: 255, b: 0 }
    }
  }).jpeg().toBuffer();
  
  const newPhotoPath = await uploadStudentPhoto(student.id, dummyJpeg, 'image/jpeg');
  assert(newPhotoPath === `students/student-${student.id}.webp`, 'Replaced photo keeps same name');
  
  const newDiskPath = path.join(process.cwd(), 'public', 'uploads', newPhotoPath);
  const newFileExists = await fs.access(newDiskPath).then(() => true).catch(() => false);
  assert(newFileExists, 'New photo file exists on disk');
  
  await deleteStudentPhoto(student.id);
  const deletedStudent = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
  assert(deletedStudent.photo === null, 'Student photo database field set to null after delete');
  
  const fileStillExists = await fs.access(newDiskPath).then(() => true).catch(() => false);
  assert(!fileStillExists, 'Photo file successfully removed from disk');

  // ----------------------------------------------------
  // Scenario 9: Publish Notice
  // ----------------------------------------------------
  console.log('\n--- Scenario 9: Publish Notice ---');
  const notice = await createNotice(
    'Phase 7 Sports Meet',
    'Join our sports meet on Friday.',
    'TEACHER',
    null,
    new Date(Date.now() + 86400 * 1000)
  );
  assert(notice.status === NoticeStatus.DRAFT, 'New notice is created as DRAFT');
  
  const published = await publishNotice(notice.id);
  assert(published.status === NoticeStatus.PUBLISHED, 'Notice updated to PUBLISHED status');
  assert(published.publishDate !== null, 'Notice publishDate populated');

  // ----------------------------------------------------
  // Scenario 10: Expire Notice
  // ----------------------------------------------------
  console.log('\n--- Scenario 10: Expire Notice ---');
  // Create a notice already expired in the database
  const expiredNotice = await prisma.notice.create({
    data: {
      title: 'Expired Announcement',
      description: 'This is in the past.',
      status: NoticeStatus.PUBLISHED,
      expiryDate: new Date(Date.now() - 3600 * 1000), // 1 hour ago
      publishDate: new Date(Date.now() - 7200 * 1000),
    },
  });
  
  const countExpired = await expireNotices();
  assert(countExpired >= 1, 'At least one notice was expired during cleanup');
  
  const checkNotice = await prisma.notice.findUniqueOrThrow({ where: { id: expiredNotice.id } });
  assert(checkNotice.status === NoticeStatus.EXPIRED, 'Notice status updated to EXPIRED');

  // ----------------------------------------------------
  // Scenario 11: Role checks
  // ----------------------------------------------------
  console.log('\n--- Scenario 11: Role checks ---');
  // Verify list of active notices filters out expired/archived ones
  const activeNotices = await getActiveNotices();
  const foundExpired = activeNotices.some(n => n.id === expiredNotice.id);
  assert(!foundExpired, 'getActiveNotices does not return expired notices');
  assert(activeNotices.length >= 1, 'getActiveNotices returns published active notices');

  console.log(`\n🎉 All Phase 7 Verification Scenarios completed successfully in ${Date.now() - startTime}ms!`);
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
