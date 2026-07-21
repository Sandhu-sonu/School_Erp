import { prisma } from '@school-erp/db';
import { StudentStatus, StaffStatus, PaymentMode, AttendanceStatus } from '@prisma/client';

export interface ReportPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReportResponse<T, S = any> {
  data: T[];
  summary: S;
  pagination: ReportPagination;
}

/**
 * Standardized Pagination Helper
 */
function getPaginationMeta(total: number, page: number, limit: number, exportMode = false): ReportPagination {
  const finalLimit = exportMode ? total || 1 : limit;
  const totalPages = Math.ceil(total / finalLimit) || 1;
  return {
    total,
    page: exportMode ? 1 : page,
    limit: finalLimit,
    totalPages,
  };
}

/**
 * A. STUDENT REPORTS
 */

export interface StudentRegisterRow {
  id: string;
  admissionNumber: string;
  name: string;
  dob: Date;
  gender: string;
  status: StudentStatus;
  admissionDate: Date;
  fatherName: string;
  parentMobile: string;
  className: string;
  sectionName: string;
  isTransportUser: boolean;
}

export async function getStudentRegister(
  filters: { sessionId?: string; classId?: string; sectionId?: string; status?: StudentStatus },
  page = 1,
  limit = 20,
  exportMode = false
): Promise<ReportResponse<StudentRegisterRow, { totalStudents: number; active: number; deleted: number; transportUsers: number }>> {
  const where: any = {};
  if (filters.status) {
    where.status = filters.status;
  } else {
    where.status = { not: 'DELETED' };
  }

  if (filters.sessionId || filters.classId || filters.sectionId) {
    where.enrollments = {
      some: {
        ...(filters.sessionId && { sessionId: filters.sessionId }),
        ...(filters.classId && { classId: filters.classId }),
        ...(filters.sectionId && { sectionId: filters.sectionId }),
        isArchived: false,
      },
    };
  }

  const total = await prisma.student.count({ where });
  const skip = exportMode ? 0 : (page - 1) * limit;
  const take = exportMode ? 10000 : limit;

  const students = await prisma.student.findMany({
    where,
    include: {
      parent: true,
      enrollments: {
        where: { isArchived: false },
        include: {
          class: true,
          section: true,
        },
        take: 1,
      },
      transports: {
        where: { status: 'ACTIVE' },
        take: 1,
      },
    },
    orderBy: { admissionNumber: 'asc' },
    skip,
    take,
  });

  const data: StudentRegisterRow[] = students.map((s) => {
    const activeEnrollment = s.enrollments[0];
    return {
      id: s.id,
      admissionNumber: s.admissionNumber,
      name: s.name,
      dob: s.dob,
      gender: s.gender,
      status: s.status,
      admissionDate: s.admissionDate,
      fatherName: s.parent.fatherName,
      parentMobile: s.parent.mobile,
      className: activeEnrollment?.class?.name || 'N/A',
      sectionName: activeEnrollment?.section?.name || 'N/A',
      isTransportUser: s.transports.length > 0,
    };
  });

  // Calculate overall KPIs (ignoring current page/class/section filters to reflect system KPIs)
  const totalStudents = await prisma.student.count({ where: { status: { not: 'DELETED' } } });
  const active = await prisma.student.count({ where: { status: 'ACTIVE' } });
  const deleted = await prisma.student.count({ where: { status: 'DELETED' } });
  const transportUsers = await prisma.studentTransport.count({ where: { status: 'ACTIVE' } });

  return {
    data,
    summary: { totalStudents, active, deleted, transportUsers },
    pagination: getPaginationMeta(total, page, limit, exportMode),
  };
}

export async function getClassStrengthReport(filters: { sessionId?: string }) {
  const activeSession = filters.sessionId 
    ? await prisma.academicSession.findUnique({ where: { id: filters.sessionId } })
    : await prisma.academicSession.findFirst({ where: { isActive: true } });

  const enrollments = await prisma.classEnrollment.findMany({
    where: {
      isArchived: false,
      ...(activeSession && { sessionId: activeSession.id }),
      student: { status: 'ACTIVE' },
    },
    include: {
      class: true,
      section: true,
    },
  });

  const counts: Record<string, { className: string; sections: Record<string, number>; total: number }> = {};

  for (const enr of enrollments) {
    const classId = enr.classId;
    const className = enr.class.name;
    const secName = enr.section?.name || 'No Section';

    if (!counts[classId]) {
      counts[classId] = { className, sections: {}, total: 0 };
    }
    counts[classId].sections[secName] = (counts[classId].sections[secName] || 0) + 1;
    counts[classId].total += 1;
  }

  const data = Object.entries(counts).map(([classId, info]) => ({
    classId,
    className: info.className,
    sections: Object.entries(info.sections).map(([sec, count]) => ({ section: sec, count })),
    total: info.total,
  }));

  return {
    data,
    summary: { totalActiveEnrolled: enrollments.length },
    pagination: getPaginationMeta(data.length, 1, data.length, true),
  };
}

