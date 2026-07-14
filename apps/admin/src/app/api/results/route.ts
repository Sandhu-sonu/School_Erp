import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@school-erp/utils';

import { isModuleEnabled } from '@/lib/services/modules';

export async function GET(request: NextRequest) {
  if (!(await isModuleEnabled('RESULTS'))) {
    return NextResponse.json({ error: 'Results module is disabled.' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  if (role === 'ACCOUNTANT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const examId = searchParams.get('examId');
  const classId = searchParams.get('classId');
  const studentId = searchParams.get('studentId');

  if (!examId && !studentId) {
    return NextResponse.json({ error: 'Missing required parameter: examId or studentId' }, { status: 400 });
  }

  // Teacher validation check
  if (role === 'TEACHER') {
    const assignments = await prisma.classTeacher.findMany({
      where: { teacherId: session.user.id }
    });
    const assignedClassIds = assignments.map(a => a.classId);

    if (classId && !assignedClassIds.includes(classId)) {
      return NextResponse.json({ error: 'Forbidden: Access restricted to assigned classes' }, { status: 403 });
    }

    if (studentId) {
      const enrollment = await prisma.classEnrollment.findFirst({
        where: { studentId, isArchived: false },
      });
      if (enrollment && !assignedClassIds.includes(enrollment.classId)) {
        return NextResponse.json({ error: 'Forbidden: Student is not in your assigned classes' }, { status: 403 });
      }
    }
  }

  try {
    const where: any = {};
    if (examId) where.examId = examId;
    if (studentId) where.studentId = studentId;

    if (classId && !studentId) {
      // Filter by students currently enrolled in the class
      const enrollments = await prisma.classEnrollment.findMany({
        where: { classId, isArchived: false },
        select: { studentId: true },
      });
      const studentIds = enrollments.map(e => e.studentId);
      where.studentId = { in: studentIds };
    }

    const results = await prisma.result.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            admissionNumber: true,
            dob: true,
            gender: true,
            parent: {
              select: {
                fatherName: true,
                mobile: true,
              },
            },
            enrollments: {
              where: { isArchived: false },
              select: {
                class: { select: { name: true } },
                section: { select: { name: true } },
              },
            },
          },
        },
        exam: {
          select: {
            name: true,
            published: true,
          },
        },
      },
      orderBy: { rank: 'asc' },
    });

    if (results.length === 0 && classId && examId) {
      const enrollments = await prisma.classEnrollment.findMany({
        where: { classId, isArchived: false },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              admissionNumber: true,
            },
          },
        },
      });

      const previewResults = [];
      for (const e of enrollments) {
        const marks = await prisma.examMark.findMany({
          where: { examId, studentId: e.studentId },
        });
        if (marks.length > 0) {
          let totalObtained = 0;
          let totalMax = 0;
          for (const m of marks) {
            totalMax += Number(m.maxMarks);
            totalObtained += m.obtained !== null ? Number(m.obtained) : 0;
          }
          const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
          const grade = getGradeForPercentage(percentage);
          previewResults.push({
            id: `preview-${e.studentId}`,
            studentId: e.studentId,
            total: totalObtained,
            percentage,
            finalGrade: grade,
            rank: 0,
            student: {
              name: e.student.name,
              admissionNumber: e.student.admissionNumber,
            },
            exam: {
              name: '',
              published: false,
            },
          });
        }
      }
      return NextResponse.json(previewResults);
    }

    // If querying for a specific student, fetch their detailed marks
    if (studentId && examId && results.length > 0) {
      const marks = await prisma.examMark.findMany({
        where: { examId, studentId },
        include: { subject: { select: { name: true, code: true } } },
      });

      const subjects = marks.map((m) => ({
        name: m.subject.name,
        code: m.subject.code,
        obtained: m.obtained !== null ? Number(m.obtained) : null,
        maxMarks: Number(m.maxMarks),
      }));

      return NextResponse.json(
        results.map((r) => ({
          ...r,
          subjects,
        }))
      );
    }

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function getGradeForPercentage(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'FAIL';
}
