import { NextRequest, NextResponse } from 'next/server';
import { reverseTransaction } from '@/lib/services/finance';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, UserRole } from '@school-erp/utils';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  // Reversals require full 'write' privileges (Principal/Accountant, not clerk)
  if (!hasPermission(role, 'finance', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { transactionId, reason } = body;

    if (!transactionId || !reason) {
      return NextResponse.json({ error: 'Missing required parameters: transactionId, reason' }, { status: 400 });
    }

    await reverseTransaction(transactionId, session.user.id, reason);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
