import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'PRINCIPAL') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const list = await prisma.uatTestCase.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(list);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'PRINCIPAL') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { testCase, module, executedBy, verifiedBy, status, severity, priority, remarks } = body;

    if (!testCase || !module || !executedBy || !verifiedBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const created = await prisma.uatTestCase.create({
      data: {
        testCase,
        module,
        executedBy,
        verifiedBy,
        status: status || 'PENDING',
        severity: severity || 'MEDIUM',
        priority: priority || 'MEDIUM',
        remarks: remarks || null,
        attachments: {}
      }
    });

    return NextResponse.json(created);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'PRINCIPAL') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status, remarks, bugReference } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    const updated = await prisma.uatTestCase.update({
      where: { id },
      data: {
        status: status || undefined,
        remarks: remarks || undefined,
        bugReference: bugReference || undefined
      }
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
