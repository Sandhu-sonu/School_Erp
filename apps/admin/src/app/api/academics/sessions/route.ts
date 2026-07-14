import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  if (role === 'ACCOUNTANT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const sessions = await prisma.academicSession.findMany({
      orderBy: { startDate: 'desc' },
    });
    return NextResponse.json(sessions);
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
  if (role !== 'PRINCIPAL') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, name, startDate, endDate, id } = body;

    if (action === 'create') {
      if (!name || !startDate || !endDate) {
        return NextResponse.json({ error: 'Missing name, startDate, or endDate' }, { status: 400 });
      }
      
      const newSession = await prisma.academicSession.create({
        data: {
          name,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isActive: false,
        },
      });
      return NextResponse.json(newSession, { status: 201 });
    }

    if (action === 'activate') {
      if (!id) {
        return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
      }

      const updatedSession = await prisma.$transaction(async (tx) => {
        await tx.academicSession.updateMany({
          where: { id: { not: id } },
          data: { isActive: false },
        });

        return tx.academicSession.update({
          where: { id },
          data: { isActive: true },
        });
      });

      return NextResponse.json(updatedSession);
    }

    if (action === 'archive') {
      if (!id) {
        return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
      }

      const updatedSession = await prisma.academicSession.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json(updatedSession);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
