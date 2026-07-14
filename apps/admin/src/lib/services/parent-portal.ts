import { prisma } from '@school-erp/db';

export async function getParentProfile(mobile: string) {
  return await prisma.parent.findUnique({
    where: { mobile },
    include: {
      students: {
        include: {
          enrollments: {
            where: { isArchived: false },
            include: {
              class: true,
              section: true,
              session: true
            }
          }
        }
      }
    }
  });
}

export async function getStudentDashboardSummary(studentId: string) {
  const student = await prisma.student.findUniqueOrThrow({
    where: { id: studentId },
    include: {
      parent: true,
      enrollments: {
        where: { isArchived: false },
        include: {
          class: true,
          section: true,
          session: true
        }
      }
    }
  });

  const activeEnrollment = student.enrollments[0];
  if (!activeEnrollment) {
    throw new Error('Student has no active enrollment for the current session.');
  }

  const feeAccount = await prisma.studentFeeAccount.findUnique({
    where: { enrollmentId: activeEnrollment.id }
  });

  const latestResult = await prisma.result.findFirst({
    where: { studentId, published: true },
    include: { exam: true },
    orderBy: { generatedAt: 'desc' }
  });

  const notices = await prisma.notice.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [
        { targetClass: null },
        { targetClass: activeEnrollment.class.name }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  const calendarEvents = await prisma.notice.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [
        { title: { contains: 'Holiday', mode: 'insensitive' } },
        { title: { contains: 'Event', mode: 'insensitive' } },
        { title: { contains: 'PTM', mode: 'insensitive' } },
        { title: { contains: 'Meeting', mode: 'insensitive' } },
        { title: { contains: 'Exam', mode: 'insensitive' } }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return {
    student: {
      id: student.id,
      name: student.name,
      admissionNumber: student.admissionNumber,
      photo: student.photo
    },
    parent: {
      fatherName: student.parent.fatherName,
      motherName: student.parent.motherName,
      mobile: student.parent.mobile,
      address: student.parent.address
    },
    enrollment: {
      class: activeEnrollment.class.name,
      section: activeEnrollment.section?.name || 'A',
      session: activeEnrollment.session.name
    },
    feeSummary: feeAccount ? {
      totalFee: Number(feeAccount.totalFee),
      paidAmount: Number(feeAccount.paidAmount),
      remainingFee: Number(feeAccount.remainingFee),
      feeStatus: feeAccount.feeStatus
    } : null,
    latestResultSummary: latestResult ? {
      examName: latestResult.exam.name,
      percentage: Number(latestResult.percentage),
      finalGrade: latestResult.finalGrade,
      rank: latestResult.rank
    } : null,
    notices: notices.map(n => ({
      id: n.id,
      title: n.title,
      description: n.description,
      createdAt: n.createdAt
    })),
    calendarEvents: calendarEvents.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.publishDate || e.createdAt
    }))
  };
}

export async function getStudentFees(studentId: string) {
  const student = await prisma.student.findUniqueOrThrow({
    where: { id: studentId },
    include: {
      enrollments: {
        where: { isArchived: false }
      }
    }
  });

  const activeEnrollment = student.enrollments[0];
  if (!activeEnrollment) {
    throw new Error('Student has no active enrollment.');
  }

  const feeAccount = await prisma.studentFeeAccount.findUnique({
    where: { enrollmentId: activeEnrollment.id }
  });

  const transactions = feeAccount ? await prisma.feeTransaction.findMany({
    where: { feeAccountId: feeAccount.id },
    orderBy: { createdAt: 'desc' }
  }) : [];

  const adjustments = feeAccount ? await prisma.feeAdjustment.findMany({
    where: { feeAccountId: feeAccount.id },
    orderBy: { createdAt: 'desc' }
  }) : [];

  return {
    feeAccount: feeAccount ? {
      totalFee: Number(feeAccount.totalFee),
      paidAmount: Number(feeAccount.paidAmount),
      discount: Number(feeAccount.discount),
      waiver: Number(feeAccount.waiver),
      remainingFee: Number(feeAccount.remainingFee),
      feeStatus: feeAccount.feeStatus
    } : null,
    transactions: transactions.map(t => ({
      id: t.id,
      receiptNumber: t.receiptNumber,
      amount: Number(t.amount),
      discountAmount: Number(t.discountAmount || 0),
      waiverAmount: Number(t.waiverAmount || 0),
      paymentMode: t.paymentMode,
      notes: t.notes,
      status: t.isReversed ? 'REVERSED' : 'COMPLETED',
      createdAt: t.createdAt
    })),
    adjustments: adjustments.map(a => ({
      id: a.id,
      amount: Number(a.amount),
      type: a.type,
      reason: a.description,
      createdAt: a.createdAt
    }))
  };
}

export async function getStudentResults(studentId: string) {
  const results = await prisma.result.findMany({
    where: { studentId, published: true },
    include: { exam: true },
    orderBy: { generatedAt: 'desc' }
  });

  const resultDetails = [];
  for (const r of results) {
    const marks = await prisma.examMark.findMany({
      where: { examId: r.examId, studentId },
      include: { subject: true }
    });

    resultDetails.push({
      resultId: r.id,
      examId: r.examId,
      examName: r.exam.name,
      total: Number(r.total),
      percentage: Number(r.percentage),
      finalGrade: r.finalGrade,
      rank: r.rank,
      snapshotJson: r.snapshotJson,
      marks: marks.map(m => ({
        subjectName: m.subject.name,
        marksObtained: Number(m.obtained || 0),
        maxMarks: Number(m.maxMarks)
      }))
    });
  }

  return resultDetails;
}

export async function getSchoolNotices(classId?: string) {
  let targetClassName: string | null = null;
  if (classId) {
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (cls) targetClassName = cls.name;
  }

  return await prisma.notice.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [
        { targetClass: null },
        ...(targetClassName ? [{ targetClass: targetClassName }] : [])
      ]
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getSchoolCalendar() {
  return await prisma.notice.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [
        { title: { contains: 'Holiday', mode: 'insensitive' } },
        { title: { contains: 'Event', mode: 'insensitive' } },
        { title: { contains: 'PTM', mode: 'insensitive' } },
        { title: { contains: 'Meeting', mode: 'insensitive' } },
        { title: { contains: 'Exam', mode: 'insensitive' } }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });
}
