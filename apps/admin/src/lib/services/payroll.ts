import { prisma, Prisma } from '@school-erp/db';
import { 
  SalaryPaymentType, 
  SalaryPaymentStatus, 
  AdvanceStatus, 
  LoanStatus, 
  InterestType, 
  LoanInstallmentStatus, 
  PayrollCycleStatus, 
  RecoveryType, 
  FinalSettlementReason,
  PaymentMode
} from '@prisma/client';

/**
 * 1. Create a Payroll Cycle
 */
export async function createPayrollCycle(data: {
  name: string;
  month: number;
  year: number;
  startDate: Date;
  endDate: Date;
}) {
  return await prisma.payrollCycle.create({
    data: {
      name: data.name,
      month: data.month,
      year: data.year,
      startDate: data.startDate,
      endDate: data.endDate,
      status: PayrollCycleStatus.OPEN,
    },
  });
}

/**
 * 2. Update Payroll Cycle Status (e.g., LOCK / ARCHIVE)
 */
export async function updatePayrollCycleStatus(cycleId: string, status: PayrollCycleStatus, userId: string) {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const cycle = await tx.payrollCycle.update({
      where: { id: cycleId },
      data: { status },
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_PAYROLL_CYCLE',
        details: `Updated payroll cycle ${cycle.name} status to ${status}`,
      },
    });

    return cycle;
  });
}

/**
 * 3. Issue Salary Advance
 */
export async function issueEmployeeAdvance(data: {
  staffId: string;
  amount: number;
  reason?: string;
  paymentMode: PaymentMode;
  createdById: string;
}) {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const advance = await tx.employeeAdvance.create({
      data: {
        staffId: data.staffId,
        amount: data.amount,
        outstandingAmount: data.amount,
        recoveredAmount: 0,
        reason: data.reason,
        status: AdvanceStatus.ACTIVE,
        paymentMode: data.paymentMode,
        createdById: data.createdById,
      },
    });

    // Generate transactional expense entry
    await tx.expense.create({
      data: {
        title: `Salary Advance`,
        category: 'SALARY',
        amount: data.amount,
        paymentMode: data.paymentMode,
        notes: data.reason || 'None',
        paidTo: data.staffId,
        expenseDate: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: data.createdById,
        action: 'ISSUE_ADVANCE',
        details: `Issued salary advance of ₹${data.amount.toFixed(2)} to staff ${data.staffId}`,
      },
    });

    return advance;
  });
}

/**
 * 4. Issue Employee Loan
 */
export async function issueEmployeeLoan(data: {
  staffId: string;
  principal: number;
  interestRate: number; // e.g. 5.5 for 5.5%
  interestType: InterestType;
  monthlyEmi: number;
  reason?: string;
  paymentMode: PaymentMode;
  createdById: string;
}) {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    let totalRepayable = Number(data.principal);
    if (data.interestType === InterestType.FLAT && data.interestRate > 0) {
      totalRepayable = Number(data.principal) * (1 + Number(data.interestRate) / 100);
    }

    const loan = await tx.employeeLoan.create({
      data: {
        staffId: data.staffId,
        principal: data.principal,
        interestRate: data.interestRate,
        interestType: data.interestType,
        monthlyEmi: data.monthlyEmi,
        outstandingAmount: totalRepayable,
        reason: data.reason,
        status: LoanStatus.ACTIVE,
        paymentMode: data.paymentMode,
        createdById: data.createdById,
      },
    });

    // Generate monthly loan installment schedules
    const totalInstallments = Math.ceil(totalRepayable / data.monthlyEmi);
    const installmentsData = [];
    const now = new Date();

    for (let i = 1; i <= totalInstallments; i++) {
      const dueDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const isLast = i === totalInstallments;
      const installmentAmount = isLast 
        ? totalRepayable - (data.monthlyEmi * (totalInstallments - 1)) 
        : data.monthlyEmi;

      installmentsData.push({
        loanId: loan.id,
        dueDate,
        amount: installmentAmount,
        paidAmount: 0,
        status: LoanInstallmentStatus.UNPAID,
      });
    }

    await tx.employeeLoanInstallment.createMany({
      data: installmentsData,
    });

    // Generate transactional expense entry
    await tx.expense.create({
      data: {
        title: `Staff Loan`,
        category: 'SALARY',
        amount: data.principal,
        paymentMode: data.paymentMode,
        notes: data.reason || 'None',
        paidTo: data.staffId,
        expenseDate: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: data.createdById,
        action: 'ISSUE_LOAN',
        details: `Issued staff loan of principal ₹${data.principal.toFixed(2)} to staff ${data.staffId}`,
      },
    });

    return loan;
  });
}

/**
 * 5. Add Salary Revision (Validating Overlaps)
 */
