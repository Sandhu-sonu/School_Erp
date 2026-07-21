import { prisma } from '@school-erp/db';
import { StaffStatus } from '@prisma/client';

/**
 * Helpers for Grades
 */
export function getGradeForPercentage(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'FAIL';
}

/**
 * 1. Subject Management Services
 */
export async function createSubject(data: {
  name: string;
  code: string;
  classId: string;
  isOptional?: boolean;
  weeklyPeriods?: number;
  teacherId?: string | null;
  consecutivePeriods?: number;
  preferredTime?: string;
}) {
  // Validate name & code
  if (!data.name || !data.code || !data.classId) {
    throw new Error('Name, code, and classId are required.');
  }

  // Check unique code within the same class
  const existing = await prisma.subject.findUnique({
    where: {
      classId_code: {
        classId: data.classId,
        code: data.code,
      },
    },
  });

  if (existing) {
    throw new Error(`Subject with code ${data.code} already exists for this class.`);
  }

  return await prisma.subject.create({
    data: {
      name: data.name,
      code: data.code,
      classId: data.classId,
      isOptional: data.isOptional || false,
      weeklyPeriods: data.weeklyPeriods ? Number(data.weeklyPeriods) : undefined,
      teacherId: data.teacherId || null,
      consecutivePeriods: data.consecutivePeriods ? Number(data.consecutivePeriods) : undefined,
      preferredTime: data.preferredTime || undefined
    },
  });
}

export async function assignSubject(classId: string, subjectId: string) {
  // Associate subject with classId (we update classId directly on Subject model)
  return await prisma.subject.update({
    where: { id: subjectId },
    data: { classId },
  });
}

/**
 * 2. Timetable Services
 */
export async function generateTimetable(data: {
  sessionId: string;
  classId: string;
  sectionId?: string | null;
  dayOfWeek: number;
  periodNumber: number;
  subjectId: string;
  staffId?: string | null;
  startTime: string;
  endTime: string;
  lockType?: string;
  allocationSource?: string;
}) {
  const sectionId = data.sectionId || null;

  // 1. Teacher collision check
  if (data.staffId) {
    const teacherCollision = await prisma.timetable.findFirst({
      where: {
        staffId: data.staffId,
        sessionId: data.sessionId,
        dayOfWeek: data.dayOfWeek,
        periodNumber: data.periodNumber,
        NOT: {
          classId: data.classId,
          sectionId: sectionId,
        },
      },
    });

    if (teacherCollision) {
      throw new Error('Teacher is already assigned to another class or section during this period.');
    }
  }

  // 2. Class/section boundary collision check
  if (sectionId) {
    const classCollision = await prisma.timetable.findFirst({
      where: {
        classId: data.classId,
        sectionId: null,
        sessionId: data.sessionId,
        dayOfWeek: data.dayOfWeek,
        periodNumber: data.periodNumber,
      },
    });
    if (classCollision) {
      throw new Error('The entire class is already scheduled for a general period at this time.');
    }
  } else {
    const sectionCollision = await prisma.timetable.findFirst({
      where: {
        classId: data.classId,
        sectionId: { not: null },
        sessionId: data.sessionId,
        dayOfWeek: data.dayOfWeek,
        periodNumber: data.periodNumber,
      },
    });
    if (sectionCollision) {
      throw new Error('One or more sections of this class are already scheduled at this time.');
    }
  }

  const isLocked = data.lockType === 'HARD' || data.lockType === 'RESERVED';

  // 3. Class/section collision check (upsert)
  return await prisma.timetable.upsert({
    where: {
      classId_sectionId_sessionId_dayOfWeek_periodNumber: {
        classId: data.classId,
        sectionId: sectionId as any,
        sessionId: data.sessionId,
        dayOfWeek: data.dayOfWeek,
        periodNumber: data.periodNumber,
      },
    },
    update: {
      subjectId: data.subjectId,
      staffId: data.staffId || null,
      startTime: data.startTime,
      endTime: data.endTime,
      lockType: data.lockType || 'NONE',
      isLocked,
      allocationSource: data.allocationSource || 'MANUAL'
    },
    create: {
      sessionId: data.sessionId,
      classId: data.classId,
      sectionId: sectionId,
      dayOfWeek: data.dayOfWeek,
      periodNumber: data.periodNumber,
      subjectId: data.subjectId,
      staffId: data.staffId || null,
      startTime: data.startTime,
      endTime: data.endTime,
      lockType: data.lockType || 'NONE',
      isLocked,
      allocationSource: data.allocationSource || 'MANUAL'
    },
  });
}

/**
 * 3. Examination Engine Services
 */
export async function createExam(data: {
  sessionId: string;
  name: string;
  startDate: Date;
  endDate: Date;
}) {
  return await prisma.exam.create({
    data: {
      sessionId: data.sessionId,
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      published: false,
    },
  });
}

/**
 * 4. Marks Entry
 */
