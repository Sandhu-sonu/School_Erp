import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isAllowedReport } from '@/lib/services/reports-security';
import { prisma } from '@school-erp/db';
import AttendanceReportClient from './AttendanceReportClient';

export const dynamic = 'force-dynamic';

export default async function AttendanceReportPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect('/login');
  }

  const role = session.user.role as string;
  if (!isAllowedReport(role, 'ATTENDANCE')) {
    redirect('/dashboard/reports?error=Forbidden');
  }

  const sessions = await prisma.academicSession.findMany({
    orderBy: { startDate: 'desc' },
  });

  const classes = await prisma.class.findMany({
    include: { sections: true },
    orderBy: { sequence: 'asc' },
  });

  return (
    <AttendanceReportClient
      sessions={sessions.map((s) => ({ id: s.id, name: s.name }))}
      classes={classes.map((c) => ({
        id: c.id,
        name: c.name,
        sections: c.sections.map((sec) => ({ id: sec.id, name: sec.name })),
      }))}
    />
  );
}
