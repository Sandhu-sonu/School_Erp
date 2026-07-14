import { prisma, Prisma } from '@school-erp/db';
import { PaymentMode } from '@prisma/client';

/**
 * Fee Structure Services
 */
export async function getFeePlans(sessionId: string) {
  return await prisma.feePlan.findMany({
    where: { sessionId },
    include: {
      class: { select: { name: true } },
    },
    orderBy: { class: { sequence: 'asc' } },
  });
}

export async function upsertFeePlan(
  sessionId: string,
  classId: string,
  tuitionFee: number,
  admissionFee: number,
  annualCharges: number,
  activityCharges: number
) {
  return await prisma.feePlan.upsert({
    where: {
      sessionId_classId: {
        sessionId,
        classId,
      },
    },
    update: {
      tuitionFee,
      admissionFee,
      annualCharges,
      activityCharges,
    },
    create: {
      sessionId,
      classId,
      tuitionFee,
      admissionFee,
      annualCharges,
      activityCharges,
    },
  });
}

export async function copyFeePlans(fromSessionId: string, toSessionId: string) {
  const sourcePlans = await prisma.feePlan.findMany({
    where: { sessionId: fromSessionId },
  });

  const copied = [];
  for (const plan of sourcePlans) {
    const p = await prisma.feePlan.upsert({
      where: {
        sessionId_classId: {
          sessionId: toSessionId,
          classId: plan.classId,
        },
      },
      update: {
        tuitionFee: plan.tuitionFee,
        admissionFee: plan.admissionFee,
        annualCharges: plan.annualCharges,
        activityCharges: plan.activityCharges,
      },
      create: {
        sessionId: toSessionId,
        classId: plan.classId,
        tuitionFee: plan.tuitionFee,
        admissionFee: plan.admissionFee,
        annualCharges: plan.annualCharges,
        activityCharges: plan.activityCharges,
      },
    });
    copied.push(p);
  }
  return copied;
}

/**
 * Concurrency-locked Sequential Receipt Number Generator
 */
