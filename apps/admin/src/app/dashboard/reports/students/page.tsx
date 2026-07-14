import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isAllowedReport } from '@/lib/services/reports-security';
import { prisma } from '@school-erp/db';
import StudentsReportClient from './StudentsReportClient';

export const dynamic = 'force-dynamic';

export default async function StudentsReportPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect('/login');
  }

  const role = session.user.role as string;
  if (!isAllowedReport(role, 'STUDENTS')) {
    redirect('/dashboard/reports?error=Forbidden');
  }

  const sessions = await prisma.academicSession.findMany({
    orderBy: { startDate: 'desc' },
  });

  const classes = await prisma.class.findMany({
    include: { sections: true },
    orderBy: { sequence: 'asc' },
  });

  const routes = await prisma.route.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });

  return (
    <StudentsReportClient
      sessions={sessions.map((s) => ({ id: s.id, name: s.name }))}
      classes={classes.map((c) => ({
        id: c.id,
        name: c.name,
        sections: c.sections.map((sec) => ({ id: sec.id, name: sec.name })),
      }))}
      routes={routes.map((r) => ({ id: r.id, name: r.name }))}
    />
  );
}
