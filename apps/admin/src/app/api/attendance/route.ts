import { NextRequest, NextResponse } from 'next/server';
import { getAttendanceGrid, recordAttendanceBatch } from '@/lib/services/academics';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, UserRole } from '@school-erp/utils';

import { isModuleEnabled } from '@/lib/services/modules';

export async function GET(request: NextRequest) {
  if (!(await isModuleEnabled('ATTENDANCE'))) {
    return NextResponse.json({ error: 'Attendance module is disabled.' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  if (!hasPermission(role, 'operations', 'read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date');
  const classId = searchParams.get('classId');
  const sectionId = searchParams.get('sectionId') || undefined;

  if (!dateStr || !classId) {
    return NextResponse.json({ error: 'Missing required query parameters: date, classId' }, { status: 400 });
  }

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    const grid = await getAttendanceGrid(date, classId, sectionId);
    return NextResponse.json(grid);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isModuleEnabled('ATTENDANCE'))) {
    return NextResponse.json({ error: 'Attendance module is disabled.' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  if (!hasPermission(role, 'operations', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { date, records } = body;
    if (!date || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Invalid parameters: date and records (array) required' }, { status: 400 });
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    const results = await recordAttendanceBatch(targetDate, records);
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
