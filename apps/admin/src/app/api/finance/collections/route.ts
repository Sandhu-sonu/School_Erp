import { NextRequest, NextResponse } from 'next/server';
import { collectFee } from '@/lib/services/finance';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, UserRole } from '@school-erp/utils';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  // Clerks are allowed to collect (has 'collect' permission on finance)
  if (!hasPermission(role, 'finance', 'collect')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { enrollmentId, amount, discountAmount, waiverAmount, paymentMode, notes } = body;

    if (!enrollmentId || amount === undefined) {
      return NextResponse.json({ error: 'Missing required parameters: enrollmentId, amount' }, { status: 400 });
    }

    const transaction = await collectFee(
      enrollmentId,
      Number(amount),
      Number(discountAmount || 0),
      Number(waiverAmount || 0),
      paymentMode,
      session.user.id,
      notes
    );

    return NextResponse.json(transaction, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
