import { NextRequest, NextResponse } from 'next/server';
import { processImport } from '@/lib/services/import-engine';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'PRINCIPAL') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const module = formData.get('module') as string;
    const dryRun = formData.get('dryRun') === 'true';

    if (!file || !module) {
      return NextResponse.json({ error: 'Missing required parameters: file, module' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await processImport(
      buffer,
      file.name,
      module,
      dryRun,
      session.user.name || 'Admin'
    );

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
