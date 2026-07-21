import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== 'PRINCIPAL') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id, lockType, allocationSource } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing slot ID' }, { status: 400 });
    }

    const isLocked = lockType === 'HARD' || lockType === 'RESERVED';

    const updated = await prisma.timetable.update({
      where: { id },
      data: {
        lockType: lockType || 'NONE',
        isLocked,
        allocationSource: allocationSource || 'MANUAL'
      }
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