export async function getGenderDistributionReport(filters: { sessionId?: string; classId?: string }) {
  const where: any = { status: 'ACTIVE' };
  if (filters.sessionId || filters.classId) {
    where.enrollments = {
      some: {
        ...(filters.sessionId && { sessionId: filters.sessionId }),
        ...(filters.classId && { classId: filters.classId }),
        isArchived: false,
      },
    };
  }

  const genderGroups = await prisma.student.groupBy({
    by: ['gender'],
    where,
    _count: { id: true },
  });

  const total = genderGroups.reduce((acc, g) => acc + g._count.id, 0);

  const data = genderGroups.map((g) => ({
    gender: g.gender,
    count: g._count.id,
    percentage: total > 0 ? (g._count.id / total) * 100 : 0,
  }));

  return {
    data,
    summary: { total },
    pagination: getPaginationMeta(data.length, 1, data.length, true),
  };
}

export async function getTransportUsersReport(
  filters: { routeId?: string; stopId?: string },
  page = 1,
  limit = 20,
  exportMode = false
) {
  const where: any = { status: 'ACTIVE' };
  if (filters.routeId) where.routeId = filters.routeId;
  if (filters.stopId) where.stopId = filters.stopId;

  const total = await prisma.studentTransport.count({ where });
  const skip = exportMode ? 0 : (page - 1) * limit;
  const take = exportMode ? 10000 : limit;

  const list = await prisma.studentTransport.findMany({
    where,
    include: {
      student: {
        include: {
          enrollments: {
            where: { isArchived: false },
            include: { class: true, section: true },
            take: 1,
          },
        },
      },
      route: true,
      stop: true,
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });

  const data = list.map((item) => {
    const enrollment = item.student.enrollments[0];
    return {
      id: item.id,
      studentId: item.studentId,
      studentName: item.student.name,
      admissionNumber: item.student.admissionNumber,
      className: enrollment?.class?.name || 'N/A',
      sectionName: enrollment?.section?.name || 'N/A',
      routeName: item.route.name,
      stopName: item.stop.name,
      monthlyFare: Number(item.monthlyFare),
      activeFrom: item.activeFrom,
    };
  });

  const totalFareSum = list.reduce((acc, item) => acc + Number(item.monthlyFare), 0);

  return {
    data,
    summary: { totalUsers: total, totalFareSum },
    pagination: getPaginationMeta(total, page, limit, exportMode),
  };
}

export async function getAdmissionsByMonthReport(filters: { sessionId?: string }) {
  const where: any = {};
  if (filters.sessionId) {
    where.enrollments = {
      some: {
        sessionId: filters.sessionId,
        isArchived: false,
      },
    };
  }

  const students = await prisma.student.findMany({
    where,
    select: { admissionDate: true },
  });

  const monthCounts: Record<string, number> = {};
  for (const s of students) {
    const date = new Date(s.admissionDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
  }

  const data = Object.entries(monthCounts)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    data,
    summary: { totalAdmissions: students.length },
    pagination: getPaginationMeta(data.length, 1, data.length, true),
  };
}

export async function getDOBAnalyticsReport(filters: { classId?: string }) {
  const where: any = { status: 'ACTIVE' };
  if (filters.classId) {
    where.enrollments = {
      some: {
        classId: filters.classId,
        isArchived: false,
      },
    };
  }

  const students = await prisma.student.findMany({
    where,
    select: { dob: true, name: true, admissionNumber: true },
  });

  const ageGroups = {
    'Under 5': 0,
    '5 to 10': 0,
    '11 to 15': 0,
    'Above 15': 0,
  };

  const today = new Date();
  for (const s of students) {
    const birthDate = new Date(s.dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 5) ageGroups['Under 5']++;
    else if (age <= 10) ageGroups['5 to 10']++;
    else if (age <= 15) ageGroups['11 to 15']++;
    else ageGroups['Above 15']++;
  }

  const data = Object.entries(ageGroups).map(([group, count]) => ({ group, count }));

  return {
    data,
    summary: { totalAnalyzed: students.length },
    pagination: getPaginationMeta(data.length, 1, data.length, true),
  };
}

/**
 * B. FINANCE REPORTS
 */

export interface FeeCollectionsRow {
  id: string;
  receiptNumber: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  amount: number;
  discountAmount: number;
  waiverAmount: number;
  paymentMode: PaymentMode;
  transactionDate: Date;
  collectedBy: string;
  isReversed: boolean;
}

export async function getFeeCollectionsReport(
  filters: { startDate?: Date; endDate?: Date; paymentMode?: PaymentMode },
  page = 1,
  limit = 20,
  exportMode = false
): Promise<ReportResponse<FeeCollectionsRow, { totalAmount: number; totalDiscount: number; totalWaiver: number; activeCount: number }>> {
  const where: any = {};
  if (filters.startDate || filters.endDate) {
    where.transactionDate = {
      ...(filters.startDate && { gte: filters.startDate }),
      ...(filters.endDate && { lte: filters.endDate }),
    };
  }
  if (filters.paymentMode) {
    where.paymentMode = filters.paymentMode;
  }

  const total = await prisma.feeTransaction.count({ where });
  const skip = exportMode ? 0 : (page - 1) * limit;
  const take = exportMode ? 10000 : limit;

  const list = await prisma.feeTransaction.findMany({
    where,
    include: {
      feeAccount: {
        include: {
          enrollment: {
            include: {
              student: true,
              class: true,
            },
          },
        },
      },
      collectedBy: true,
    },
    orderBy: { transactionDate: 'desc' },
    skip,
    take,
  });

  const data: FeeCollectionsRow[] = list.map((t) => ({
    id: t.id,
    receiptNumber: t.receiptNumber,
    studentName: t.feeAccount.enrollment.student.name,
    admissionNumber: t.feeAccount.enrollment.student.admissionNumber,
    className: t.feeAccount.enrollment.class.name,
    amount: Number(t.amount),
    discountAmount: Number(t.discountAmount),
    waiverAmount: Number(t.waiverAmount),
    paymentMode: t.paymentMode,
    transactionDate: t.transactionDate,
    collectedBy: t.collectedBy?.name || 'System',
    isReversed: t.isReversed,
  }));

  const activeTx = list.filter((t) => !t.isReversed);
  const totalAmount = activeTx.reduce((acc, t) => acc + Number(t.amount), 0);
  const totalDiscount = activeTx.reduce((acc, t) => acc + Number(t.discountAmount), 0);
  const totalWaiver = activeTx.reduce((acc, t) => acc + Number(t.waiverAmount), 0);

  return {
    data,
    summary: { totalAmount, totalDiscount, totalWaiver, activeCount: activeTx.length },
    pagination: getPaginationMeta(total, page, limit, exportMode),
  };
}

export async function getOutstandingDuesReport(
  filters: { classId?: string },
  page = 1,
  limit = 20,
  exportMode = false
) {
  const where: any = {
    remainingFee: { gt: 0 },
    enrollment: {
      isArchived: false,
      student: { status: 'ACTIVE' },
      ...(filters.classId && { classId: filters.classId }),
    },
  };

  const total = await prisma.studentFeeAccount.count({ where });
  const skip = exportMode ? 0 : (page - 1) * limit;
  const take = exportMode ? 10000 : limit;

  const accounts = await prisma.studentFeeAccount.findMany({
    where,
    include: {
      enrollment: {
        include: {
          student: true,
          class: true,
          section: true,
        },
      },
    },
    orderBy: { remainingFee: 'desc' },
    skip,
    take,
  });

  const data = accounts.map((acc) => ({
    id: acc.id,
    studentName: acc.enrollment.student.name,
    admissionNumber: acc.enrollment.student.admissionNumber,
    className: acc.enrollment.class.name,
    sectionName: acc.enrollment.section?.name || 'N/A',
    totalFee: Number(acc.totalFee),
    paidAmount: Number(acc.paidAmount),
    discount: Number(acc.discount),
    waiver: Number(acc.waiver),
    remainingFee: Number(acc.remainingFee),
  }));

  const totalOutstanding = data.reduce((sum, item) => sum + item.remainingFee, 0);

  return {
    data,
    summary: { totalOutstanding, count: total },
    pagination: getPaginationMeta(total, page, limit, exportMode),
  };
}

export async function getDailyCollectionReport(startDate?: Date, endDate?: Date) {
  const where: any = { isReversed: false };
  if (startDate || endDate) {
    where.transactionDate = {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    };
  }

  const transactions = await prisma.feeTransaction.findMany({
    where,
    select: { amount: true, transactionDate: true },
  });

  const daily: Record<string, number> = {};
  for (const t of transactions) {
    const d = new Date(t.transactionDate);
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    daily[dayKey] = (daily[dayKey] || 0) + Number(t.amount);
  }

  const data = Object.entries(daily)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  return {
    data,
    summary: { totalAmount },
    pagination: getPaginationMeta(data.length, 1, data.length, true),
  };
}

export async function getMonthlyCollectionReport(startDate?: Date, endDate?: Date) {
  const where: any = { isReversed: false };
  if (startDate || endDate) {
    where.transactionDate = {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    };
  }

  const transactions = await prisma.feeTransaction.findMany({
    where,
    select: { amount: true, transactionDate: true },
  });

  const monthly: Record<string, number> = {};
  for (const t of transactions) {
    const d = new Date(t.transactionDate);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly[monthKey] = (monthly[monthKey] || 0) + Number(t.amount);
  }

  const data = Object.entries(monthly)
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => b.month.localeCompare(a.month));

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  return {
    data,
    summary: { totalAmount },
    pagination: getPaginationMeta(data.length, 1, data.length, true),
  };
}

