import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isAllowedReport } from '@/lib/services/reports-security';
import { prisma } from '@school-erp/db';
import ResultsReportClient from './ResultsReportClient';

export const dynamic = 'force-dynamic';

export default async function ResultsReportPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect('/login');
  }

  const role = session.user.role as string;
  if (!isAllowedReport(role, 'RESULTS')) {
    redirect('/dashboard/reports?error=Forbidden');
  }

  const exams = await prisma.exam.findMany({
    where: { published: true },
    orderBy: { startDate: 'desc' },
  });

  const classes = await prisma.class.findMany({
    orderBy: { sequence: 'asc' },
  });

  return (
    <ResultsReportClient
      exams={exams.map((e) => ({ id: e.id, name: e.name }))}
      classes={classes.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
