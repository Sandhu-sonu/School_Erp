import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isAllowedReport } from '@/lib/services/reports-security';
import { prisma } from '@school-erp/db';
import FinanceReportClient from './FinanceReportClient';

export const dynamic = 'force-dynamic';

export default async function FinanceReportPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect('/login');
  }

  const role = session.user.role as string;
  if (!isAllowedReport(role, 'FINANCE')) {
    redirect('/dashboard/reports?error=Forbidden');
  }

  const classes = await prisma.class.findMany({
    orderBy: { sequence: 'asc' },
  });

  return (
    <FinanceReportClient
      classes={classes.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
