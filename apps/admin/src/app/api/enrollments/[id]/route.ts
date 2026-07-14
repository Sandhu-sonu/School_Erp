import { NextRequest, NextResponse } from 'next/server';
import { updateEnrollment } from '@/lib/services/academics';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, UserRole } from '@school-erp/utils';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  if (!hasPermission(role, 'academics', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { classId, sectionId } = body;
    const enrollment = await updateEnrollment(id, classId, sectionId);
    return NextResponse.json(enrollment);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
