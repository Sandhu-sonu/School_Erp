import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { UserRole } from '@school-erp/utils';

import { getEnabledModules } from '@/lib/services/modules';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login');
  }

  const role = session.user.role as UserRole;
  const name = session.user.name || session.user.email || 'User';
  const enabledModules = await getEnabledModules();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {/* Sidebar Navigation */}
      <Sidebar userRole={role} enabledModules={enabledModules} />

      {/* Main View Area */}
      <div className="flex flex-col flex-1 h-full min-w-0">
        {/* Top Navbar */}
        <Navbar userName={name} userRole={role} />

        {/* Dynamic Route Dashboard Body */}
        <main className="flex-1 overflow-y-auto p-6 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
