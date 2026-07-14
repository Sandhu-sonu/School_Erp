import { NextRequest, NextResponse } from 'next/server';
import { getSalaryHistory } from '@/lib/services/hr';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@school-erp/utils';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  if (role !== 'PRINCIPAL' && role !== 'ACCOUNTANT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get('staffId') || undefined;
  const month = searchParams.get('month') ? Number(searchParams.get('month')) : undefined;
  const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined;

  try {
    const list = await getSalaryHistory({ staffId, month, year });
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
