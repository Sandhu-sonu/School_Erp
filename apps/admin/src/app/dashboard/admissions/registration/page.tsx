import React from 'react';
import { prisma } from '@school-erp/db';
import RegistrationFormClient from './RegistrationFormClient';

export const dynamic = 'force-dynamic';

export default async function RegistrationPage() {
  // Fetch classes and sections for dropdown options
  const classes = await prisma.class.findMany({
    orderBy: { sequence: 'asc' },
    include: {
      sections: {
        orderBy: { name: 'asc' },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Student Admission Desk</h1>
        <p className="text-xs text-slate-500">Register new students and link or create parent profiles.</p>
      </div>

      {/* Main Registration Form */}
      <RegistrationFormClient classes={classes} />
    </div>
  );
}
