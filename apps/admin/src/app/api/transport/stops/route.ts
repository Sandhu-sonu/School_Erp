import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

import { isModuleEnabled } from '@/lib/services/modules';

export async function POST(request: NextRequest) {
  if (!(await isModuleEnabled('TRANSPORT'))) {
    return NextResponse.json({ error: 'Transport module is disabled.' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'PRINCIPAL' && role !== 'CLERK') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { routeId, name, fare, orderNo } = await request.json();
    if (!routeId || !name || fare === undefined || orderNo === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const stop = await prisma.stop.create({
      data: {
        routeId,
        name,
        fare: Number(fare),
        orderNo: Number(orderNo),
      },
    });

    return NextResponse.json(stop);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'PRINCIPAL' && role !== 'CLERK') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id, name, fare, orderNo } = await request.json();
    if (!id || !name || fare === undefined || orderNo === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const stop = await prisma.stop.update({
      where: { id },
      data: {
        name,
        fare: Number(fare),
        orderNo: Number(orderNo),
      },
    });

    return NextResponse.json(stop);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'PRINCIPAL' && role !== 'CLERK') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id query parameter' }, { status: 400 });
    }

    await prisma.stop.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
