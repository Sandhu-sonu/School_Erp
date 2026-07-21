import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { getStudentResults } from '../../../../lib/services/parent-portal';

export async function GET(request: NextRequest) {
  try {
    const parentId = request.cookies.get('parent_session')?.value;

    if (!parentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    // Security check: Verify student belongs to logged in parent
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        parentId: parentId
      }
    });

    if (!student) {
      return NextResponse.json({ error: 'Forbidden. Student profile not associated with this account.' }, { status: 403 });
    }

    const results = await getStudentResults(studentId);
    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
