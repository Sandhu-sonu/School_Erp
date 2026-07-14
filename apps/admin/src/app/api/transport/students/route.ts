import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { linkStudentTransport, unlinkStudentTransport } from '@/lib/services/finance';

import { isModuleEnabled } from '@/lib/services/modules';

export async function GET(request: NextRequest) {
  if (!(await isModuleEnabled('TRANSPORT'))) {
    return NextResponse.json({ error: 'Transport module is disabled.' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  // All roles (PRINCIPAL, HEAD, CLERK, TEACHER, ACCOUNTANT) can read roster or search students
  const { searchParams } = new URL(request.url);
  const roster = searchParams.get('roster') === 'true';
  const query = searchParams.get('search');

  try {
    if (roster) {
      const activeTransports = await prisma.studentTransport.findMany({
        where: { status: 'ACTIVE' },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              admissionNumber: true,
              status: true,
            },
          },
          route: {
            select: {
              name: true,
              vehicleNumber: true,
            },
          },
          stop: {
            select: {
              name: true,
              fare: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(activeTransports);
    }

    if (query) {
      // Find students whose name or admission number matches and who have an active class enrollment
      const enrollments = await prisma.classEnrollment.findMany({
        where: {
          isArchived: false,
          session: { isActive: true },
          student: {
            status: 'ACTIVE',
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { admissionNumber: { contains: query, mode: 'insensitive' } },
            ],
          },
        },
        include: {
          student: {
            include: {
              transports: {
                where: { status: 'ACTIVE' },
                include: { stop: true, route: true },
              },
            },
          },
          class: true,
          section: true,
        },
        take: 10,
      });

      const results = enrollments.map((e) => ({
        id: e.student.id,
        name: e.student.name,
        admissionNumber: e.student.admissionNumber,
        className: e.class.name,
        sectionName: e.section?.name || 'N/A',
        activeTransport: e.student.transports[0] || null,
      }));

      return NextResponse.json(results);
    }

    return NextResponse.json({ error: 'Provide roster=true or search query' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'PRINCIPAL' && role !== 'CLERK') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { action, studentId, routeId, stopId } = await request.json();

    if (action === 'remove') {
      if (!studentId) {
        return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
      }
      const transport = await unlinkStudentTransport(studentId);
      return NextResponse.json({ success: true, transport });
    }

    if (!studentId || !routeId || !stopId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const transport = await linkStudentTransport(studentId, routeId, stopId);
    return NextResponse.json({ success: true, transport });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
