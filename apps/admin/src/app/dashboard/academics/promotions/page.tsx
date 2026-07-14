import React from 'react';
import { prisma } from '@school-erp/db';
import PromotionEngineClient from './PromotionEngineClient';

export const dynamic = 'force-dynamic';

export default async function PromotionsPage() {
  // Fetch sessions, classes, sections for setup dropdowns
  const sessions = await prisma.academicSession.findMany({
    orderBy: { startDate: 'desc' },
  });

  const classes = await prisma.class.findMany({
    orderBy: { sequence: 'asc' },
    include: { sections: { orderBy: { name: 'asc' } } },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Academic Promotion Desk</h1>
        <p className="text-xs text-slate-500">Promote cohorts of students to the next class levels between sessions.</p>
      </div>

      {/* Promotion interactive desk */}
      <PromotionEngineClient sessions={sessions} classes={classes} />
    </div>
  );
}
