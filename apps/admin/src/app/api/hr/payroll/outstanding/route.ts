import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@school-erp/db';
import { AdvanceStatus, LoanStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get('staffId');

  if (!staffId) {
    return NextResponse.json({ error: 'Missing staffId query parameter' }, { status: 400 });
  }

  try {
    const [advances, loans] = await Promise.all([
      prisma.employeeAdvance.findMany({
        where: {
          staffId,
          status: { in: [AdvanceStatus.ACTIVE, AdvanceStatus.PARTIALLY_RECOVERED] },
        },
        orderBy: { issuedDate: 'asc' },
      }),
      prisma.employeeLoan.findMany({
        where: {
          staffId,
          status: LoanStatus.ACTIVE,
        },
        include: {
          installments: {
            orderBy: { dueDate: 'asc' },
          },
        },
      }),
    ]);

    const resData = {
      advances: JSON.parse(JSON.stringify(advances)),
      loans: JSON.parse(JSON.stringify(loans)),
    };

    return NextResponse.json(resData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 550 });
  }
}
