import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadStudentPhoto, deleteStudentPhoto } from '@/lib/services/photo';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'PRINCIPAL' && role !== 'CLERK') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id: studentId } = await params;
    const formData = await request.formData();
    const file = formData.get('photo') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No photo file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const relativePath = await uploadStudentPhoto(studentId, buffer, file.type);

    return NextResponse.json({ success: true, photo: relativePath });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'PRINCIPAL' && role !== 'CLERK') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id: studentId } = await params;
    await deleteStudentPhoto(studentId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