export async function getFeeStatusReport() {
  const accounts = await prisma.studentFeeAccount.groupBy({
    by: ['feeStatus'],
    _count: { id: true },
    _sum: { remainingFee: true, paidAmount: true },
  });

  const data = accounts.map((a) => ({
    status: a.feeStatus,
    count: a._count.id,
    totalRemaining: Number(a._sum.remainingFee || 0),
    totalPaid: Number(a._sum.paidAmount || 0),
  }));

  return {
    data,
    summary: {},
    pagination: getPaginationMeta(data.length, 1, data.length, true),
  };
}

export async function getDiscountAndWaiverSummary() {
  const accounts = await prisma.studentFeeAccount.aggregate({
    _sum: {
      discount: true,
      waiver: true,
    },
  });

  const data = [
    { type: 'DISCOUNT', total: Number(accounts._sum.discount || 0) },
    { type: 'WAIVER', total: Number(accounts._sum.waiver || 0) },
  ];

  return {
    data,
    summary: { totalAdjustment: data.reduce((acc, d) => acc + d.total, 0) },
    pagination: getPaginationMeta(data.length, 1, data.length, true),
  };
}

export async function getTransportRevenueReport() {
  const debits = await prisma.feeAdjustment.aggregate({
    where: { referenceType: 'TRANSPORT', type: 'DEBIT' },
    _sum: { amount: true },
  });
  const credits = await prisma.feeAdjustment.aggregate({
    where: { referenceType: 'TRANSPORT', type: 'CREDIT' },
    _sum: { amount: true },
  });

  const totalDebits = Number(debits._sum.amount || 0);
  const totalCredits = Number(credits._sum.amount || 0);
  const revenue = totalDebits - totalCredits;

  return {
    data: [
      { type: 'DEBITS (Charges)', amount: totalDebits },
      { type: 'CREDITS (Reversals)', amount: totalCredits },
      { type: 'NET TRANSPORT REVENUE', amount: revenue },
    ],
    summary: { revenue },
    pagination: getPaginationMeta(3, 1, 3, true),
  };
}

