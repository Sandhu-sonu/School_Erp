import { NextRequest, NextResponse } from 'next/server';
import { adjustSalaryPayment } from '@/lib/services/hr';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@school-erp/utils';
import { prisma } from '@school-erp/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  if (role !== 'PRINCIPAL' && role !== 'ACCOUNTANT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const payment = await prisma.salaryPayment.findUnique({
      where: { id },
      include: {
        staff: true,
        createdBy: { select: { name: true } },
        adjustments: {
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { name: true } } },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Salary record not found' }, { status: 404 });
    }

    return NextResponse.json(payment);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  if (role !== 'PRINCIPAL' && role !== 'ACCOUNTANT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, reason } = body;

    if (amount === undefined || !reason) {
      return NextResponse.json({ error: 'Missing required parameters: amount, reason' }, { status: 400 });
    }

    const adjustment = await adjustSalaryPayment(
      id,
      Number(amount),
      reason,
      session.user.id
    );

    return NextResponse.json(adjustment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