export async function generateReceiptNumber(year: number): Promise<string> {
  const prefix = `SCH-${year}-`;

  return await prisma.$transaction(async (tx) => {
    // Find or create sequence for this prefix
    let seq = await tx.receiptSequence.findUnique({
      where: { prefix },
    });

    if (!seq) {
      seq = await tx.receiptSequence.create({
        data: {
          prefix,
          currentValue: 0,
        },
      });
    }

    const updatedSeq = await tx.receiptSequence.update({
      where: { id: seq.id },
      data: {
        currentValue: { increment: 1 },
      },
    });

    const numStr = String(updatedSeq.currentValue).padStart(5, '0'); // e.g. "00001"
    return `${prefix}${numStr}`;
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

/**
 * Fee Collection Desk Logic
 */
export async function collectFee(
  enrollmentId: string,
  amount: number,
  discountAmount: number,
  waiverAmount: number,
  paymentMode: PaymentMode,
  collectedById: string,
  notes?: string
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Lock the StudentFeeAccount record
    const feeAccount = await tx.studentFeeAccount.findUniqueOrThrow({
      where: { enrollmentId },
    });

    const remaining = Number(feeAccount.remainingFee);
    const totalAdjustment = amount + discountAmount + waiverAmount;

    // Guard checks
    if (totalAdjustment <= 0) {
      throw new Error('Total collection adjustments must be positive.');
    }
    if (totalAdjustment > remaining) {
      throw new Error(`Collection amount exceeds outstanding balance. Remaining: ₹${remaining.toFixed(2)}`);
    }

    // 2. Generate sequential receipt number mapping to current year
    const year = new Date().getFullYear();
    const receiptNumber = await generateReceiptNumber(year);

    // 3. Create fee transaction log
    const transaction = await tx.feeTransaction.create({
      data: {
        feeAccountId: feeAccount.id,
        amount,
        discountAmount,
        waiverAmount,
        receiptNumber,
        paymentMode,
        collectedById,
        notes: notes || null,
        isReversed: false,
      },
      include: {
        collectedBy: {
          select: { name: true }
        }
      }
    });

    // 4. Update balances in StudentFeeAccount
    const newPaid = Number(feeAccount.paidAmount) + amount;
    const newDiscount = Number(feeAccount.discount) + discountAmount;
    const newWaiver = Number(feeAccount.waiver) + waiverAmount;
    const newRemaining = Math.max(0, Number(feeAccount.totalFee) - newPaid - newDiscount - newWaiver);
    const status = newRemaining === 0 ? 'PAID' : (newPaid > 0 || newDiscount + newWaiver > 0) ? 'PARTIAL' : 'UNPAID';

    await tx.studentFeeAccount.update({
      where: { id: feeAccount.id },
      data: {
        paidAmount: newPaid,
        discount: newDiscount,
        waiver: newWaiver,
        remainingFee: newRemaining,
        feeStatus: status,
      },
    });

    // 5. Write audit log
    await tx.auditLog.create({
      data: {
        userId: collectedById,
        action: 'COLLECT_FEE',
        details: `Collected fee amount: ₹${amount.toFixed(2)} (Receipt: ${receiptNumber}) for enrollment ID ${enrollmentId}`,
      },
    });

    return transaction;
  });
}

/**
 * Reversal transaction for correcting mistakes (Receipt Reversal)
 */
export async function reverseTransaction(transactionId: string, reversedById: string, reason: string) {
  return await prisma.$transaction(async (tx) => {
    const original = await tx.feeTransaction.findUniqueOrThrow({
      where: { id: transactionId },
    });

    if (original.isReversed) {
      throw new Error('Transaction has already been reversed.');
    }

    // Fetch related fee account
    const feeAccount = await tx.studentFeeAccount.findUniqueOrThrow({
      where: { id: original.feeAccountId },
    });

    // Mark original transaction as reversed
    await tx.feeTransaction.update({
      where: { id: transactionId },
      data: { isReversed: true, notes: `Reversed: ${reason}` },
    });

    // Create Reversal Transaction
    const year = new Date().getFullYear();
    const reversalReceipt = await generateReceiptNumber(year);

    await tx.feeTransaction.create({
      data: {
        feeAccountId: feeAccount.id,
        amount: -original.amount,
        discountAmount: -original.discountAmount,
        waiverAmount: -original.waiverAmount,
        receiptNumber: reversalReceipt,
        paymentMode: original.paymentMode,
        collectedById: reversedById,
        notes: `Reversal of receipt ${original.receiptNumber}: ${reason}`,
        isReversed: true,
      },
    });

    // Update balances in StudentFeeAccount
    const newPaid = Math.max(0, Number(feeAccount.paidAmount) - Number(original.amount));
    const newDiscount = Math.max(0, Number(feeAccount.discount) - Number(original.discountAmount));
    const newWaiver = Math.max(0, Number(feeAccount.waiver) - Number(original.waiverAmount));
    const newRemaining = Number(feeAccount.totalFee) - newPaid - newDiscount - newWaiver;
    const status = newRemaining === 0 ? 'PAID' : (newPaid > 0 || newDiscount + newWaiver > 0) ? 'PARTIAL' : 'UNPAID';

    await tx.studentFeeAccount.update({
      where: { id: feeAccount.id },
      data: {
        paidAmount: newPaid,
        discount: newDiscount,
        waiver: newWaiver,
        remainingFee: newRemaining,
        feeStatus: status,
      },
    });

    // Log the audit event
    await tx.auditLog.create({
      data: {
        userId: reversedById,
        action: 'REVERSE_FEE_TRANSACTION',
        details: `Reversed receipt number ${original.receiptNumber}. Reversal receipt: ${reversalReceipt}`,
      },
    });
  });
}

/**
 * Transport Billing Services
 */
export async function linkStudentTransport(studentId: string, routeId: string, stopId: string) {
  const stop = await prisma.stop.findUniqueOrThrow({
    where: { id: stopId },
    include: { route: true },
  });

  return await prisma.$transaction(async (tx) => {
    // 1. Find active enrollment for the student in the active session
    const enrollment = await tx.classEnrollment.findFirstOrThrow({
      where: {
        studentId,
        isArchived: false,
        session: { isActive: true },
      },
      include: {
        feeAccount: true,
      },
    });

    if (!enrollment.feeAccount) {
      throw new Error("Student fee account not found");
    }

    // 2. Deactivate any existing active transport for this student
    const activeTransport = await tx.studentTransport.findFirst({
      where: {
        studentId,
        status: 'ACTIVE',
      },
    });

    if (activeTransport) {
      await tx.studentTransport.update({
        where: { id: activeTransport.id },
        data: {
          status: 'INACTIVE',
          activeTo: new Date(),
        },
      });
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const totalDays = new Date(year, month + 1, 0).getDate();
      const remainingDays = totalDays - today.getDate();
      const monthlyFare = Number(activeTransport.monthlyFare);
      const prorationCredit = Math.max(0, Number(((monthlyFare * remainingDays) / totalDays).toFixed(2)));

      // Also post a CREDIT adjustment to offset the previous one
      await tx.feeAdjustment.create({
        data: {
          feeAccountId: enrollment.feeAccount.id,
          amount: prorationCredit,
          type: 'CREDIT',
          description: `Transport Cancelled (Auto): Route ${activeTransport.routeId}`,
          referenceType: 'TRANSPORT',
          referenceId: activeTransport.id,
        },
      });
      const oldRemaining = Number(enrollment.feeAccount.remainingFee);
      const newRemaining = Math.max(0, oldRemaining - prorationCredit);
      const status = newRemaining === 0 ? 'PAID' : (Number(enrollment.feeAccount.paidAmount) > 0 || Number(enrollment.feeAccount.discount) + Number(enrollment.feeAccount.waiver) > 0) ? 'PARTIAL' : 'UNPAID';
      await tx.studentFeeAccount.update({
        where: { id: enrollment.feeAccount.id },
        data: {
          remainingFee: newRemaining,
          feeStatus: status,
        },
      });
    }

    // Refresh enrollment feeAccount state after potential cancellation
    const currentFeeAccount = await tx.studentFeeAccount.findUniqueOrThrow({
      where: { id: enrollment.feeAccount.id },
    });

    // 3. Create new StudentTransport record
    const fare = Number(stop.fare);
    const st = await tx.studentTransport.create({
      data: {
        studentId,
        routeId,
        stopId,
        activeFrom: new Date(),
        monthlyFare: fare,
        status: 'ACTIVE',
      },
    });

    // 4. Create DEBIT FeeAdjustment
    await tx.feeAdjustment.create({
      data: {
        feeAccountId: currentFeeAccount.id,
        amount: fare,
        type: 'DEBIT',
        description: `Transport Linked: ${stop.name} (Route: ${stop.route.name})`,
        referenceType: 'TRANSPORT',
        referenceId: st.id,
      },
    });

    const newRemaining = Number(currentFeeAccount.remainingFee) + fare;
    const status = newRemaining === 0 ? 'PAID' : (Number(currentFeeAccount.paidAmount) > 0 || Number(currentFeeAccount.discount) + Number(currentFeeAccount.waiver) > 0) ? 'PARTIAL' : 'UNPAID';

    await tx.studentFeeAccount.update({
      where: { id: currentFeeAccount.id },
      data: {
        remainingFee: newRemaining,
        feeStatus: status,
      },
    });

    return st;
  });
}

export async function unlinkStudentTransport(studentId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Find active transport record
    const transport = await tx.studentTransport.findFirst({
      where: {
        studentId,
        status: 'ACTIVE',
      },
    });

    if (!transport) return null;

    // 2. Mark transport record as INACTIVE
    const updatedTransport = await tx.studentTransport.update({
      where: { id: transport.id },
      data: {
        status: 'INACTIVE',
        activeTo: new Date(),
      },
    });

    // 3. Find active enrollment feeAccount
    const enrollment = await tx.classEnrollment.findFirstOrThrow({
      where: {
        studentId,
        isArchived: false,
        session: { isActive: true },
      },
      include: {
        feeAccount: true,
      },
    });

    if (!enrollment.feeAccount) {
      throw new Error("Student fee account not found");
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const remainingDays = totalDays - today.getDate();
    const monthlyFare = Number(transport.monthlyFare);
    const prorationCredit = Math.max(0, Number(((monthlyFare * remainingDays) / totalDays).toFixed(2)));

    // 4. Create CREDIT FeeAdjustment
    await tx.feeAdjustment.create({
      data: {
        feeAccountId: enrollment.feeAccount.id,
        amount: prorationCredit,
        type: 'CREDIT',
        description: `Transport Unlinked: Stop ${transport.stopId}`,
        referenceType: 'TRANSPORT',
        referenceId: transport.id,
      },
    });

    const newRemaining = Math.max(0, Number(enrollment.feeAccount.remainingFee) - prorationCredit);
    const status = newRemaining === 0 ? 'PAID' : (Number(enrollment.feeAccount.paidAmount) > 0 || Number(enrollment.feeAccount.discount) + Number(enrollment.feeAccount.waiver) > 0) ? 'PARTIAL' : 'UNPAID';

    await tx.studentFeeAccount.update({
      where: { id: enrollment.feeAccount.id },
      data: {
        remainingFee: newRemaining,
        feeStatus: status,
      },
    });

    return updatedTransport;
  });
}

