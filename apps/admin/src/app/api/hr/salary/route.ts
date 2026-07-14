import { NextRequest, NextResponse } from 'next/server';
import { createSalaryPayment, getSalaryHistory } from '@/lib/services/hr';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@school-erp/utils';

import { isModuleEnabled } from '@/lib/services/modules';

export async function GET(request: NextRequest) {
  if (!(await isModuleEnabled('SALARY'))) {
    return NextResponse.json({ error: 'Salary module is disabled.' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  // Clerk is blocked from viewing salary records
  if (role !== 'PRINCIPAL' && role !== 'ACCOUNTANT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get('staffId') || undefined;
  const month = searchParams.get('month') ? Number(searchParams.get('month')) : undefined;
  const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined;

  try {
    const list = await getSalaryHistory({ staffId, month, year });
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  if (role !== 'PRINCIPAL' && role !== 'ACCOUNTANT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { staffId, month, year, grossSalary, adjustment, paymentMethod, remarks } = body;

    if (!staffId || !month || !year || grossSalary === undefined || adjustment === undefined || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payment = await createSalaryPayment({
      staffId,
      month: Number(month),
      year: Number(year),
      grossSalary: Number(grossSalary),
      adjustment: Number(adjustment),
      paymentMethod,
      remarks,
      createdById: session.user.id,
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
