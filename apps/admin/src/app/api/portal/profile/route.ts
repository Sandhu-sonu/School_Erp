import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { verifyPassword, hashPassword } from '@school-erp/utils';

export async function GET(request: NextRequest) {
  try {
    const parentId = request.cookies.get('parent_session')?.value;

    if (!parentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      include: {
        students: {
          where: { status: 'ACTIVE' },
          include: {
            enrollments: {
              where: { isArchived: false },
              include: {
                class: true,
                section: true,
                session: true
              }
            }
          }
        }
      }
    });

    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
    }

    return NextResponse.json(parent);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const parentId = request.cookies.get('parent_session')?.value;

    if (!parentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Missing required parameters: currentPassword, newPassword' }, { status: 400 });
    }

    const parent = await prisma.parent.findUnique({
      where: { id: parentId }
    });

    if (!parent) {
      return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 });
    }

    const isValid = verifyPassword(currentPassword, parent.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
    }

    const updatedHash = hashPassword(newPassword);

    await prisma.parent.update({
      where: { id: parentId },
      data: {
        passwordHash: updatedHash,
        passwordChangedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
