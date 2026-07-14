import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@school-erp/utils';
import { calculateResult, publishResults } from '@/lib/services/academics-exam';

import { isModuleEnabled } from '@/lib/services/modules';

export async function POST(request: NextRequest) {
  if (!(await isModuleEnabled('RESULTS'))) {
    return NextResponse.json({ error: 'Results module is disabled.' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  if (role !== 'PRINCIPAL') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { examId } = body;

    if (!examId) {
      return NextResponse.json({ error: 'Missing required parameter: examId' }, { status: 400 });
    }

    // 1. Fetch all students with marks in this exam
    const distinctStudents = await prisma.examMark.findMany({
      where: { examId },
      distinct: ['studentId'],
      select: { studentId: true },
    });

    if (distinctStudents.length === 0) {
      return NextResponse.json({ error: 'No marks entered for this exam yet.' }, { status: 400 });
    }

    // 2. Calculate results for each student
    for (const record of distinctStudents) {
      await calculateResult(examId, record.studentId);
    }

    // 3. Publish results (build snapshots & lock edits)
    await publishResults(examId);

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'PUBLISH_EXAM_RESULTS',
        details: `Published results for exam ID ${examId} with dense ranking and immutable snapshots.`,
      },
    });

    return NextResponse.json({ success: true, message: 'Results compiled, ranked, and published successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
