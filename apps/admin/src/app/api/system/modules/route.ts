import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getModuleSettings, updateModuleStatus, applyProfilePreset } from '@/lib/services/modules';

export async function GET() {
  try {
    const settings = await getModuleSettings();
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

    if (body.preset) {
      await applyProfilePreset(body.preset, session.user.id);
      return NextResponse.json({ success: true });
    }

    if (body.moduleKey && body.enabled !== undefined) {
      const result = await updateModuleStatus(body.moduleKey, body.enabled, session.user.id);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
