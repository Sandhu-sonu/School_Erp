import { prisma } from '@school-erp/db';

/**
 * Class Enrollment Services
 */
export async function createEnrollment(studentId: string, sessionId: string, classId: string, sectionId?: string) {
  // Check if active session enrollment already exists for this student
  const existing = await prisma.classEnrollment.findFirst({
    where: { studentId, sessionId },
  });
  if (existing) {
    throw new Error('Student is already enrolled in this academic session.');
  }

  // Get fee plan for this class and session
  const feePlan = await prisma.feePlan.findUnique({
    where: {
      sessionId_classId: {
        sessionId,
        classId,
      },
    },
  });
  const tuition = feePlan ? Number(feePlan.tuitionFee) : 0;
  const admission = feePlan ? Number(feePlan.admissionFee) : 0;
  const annual = feePlan ? Number(feePlan.annualCharges || 0) : 0;
  const activity = feePlan ? Number(feePlan.activityCharges || 0) : 0;
  const totalFee = tuition + admission + annual + activity;

  return await prisma.$transaction(async (tx) => {
    const enrollment = await tx.classEnrollment.create({
      data: {
        studentId,
        sessionId,
        classId,
        sectionId: sectionId || null,
        isArchived: false,
      },
    });

    // Initialize student fee account
    await tx.studentFeeAccount.create({
      data: {
        enrollmentId: enrollment.id,
        totalFee,
        paidAmount: 0,
        remainingFee: totalFee,
        feeStatus: 'UNPAID',
      },
    });

    return enrollment;
  });
}

export async function updateEnrollment(id: string, classId: string, sectionId?: string) {
  const enrollment = await prisma.classEnrollment.findUnique({
    where: { id },
  });

  if (!enrollment) {
    throw new Error('Enrollment record not found.');
  }
  if (enrollment.isArchived) {
    throw new Error('Archived enrollments are immutable.');
  }

  return await prisma.classEnrollment.update({
    where: { id },
    data: {
      classId,
      sectionId: sectionId || null,
    },
  });
}

export async function getEnrollments(filters: { sessionId?: string; classId?: string; sectionId?: string; search?: string }) {
  const where: any = {};

  if (filters.sessionId) where.sessionId = filters.sessionId;
  if (filters.classId) where.classId = filters.classId;
  if (filters.sectionId) where.sectionId = filters.sectionId;

  if (filters.search) {
    where.student = {
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' as const } },
        { admissionNumber: { contains: filters.search, mode: 'insensitive' as const } },
      ],
    };
  }

  return await prisma.classEnrollment.findMany({
    where,
    orderBy: { student: { name: 'asc' } },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          admissionNumber: true,
          status: true,
        },
      },
      session: { select: { name: true } },
      class: { select: { name: true } },
      section: { select: { name: true } },
      feeAccount: true,
    },
  });
}

/**
 * Promotion Engine Services
 */

export interface PromotionPreviewItem {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  status: string;
  currentClass: string;
  nextClass: string; // Name of class or "ALUMNI"
  nextClassId: string | null;
  promotable: boolean;
  reason?: string;
}

export async function getPromotionPreview(classId: string, sectionId: string | null, fromSessionId: string, toSessionId: string): Promise<PromotionPreviewItem[]> {
  // Query all active enrollments for the class/section under the source session
  const enrollments = await prisma.classEnrollment.findMany({
    where: {
      classId,
      ...(sectionId ? { sectionId } : {}),
      sessionId: fromSessionId,
      isArchived: false,
    },
    include: {
      student: true,
      class: true,
    },
  });

  const sourceClass = await prisma.class.findUniqueOrThrow({ where: { id: classId } });
  
  // Find next class by sequence level (S + 1)
  const nextClass = await prisma.class.findFirst({
    where: { sequence: sourceClass.sequence + 1 },
  });

  const previewList: PromotionPreviewItem[] = [];

  for (const en of enrollments) {
    const student = en.student;
    let promotable = true;
    let reason = '';
    let nextClassName = nextClass ? nextClass.name : 'ALUMNI';
    let nextClassId = nextClass ? nextClass.id : null;

    // Rules checks
    if (student.status !== 'ACTIVE') {
      promotable = false;
      reason = `Student lifecycle state is ${student.status}`;
    }

    // Check if target enrollment already exists (double promotion check)
    const alreadyPromoted = await prisma.classEnrollment.findFirst({
      where: {
        studentId: student.id,
        sessionId: toSessionId,
      },
    });

    if (alreadyPromoted) {
      promotable = false;
      reason = 'Student already has an enrollment for the target academic session';
    }

    previewList.push({
      studentId: student.id,
      studentName: student.name,
      admissionNumber: student.admissionNumber,
      status: student.status,
      currentClass: sourceClass.name,
      nextClass: nextClassName,
      nextClassId,
      promotable,
      reason: reason || undefined,
    });
  }

  return previewList;
}

