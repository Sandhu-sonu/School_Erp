import React from 'react';
import { prisma } from '@school-erp/db';
import AttendanceDeskClient from './AttendanceDeskClient';

import { isModuleEnabled } from '@/lib/services/modules';
import ModuleDisabled from '@/components/ModuleDisabled';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
  if (!(await isModuleEnabled('ATTENDANCE'))) {
    return <ModuleDisabled moduleName="Attendance" />;
  }

  // Fetch classes and sections for rosters selection
  const classes = await prisma.class.findMany({
    orderBy: { sequence: 'asc' },
    include: { sections: { orderBy: { name: 'asc' } } },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Daily Attendance Desk</h1>
        <p className="text-xs text-slate-500">Record daily student attendance sheets and update monthly logs.</p>
      </div>

      {/* Attendance Desk Interactive Form */}
      <AttendanceDeskClient classes={classes} />
    </div>
  );
}
