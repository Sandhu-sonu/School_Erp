import { NextRequest, NextResponse } from 'next/server';
import { getFeePlans, upsertFeePlan, copyFeePlans } from '@/lib/services/finance';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, UserRole } from '@school-erp/utils';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  if (!hasPermission(role, 'finance', 'read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing required query parameter: sessionId' }, { status: 400 });
  }

  try {
    const plans = await getFeePlans(sessionId);
    return NextResponse.json(plans);
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
  if (!hasPermission(role, 'finance', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, sessionId, classId, tuitionFee, admissionFee, annualCharges, activityCharges, fromSessionId, toSessionId } = body;

    if (action === 'copy') {
      if (!fromSessionId || !toSessionId) {
        return NextResponse.json({ error: 'Missing fromSessionId or toSessionId for copy action' }, { status: 400 });
      }
      const copied = await copyFeePlans(fromSessionId, toSessionId);
      return NextResponse.json(copied);
    }

    if (!sessionId || !classId) {
      return NextResponse.json({ error: 'Missing required parameters: sessionId, classId' }, { status: 400 });
    }

    const plan = await upsertFeePlan(
      sessionId,
      classId,
      Number(tuitionFee),
      Number(admissionFee),
      Number(annualCharges || 0),
      Number(activityCharges || 0)
    );
    return NextResponse.json(plan);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
