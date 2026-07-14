import { NextRequest, NextResponse } from 'next/server';
import { getPromotionPreview, promoteStudentsBatch } from '@/lib/services/academics';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, UserRole } from '@school-erp/utils';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  if (!hasPermission(role, 'academics', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  const sectionId = searchParams.get('sectionId') || null;
  const fromSessionId = searchParams.get('fromSessionId');
  const toSessionId = searchParams.get('toSessionId');

  if (!classId || !fromSessionId || !toSessionId) {
    return NextResponse.json({ error: 'Missing required query parameters: classId, fromSessionId, toSessionId' }, { status: 400 });
  }

  try {
    const preview = await getPromotionPreview(classId, sectionId, fromSessionId, toSessionId);
    return NextResponse.json(preview);
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
    const { studentIds, fromSessionId, toSessionId } = body;
    if (!studentIds || !Array.isArray(studentIds) || !fromSessionId || !toSessionId) {
      return NextResponse.json({ error: 'Invalid parameters: studentIds (array), fromSessionId, toSessionId required' }, { status: 400 });
    }

    const results = await promoteStudentsBatch(studentIds, fromSessionId, toSessionId);
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 505 });
  }
}
