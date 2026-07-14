import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@school-erp/utils';
import { generateTimetable } from '@/lib/services/academics-exam';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  if (role === 'ACCOUNTANT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  const sectionId = searchParams.get('sectionId') || null;
  const sessionId = searchParams.get('sessionId');

  if (!classId || !sessionId) {
    return NextResponse.json({ error: 'Missing required parameters: classId, sessionId' }, { status: 400 });
  }

  // Teacher restricted view lock
  if (role === 'TEACHER') {
    const assignments = await prisma.classTeacher.findMany({
      where: { teacherId: session.user.id }
    });
    const assignedClassIds = assignments.map(a => a.classId);
    if (!assignedClassIds.includes(classId)) {
      return NextResponse.json({ error: 'Forbidden: Access restricted to assigned classes' }, { status: 403 });
    }
  }

  try {
    const slots = await prisma.timetable.findMany({
      where: {
        classId,
        sectionId,
        sessionId,
      },
      include: {
        subject: { select: { name: true, code: true } },
        staff: { select: { id: true, name: true, employeeCode: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
    });
    return NextResponse.json(slots);
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
    const { sessionId, classId, sectionId, dayOfWeek, periodNumber, subjectId, staffId, startTime, endTime } = body;

    if (!sessionId || !classId || !dayOfWeek || !periodNumber || !subjectId || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const slot = await generateTimetable({
      sessionId,
      classId,
      sectionId,
      dayOfWeek: Number(dayOfWeek),
      periodNumber: Number(periodNumber),
      subjectId,
      staffId,
      startTime,
      endTime,
    });

    return NextResponse.json(slot, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
