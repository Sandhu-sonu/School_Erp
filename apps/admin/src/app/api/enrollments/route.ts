import { NextRequest, NextResponse } from 'next/server';
import { getEnrollments, createEnrollment } from '@/lib/services/academics';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, UserRole } from '@school-erp/utils';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  if (!hasPermission(role, 'academics', 'read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || undefined;
  const sessionId = searchParams.get('sessionId') || undefined;
  const classId = searchParams.get('classId') || undefined;
  const sectionId = searchParams.get('sectionId') || undefined;

  try {
    const enrollments = await getEnrollments({ search, sessionId, classId, sectionId });
    return NextResponse.json(enrollments);
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
  if (!hasPermission(role, 'academics', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { studentId, sessionId, classId, sectionId } = body;
    const enrollment = await createEnrollment(studentId, sessionId, classId, sectionId);
    return NextResponse.json(enrollment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