export async function saveMarks(data: {
  examId: string;
  studentId: string;
  subjectId: string;
  maxMarks: number;
  obtained: number | null;
}) {
  // Check if exam is published (block editing)
  const exam = await prisma.exam.findUniqueOrThrow({
    where: { id: data.examId },
  });
  if (exam.published) {
    throw new Error('Cannot edit marks. The exam results have already been published.');
  }

  // Validate obtained <= maxMarks
  if (data.obtained !== null && Number(data.obtained) > Number(data.maxMarks)) {
    throw new Error('Obtained marks cannot exceed maximum marks.');
  }

  // Duplicate block check
  const existing = await prisma.examMark.findUnique({
    where: {
      examId_studentId_subjectId: {
        examId: data.examId,
        studentId: data.studentId,
        subjectId: data.subjectId,
      },
    },
  });
  if (existing) {
    throw new Error('Marks already exist for this student and subject in this exam.');
  }

  return await prisma.examMark.create({
    data: {
      examId: data.examId,
      studentId: data.studentId,
      subjectId: data.subjectId,
      maxMarks: data.maxMarks,
      obtained: data.obtained,
    },
  });
}

/**
 * Helper to update dense ranks for an exam
 */
export async function updateExamRanks(examId: string) {
  // Retrieve all results for this exam
  const results = await prisma.result.findMany({
    where: { examId },
    orderBy: { total: 'desc' },
  });

  if (results.length === 0) return;

  // Calculate dense ranks
  let currentRank = 1;
  let previousTotal = Number(results[0].total);

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const total = Number(r.total);
    
    if (total < previousTotal) {
      currentRank = i + 1; // standard dense rank behavior or standard competition?
      // Wait: "Dense Ranking" example in prompt:
      // 450 -> Rank 1
      // 430 -> Rank 2
      // 430 -> Rank 2
      // 420 -> Rank 3
      // Under standard dense ranking, if we have 1, 2, 2, the next one is 3.
      // Under fractional/competition ranking, the next one is 4.
      // The prompt says: "Dense Ranking. Example: 450 -> Rank 1, 430 -> Rank 2, 430 -> Rank 2, 420 -> Rank 3".
      // Let's implement exactly this: if total is less than previousTotal, currentRank is previousRank + 1.
    }
    
    // Let's trace dense rank:
    // r0 (450) -> rank 1
    // r1 (430) -> rank 2 (since 430 < 450)
    // r2 (430) -> rank 2 (since 430 == 430)
    // r3 (420) -> rank 3 (since 420 < 430)
  }

  // Let's write the dense ranking logic precisely:
  let rank = 1;
  let lastTotal = -1;
  
  for (const r of results) {
    const total = Number(r.total);
    if (lastTotal !== -1 && total < lastTotal) {
      rank++;
    }
    lastTotal = total;
    
    await prisma.result.update({
      where: { id: r.id },
      data: { rank },
    });
  }
}

/**
 * 5. Result Calculations
 */
export async function calculateResult(examId: string, studentId: string) {
  // Validate exam is not published
  const exam = await prisma.exam.findUniqueOrThrow({
    where: { id: examId },
  });
  if (exam.published) {
    throw new Error('Cannot regenerate results. The exam has already been published.');
  }

  // Get all marks for this student in this exam
  const marks = await prisma.examMark.findMany({
    where: { examId, studentId },
  });

  if (marks.length === 0) {
    throw new Error('No marks entered for this student in this exam.');
  }

  let totalObtained = 0;
  let totalMax = 0;

  for (const m of marks) {
    totalMax += Number(m.maxMarks);
    totalObtained += m.obtained !== null ? Number(m.obtained) : 0;
  }

  const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
  const grade = getGradeForPercentage(percentage);

  // Create or update result row
  const res = await prisma.result.upsert({
    where: {
      examId_studentId: {
        examId,
        studentId,
      },
    },
    update: {
      total: totalObtained,
      percentage,
      finalGrade: grade,
      rank: 0, // temporary, will be updated by dense rank sweep
      snapshotJson: {}, // updated on publish
    },
    create: {
      examId,
      studentId,
      total: totalObtained,
      percentage,
      finalGrade: grade,
      rank: 0,
      snapshotJson: {},
    },
  });

  // Sweep ranks
  await updateExamRanks(examId);

  return res;
}

/**
 * 6. Publish Results (with Immutable snapshotJson)
 */
export async function publishResults(examId: string) {
  // Validate exam
  const exam = await prisma.exam.findUniqueOrThrow({
    where: { id: examId },
  });

  if (exam.published) {
    throw new Error('Results have already been published.');
  }

  // For each student who has a Result entry, calculate snapshotJson
  const results = await prisma.result.findMany({
    where: { examId },
    include: {
      student: true,
    },
  });

  for (const r of results) {
    // Get all student marks
    const marks = await prisma.examMark.findMany({
      where: { examId, studentId: r.studentId },
      include: {
        subject: true,
      },
    });

    const subjectsData = marks.map((m) => ({
      name: m.subject.name,
      code: m.subject.code,
      obtained: m.obtained !== null ? Number(m.obtained) : null,
      maxMarks: Number(m.maxMarks),
    }));

    const snapshot = {
      subjects: subjectsData,
      percentage: Number(r.percentage),
      grade: r.finalGrade,
      total: Number(r.total),
      rank: r.rank,
    };

    // Update Result with snapshotJson and publish
    await prisma.result.update({
      where: { id: r.id },
      data: {
        published: true,
        snapshotJson: snapshot as any,
      },
    });
  }

  // Publish exam
  return await prisma.exam.update({
    where: { id: examId },
    data: {
      published: true,
    },
  });
}
