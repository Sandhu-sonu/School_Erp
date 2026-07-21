import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createPayrollCycle, updatePayrollCycleStatus } from '@/lib/services/payroll';
import { prisma } from '@school-erp/db';
import { PayrollCycleStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cycles = await prisma.payrollCycle.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    return NextResponse.json(cycles);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 550 });
  }
}

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
    const { name, month, year, startDate, endDate } = body;
    if (!name || !month || !year || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const cycle = await createPayrollCycle({
      name,
      month: Number(month),
      year: Number(year),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    return NextResponse.json(cycle, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
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
    const { id, status } = body;
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing cycle ID or status' }, { status: 400 });
    }

    const cycle = await updatePayrollCycleStatus(id, status as PayrollCycleStatus, session.user.id);
    return NextResponse.json(cycle);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
