import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@school-erp/utils';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  if (role !== 'PRINCIPAL') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const startTime = Date.now();

  try {
    const body = await request.json();
    const {
      sessionId,
      classId,
      sectionId,
      mode = 'OVERWRITE', // PREVIEW_ONLY, FILL_EMPTY, OVERWRITE, REGEN_DAY, GEN_REMAINING
      selectedDay = 1,
      workingDays = 6,
      periodsPerDay = 7,
      breaks = [5],
      dailySubjectLimit = 2,
      optimizationGoal = 'BALANCED', // BALANCED, TEACHER_FRIENDLY, STUDENT_FRIENDLY
      subjectsConfig = [],
      previewOnly = true,
      preAllocatedSlots = [] // Custom fixed pre-allocations from wizard
    } = body;

    if (!sessionId || !classId) {
      return NextResponse.json({ error: 'Missing required parameters: sessionId, classId' }, { status: 400 });
    }

    const targetSectionId = sectionId || null;

    // Load global settings & class teacher definitions
    const [settings, classTeacher, allTeachers, existingSlots, otherTimetableSlots] = await Promise.all([
      prisma.schoolSettings.findFirst(),
      prisma.classTeacher.findFirst({
        where: { classId, sectionId: targetSectionId, sessionId },
        include: { teacher: true }
      }),
      prisma.staff.findMany({
        where: { status: 'ACTIVE' },
        include: { subjects: true }
      }),
      prisma.timetable.findMany({
        where: { sessionId, classId, sectionId: targetSectionId },
        include: {
          subject: { select: { id: true, name: true, code: true } },
          staff: { select: { id: true, name: true, employeeCode: true } }
        }
      }),
      prisma.timetable.findMany({
        where: {
          sessionId,
          NOT: { classId, sectionId: targetSectionId }
        }
      })
    ]);

    // Find class teacher's Staff profile
    const classTeacherStaff = classTeacher
      ? allTeachers.find(t => t.id === classTeacher.teacherId || t.name === classTeacher.teacher?.name)
      : null;

    // Initialize schedule grid: 1-indexed days and periods
    const grid: any = {};
    for (let d = 1; d <= workingDays; d++) {
      grid[d] = {};
      for (let p = 1; p <= periodsPerDay; p++) {
        if (breaks.includes(p)) {
          grid[d][p] = { isBreak: true, isLocked: true, lockType: 'HARD', allocationSource: 'SYSTEM' };
        } else {
          grid[d][p] = null;
        }
      }
    }

    // Apply Dedicated Class Teacher Period if enabled
    if (settings?.enableClassTeacherPeriod && classTeacherStaff) {
      const ctDay = settings.classTeacherPeriodDay || 1;
      const ctPeriod = settings.classTeacherPeriodNumber || 1;
      if (grid[ctDay] && grid[ctDay][ctPeriod] !== undefined && !grid[ctDay][ctPeriod]?.isBreak) {
        grid[ctDay][ctPeriod] = {
          subjectId: 'CLASS_TEACHER_PERIOD',
          staffId: classTeacherStaff.id,
          subjectName: 'Class Teacher Period',
          subjectCode: 'CTP',
          teacherName: classTeacherStaff.name,
          isLocked: true,
          lockType: 'HARD',
          allocationSource: 'CLASS_TEACHER'
        };
      }
    }

    // Populate grid with manual pre-allocations from setup wizard
    preAllocatedSlots.forEach((slot: any) => {
      const d = Number(slot.day);
      const p = Number(slot.period);
      if (grid[d] && grid[d][p] !== undefined && !grid[d][p]?.isBreak) {
        const staffObj = allTeachers.find(t => t.id === slot.teacherId);
        grid[d][p] = {
          subjectId: slot.subjectId || 'SPECIAL_ACTIVITY',
          staffId: slot.teacherId || null,
          subjectName: slot.subjectName || 'Special Activity',
          subjectCode: slot.subjectCode || 'ACT',
          teacherName: staffObj?.name || 'Unassigned',
          isLocked: slot.lockType === 'HARD' || slot.lockType === 'RESERVED',
          lockType: slot.lockType || 'HARD',
          allocationSource: 'PRE_ALLOCATED'
        };
      }
    });

    // Populate grid with database assignments depending on generation mode
    existingSlots.forEach((slot) => {
      const d = slot.dayOfWeek;
      const p = slot.periodNumber;
      if (grid[d] && grid[d][p] !== undefined && !grid[d][p]?.isBreak) {
        // Do not overwrite pre-allocated activities
        if (grid[d][p]) return;

        const preserve = 
          slot.lockType === 'HARD' ||
          slot.lockType === 'RESERVED' ||
          mode === 'GEN_REMAINING' ||
          mode === 'FILL_EMPTY' ||
          (mode === 'REGEN_DAY' && d !== Number(selectedDay));

        if (preserve) {
          grid[d][p] = {
            subjectId: slot.subjectId,
            staffId: slot.staffId,
            isLocked: true,
            lockType: slot.lockType || 'HARD',
            allocationSource: slot.allocationSource || 'MANUAL',
            subjectName: slot.subject.name,
            subjectCode: slot.subject.code,
            teacherName: slot.staff?.name || 'Unassigned'
          };
        } else if (slot.lockType === 'SOFT') {
          // Pre-populate soft locked assignments so solver tries them first
          grid[d][p] = {
            subjectId: slot.subjectId,
            staffId: slot.staffId,
            isLocked: false,
            lockType: 'SOFT',
            allocationSource: slot.allocationSource || 'MANUAL',
            subjectName: slot.subject.name,
            subjectCode: slot.subject.code,
            teacherName: slot.staff?.name || 'Unassigned'
          };
        }
      }
    });

    // Subjects list map to calculate remaining counts
    const subjectsMap: Record<string, any> = {};
    subjectsConfig.forEach((sub: any) => {
      subjectsMap[sub.id] = {
        ...sub,
        assignedCount: 0
      };
    });

    // Deduct count of already preserved slots
    for (let d = 1; d <= workingDays; d++) {
      for (let p = 1; p <= periodsPerDay; p++) {
        const cell = grid[d][p];
        if (cell && cell.subjectId && subjectsMap[cell.subjectId]) {
          subjectsMap[cell.subjectId].assignedCount++;
        }
      }
    }

    // List of variables to schedule (empty cells or soft locked cells)
    const vars: Array<{ day: number; period: number; preferredSubjectId?: string }> = [];
    for (let d = 1; d <= workingDays; d++) {
      for (let p = 1; p <= periodsPerDay; p++) {
        if (!grid[d][p]) {
          vars.push({ day: d, period: p });
        } else if (grid[d][p]?.lockType === 'SOFT') {
          const softSubId = grid[d][p].subjectId;
          // Clear it locally so scheduler can backtrack
          grid[d][p] = null;
          vars.push({ day: d, period: p, preferredSubjectId: softSubId });
        }
      }
    }

    // Sort variables: Morning periods first
    vars.sort((a, b) => a.period - b.period);

    // Constraint validation helper
    const isValid = (day: number, period: number, subject: any, teacherId: string | null) => {
      // 1. Weekly period requirement check
      if (subjectsMap[subject.id].assignedCount >= subject.weeklyPeriods) {
        return false;
      }

      // 2. Daily subject frequency limit
      let dailyCount = 0;
      for (let p = 1; p <= periodsPerDay; p++) {
        if (grid[day][p]?.subjectId === subject.id) {
          dailyCount++;
        }
      }
      if (dailyCount >= dailySubjectLimit) {
        return false;
      }

      // 3. Teacher availability & collisions
      if (teacherId) {
        const teacherObj = allTeachers.find((t) => t.id === teacherId);
        
        // Fixed availability exclusion check (Staff.unavailableSlots)
        if (teacherObj && teacherObj.unavailableSlots) {
          const blocked = teacherObj.unavailableSlots.split(',').includes(`${day}-${period}`);
          if (blocked) {
            return false;
          }
        }

        // Teacher collision in other classes/sections
        const collidesInDb = otherTimetableSlots.some(
          (s) => s.dayOfWeek === day && s.periodNumber === period && s.staffId === teacherId
        );
        if (collidesInDb) {
          return false;
        }

        // Teacher collision in local grid same period
        for (let d = 1; d <= workingDays; d++) {
          if (grid[day][period]?.staffId === teacherId) {
            return false;
          }
        }

        // Teacher daily workload limits (Teacher Friendly optimization)
        if (optimizationGoal === 'TEACHER_FRIENDLY') {
          let teacherDailyPeriods = 0;
          for (let p = 1; p <= periodsPerDay; p++) {
            if (grid[day][p]?.staffId === teacherId) {
              teacherDailyPeriods++;
            }
          }
          if (teacherDailyPeriods >= 4) {
            return false;
          }
        }
      }

      // 4. Timing preferences check
      if (subject.preferredTime === 'MORNING' && period > 3) {
        return false;
      }
      if (subject.preferredTime === 'AVOID_LAST' && period === periodsPerDay) {
        return false;
      }
      if (subject.preferredTime === 'LAST_TWO' && period < periodsPerDay - 1) {
        return false;
      }

      return true;
    };

    let backtrackCount = 0;
    const warnings: string[] = [];

    // CSP Backtracking Search Solver
    const solve = (varIndex: number): boolean => {
      backtrackCount++;
      if (varIndex >= vars.length) {
        return true; // Solved!
      }

      if (backtrackCount > 12000) {
        return false; // Soft cutoff to prevent timeouts
      }

      const { day, period, preferredSubjectId } = vars[varIndex];

      // Prioritize subjects list:
      // 1. Soft-locked preferred subject if defined
      // 2. Class teacher's subject in own class if enabled
      // 3. Normal priority
      const sortedSubjects = [...subjectsConfig].sort((a, b) => {
        if (preferredSubjectId) {
          if (a.id === preferredSubjectId) return -1;
          if (b.id === preferredSubjectId) return 1;
        }
        if (settings?.preferClassTeacher && classTeacherStaff) {
          const aIsCT = a.teacherId === classTeacherStaff.id;
          const bIsCT = b.teacherId === classTeacherStaff.id;
          if (aIsCT && !bIsCT) return -1;
          if (!aIsCT && bIsCT) return 1;
        }
        return 0;
      });

      for (const subject of sortedSubjects) {
        // Resolve Teacher based on subject configurations or staff designative mapping with priority levels
        let eligibleTeacherIds: string[] = [];
        if (subject.teacherId) {
          eligibleTeacherIds = [subject.teacherId];
        } else {
          // Look up active teachers who teach this subject code or name
          const teachersWhoTeach = allTeachers.filter(t => 
            t.subjects?.some((s: any) => s.id === subject.id || s.code === subject.code)
          );
          // Sort by Priority: 1 (Senior) first, 3 (Guest) last
          teachersWhoTeach.sort((a, b) => (a.teacherPriority || 2) - (b.teacherPriority || 2));
          eligibleTeacherIds = teachersWhoTeach.map(t => t.id);
        }

        // Try eligible teachers
        for (const teacherId of eligibleTeacherIds) {
          const consecutiveCount = Number(subject.consecutivePeriods) || 1;
          if (consecutiveCount > 1) {
            let canFitConsecutive = true;
            const consecutiveSlots: number[] = [];

            for (let offset = 0; offset < consecutiveCount; offset++) {
              const nextPeriod = period + offset;
              if (nextPeriod > periodsPerDay || grid[day][nextPeriod] !== null) {
                canFitConsecutive = false;
                break;
              }
              consecutiveSlots.push(nextPeriod);
            }

            if (canFitConsecutive) {
              let allValid = true;
              for (const pNum of consecutiveSlots) {
                if (!isValid(day, pNum, subject, teacherId)) {
                  allValid = false;
                  break;
                }
                subjectsMap[subject.id].assignedCount++;
              }

              consecutiveSlots.forEach(() => {
                subjectsMap[subject.id].assignedCount--;
              });

              if (allValid) {
                consecutiveSlots.forEach((pNum) => {
                  const teacherObj = allTeachers.find((t) => t.id === teacherId);
                  grid[day][pNum] = {
                    subjectId: subject.id,
                    staffId: teacherId,
                    subjectName: subject.name,
                    subjectCode: subject.code,
                    teacherName: teacherObj?.name || 'Unassigned',
                    isLocked: false,
                    lockType: 'NONE',
                    allocationSource: 'AUTO'
                  };
                  subjectsMap[subject.id].assignedCount++;
                });

                const nextVarIdx = vars.findIndex((v) => v.day === day && v.period === period + consecutiveCount);
                const recursiveIdx = nextVarIdx !== -1 ? nextVarIdx : varIndex + consecutiveCount;

                if (solve(recursiveIdx)) return true;

                consecutiveSlots.forEach((pNum) => {
                  grid[day][pNum] = null;
                  subjectsMap[subject.id].assignedCount--;
                });
              }
            }
          } else {
            // Single period allocation
            if (isValid(day, period, subject, teacherId)) {
              const teacherObj = allTeachers.find((t) => t.id === teacherId);
              grid[day][period] = {
                subjectId: subject.id,
                staffId: teacherId,
                subjectName: subject.name,
                subjectCode: subject.code,
                teacherName: teacherObj?.name || 'Unassigned',
                isLocked: false,
                lockType: 'NONE',
                allocationSource: 'AUTO'
              };
              subjectsMap[subject.id].assignedCount++;

              if (solve(varIndex + 1)) return true;

              grid[day][period] = null;
              subjectsMap[subject.id].assignedCount--;
            }
          }
        }
      }

      return false;
    };

    const success = solve(0);

    if (!success) {
      // Find bottleneck conflicts to return intelligent error suggestions
      const bottlenecks: string[] = [];
      subjectsConfig.forEach((sub: any) => {
        const remaining = sub.weeklyPeriods - subjectsMap[sub.id].assignedCount;
        if (remaining > 0) {
          const teacherObj = allTeachers.find((t) => t.id === sub.teacherId);
          bottlenecks.push(
            `Subject "${sub.name}" is missing ${remaining} periods. assigned teacher "${teacherObj?.name || 'unassigned'}" may be busy on other schedules or blocked in unavailable slots.`
          );
        }
      });

      return NextResponse.json({
        error: 'Timetable conflict detected. The scheduler was unable to allocate all periods without overlaps.',
        suggestions: bottlenecks.length > 0 ? bottlenecks : ['Try adjusting teacher availability, custom locks, or priority constraints in parameters wizard.']
      }, { status: 409 });
    }

    // Evaluate soft constraints workload warnings
    allTeachers.forEach((teacher) => {
      let teacherTotalPeriods = 0;
      for (let d = 1; d <= workingDays; d++) {
        for (let p = 1; p <= periodsPerDay; p++) {
          if (grid[d][p]?.staffId === teacher.id) {
            teacherTotalPeriods++;
          }
        }
      }
      if (teacherTotalPeriods > 20) {
        warnings.push(`Teacher workload is high: ${teacher.name} is teaching ${teacherTotalPeriods} periods/week.`);
      }
    });

    const flatResults: any[] = [];
    for (let d = 1; d <= workingDays; d++) {
      for (let p = 1; p <= periodsPerDay; p++) {
        if (grid[d][p] && !grid[d][p].isBreak) {
          flatResults.push({
            dayOfWeek: d,
            periodNumber: p,
            subjectId: grid[d][p].subjectId,
            staffId: grid[d][p].staffId,
            isLocked: grid[d][p].isLocked || false,
            lockType: grid[d][p].lockType || 'NONE',
            allocationSource: grid[d][p].allocationSource || 'AUTO',
            subject: { name: grid[d][p].subjectName, code: grid[d][p].subjectCode },
            staff: grid[d][p].staffId ? { name: grid[d][p].teacherName } : null
          });
        }
      }
    }

    const durationMs = Date.now() - startTime;

    // Save slots to database if not preview mode
    if (!previewOnly) {
      await prisma.$transaction(async (tx) => {
        // Clear all unlocked/soft slots for this class/section/session
        await tx.timetable.deleteMany({
          where: {
            sessionId,
            classId,
            sectionId: targetSectionId,
            lockType: { notIn: ['HARD', 'RESERVED'] },
            ...(mode === 'REGEN_DAY' ? { dayOfWeek: { not: Number(selectedDay) } } : {})
          }
        });

        // Insert new generated/assigned slots
        for (const slot of flatResults) {
          // If already exists as a hard lock/reserved in DB, skip insert
          const alreadyExists = existingSlots.some(
            (s) => s.dayOfWeek === slot.dayOfWeek && 
                   s.periodNumber === slot.periodNumber && 
                   (s.lockType === 'HARD' || s.lockType === 'RESERVED')
          );
          if (alreadyExists) continue;

          // Get period times
          const hoursStart = 8 + slot.periodNumber;
          const startTimeStr = `${hoursStart.toString().padStart(2, '0')}:00`;
          const endTimeStr = `${hoursStart.toString().padStart(2, '0')}:45`;

          await tx.timetable.create({
            data: {
              sessionId,
              classId,
              sectionId: targetSectionId,
              dayOfWeek: slot.dayOfWeek,
              periodNumber: slot.periodNumber,
              subjectId: slot.subjectId,
              staffId: slot.staffId,
              startTime: startTimeStr,
              endTime: endTimeStr,
              isLocked: slot.isLocked || slot.lockType === 'HARD' || slot.lockType === 'RESERVED',
              lockType: slot.lockType || 'NONE',
              allocationSource: slot.allocationSource || 'AUTO'
            }
          });
        }

        // Write Audit Record
        await tx.timetableAudit.create({
          data: {
            generatedBy: session.user.name || 'Principal',
            mode,
            durationMs,
            classId,
            sectionId: targetSectionId,
            sessionId
          }
        });
      });
    }

    return NextResponse.json({
      success: true,
      count: flatResults.length,
      warnings,
      slots: flatResults,
      durationMs
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 550 });
  }
}
