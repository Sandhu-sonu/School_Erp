import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAllowedReport } from '@/lib/services/reports-security';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as string;
  // Dashboard analytics page generally requires Principal, Clerk, Accountant or Head.
  // Teachers might be restricted or allowed to view limited widgets, but let's allow read access if they have a role.
  // Principal: full, Clerk: read-only, Accountant: finance+hr, Teacher: attendance+results.
  // If they are logged in, let's load all or filter based on role.
  // Let's filter data according to role to prevent leaking finance data to Teachers, etc.

  try {
    const isPrincipalOrHead = role === 'PRINCIPAL' || role === 'HEAD';
    const isClerk = role === 'CLERK';
    const isAccountant = role === 'ACCOUNTANT';
    const isTeacher = role === 'TEACHER';

    // 1. Admissions Trend (allowed for Principal, Head, Clerk)
    let admissionsTrend: { month: string; count: number }[] = [];
    if (isPrincipalOrHead || isClerk) {
      const students = await prisma.student.findMany({
        select: { admissionDate: true },
      });
      const monthCounts: Record<string, number> = {};
      for (const s of students) {
        const d = new Date(s.admissionDate);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthCounts[k] = (monthCounts[k] || 0) + 1;
      }
      admissionsTrend = Object.entries(monthCounts)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6);
    }

    // 2. Collections Trend & Transport Revenue (allowed for Principal, Head, Clerk, Accountant)
    let collectionsTrend: { month: string; amount: number }[] = [];
    let transportRevenue = 0;
    if (isPrincipalOrHead || isClerk || isAccountant) {
      const txs = await prisma.feeTransaction.findMany({
        where: { isReversed: false },
        select: { amount: true, transactionDate: true },
      });
      const monthCounts: Record<string, number> = {};
      for (const t of txs) {
        const d = new Date(t.transactionDate);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthCounts[k] = (monthCounts[k] || 0) + Number(t.amount);
      }
      collectionsTrend = Object.entries(monthCounts)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6);

      const debits = await prisma.feeAdjustment.aggregate({
        where: { referenceType: 'TRANSPORT', type: 'DEBIT' },
        _sum: { amount: true },
      });
      const credits = await prisma.feeAdjustment.aggregate({
        where: { referenceType: 'TRANSPORT', type: 'CREDIT' },
        _sum: { amount: true },
      });
      transportRevenue = Number(debits._sum.amount || 0) - Number(credits._sum.amount || 0);
    }

    // 3. Attendance % (allowed for Principal, Head, Clerk, Teacher)
    let attendancePercentage = 0;
    if (isPrincipalOrHead || isClerk || isTeacher) {
      const totalAttendance = await prisma.attendance.count();
      const presentAttendance = await prisma.attendance.count({
        where: { status: { in: ['PRESENT', 'LATE'] } },
      });
      attendancePercentage = totalAttendance > 0 ? (presentAttendance / totalAttendance) * 100 : 0;
    }

    // 4. Expense Trend (allowed for Principal, Head, Clerk, Accountant)
    let expenseTrend: { month: string; amount: number }[] = [];
    if (isPrincipalOrHead || isClerk || isAccountant) {
      const expenses = await prisma.expense.findMany({
        select: { amount: true, expenseDate: true },
      });
      const monthCounts: Record<string, number> = {};
      for (const e of expenses) {
        const d = new Date(e.expenseDate);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthCounts[k] = (monthCounts[k] || 0) + Number(e.amount);
      }
      expenseTrend = Object.entries(monthCounts)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6);
    }

    // 5. Published Notices (all roles)
    const publishedNoticesCount = await prisma.notice.count({
      where: { status: 'PUBLISHED' },
    });

    // 6. Top Classes (by student count) (Principal, Head, Clerk)
    let topClasses: { className: string; studentCount: number }[] = [];
    if (isPrincipalOrHead || isClerk) {
      const classes = await prisma.class.findMany({
        include: {
          enrollments: {
            where: { isArchived: false, student: { status: 'ACTIVE' } },
          },
        },
      });
      topClasses = classes
        .map((c) => ({
          className: c.name,
          studentCount: c.enrollments.length,
        }))
        .sort((a, b) => b.studentCount - a.studentCount)
        .slice(0, 5);
    }

    return NextResponse.json({
      admissionsTrend,
      collectionsTrend,
      attendancePercentage,
      transportRevenue,
      expenseTrend,
      publishedNoticesCount,
      topClasses,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
