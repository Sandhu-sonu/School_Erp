import { NextRequest, NextResponse } from 'next/server';
import { getSchoolCalendar } from '../../../../lib/services/parent-portal';

export async function GET(request: NextRequest) {
  try {
    const parentId = request.cookies.get('parent_session')?.value;

    if (!parentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const calendar = await getSchoolCalendar();
    return NextResponse.json(calendar);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
