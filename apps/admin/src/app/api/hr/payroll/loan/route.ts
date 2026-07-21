import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { issueEmployeeLoan } from '@/lib/services/payroll';
import { PaymentMode, InterestType } from '@prisma/client';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'PRINCIPAL' && role !== 'ACCOUNTANT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { staffId, principal, interestRate, interestType, monthlyEmi, reason, paymentMode } = body;
    if (!staffId || !principal || monthlyEmi === undefined || !paymentMode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const loan = await issueEmployeeLoan({
      staffId,
      principal: Number(principal),
      interestRate: Number(interestRate || 0),
      interestType: (interestType || InterestType.FLAT) as InterestType,
      monthlyEmi: Number(monthlyEmi),
      reason,
      paymentMode: paymentMode as PaymentMode,
      createdById: session.user.id,
    });

    return NextResponse.json(loan, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
