import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { reportType, filters = {}, action = 'VIEW' } = body;

    if (!reportType) {
      return NextResponse.json({ error: 'Report type is required' }, { status: 400 });
    }

    const dbReportType = action === 'PRINT' ? `${reportType}_PRINT` : reportType;

    const audit = await prisma.reportAudit.create({
      data: {
        userId: session.user.id,
        reportType: dbReportType,
        filters: JSON.stringify(filters),
        exported: false,
      },
    });

    return NextResponse.json(audit, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
