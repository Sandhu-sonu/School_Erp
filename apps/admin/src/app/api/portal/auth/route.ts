import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { verifyPassword } from '@school-erp/utils';

export async function POST(request: NextRequest) {
  try {
    const { mobile, password } = await request.json();

    if (!mobile || !password) {
      return NextResponse.json({ error: 'Mobile and password are required' }, { status: 400 });
    }

    const parent = await prisma.parent.findUnique({
      where: { mobile }
    });

    if (!parent) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = verifyPassword(password, parent.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Update lastLoginAt
    await prisma.parent.update({
      where: { id: parent.id },
      data: { lastLoginAt: new Date() }
    });

    // Set cookie
    const response = NextResponse.json({ 
      success: true, 
      parentId: parent.id,
      name: `${parent.fatherName || ''} / ${parent.motherName || ''}`.trim()
    });
    
    response.cookies.set('parent_session', parent.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/'
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// LOGOUT support
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('parent_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0, // Invalidate immediately
    path: '/'
  });
  return response;
}