/**
 * Execute Batch Promotion Process
 */
export async function promoteStudentsBatch(studentIds: string[], fromSessionId: string, toSessionId: string) {
  const activeSession = await prisma.academicSession.findUniqueOrThrow({ where: { id: fromSessionId } });
  const targetSession = await prisma.academicSession.findUniqueOrThrow({ where: { id: toSessionId } });

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const studentId of studentIds) {
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Fetch student detail
        const student = await tx.student.findUniqueOrThrow({
          where: { id: studentId },
        });

        // Guard validations
        if (student.status === 'DELETED') {
          throw new Error(`Student ${student.name} is soft-deleted.`);
        }
        if (student.status === 'ALUMNI') {
          throw new Error(`Student ${student.name} is already an alumnus.`);
        }
        if (student.status === 'DROPPED') {
          throw new Error(`Student ${student.name} has dropped out (promotion frozen).`);
        }

        // 2. Fetch active source enrollment
        const sourceEnrollment = await tx.classEnrollment.findFirst({
          where: { studentId, sessionId: fromSessionId, isArchived: false },
          include: { class: true },
        });

        if (!sourceEnrollment) {
          throw new Error(`No active enrollment found for session ${activeSession.name}`);
        }

        // 3. Double promotion check
        const targetEnrollment = await tx.classEnrollment.findFirst({
          where: { studentId, sessionId: toSessionId },
        });
        if (targetEnrollment) {
          throw new Error('Duplicate promotion check triggered: Student already enrolled in target session.');
        }

        const currentClass = sourceEnrollment.class;
        const nextClass = await tx.class.findFirst({
          where: { sequence: currentClass.sequence + 1 },
        });

        // 4. Archive current enrollment
        await tx.classEnrollment.update({
          where: { id: sourceEnrollment.id },
          data: { isArchived: true },
        });

        if (!nextClass) {
          // No next class -> Graduate student to ALUMNI
          await tx.student.update({
            where: { id: studentId },
            data: { status: 'ALUMNI' },
          });

          // Log Promotion History
          await tx.promotionHistory.create({
            data: {
              studentId,
              fromSessionId,
              toSessionId,
              fromClassId: currentClass.id,
              toClassId: currentClass.id, // Graduated at Class 12
            },
          });
        } else {
          // Standard class promotion

          // Find if target section exists with same name in next class
          let targetSectionId = null;
          if (sourceEnrollment.sectionId) {
            const currentSection = await tx.section.findUnique({
              where: { id: sourceEnrollment.sectionId },
            });
            if (currentSection) {
              const matchingSection = await tx.section.findFirst({
                where: { classId: nextClass.id, name: currentSection.name },
              });
              if (matchingSection) {
                targetSectionId = matchingSection.id;
              }
            }
          }

          // Create new enrollment
          const newEnrollment = await tx.classEnrollment.create({
            data: {
              studentId,
              sessionId: toSessionId,
              classId: nextClass.id,
              sectionId: targetSectionId,
              isArchived: false,
            },
          });

          // Fetch next class fee plan
          const nextFeePlan = await tx.feePlan.findUnique({
            where: {
              sessionId_classId: {
                sessionId: toSessionId,
                classId: nextClass.id,
              },
            },
          });
          const tuition = nextFeePlan ? Number(nextFeePlan.tuitionFee) : 0;
          const admission = nextFeePlan ? Number(nextFeePlan.admissionFee) : 0;
          const annual = nextFeePlan ? Number(nextFeePlan.annualCharges || 0) : 0;
          const activity = nextFeePlan ? Number(nextFeePlan.activityCharges || 0) : 0;
          const totalFee = tuition + admission + annual + activity;

          // Create student fee account
          await tx.studentFeeAccount.create({
            data: {
              enrollmentId: newEnrollment.id,
              totalFee,
              paidAmount: 0,
              remainingFee: totalFee,
              feeStatus: 'UNPAID',
            },
          });

          // Log Promotion History
          await tx.promotionHistory.create({
            data: {
              studentId,
              fromSessionId,
              toSessionId,
              fromClassId: currentClass.id,
              toClassId: nextClass.id,
            },
          });
        }

        // Write Audit log
        await tx.auditLog.create({
          data: {
            action: 'PROMOTE_STUDENT',
            details: `Promoted student ${student.name} from Class ${currentClass.name} to ${nextClass ? nextClass.name : 'ALUMNI'}`,
          },
        });
      });

      results.success++;
    } catch (err: any) {
      results.failed++;
      results.errors.push(`Student ID ${studentId} failed: ${err.message}`);
    }
  }

  return results;
}

