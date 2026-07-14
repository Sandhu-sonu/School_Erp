import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isAllowedReport } from '@/lib/services/reports-security';
import { isModuleEnabled } from '@/lib/services/modules';
import ReportsDashboardClient from './ReportsDashboardClient';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect('/login');
  }

  const role = session.user.role as string;

  const showAttendance = await isModuleEnabled('ATTENDANCE');
  const showResults = await isModuleEnabled('RESULTS');
  const showHr = await isModuleEnabled('HR');
  const showTransport = await isModuleEnabled('TRANSPORT');

  // Compile list of allowed reports for the UI cards
  const categories = [
    { key: 'STUDENTS', title: 'Student Reports', href: '/dashboard/reports/students', desc: 'Demographics, Register, Class Strength, DOB Analytics', enabled: true },
    { key: 'FINANCE', title: 'Finance Reports', href: '/dashboard/reports/finance', desc: 'Fee collections, outstanding dues, daily summaries, net balances', enabled: true },
    { key: 'ATTENDANCE', title: 'Attendance Reports', href: '/dashboard/reports/attendance', desc: 'Daily roles, absenteeism lists, attendance logs', enabled: showAttendance },
    { key: 'RESULTS', title: 'Academic Reports', href: '/dashboard/reports/results', desc: 'Exam snapshots, toppers,Pass/Fail grades distribution', enabled: showResults },
    { key: 'HR', title: 'HR & Salary Reports', href: '/dashboard/reports/hr', desc: 'Employee registries, salary history logs, adjustments audit', enabled: showHr },
    { key: 'TRANSPORT', title: 'Transport Reports', href: '/dashboard/reports/transport', desc: 'Route capacities, stop revenues, assignment histories', enabled: showTransport }
  ];

  const allowedCategories = categories
    .filter(cat => cat.enabled)
    .filter(cat => isAllowedReport(role, cat.key));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Analytics Desk</h1>
        <p className="text-sm text-slate-500">Secure production reporting layer. All reports are read-only and audited.</p>
      </div>

      {/* Grid of Report Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allowedCategories.map((cat) => (
          <a
            key={cat.key}
            href={cat.href}
            className="block p-6 bg-white rounded-lg border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all group"
          >
            <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{cat.title}</h3>
            <p className="mt-2 text-xs text-slate-500 line-clamp-2">{cat.desc}</p>
            <div className="mt-4 text-xs font-semibold text-blue-600 group-hover:underline flex items-center gap-1">
              Open Report Desk &rarr;
            </div>
          </a>
        ))}
      </div>

      {/* Analytics Widgets section */}
      <ReportsDashboardClient role={role} />
    </div>
  );
}
