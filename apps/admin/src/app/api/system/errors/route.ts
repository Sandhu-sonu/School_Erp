import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'PRINCIPAL') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const list = await prisma.errorLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Compute KPIs
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await prisma.errorLog.count({ where: { createdAt: { gte: today } } });
    const criticalCount = await prisma.errorLog.count({ where: { level: 'CRITICAL' } });
    const openCount = await prisma.errorLog.count({ where: { resolved: false } });
    const resolvedCount = await prisma.errorLog.count({ where: { resolved: true } });

    return NextResponse.json({
      list,
      kpis: {
        todayCount,
        criticalCount,
        openCount,
        resolvedCount
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'PRINCIPAL') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, resolved } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    const updated = await prisma.errorLog.update({
      where: { id },
      data: { resolved }
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
