import { NextRequest, NextResponse } from 'next/server';
import { getParents, createParent } from '@/lib/services/admissions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, UserRole } from '@school-erp/utils';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  if (!hasPermission(role, 'admissions', 'read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || undefined;

  try {
    const parents = await getParents(search);
    return NextResponse.json(parents);
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
  if (!hasPermission(role, 'admissions', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parent = await createParent(body);
    return NextResponse.json(parent, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const messages = error.errors ? error.errors.map((e: any) => e.message).join('. ') : error.message;
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