export async function getExpenseSummaryReport(startDate?: Date, endDate?: Date) {
  const where: any = {};
  if (startDate || endDate) {
    where.expenseDate = {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    };
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { expenseDate: 'desc' },
  });

  const data = expenses.map((e) => ({
    id: e.id,
    title: e.title,
    amount: Number(e.amount),
    category: e.category,
    expenseDate: e.expenseDate,
    paidTo: e.paidTo,
    paymentMode: e.paymentMode,
    isLocked: e.isLocked,
  }));

  const totalExpense = data.reduce((sum, item) => sum + item.amount, 0);

  return {
    data,
    summary: { totalExpense },
    pagination: getPaginationMeta(data.length, 1, data.length, true),
  };
}

export async function getSalarySummaryReport() {
  const payments = await prisma.salaryPayment.findMany({
    include: { adjustments: true, payrollCycle: true },
  });

  let totalGross = 0;
  let totalAdjustments = 0;
  let totalEffectivePaid = 0;

  const data = payments.map((p) => {
    const gross = Number(p.grossSalary);
    const adjustmentsSum = p.adjustments.reduce((sum, adj) => sum + Number(adj.amount), 0);
    const effectivePaid = gross + adjustmentsSum;

    totalGross += gross;
    totalAdjustments += adjustmentsSum;
    totalEffectivePaid += effectivePaid;

    return {
      id: p.id,
      receiptNumber: p.salarySlipNo,
      month: p.payrollCycle?.month || 0,
      year: p.payrollCycle?.year || 0,
      grossSalary: gross,
      adjustments: adjustmentsSum,
      effectivePaid,
    };
  });

  return {
    data,
    summary: { totalGross, totalAdjustments, totalEffectivePaid },
    pagination: getPaginationMeta(data.length, 1, data.length, true),
  };
}

