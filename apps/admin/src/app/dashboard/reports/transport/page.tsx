import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isAllowedReport } from '@/lib/services/reports-security';
import TransportReportClient from './TransportReportClient';

export const dynamic = 'force-dynamic';

export default async function TransportReportPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect('/login');
  }

  const role = session.user.role as string;
  if (!isAllowedReport(role, 'TRANSPORT')) {
    redirect('/dashboard/reports?error=Forbidden');
  }

  return (
    <TransportReportClient />
  );
}