/**
 * Attendance Services
 */

export interface AttendancePayload {
  enrollmentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';

export async function getAttendanceGrid(date: Date, classId: string, sectionId?: string) {
  // 1. Fetch active enrollments
  const enrollments = await prisma.classEnrollment.findMany({
    where: {
      classId,
      ...(sectionId ? { sectionId } : {}),
      isArchived: false,
    },
    include: {
      student: true,
    },
    orderBy: { student: { name: 'asc' } },
  });

  // 2. Fetch existing attendance for this date
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      date: date,
      enrollmentId: {
        in: enrollments.map((e) => e.id),
      },
    },
  });

  return enrollments.map((en) => {
    const record = attendanceRecords.find((r) => r.enrollmentId === en.id);
    return {
      enrollmentId: en.id,
      studentName: en.student.name,
      admissionNumber: en.student.admissionNumber,
      status: en.student.status,
      attendanceStatus: record ? record.status : null,
      remarks: record ? record.remarks : '',
    };
  });
}

export async function recordAttendanceBatch(date: Date, records: AttendancePayload[]) {
  // Format Date to strip time elements
  const dateOnly = new Date(date);
  dateOnly.setUTCHours(0, 0, 0, 0);

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  const yearMonth = `${dateOnly.getUTCFullYear()}-${String(dateOnly.getUTCMonth() + 1).padStart(2, '0')}`;

  for (const record of records) {
    try {
      await prisma.$transaction(async (tx) => {
        // Fetch enrollment and check student status locks
        const enrollment = await tx.classEnrollment.findUniqueOrThrow({
          where: { id: record.enrollmentId },
          include: { student: true },
        });

        const student = enrollment.student;
        if (student.status === 'TRANSFERRED') {
          throw new Error('Attendance locked: Student is transferred.');
        }
        if (student.status === 'DELETED') {
          throw new Error('Attendance locked: Student record is soft-deleted.');
        }
        if (student.status === 'ALUMNI') {
          throw new Error('Attendance locked: Student is an alumnus.');
        }

        // Upsert attendance record
        const oldAttendance = await tx.attendance.findUnique({
          where: {
            enrollmentId_date: {
              enrollmentId: record.enrollmentId,
              date: dateOnly,
            },
          },
        });

        await tx.attendance.upsert({
          where: {
            enrollmentId_date: {
              enrollmentId: record.enrollmentId,
              date: dateOnly,
            },
          },
          update: {
            status: record.status,
            remarks: record.remarks || null,
          },
          create: {
            enrollmentId: record.enrollmentId,
            date: dateOnly,
            status: record.status,
            remarks: record.remarks || null,
          },
        });

        // Update Monthly Aggregates (AttendanceSummary)
        // Find or create summary for this month
        let summary = await tx.attendanceSummary.findUnique({
          where: {
            enrollmentId_yearMonth: {
              enrollmentId: record.enrollmentId,
              yearMonth,
            },
          },
        });

        if (!summary) {
          summary = await tx.attendanceSummary.create({
            data: {
              enrollmentId: record.enrollmentId,
              yearMonth,
              present: 0,
              absent: 0,
              late: 0,
            },
          });
        }

        // Recalculate summary totals based on delta difference
        let pDiff = 0;
        let aDiff = 0;
        let lDiff = 0;

        const nextStatus = record.status;
        const prevStatus = oldAttendance ? oldAttendance.status : null;

        if (prevStatus !== nextStatus) {
          // Subtract previous status count
          if (prevStatus === 'PRESENT') pDiff--;
          else if (prevStatus === 'ABSENT') aDiff--;
          else if (prevStatus === 'LATE') lDiff--;
          // Half day can count as half present or custom, let's treat it as present for basic summary or ignore

          // Add next status count
          if (nextStatus === 'PRESENT') pDiff++;
          else if (nextStatus === 'ABSENT') aDiff++;
          else if (nextStatus === 'LATE') lDiff++;
        }

        if (pDiff !== 0 || aDiff !== 0 || lDiff !== 0) {
          await tx.attendanceSummary.update({
            where: { id: summary.id },
            data: {
              present: { increment: pDiff },
              absent: { increment: aDiff },
              late: { increment: lDiff },
            },
          });
        }
      });

      results.success++;
    } catch (err: any) {
      results.failed++;
      results.errors.push(`Enrollment ID ${record.enrollmentId} failed: ${err.message}`);
    }
  }

  return results;
}
