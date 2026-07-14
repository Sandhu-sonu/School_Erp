import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

import { isModuleEnabled } from '@/lib/services/modules';

export async function GET(request: NextRequest) {
  if (!(await isModuleEnabled('TRANSPORT'))) {
    return NextResponse.json({ error: 'Transport module is disabled.' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const routes = await prisma.route.findMany({
      include: {
        stops: {
          orderBy: { orderNo: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(routes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'PRINCIPAL' && role !== 'CLERK') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { name, vehicleNumber, driverName, driverMobile } = await request.json();
    if (!name || !vehicleNumber || !driverName || !driverMobile) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const route = await prisma.route.create({
      data: {
        name,
        vehicleNumber,
        driverName,
        driverMobile,
        active: true,
      },
    });

    return NextResponse.json(route);
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
    const { id, name, vehicleNumber, driverName, driverMobile, active } = await request.json();
    if (!id || !name || !vehicleNumber || !driverName || !driverMobile) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const route = await prisma.route.update({
      where: { id },
      data: {
        name,
        vehicleNumber,
        driverName,
        driverMobile,
        active: active !== undefined ? active : true,
      },
    });

    return NextResponse.json(route);
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

    await prisma.route.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
