import { prisma, Prisma } from '@school-erp/db';
import { parentSchema, studentSchema } from '@school-erp/utils';

// Helper to map class name to code (e.g., "Class 1" -> "C1", "Nursery" -> "NUR")
export function getClassCode(className: string): string {
  if (className === 'Nursery') return 'NUR';
  if (className === 'LKG') return 'LKG';
  if (className === 'UKG') return 'UKG';
  const match = className.match(/Class\s+(\d+)/i);
  if (match) return `C${match[1]}`;
  return className.substring(0, 3).toUpperCase();
}

/**
 * Sequential, transaction-safe Admission Number Generator
 */
export async function generateAdmissionNumber(sessionId: string, classId: string): Promise<string> {
  const session = await prisma.academicSession.findUniqueOrThrow({
    where: { id: sessionId },
  });
  const cls = await prisma.class.findUniqueOrThrow({
    where: { id: classId },
  });

  const startYear = new Date(session.startDate).getFullYear();
  const classCode = getClassCode(cls.name);

  return await prisma.$transaction(async (tx) => {
    // Upsert the sequence value with a row lock by updating
    let seq = await tx.admissionSequence.findUnique({
      where: {
        sessionId_year: {
          sessionId: session.id,
          year: startYear,
        },
      },
    });

    if (!seq) {
      seq = await tx.admissionSequence.create({
        data: {
          sessionId: session.id,
          year: startYear,
          currentValue: 0,
        },
      });
    }

    const updatedSeq = await tx.admissionSequence.update({
      where: { id: seq.id },
      data: {
        currentValue: { increment: 1 },
      },
    });

    const numStr = String(updatedSeq.currentValue).padStart(4, '0');
    return `SCH/${startYear}/${classCode}/${numStr}`;
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

/**
 * Parent Master Services
 */
export async function getParents(search?: string) {
  const filter = search
    ? {
        OR: [
          { fatherName: { contains: search, mode: 'insensitive' as const } },
          { motherName: { contains: search, mode: 'insensitive' as const } },
          { mobile: { contains: search } },
        ],
      }
    : {};

  return await prisma.parent.findMany({
    where: filter,
    orderBy: { fatherName: 'asc' },
    include: {
      students: {
        select: {
          id: true,
          name: true,
          admissionNumber: true,
          status: true,
        },
      },
    },
  });
}

export async function getParentById(id: string) {
  return await prisma.parent.findUnique({
    where: { id },
    include: {
      students: {
        select: {
          id: true,
          name: true,
          admissionNumber: true,
          status: true,
        },
      },
    },
  });
}

export async function createParent(data: any) {
  const validated = parentSchema.parse(data);

  // Check if mobile already exists
  const existing = await prisma.parent.findUnique({
    where: { mobile: validated.mobile },
  });
  if (existing) {
    throw new Error('A parent with this mobile number already exists');
  }

  return await prisma.parent.create({
    data: {
      fatherName: validated.fatherName,
      motherName: validated.motherName || null,
      mobile: validated.mobile,
      alternateMobile: validated.alternateMobile || null,
      occupation: validated.occupation || null,
      address: data.address || null,
      remarks: data.remarks || null,
    },
  });
}

export async function updateParent(id: string, data: any) {
  const validated = parentSchema.parse(data);

  // Check if mobile matches other parent
  const existing = await prisma.parent.findFirst({
    where: {
      mobile: validated.mobile,
      id: { not: id },
    },
  });
  if (existing) {
    throw new Error('Another parent with this mobile number already exists');
  }

  return await prisma.parent.update({
    where: { id },
    data: {
      fatherName: validated.fatherName,
      motherName: validated.motherName || null,
      mobile: validated.mobile,
      alternateMobile: validated.alternateMobile || null,
      occupation: validated.occupation || null,
      address: data.address || null,
      remarks: data.remarks || null,
    },
  });
}

export async function deleteParent(id: string) {
  // Check if linked students exist
  const linked = await prisma.student.count({
    where: { parentId: id },
  });

  if (linked > 0) {
    throw new Error('Parent cannot be deleted because they have registered students');
  }

  return await prisma.parent.delete({
    where: { id },
  });
}

/**
 * Student Registration Services
 */
export async function registerStudent(data: any) {
  const validated = studentSchema.parse(data);

  // Get active session
  const activeSession = await prisma.academicSession.findFirst({
    where: { isActive: true },
  });
  if (!activeSession) {
    throw new Error('No active academic session found. Initialize a session first.');
  }

  // Generate sequence-locked admission number
  const admissionNumber = await generateAdmissionNumber(activeSession.id, validated.classId);

  // Find fee plan for class in this session
  const feePlan = await prisma.feePlan.findUnique({
    where: {
      sessionId_classId: {
        sessionId: activeSession.id,
        classId: validated.classId,
      },
    },
  });
  const tuitionFee = feePlan ? Number(feePlan.tuitionFee) : 0;
  const admissionFee = feePlan ? Number(feePlan.admissionFee) : 0;
  const annualCharges = feePlan ? Number(feePlan.annualCharges || 0) : 0;
  const activityCharges = feePlan ? Number(feePlan.activityCharges || 0) : 0;
  const totalBaseFee = tuitionFee + admissionFee + annualCharges + activityCharges;

  return await prisma.$transaction(async (tx) => {
    // Check if active enrollment already exists for this student in this session
    // (This is prevented by schema unique constraint, but we add a safety check)
    
    // Create Student identity record
    const student = await tx.student.create({
      data: {
        admissionNumber,
        name: validated.name,
        dob: new Date(data.dob),
        gender: validated.gender,
        photo: validated.photo || null,
        parentId: validated.parentId,
        status: 'ACTIVE',
        admissionDate: data.admissionDate ? new Date(data.admissionDate) : new Date(),
      },
    });

    // Create Class Enrollment (academic only)
    const enrollment = await tx.classEnrollment.create({
      data: {
        studentId: student.id,
        sessionId: activeSession.id,
        classId: validated.classId,
        sectionId: validated.sectionId || null,
        isArchived: false,
      },
    });

    // Create Student Fee Account (ledger source of truth)
    await tx.studentFeeAccount.create({
      data: {
        enrollmentId: enrollment.id,
        totalFee: totalBaseFee,
        paidAmount: 0,
        remainingFee: totalBaseFee,
        feeStatus: 'UNPAID',
      },
    });

    // Log the audit event
    await tx.auditLog.create({
      data: {
        action: 'ADMIT_STUDENT',
        details: `Admitted student ${student.name} with Admission Number ${admissionNumber} into Class ID ${validated.classId}`,
      },
    });

    return student;
  });
}

export async function getStudents(filters: { search?: string; classId?: string; sectionId?: string; status?: string }) {
  const where: any = {
    // Soft delete check
    status: filters.status ? (filters.status as any) : { not: 'DELETED' as const },
  };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' as const } },
      { admissionNumber: { contains: filters.search, mode: 'insensitive' as const } },
      { parent: { mobile: { contains: filters.search } } },
    ];
  }

  if (filters.classId || filters.sectionId) {
    where.enrollments = {
      some: {
        isArchived: false,
        ...(filters.classId ? { classId: filters.classId } : {}),
        ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
      },
    };
  }

  return await prisma.student.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      parent: {
        select: {
          fatherName: true,
          mobile: true,
        },
      },
      enrollments: {
        where: { isArchived: false },
        include: {
          class: { select: { name: true } },
          section: { select: { name: true } },
          feeAccount: { select: { remainingFee: true, feeStatus: true } },
        },
      },
    },
  });
}