export async function createSalaryRevision(data: {
  staffId: string;
  previousSalary: number;
  newSalary: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  reason?: string;
  createdById: string;
}) {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Check for overlapping revision periods
    const existingRevisions = await tx.salaryRevision.findMany({
      where: { staffId: data.staffId },
    });

    const newStart = new Date(data.effectiveFrom).getTime();
    const newEnd = data.effectiveTo ? new Date(data.effectiveTo).getTime() : Infinity;

    for (const rev of existingRevisions) {
      const revStart = new Date(rev.effectiveFrom).getTime();
      const revEnd = rev.effectiveTo ? new Date(rev.effectiveTo).getTime() : Infinity;

      // Overlap calculation: (StartA <= EndB) and (EndA >= StartB)
      if (newStart <= revEnd && newEnd >= revStart) {
        throw new Error('Salary revision periods overlap.');
      }
    }

    // 2. Insert new revision log
    const revision = await tx.salaryRevision.create({
      data: {
        staffId: data.staffId,
        previousSalary: data.previousSalary,
        newSalary: data.newSalary,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo,
        reason: data.reason,
        createdById: data.createdById,
      },
    });

    // 3. Update active monthly salary on Staff profile
    await tx.staff.update({
      where: { id: data.staffId },
      data: { monthlySalary: data.newSalary },
    });

    await tx.auditLog.create({
      data: {
        userId: data.createdById,
        action: 'REVISE_SALARY',
        details: `Revised staff ${data.staffId} salary from ₹${data.previousSalary} to ₹${data.newSalary}`,
      },
    });

    return revision;
  });
}

/**
 * 6. Process Salary Installment / Final Settlement
 */
