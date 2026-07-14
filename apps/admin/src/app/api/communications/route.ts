import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createNotice, publishNotice, archiveNotice, expireNotices, getActiveNotices } from '@/lib/services/communications';
import { NoticeStatus } from '@prisma/client';

import { isModuleEnabled } from '@/lib/services/modules';

export async function GET(request: NextRequest) {
  if (!(await isModuleEnabled('COMMUNICATIONS'))) {
    return NextResponse.json({ error: 'Communications module is disabled.' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role === 'ACCOUNTANT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Update expired notices first
  await expireNotices();

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');
  const query = searchParams.get('search');

  try {
    if (role === 'PRINCIPAL') {
      const notices = await prisma.notice.findMany({
        where: {
          ...(statusParam ? { status: statusParam as NoticeStatus } : {}),
          ...(query ? {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(notices);
    } else {
      // Teachers and Clerks can only view active, published notices
      const notices = await getActiveNotices();
      // Filter if search query is provided
      const filtered = query ? notices.filter(n =>
        n.title.toLowerCase().includes(query.toLowerCase()) ||
        n.description.toLowerCase().includes(query.toLowerCase())
      ) : notices;
      return NextResponse.json(filtered);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'PRINCIPAL') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { title, description, targetRole, targetClass, expiryDate } = await request.json();
    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const expiry = expiryDate ? new Date(expiryDate) : null;
    const notice = await createNotice(title, description, targetRole, targetClass, expiry);

    return NextResponse.json(notice);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'PRINCIPAL') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id, action, title, description, targetRole, targetClass, expiryDate } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Notice ID is required' }, { status: 400 });
    }

    let notice;
    if (action === 'publish') {
      notice = await publishNotice(id);
    } else if (action === 'archive') {
      notice = await archiveNotice(id);
    } else {
      // General edit
      const expiry = expiryDate ? new Date(expiryDate) : null;
      notice = await prisma.notice.update({
        where: { id },
        data: {
          title,
          description,
          targetRole: targetRole || null,
          targetClass: targetClass || null,
          expiryDate: expiry,
        },
      });
    }

    return NextResponse.json(notice);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'PRINCIPAL') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id query parameter' }, { status: 400 });
    }

    await prisma.notice.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