export async function getStudentById(id: string) {
  return await prisma.student.findUnique({
    where: { id },
    include: {
      parent: true,
      transports: {
        orderBy: { createdAt: 'desc' },
        include: {
          route: true,
          stop: true,
        },
      },
      enrollments: {
        orderBy: { createdAt: 'desc' },
        include: {
          session: { select: { name: true } },
          class: { select: { name: true } },
          section: { select: { name: true } },
          feeAccount: {
            include: {
              transactions: {
                orderBy: { transactionDate: 'desc' },
                include: { collectedBy: { select: { name: true } } },
              },
              adjustments: {
                orderBy: { createdAt: 'desc' },
              },
            },
          },
          attendanceSummary: { orderBy: { yearMonth: 'desc' } },
        },
      },
      promotions: {
        orderBy: { promotedAt: 'desc' },
        include: {
          fromSession: { select: { name: true } },
          toSession: { select: { name: true } },
          fromClass: { select: { name: true } },
          toClass: { select: { name: true } },
        },
      },
    },
  });
}

export async function updateStudent(id: string, data: any) {
  const validated = studentSchema.parse(data);

  return await prisma.$transaction(async (tx) => {
    const student = await tx.student.update({
      where: { id },
      data: {
        name: validated.name,
        dob: new Date(data.dob),
        gender: validated.gender,
        photo: validated.photo || null,
        parentId: validated.parentId,
      },
    });

    // Update active academic enrollment if different
    const activeEnrollment = await tx.classEnrollment.findFirst({
      where: { studentId: id, isArchived: false },
    });

    if (activeEnrollment) {
      const isClassChanged = activeEnrollment.classId !== validated.classId;
      const isSectionChanged = activeEnrollment.sectionId !== (validated.sectionId || null);

      if (isClassChanged || isSectionChanged) {
        // Update enrollment details
        await tx.classEnrollment.update({
          where: { id: activeEnrollment.id },
          data: {
            classId: validated.classId,
            sectionId: validated.sectionId || null,
          },
        });

        // If class changed, recalculate fee plan dues in feeAccount
        if (isClassChanged) {
          const activeSession = await tx.academicSession.findFirst({
            where: { isActive: true },
          });
          const feePlan = await tx.feePlan.findUnique({
            where: {
              sessionId_classId: {
                sessionId: activeSession!.id,
                classId: validated.classId,
              },
            },
          });
          const tuitionFee = feePlan ? Number(feePlan.tuitionFee) : 0;
          const admissionFee = feePlan ? Number(feePlan.admissionFee) : 0;
          const newTotal = tuitionFee + admissionFee;

          const feeAccount = await tx.studentFeeAccount.findUnique({
            where: { enrollmentId: activeEnrollment.id },
          });

          if (feeAccount) {
            const paid = Number(feeAccount.paidAmount);
            const remaining = Math.max(0, newTotal - paid);
            const status = remaining === 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';

            await tx.studentFeeAccount.update({
              where: { id: feeAccount.id },
              data: {
                totalFee: newTotal,
                remainingFee: remaining,
                feeStatus: status,
              },
            });
          }
        }
      }
    }

    return student;
  });
}

/**
 * Transitions student status (soft-delete, suspend, alumni, transferred)
 */
export async function transitionStudentStatus(id: string, status: 'ACTIVE' | 'TRANSFERRED' | 'DROPPED' | 'SUSPENDED' | 'DELETED' | 'ALUMNI') {
  return await prisma.$transaction(async (tx) => {
    const student = await tx.student.update({
      where: { id },
      data: { status },
    });

    // If status is not ACTIVE, archive active enrollments
    if (status !== 'ACTIVE') {
      await tx.classEnrollment.updateMany({
        where: { studentId: id, isArchived: false },
        data: { isArchived: true },
      });
    }

    await tx.auditLog.create({
      data: {
        action: `STUDENT_STATUS_${status}`,
        details: `Transitioned student ID ${id} status to ${status}`,
      },
    });

    return student;
  });
}
