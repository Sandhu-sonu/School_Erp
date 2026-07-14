import { prisma, Prisma } from '@school-erp/db';
import { StaffStatus, PaymentMode } from '@prisma/client';

/**
 * Generate a transaction-safe sequential Employee Code (e.g. EMP-0001)
 */
export async function generateEmployeeCode(): Promise<string> {
  return await prisma.$transaction(async (tx) => {
    let seq = await tx.employeeSequence.findFirst();
    if (!seq) {
      seq = await tx.employeeSequence.create({
        data: { nextNumber: 1 },
      });
    }

    const currentNumber = seq.nextNumber;
    
    // Increment the sequence number
    await tx.employeeSequence.update({
      where: { id: seq.id },
      data: { nextNumber: currentNumber + 1 },
    });

    const codeStr = String(currentNumber).padStart(4, '0');
    return `EMP-${codeStr}`;
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

/**
 * Generate a transaction-safe sequential Salary Receipt Number (e.g. SAL-2026-00001)
 */
export async function generateSalaryReceiptNumber(year: number): Promise<string> {
  return await prisma.$transaction(async (tx) => {
    let seq = await tx.salaryReceiptSequence.findUnique({
      where: { year },
    });

    if (!seq) {
      seq = await tx.salaryReceiptSequence.create({
        data: { year, nextNumber: 1 },
      });
    }

    const currentNumber = seq.nextNumber;

    // Increment
    await tx.salaryReceiptSequence.update({
      where: { id: seq.id },
      data: { nextNumber: currentNumber + 1 },
    });

    const numStr = String(currentNumber).padStart(5, '0');
    return `SAL-${year}-${numStr}`;
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

/**
 * Staff Administration Services
 */
export async function createStaff(data: {
  name: string;
  mobile: string;
  email?: string;
  gender: string;
  dob: Date;
  joiningDate: Date;
  designation: string;
  qualification: string;
  monthlySalary: number;
  remarks?: string;
}) {
  const employeeCode = await generateEmployeeCode();

  return await prisma.staff.create({
    data: {
      employeeCode,
      name: data.name,
      mobile: data.mobile,
      email: data.email || null,
      gender: data.gender,
      dob: data.dob,
      joiningDate: data.joiningDate,
      designation: data.designation,
      qualification: data.qualification,
      monthlySalary: data.monthlySalary,
      status: StaffStatus.ACTIVE,
      remarks: data.remarks || null,
    },
  });
}

export async function getStaffList(filters: { search?: string; status?: StaffStatus; page?: number; limit?: number }) {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = {
    // Hide DELETED from rosters
    status: filters.status ? filters.status : { not: StaffStatus.DELETED },
  };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { employeeCode: { contains: filters.search, mode: 'insensitive' } },
      { mobile: { contains: filters.search } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.staff.count({ where }),
    prisma.staff.findMany({
      where,
      orderBy: { employeeCode: 'asc' },
      skip,
      take: limit,
    }),
  ]);

  return { total, items, page, limit };
}

export async function getStaffById(id: string) {
  return await prisma.staff.findUnique({
    where: { id },
    include: {
      salaryPayments: {
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: {
          createdBy: { select: { name: true } },
          adjustments: {
            orderBy: { createdAt: 'desc' },
            include: { createdBy: { select: { name: true } } },
          },
        },
      },
    },
  });
}

export async function updateStaff(
  id: string,
  data: {
    name?: string;
    mobile?: string;
    email?: string;
    gender?: string;
    dob?: Date;
    joiningDate?: Date;
    designation?: string;
    qualification?: string;
    monthlySalary?: number;
    status?: StaffStatus;
    remarks?: string;
  }
) {
  return await prisma.staff.update({
    where: { id },
    data: {
      ...data,
      email: data.email !== undefined ? (data.email || null) : undefined,
      remarks: data.remarks !== undefined ? (data.remarks || null) : undefined,
    },
  });
}

/**
 * Manual Salary Entry Services
 */
export async function createSalaryPayment(data: {
  staffId: string;
  month: number; // 1-12
  year: number;
  grossSalary: number;
  adjustment: number;
  paymentMethod: PaymentMode;
  remarks?: string;
  createdById: string;
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. Validate Staff ACTIVE status
    const staff = await tx.staff.findUniqueOrThrow({
      where: { id: data.staffId },
    });

    if (staff.status !== StaffStatus.ACTIVE) {
      throw new Error(`Salary cannot be processed for INACTIVE or DELETED staff member: ${staff.name} (${staff.employeeCode})`);
    }

    // 2. Validate month/year uniqueness to prevent duplicate entries
    const existing = await tx.salaryPayment.findUnique({
      where: {
        staffId_month_year: {
          staffId: data.staffId,
          month: data.month,
          year: data.year,
        },
      },
    });

    if (existing) {
      throw new Error(`Salary payment for ${staff.name} is already registered for month ${data.month}/${data.year}`);
    }

    // 3. Generate transaction-safe receipt number
    const receiptNumber = await generateSalaryReceiptNumber(data.year);

    // 4. Create SalaryPayment (immutable)
    const payment = await tx.salaryPayment.create({
      data: {
        staffId: data.staffId,
        month: data.month,
        year: data.year,
        grossSalary: data.grossSalary,
        paymentMethod: data.paymentMethod,
        remarks: data.remarks || null,
        receiptNumber,
        createdById: data.createdById,
      },
    });

    // Create initial SalaryAdjustment if adjustment !== 0
    if (data.adjustment !== 0) {
      await tx.salaryAdjustment.create({
        data: {
          salaryPaymentId: payment.id,
          amount: data.adjustment,
          reason: 'Initial adjustment on creation',
          createdById: data.createdById,
        },
      });
    }

    // 5. Create locked Expense record mapping back to SalaryPayment
    const finalAmount = Number(data.grossSalary) + Number(data.adjustment);
    
    await tx.expense.create({
      data: {
        title: `Salary Paid - ${staff.name} (${staff.employeeCode})`,
        amount: finalAmount,
        category: 'Salary',
        expenseDate: new Date(),
        paidTo: staff.name,
        paymentMode: data.paymentMethod,
        notes: `Salary Receipt: ${receiptNumber}. Remarks: ${data.remarks || 'None'}`,
        referenceType: 'SALARY',
        referenceId: payment.id,
        isLocked: true,
      },
    });

    // 6. Write Audit Log
    await tx.auditLog.create({
      data: {
        userId: data.createdById,
        action: 'CREATE_SALARY',
        details: `Generated manual salary payment of ₹${finalAmount.toFixed(2)} for ${staff.name} (${receiptNumber})`,
      },
    });

    return payment;
  });
}

/**
 * Apply Salary Adjustment entries
 */
export async function adjustSalaryPayment(
  paymentId: string,
  amount: number, // can be positive (bonus) or negative (correction)
  reason: string,
  createdById: string
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Validate payment exists
    const payment = await tx.salaryPayment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { staff: true },
    });

    // 2. Create SalaryAdjustment
    const adj = await tx.salaryAdjustment.create({
      data: {
        salaryPaymentId: paymentId,
        amount,
        reason,
        createdById,
      },
    });

    // 3. Calculate new total adjustments sum
    const adjustments = await tx.salaryAdjustment.findMany({
      where: { salaryPaymentId: paymentId },
    });
    const totalAdjustment = adjustments.reduce((sum, current) => sum + Number(current.amount), 0);

    // 4. Never update SalaryPayment! (Gross Salary remains immutable and adjustment isn't stored on it!)

    // 5. Update the linked locked Expense entry
    const finalAmount = Number(payment.grossSalary) + totalAdjustment;
    
    const expense = await tx.expense.findFirst({
      where: {
        referenceType: 'SALARY',
        referenceId: paymentId,
      },
    });

    if (expense) {
      await tx.expense.update({
        where: { id: expense.id },
        data: {
          amount: finalAmount,
          notes: `${expense.notes} | Adjust: ₹${amount.toFixed(2)} (${reason})`,
        },
      });
    }

    // 6. Write Audit Log
    await tx.auditLog.create({
      data: {
        userId: createdById,
        action: 'ADJUST_SALARY',
        details: `Applied salary adjustment of ₹${amount.toFixed(2)} on slip ${payment.receiptNumber} (${reason})`,
      },
    });

    return adj;
  });
}

/**
 * Get Salary history report logs
 */
export async function getSalaryHistory(filters: { staffId?: string; month?: number; year?: number }) {
  const where: any = {};
  if (filters.staffId) where.staffId = filters.staffId;
  if (filters.month) where.month = filters.month;
  if (filters.year) where.year = filters.year;

  return await prisma.salaryPayment.findMany({
    where,
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    include: {
      staff: { select: { name: true, employeeCode: true, designation: true } },
      createdBy: { select: { name: true } },
      adjustments: { orderBy: { createdAt: 'desc' } },
    },
  });
}