export async function getNetBalanceReport(): Promise<{ collections: number; expenses: number; salaryPaid: number; netBalance: number }> {
  // Collections (fee transactions that are not reversed)
  const collectionsTx = await prisma.feeTransaction.aggregate({
    where: { isReversed: false },
    _sum: { amount: true },
  });
  const collections = Number(collectionsTx._sum.amount || 0);

  // Expenses
  const expensesAgg = await prisma.expense.aggregate({
    _sum: { amount: true },
  });
  const expenses = Number(expensesAgg._sum.amount || 0);

  // Salary Effective Paid
  const salaries = await prisma.salaryPayment.findMany({
    include: { adjustments: true },
  });
  const salaryPaid = salaries.reduce((sum, s) => {
    const gross = Number(s.grossSalary);
    const adjSum = s.adjustments.reduce((aSum, a) => aSum + Number(a.amount), 0);
    return sum + gross + adjSum;
  }, 0);

  const netBalance = collections - expenses - salaryPaid;

  return {
    collections,
    expenses,
    salaryPaid,
    netBalance,
  };
}

/**
 * C. ATTENDANCE REPORTS
 */

export interface AttendanceKPIs {
  present: number;
  absent: number;
  late: number;
  holiday: number;
}

export async function getDailyAttendanceReport(date: Date, classId?: string, sectionId?: string) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);

  const where: any = {
    date: d,
  };

  if (classId || sectionId) {
    where.enrollment = {
      ...(classId && { classId }),
      ...(sectionId && { sectionId }),
    };
  }

  const records = await prisma.attendance.findMany({
    where,
    include: {
      enrollment: {
        include: {
          student: true,
          class: true,
          section: true,
        },
      },
    },
  });

  const kpis: AttendanceKPIs = { present: 0, absent: 0, late: 0, holiday: 0 };
  const data = records.map((r) => {
    if (r.status === 'PRESENT') kpis.present++;
    else if (r.status === 'ABSENT') kpis.absent++;
    else if (r.status === 'LATE') kpis.late++;
    else if (r.status === 'HALF_DAY') kpis.late++; // Let's count half day as present/late or separate? Let's classify: standard KPIs has Present, Absent, Late, Holiday.

    return {
      id: r.id,
      studentName: r.enrollment.student.name,
      admissionNumber: r.enrollment.student.admissionNumber,
      className: r.enrollment.class.name,
      sectionName: r.enrollment.section?.name || 'N/A',
      status: r.status,
      remarks: r.remarks,
    };
  });

  return {
    data,
    summary: kpis,
    pagination: getPaginationMeta(data.length, 1, data.length, true),
  };
}

export async function getAbsenteeList(date: Date, classId?: string, sectionId?: string) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);

  const records = await prisma.attendance.findMany({
    where: {
      date: d,
      status: 'ABSENT',
      enrollment: {
        ...(classId && { classId }),
        ...(sectionId && { sectionId }),
      },
    },
    include: {
      enrollment: {
        include: {
          student: true,
          class: true,
          section: true,
        },
      },
    },
  });

  const data = records.map((r) => ({
    studentName: r.enrollment.student.name,
    admissionNumber: r.enrollment.student.admissionNumber,
    className: r.enrollment.class.name,
    sectionName: r.enrollment.section?.name || 'N/A',
    remarks: r.remarks,
  }));

  return {
    data,
    summary: { totalAbsentees: data.length },
    pagination: getPaginationMeta(data.length, 1, data.length, true),
  };
}

