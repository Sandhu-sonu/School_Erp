import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isAllowedReport } from '@/lib/services/reports-security';
import { prisma } from '@school-erp/db';
import HrReportClient from './HrReportClient';

export const dynamic = 'force-dynamic';

export default async function HrReportPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect('/login');
  }

  const role = session.user.role as string;
  if (!isAllowedReport(role, 'HR')) {
    redirect('/dashboard/reports?error=Forbidden');
  }

  const staffList = await prisma.staff.findMany({
    where: { status: { not: 'DELETED' } },
    orderBy: { name: 'asc' },
  });

  return (
    <HrReportClient
      staffList={staffList.map((s) => ({ id: s.id, name: s.name, code: s.employeeCode }))}
    />
  );
}
