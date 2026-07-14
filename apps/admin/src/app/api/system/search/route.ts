import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || '';

  if (!query || query.length < 2) {
    return NextResponse.json({ students: [], parents: [], staff: [], receipts: [] });
  }

  try {
    const students = await prisma.student.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { admissionNumber: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 5,
      select: { id: true, name: true, admissionNumber: true }
    });

    const parents = await prisma.parent.findMany({
      where: {
        OR: [
          { fatherName: { contains: query, mode: 'insensitive' } },
          { motherName: { contains: query, mode: 'insensitive' } },
          { mobile: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 5,
      select: { id: true, fatherName: true, mobile: true }
    });

    const staff = await prisma.staff.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { employeeCode: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 5,
      select: { id: true, name: true, employeeCode: true }
    });

    const receipts = await prisma.feeTransaction.findMany({
      where: {
        receiptNumber: { contains: query, mode: 'insensitive' }
      },
      take: 5,
      select: { id: true, receiptNumber: true, amount: true }
    });

    return NextResponse.json({
      students,
      parents,
      staff,
      receipts
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