export async function getStudentAttendancePercent(classId?: string, sectionId?: string) {
  const enrollments = await prisma.classEnrollment.findMany({
    where: {
      isArchived: false,
      student: { status: 'ACTIVE' },
      ...(classId && { classId }),
      ...(sectionId && { sectionId }),
    },
    include: {
      student: true,
      class: true,
      section: true,
      attendance: true,
    },
  });

  const data = enrollments.map((enr) => {
    const total = enr.attendance.length;
    const present = enr.attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const rate = total > 0 ? (present / total) * 100 : 0;

    return {
      studentName: enr.student.name,
      admissionNumber: enr.student.admissionNumber,
      className: enr.class.name,
      sectionName: enr.section?.name || 'N/A',
      present,
      total,
      percentage: rate,
    };
  });

  return {
    data,
    summary: {},
    pagination: getPaginationMeta(data.length, 1, data.length, true),
  };
}

export async function getClassAttendancePercent() {
  const classes = await prisma.class.findMany({
    include: {
      enrollments: {
        where: { isArchived: false, student: { status: 'ACTIVE' } },
        include: { attendance: true },
      },
    },
  });

  const data = classes.map((c) => {
    let total = 0;
    let present = 0;
    for (const enr of c.enrollments) {
      total += enr.attendance.length;
      present += enr.attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    }
    const rate = total > 0 ? (present / total) * 100 : 0;

    return {
      className: c.name,
      percentage: rate,
      totalRecords: total,
    };
  });

  return {
    data,
    summary: {},
    pagination: getPaginationMeta(data.length, 1, data.length, true),
  };
}

/**
 * D. ACADEMIC REPORTS (READING Result.snapshotJson ONLY for published results)
 */

export async function getExamResultsReport(examId: string, classId?: string) {
  const results = await prisma.result.findMany({
    where: {
      examId,
      published: true,
      student: {
        enrollments: {
          some: {
            ...(classId && { classId }),
            isArchived: false,
          },
        },
      },
    },
    include: {
      student: {
        include: {
          enrollments: {
            where: { isArchived: false },
            include: { class: true, section: true },
            take: 1,
          },
        },
      },
    },
  });

  const data = results.map((r) => {
    const snapshot: any = r.snapshotJson || {};
    const enrollment = r.student.enrollments[0];

    return {
      id: r.id,
      studentName: r.student.name,
      admissionNumber: r.student.admissionNumber,
      className: enrollment?.class?.name || 'N/A',
      sectionName: enrollment?.section?.name || 'N/A',
      totalObtained: snapshot.total ?? Number(r.total),
      percentage: snapshot.percentage ?? Number(r.percentage),
      grade: snapshot.grade ?? r.finalGrade,
      rank: snapshot.rank ?? r.rank,
      subjects: snapshot.subjects || [],
    };
  });

  return {
    data,
    summary: { count: data.length },
    pagination: getPaginationMeta(data.length, 1, data.length, true),
  };
}

export async function getClassToppers(examId: string, classId?: string) {
  const report = await getExamResultsReport(examId, classId);
  const data = report.data
    .sort((a, b) => (a.rank || 999) - (b.rank || 999))
    .slice(0, 10); // top 10 toppers

  return {
    data,
    summary: { toppersCount: data.length },
    pagination: getPaginationMeta(data.length, 1, data.length, true),
  };
}

export async function getPassPercentageReport(examId: string, classId?: string) {
  const report = await getExamResultsReport(examId, classId);
  const total = report.data.length;
  const passed = report.data.filter(r => r.grade !== 'FAIL').length;
  const passPercentage = total > 0 ? (passed / total) * 100 : 0;

  return {
    data: [
      { name: 'Passed', count: passed },
      { name: 'Failed', count: total - passed },
    ],
    summary: { total, passed, passPercentage },
    pagination: getPaginationMeta(2, 1, 2, true),
  };
}

export async function getGradeDistributionReport(examId: string, classId?: string) {
  const report = await getExamResultsReport(examId, classId);
  const dist: Record<string, number> = {};

  for (const r of report.data) {
    dist[r.grade] = (dist[r.grade] || 0) + 1;
  }

  const data = Object.entries(dist).map(([grade, count]) => ({
    grade,
    count,
  }));

  return {
    data,
    summary: { totalStudents: report.data.length },
    pagination: getPaginationMeta(data.length, 1, data.length, true),
  };
}

/**
 * E. HR REPORTS
 */

