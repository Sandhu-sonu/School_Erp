import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  if (role === 'ACCOUNTANT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const classes = await prisma.class.findMany({
      orderBy: { sequence: 'asc' },
      include: {
        sections: {
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: { enrollments: { where: { isArchived: false } } }
            }
          }
        },
        feePlans: {
          select: {
            id: true,
            sessionId: true,
            session: { select: { name: true } }
          }
        },
        _count: {
          select: { enrollments: { where: { isArchived: false } } }
        }
      }
    });

    return NextResponse.json(classes);
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
  if (role !== 'PRINCIPAL') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, id, name, sequence, classId } = body;

    if (action === 'createClass') {
      if (!name || sequence === undefined) {
        return NextResponse.json({ error: 'Missing class name or sequence' }, { status: 400 });
      }
      const newClass = await prisma.class.create({
        data: {
          name,
          sequence: Number(sequence),
        },
      });
      return NextResponse.json(newClass, { status: 201 });
    }

    if (action === 'updateClass') {
      if (!id || !name || sequence === undefined) {
        return NextResponse.json({ error: 'Missing class ID, name, or sequence' }, { status: 400 });
      }
      const updatedClass = await prisma.class.update({
        where: { id },
        data: {
          name,
          sequence: Number(sequence),
        },
      });
      return NextResponse.json(updatedClass);
    }

    if (action === 'deleteClass') {
      if (!id) {
        return NextResponse.json({ error: 'Missing class ID' }, { status: 400 });
      }
      const activeEnrollmentsCount = await prisma.classEnrollment.count({
        where: { classId: id, isArchived: false },
      });
      if (activeEnrollmentsCount > 0) {
        return NextResponse.json({ error: 'Cannot delete class with active student enrollments.' }, { status: 400 });
      }
      const deletedClass = await prisma.class.delete({
        where: { id },
      });
      return NextResponse.json(deletedClass);
    }

    if (action === 'createSection') {
      if (!classId || !name) {
        return NextResponse.json({ error: 'Missing classId or section name' }, { status: 400 });
      }
      const newSection = await prisma.section.create({
        data: {
          classId,
          name,
        },
      });
      return NextResponse.json(newSection, { status: 201 });
    }

    if (action === 'updateSection') {
      if (!id || !name) {
        return NextResponse.json({ error: 'Missing section ID or name' }, { status: 400 });
      }
      const updatedSection = await prisma.section.update({
        where: { id },
        data: {
          name,
        },
      });
      return NextResponse.json(updatedSection);
    }

    if (action === 'deleteSection') {
      if (!id) {
        return NextResponse.json({ error: 'Missing section ID' }, { status: 400 });
      }
      const activeEnrollmentsCount = await prisma.classEnrollment.count({
        where: { sectionId: id, isArchived: false },
      });
      if (activeEnrollmentsCount > 0) {
        return NextResponse.json({ error: 'Cannot delete section with active student enrollments.' }, { status: 400 });
      }
      const deletedSection = await prisma.section.delete({
        where: { id },
      });
      return NextResponse.json(deletedSection);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