/**
 * Finance Dashboard Metrics (with Clerk restricted locks)
 */
export async function getFinanceDashboardMetrics() {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  // Today's collections
  const todayTransactions = await prisma.feeTransaction.aggregate({
    where: {
      transactionDate: { gte: startOfToday },
      isReversed: false,
    },
    _sum: { amount: true },
  });
  const todayCollection = todayTransactions._sum.amount ? Number(todayTransactions._sum.amount) : 0;

  // Monthly collections
  const monthTransactions = await prisma.feeTransaction.aggregate({
    where: {
      transactionDate: { gte: startOfMonth },
      isReversed: false,
    },
    _sum: { amount: true },
  });
  const monthCollection = monthTransactions._sum.amount ? Number(monthTransactions._sum.amount) : 0;

  // Outstanding/Pending Dues
  const outstandingAggregate = await prisma.studentFeeAccount.aggregate({
    _sum: { remainingFee: true },
  });
  const totalOutstanding = outstandingAggregate._sum.remainingFee ? Number(outstandingAggregate._sum.remainingFee) : 0;

  // Transport Revenue (debits - credits)
  const transportDebits = await prisma.feeAdjustment.aggregate({
    where: {
      referenceType: 'TRANSPORT',
      type: 'DEBIT',
    },
    _sum: { amount: true },
  });
  const transportCredits = await prisma.feeAdjustment.aggregate({
    where: {
      referenceType: 'TRANSPORT',
      type: 'CREDIT',
    },
    _sum: { amount: true },
  });
  const transportRevenue = (transportDebits._sum.amount ? Number(transportDebits._sum.amount) : 0) -
                           (transportCredits._sum.amount ? Number(transportCredits._sum.amount) : 0);

  return {
    todayCollection,
    monthCollection,
    totalOutstanding,
    transportRevenue,
  };
}
