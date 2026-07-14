import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSchoolSettings, updateSchoolSettings } from '@/lib/services/school-settings';

export async function GET() {
  try {
    const settings = await getSchoolSettings();
    return NextResponse.json(settings);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'PRINCIPAL') {
      return NextResponse.json({ error: 'Unauthorized. Principal only.' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Missing setting ID' }, { status: 400 });
    }

    const updated = await updateSchoolSettings(body.id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
