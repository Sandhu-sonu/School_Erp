import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { createBackup, restoreBackup } from '@/lib/services/backup';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'PRINCIPAL') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const list = await prisma.backupHistory.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Convert BigInt to string to prevent JSON serialization errors
    const serialized = list.map(b => ({
      ...b,
      fileSize: b.fileSize.toString()
    }));

    return NextResponse.json(serialized);
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
    const { type } = await request.json();
    const backupName = await createBackup(type || 'MANUAL', session.user.name || 'Admin');
    return NextResponse.json({ success: true, backupName });
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
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    const success = await restoreBackup(id);
    return NextResponse.json({ success });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