export async function processSalaryPayment(data: {
  staffId: string;
  payrollCycleId: string;
  paymentType: SalaryPaymentType;
  installmentAmount: number; // Gross installment paid this time
  paymentMode: PaymentMode;
  transactionReference?: string;
  remarks?: string;
  createdById: string;

  // Recovery requests
  recoverAdvanceId?: string;
  recoverAdvanceAmount?: number;
  recoverLoanId?: string;
  recoverLoanAmount?: number;

  // Custom adjustments (positive/negative)
  adjustments?: { amount: number; reason: string }[];
  finalSettlementReason?: FinalSettlementReason;
}) {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Validate Payroll Cycle Lock
    const cycle = await tx.payrollCycle.findUnique({
      where: { id: data.payrollCycleId },
    });
    if (!cycle) throw new Error('Payroll cycle not found.');
    if (cycle.status === PayrollCycleStatus.LOCKED || cycle.status === PayrollCycleStatus.ARCHIVED) {
      throw new Error('Payroll cycle is locked or archived.');
    }

    // 2. Fetch Employee details
    const staff = await tx.staff.findUnique({
      where: { id: data.staffId },
    });
    if (!staff) throw new Error('Staff member not found.');

    // 3. Prevent duplicate overpayment validation
    const pastPayments = await tx.salaryPayment.findMany({
      where: { 
        staffId: data.staffId, 
        payrollCycleId: data.payrollCycleId, 
        status: SalaryPaymentStatus.COMPLETED 
      },
    });

    const totalPaidGross = pastPayments.reduce((sum: number, p: any) => sum + Number(p.grossSalary), 0);
    const monthlyGrossContract = Number(staff.monthlySalary);
    const remainingGrossBalance = monthlyGrossContract - totalPaidGross;

    if (Number(data.installmentAmount) > remainingGrossBalance) {
      throw new Error(`Payment exceeds remaining salary balance of ₹${remainingGrossBalance.toFixed(2)}.`);
    }

    // 4. Sequence number generation: e.g. SAL-2026-07-000001
    const countAllPayments = await tx.salaryPayment.count();
    const slipSeq = (countAllPayments + 1).toString().padStart(6, '0');
    const salarySlipNo = `SAL-${cycle.year}-${cycle.month.toString().padStart(2, '0')}-${slipSeq}`;

    // 5. Build salary components snapshot
    const pct = Number(data.installmentAmount) / monthlyGrossContract; // ratio of payment
    const basic = 0.5 * Number(data.installmentAmount); // 50% basic
    const da = 0.15 * Number(data.installmentAmount); // 15% DA
    const hra = 0.2 * Number(data.installmentAmount); // 20% HRA
    const medical = 0.05 * Number(data.installmentAmount); // 5% Medical
    const spec = Number(data.installmentAmount) - (basic + da + hra + medical); // remaining

    // 6. Create Salary Payment
    const payment = await tx.salaryPayment.create({
      data: {
        staffId: data.staffId,
        payrollCycleId: data.payrollCycleId,
        paymentType: data.paymentType,
        status: SalaryPaymentStatus.COMPLETED,
        salarySlipNo,
        installmentNumber: pastPayments.length + 1,
        transactionReference: data.transactionReference,
        paymentMode: data.paymentMode,
        grossSalary: data.installmentAmount,
        remarks: data.remarks,
        finalSettlementReason: data.finalSettlementReason,
        createdById: data.createdById,

        // Snapshot details
        basicSalary: basic,
        da,
        hra,
        medical,
        specialAllowance: spec,
        grossAmount: data.installmentAmount,
        netAmount: data.installmentAmount, // base, adjusted below
      },
    });

    let totalDeductions = 0;
    let totalIncentives = 0;

    // 7. Recover Advance (Deduction Priority 1)
    if (data.recoverAdvanceId && data.recoverAdvanceAmount && data.recoverAdvanceAmount > 0) {
      const adv = await tx.employeeAdvance.findUnique({
        where: { id: data.recoverAdvanceId },
      });
      if (!adv) throw new Error('Advance record not found.');
      if (Number(adv.outstandingAmount) < data.recoverAdvanceAmount) {
        throw new Error('Recovery amount exceeds outstanding advance balance.');
      }

      const nextOutstanding = Number(adv.outstandingAmount) - data.recoverAdvanceAmount;
      const nextRecovered = Number(adv.recoveredAmount) + data.recoverAdvanceAmount;
      const isFullyRecovered = nextOutstanding <= 0;

      await tx.employeeAdvance.update({
        where: { id: adv.id },
        data: {
          outstandingAmount: nextOutstanding,
          recoveredAmount: nextRecovered,
          status: isFullyRecovered ? AdvanceStatus.RECOVERED : AdvanceStatus.PARTIALLY_RECOVERED,
          recoveredAt: isFullyRecovered ? new Date() : undefined,
        },
      });

      // Record recovery ledger
      await tx.payrollRecovery.create({
        data: {
          salaryPaymentId: payment.id,
          recoveryType: RecoveryType.ADVANCE,
          referenceId: adv.id,
          amount: data.recoverAdvanceAmount,
        },
      });

      totalDeductions += data.recoverAdvanceAmount;
    }

    // 8. Recover Loan EMI (Deduction Priority 2)
    if (data.recoverLoanId && data.recoverLoanAmount && data.recoverLoanAmount > 0) {
      const loan = await tx.employeeLoan.findUnique({
        where: { id: data.recoverLoanId },
      });
      if (!loan) throw new Error('Loan record not found.');
      if (Number(loan.outstandingAmount) < data.recoverLoanAmount) {
        throw new Error('Recovery amount exceeds outstanding loan balance.');
      }

      const nextOutstanding = Number(loan.outstandingAmount) - data.recoverLoanAmount;
      const isFullyRecovered = nextOutstanding <= 0;

      await tx.employeeLoan.update({
        where: { id: loan.id },
        data: {
          outstandingAmount: nextOutstanding,
          status: isFullyRecovered ? LoanStatus.RECOVERED : LoanStatus.ACTIVE,
        },
      });

      // Mark matching unpaid loan installment as paid
      const nextUnpaidInstallment = await tx.employeeLoanInstallment.findFirst({
        where: { loanId: loan.id, status: LoanInstallmentStatus.UNPAID },
        orderBy: { dueDate: 'asc' },
      });

      if (nextUnpaidInstallment) {
        await tx.employeeLoanInstallment.update({
          where: { id: nextUnpaidInstallment.id },
          data: {
            paidAmount: data.recoverLoanAmount,
            status: LoanInstallmentStatus.PAID,
          },
        });
      }

      // Record recovery ledger
      await tx.payrollRecovery.create({
        data: {
          salaryPaymentId: payment.id,
          recoveryType: RecoveryType.LOAN,
          referenceId: loan.id,
          amount: data.recoverLoanAmount,
        },
      });

      totalDeductions += data.recoverLoanAmount;
    }

    // 9. Apply Custom adjustments (Incentives / Deductions)
    if (data.adjustments && data.adjustments.length > 0) {
      for (const adj of data.adjustments) {
        await tx.salaryAdjustment.create({
          data: {
            salaryPaymentId: payment.id,
            amount: adj.amount,
            reason: adj.reason,
            createdById: data.createdById,
          },
        });

        if (adj.amount > 0) {
          totalIncentives += adj.amount;
        } else {
          totalDeductions += Math.abs(adj.amount);
        }
      }
    }

    // 10. Re-verify Net Amount is not negative
    const finalNet = Number(data.installmentAmount) + totalIncentives - totalDeductions;
    if (finalNet < 0) {
      throw new Error(`Deductions of ₹${totalDeductions} exceed total gross + incentives ₹${(Number(data.installmentAmount) + totalIncentives)}.`);
    }

    // 11. Update final net amount on payment record
    const updatedPayment = await tx.salaryPayment.update({
      where: { id: payment.id },
      data: { netAmount: finalNet },
    });

    // 12. Log matching Expense row
    await tx.expense.create({
      data: {
        title: `Salary Disbursement`,
        category: 'SALARY',
        amount: finalNet,
        paymentMode: data.paymentMode,
        notes: `Salary disbursement slip ${salarySlipNo}`,
        paidTo: data.staffId,
        expenseDate: new Date(),
        referenceType: 'SALARY',
        referenceId: payment.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: data.createdById,
        action: 'DISBURSE_SALARY',
        details: `Disbursed salary slip ${salarySlipNo} (Net Paid: ₹${finalNet.toFixed(2)}) to staff ${data.staffId}`,
      },
    });

    return updatedPayment;
  });
}
