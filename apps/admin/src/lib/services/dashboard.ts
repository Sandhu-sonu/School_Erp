import { prisma } from '@school-erp/db';

export async function getDashboardData() {
  const now = new Date();
  
  const [
    activeStudentsCount,
    leadsCount,
    collectionAggregate,
    pendingAggregate,
    transportAdjustments,
    studentsUsingTransport,
    publishedNoticesCount,
    newAdmissionsCount,
    recentLogs,
    classes
  ] = await prisma.$transaction([
    prisma.student.count({
      where: { status: 'ACTIVE' },
    }),
    prisma.lead.count(),
    prisma.feeTransaction.aggregate({
      where: { isReversed: false },
      _sum: { amount: true },
    }),
    prisma.studentFeeAccount.aggregate({
      _sum: { remainingFee: true },
    }),
    prisma.feeAdjustment.groupBy({
      by: ['type'],
      where: { referenceType: 'TRANSPORT' },
      _sum: { amount: true },
    } as any),
    prisma.studentTransport.count({
      where: { status: 'ACTIVE' },
    }),
    prisma.notice.count({
      where: {
        status: 'PUBLISHED',
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: now } },
        ],
      },
    }),
    prisma.classEnrollment.count({
      where: {
        session: { isActive: true },
        isArchived: false,
      },
    }),
    prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        details: true,
        ipAddress: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            role: true,
          }
        }
      }
    }),
    prisma.class.findMany({
      orderBy: { sequence: 'asc' },
      select: {
        id: true,
        name: true,
        _count: {
          select: { enrollments: true }
        }
      }
    })
  ]);

  const totalCollected = collectionAggregate._sum.amount ? Number(collectionAggregate._sum.amount) : 0;
  const totalPending = pendingAggregate._sum.remainingFee ? Number(pendingAggregate._sum.remainingFee) : 0;

  let debitSum = 0;
  let creditSum = 0;
  for (const group of transportAdjustments as any[]) {
    const amt = group._sum?.amount ? Number(group._sum.amount) : 0;
    if (group.type === 'DEBIT') debitSum = amt;
    if (group.type === 'CREDIT') creditSum = amt;
  }
  const transportRevenue = debitSum - creditSum;

  return {
    activeStudentsCount,
    leadsCount,
    totalCollected,
    totalPending,
    transportRevenue,
    studentsUsingTransport,
    publishedNoticesCount,
    newAdmissionsCount,
    recentLogs,
    classes
  };
}
