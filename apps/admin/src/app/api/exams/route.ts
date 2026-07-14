import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@school-erp/utils';
import { createExam } from '@/lib/services/academics-exam';

import { isModuleEnabled } from '@/lib/services/modules';

export async function GET(request: NextRequest) {
  if (!(await isModuleEnabled('EXAMS'))) {
    return NextResponse.json({ error: 'Examinations module is disabled.' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  if (role === 'ACCOUNTANT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId') || undefined;

  try {
    const exams = await prisma.exam.findMany({
      where: sessionId ? { sessionId } : {},
      orderBy: { startDate: 'desc' },
    });
    return NextResponse.json(exams);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isModuleEnabled('EXAMS'))) {
    return NextResponse.json({ error: 'Examinations module is disabled.' }, { status: 403 });
  }

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
    const { sessionId, name, startDate, endDate } = body;

    if (!sessionId || !name || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const exam = await createExam({
      sessionId,
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    return NextResponse.json(exam, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
