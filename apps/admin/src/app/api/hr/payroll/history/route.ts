import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@school-erp/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get('staffId') || undefined;
  const payrollCycleId = searchParams.get('payrollCycleId') || undefined;

  const where: any = {};
  if (staffId) where.staffId = staffId;
  if (payrollCycleId) where.payrollCycleId = payrollCycleId;

  try {
    const history = await prisma.salaryPayment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        staff: { select: { name: true, employeeCode: true, designation: true } },
        payrollCycle: { select: { name: true } },
        createdBy: { select: { name: true } },
        adjustments: { orderBy: { createdAt: 'desc' } },
        recoveries: { orderBy: { createdAt: 'desc' } },
      },
    });

    const formattedHistory = JSON.parse(JSON.stringify(history));
    return NextResponse.json(formattedHistory);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 550 });
  }
}