export async function getStaffRegister(
  filters: { designation?: string; status?: StaffStatus },
  page = 1,
  limit = 20,
  exportMode = false
) {
  const where: any = {};
  if (filters.designation) where.designation = filters.designation;
  if (filters.status) {
    where.status = filters.status;
  } else {
    where.status = { not: 'DELETED' };
  }

  const total = await prisma.staff.count({ where });
  const skip = exportMode ? 0 : (page - 1) * limit;
  const take = exportMode ? 10000 : limit;

  const staff = await prisma.staff.findMany({
    where,
    orderBy: { employeeCode: 'asc' },
    skip,
    take,
  });

  const data = staff.map((st) => ({
    id: st.id,
    employeeCode: st.employeeCode,
    name: st.name,
    mobile: st.mobile,
    email: st.email,
    gender: st.gender,
    designation: st.designation,
    joiningDate: st.joiningDate,
    monthlySalary: Number(st.monthlySalary),
    status: st.status,
  }));

  return {
    data,
    summary: { count: total },
    pagination: getPaginationMeta(total, page, limit, exportMode),
  };
}

export async function getSalaryHistory(
  filters: { staffId?: string; year?: number; month?: number },
  page = 1,
  limit = 20,
  exportMode = false
) {
  const where: any = {};
  if (filters.staffId) where.staffId = filters.staffId;
  if (filters.month) where.payrollCycle = { month: filters.month };
  if (filters.year) where.payrollCycle = { ...(where.payrollCycle || {}), year: filters.year };

  const total = await prisma.salaryPayment.count({ where });
  const skip = exportMode ? 0 : (page - 1) * limit;
  const take = exportMode ? 10000 : limit;

  const list = await prisma.salaryPayment.findMany({
    where,
    include: {
      staff: true,
      createdBy: true,
      adjustments: true,
      payrollCycle: true,
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });

  const data = list.map((p) => {
    const gross = Number(p.grossSalary);
    const adjustmentsSum = p.adjustments.reduce((sum, adj) => sum + Number(adj.amount), 0);
    const effectivePaid = gross + adjustmentsSum;

    return {
      id: p.id,
      receiptNumber: p.salarySlipNo,
      employeeCode: p.staff.employeeCode,
      staffName: p.staff.name,
      designation: p.staff.designation,
      month: p.payrollCycle?.month || 0,
      year: p.payrollCycle?.year || 0,
      grossSalary: gross,
      adjustmentTotal: adjustmentsSum,
      effectivePaid,
      paymentMethod: p.paymentMode,
      paidDate: p.createdAt,
    };
  });

  const totalGross = data.reduce((sum, item) => sum + item.grossSalary, 0);
  const totalAdjustments = data.reduce((sum, item) => sum + item.adjustmentTotal, 0);
  const totalEffectivePaid = data.reduce((sum, item) => sum + item.effectivePaid, 0);

  return {
    data,
    summary: { totalGross, totalAdjustments, totalEffectivePaid },
    pagination: getPaginationMeta(total, page, limit, exportMode),
  };
}

export async function getAdjustmentHistory(
  filters: { staffId?: string },
  page = 1,
  limit = 20,
  exportMode = false
) {
  const where: any = {};
  if (filters.staffId) {
    where.salaryPayment = { staffId: filters.staffId };
  }

  const total = await prisma.salaryAdjustment.count({ where });
  const skip = exportMode ? 0 : (page - 1) * limit;
  const take = exportMode ? 10000 : limit;

  const adjustments = await prisma.salaryAdjustment.findMany({
    where,
    include: {
      salaryPayment: {
        include: { staff: true },
      },
      createdBy: true,
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });

  const data = adjustments.map((adj) => ({
    id: adj.id,
    receiptNumber: adj.salaryPayment.salarySlipNo,
    employeeCode: adj.salaryPayment.staff.employeeCode,
    staffName: adj.salaryPayment.staff.name,
    amount: Number(adj.amount),
    reason: adj.reason,
    createdBy: adj.createdBy.name,
    createdAt: adj.createdAt,
  }));

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  return {
    data,
    summary: { totalAmount },
    pagination: getPaginationMeta(total, page, limit, exportMode),
  };
}

export async function getMonthlySalarySummary() {
  const payments = await prisma.salaryPayment.findMany({
    include: { adjustments: true, payrollCycle: true },
  });

  const monthlySums: Record<string, { gross: number; adj: number; effective: number }> = {};

  for (const p of payments) {
    const m = p.payrollCycle?.month || 0;
    const y = p.payrollCycle?.year || 0;
    const key = `${y}-${String(m).padStart(2, '0')}`;
    if (!monthlySums[key]) {
      monthlySums[key] = { gross: 0, adj: 0, effective: 0 };
    }

    const gross = Number(p.grossSalary);
    const adjustmentsSum = p.adjustments.reduce((sum, adj) => sum + Number(adj.amount), 0);
    const effectivePaid = gross + adjustmentsSum;

    monthlySums[key].gross += gross;
    monthlySums[key].adj += adjustmentsSum;
    monthlySums[key].effective += effectivePaid;
  }

  const data = Object.entries(monthlySums)
    .map(([month, sums]) => ({
      month,
      grossSalary: sums.gross,
      adjustmentTotal: sums.adj,
      effectivePaid: sums.effective,
    }))
    .sort((a, b) => b.month.localeCompare(a.month));

  return {
    data,
    summary: {},
    pagination: getPaginationMeta(data.length, 1, data.length, true),
  };
}

export async function getDesignationSummary() {
  const staffList = await prisma.staff.findMany({
    where: { status: 'ACTIVE' },
  });

  const sums: Record<string, { count: number; totalSalary: number }> = {};

  for (const s of staffList) {
    const des = s.designation || 'Other';
    if (!sums[des]) {
      sums[des] = { count: 0, totalSalary: 0 };
    }
    sums[des].count++;
    sums[des].totalSalary += Number(s.monthlySalary);
  }

  const data = Object.entries(sums).map(([designation, info]) => ({
    designation,
    count: info.count,
    totalMonthlySalaryBudget: info.totalSalary,
  }));

  return {
    data,
    summary: {},
    pagination: getPaginationMeta(data.length, 1, data.length, true),
  };
}

/**
 * F. TRANSPORT REPORTS
 */

export async function getRouteUtilizationReport() {
  const routes = await prisma.route.findMany({
    where: { active: true },
    include: {
      transports: {
        where: { status: 'ACTIVE' },
      },
    },
  });

  const data = routes.map((r) => ({
    id: r.id,
    routeName: r.name,
    vehicleNumber: r.vehicleNumber,
    driverName: r.driverName,
    capacityCount: r.transports.length, // Active transport assignments
  }));

  return {
    data,
    summary: { totalActiveAssignments: data.reduce((sum, item) => sum + item.capacityCount, 0) },
    pagination: getPaginationMeta(data.length, 1, data.length, true),
  };
}

export async function getStopRevenueReport() {
  const stops = await prisma.stop.findMany({
    include: {
      route: true,
      transports: true,
    },
  });

  const stopRevenues: Record<string, { stopName: string; routeName: string; debitTotal: number; creditTotal: number; revenue: number }> = {};

  // For each stop, let's find the active/past transports, and find all fee adjustments referencing those transports
  for (const stop of stops) {
    const transportIds = stop.transports.map((t) => t.id);

    const adjustments = await prisma.feeAdjustment.findMany({
      where: {
        referenceType: 'TRANSPORT',
        referenceId: { in: transportIds },
      },
    });

    const debitTotal = adjustments
      .filter((a) => a.type === 'DEBIT')
      .reduce((sum, a) => sum + Number(a.amount), 0);

    const creditTotal = adjustments
      .filter((a) => a.type === 'CREDIT')
      .reduce((sum, a) => sum + Number(a.amount), 0);

    const revenue = debitTotal - creditTotal;

    stopRevenues[stop.id] = {
      stopName: stop.name,
      routeName: stop.route.name,
      debitTotal,
      creditTotal,
      revenue,
    };
  }

  const data = Object.entries(stopRevenues).map(([stopId, info]) => ({
    stopId,
    stopName: info.stopName,
    routeName: info.routeName,
    debitTotal: info.debitTotal,
    creditTotal: info.creditTotal,
    revenue: info.revenue,
  }));

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

  return {
    data,
    summary: { totalRevenue },
    pagination: getPaginationMeta(data.length, 1, data.length, true),
  };
}

export async function getTransportAdjustmentHistory(
  page = 1,
  limit = 20,
  exportMode = false
) {
  const where = { referenceType: 'TRANSPORT' };
  const total = await prisma.feeAdjustment.count({ where });
  const skip = exportMode ? 0 : (page - 1) * limit;
  const take = exportMode ? 10000 : limit;

  const adjustments = await prisma.feeAdjustment.findMany({
    where,
    include: {
      feeAccount: {
        include: {
          enrollment: {
            include: { student: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });

  const data = adjustments.map((a) => ({
    id: a.id,
    studentName: a.feeAccount.enrollment.student.name,
    admissionNumber: a.feeAccount.enrollment.student.admissionNumber,
    type: a.type,
    amount: Number(a.amount),
    description: a.description,
    createdAt: a.createdAt,
  }));

  return {
    data,
    summary: {},
    pagination: getPaginationMeta(total, page, limit, exportMode),
  };
}
