import React from 'react';
import { 
  Users, UserPlus, CreditCard, AlertCircle, FileText, 
  Activity, Bus, Bell, UserCheck, MapPin, Sparkles, Plus, Shield, Settings, Wrench
} from 'lucide-react';
import { getDashboardData } from '@/lib/services/dashboard';
import { isModuleEnabled } from '@/lib/services/modules';
import { StatisticCard, Card } from '@/components/ui/Card';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const {
    activeStudentsCount,
    leadsCount,
    totalCollected,
    totalPending,
    transportRevenue,
    studentsUsingTransport,
    publishedNoticesCount,
    newAdmissionsCount,
    recentLogs,
    classes
  } = await getDashboardData();

  const showTransport = await isModuleEnabled('TRANSPORT');
  const showNotices = await isModuleEnabled('COMMUNICATIONS');

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6 select-none text-xs font-semibold text-slate-700">
      {/* 1. Header Greeting board */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="absolute right-0 top-0 -mr-6 -mt-6 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
              System Live
            </span>
            <Sparkles className="h-4 w-4 text-blue-400 animate-pulse" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Good Morning, Principal</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Greenwood High School | CBSE Affiliation</p>
        </div>
        <div className="bg-white/10 border border-white/10 rounded-2xl py-2 px-4 backdrop-blur-sm text-right relative z-10">
          <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Active Academic Session</span>
          <span className="text-sm font-extrabold text-white font-mono mt-0.5 block">Session 2026–27</span>
        </div>
      </div>

      {/* 2. Row 1: Executive KPI summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatisticCard
          title="Active Students"
          value={activeStudentsCount}
          icon={Users}
          trend={{ value: '12%', isUp: true }}
          description="Total enrolled pupils"
        />
        <StatisticCard
          title="Collected Fees"
          value={formatINR(totalCollected)}
          icon={CreditCard}
          iconBgColor="bg-green-50 text-green-700"
          iconTextColor="text-green-700"
          trend={{ value: '8.4%', isUp: true }}
          description="Paid invoices this session"
        />
        <StatisticCard
          title="Outstanding Fees"
          value={formatINR(totalPending)}
          icon={AlertCircle}
          iconBgColor="bg-red-50 text-red-750"
          iconTextColor="text-red-750"
          trend={{ value: '4.2%', isUp: false }}
          description="Unpaid pending dues"
        />
        <StatisticCard
          title="Admissions Intake"
          value={newAdmissionsCount}
          icon={UserPlus}
          iconBgColor="bg-purple-50 text-purple-700"
          iconTextColor="text-purple-700"
          trend={{ value: '15%', isUp: true }}
          description="New students this month"
        />
      </div>

      {/* 3. Row 2: Premium responsive SVG charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Admissions line chart */}
        <Card title="Admissions Intake Trend (Monthly)" className="lg:col-span-2">
          <div className="h-44 w-full flex flex-col justify-between pt-2">
            <svg className="w-full h-32 text-primary" viewBox="0 0 300 100" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="20" x2="300" y2="20" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="50" x2="300" y2="50" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="80" x2="300" y2="80" stroke="#f1f5f9" strokeWidth="1" />
              
              {/* Line graph */}
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                points="10,80 60,65 120,40 180,50 240,25 290,15"
              />
              
              {/* Fill area */}
              <polygon
                fill="currentColor"
                fillOpacity="0.05"
                points="10,80 60,65 120,40 180,50 240,25 290,15 290,100 10,100"
              />

              {/* Data dots */}
              <circle cx="10" cy="80" r="3" className="fill-white stroke-primary stroke-2" />
              <circle cx="60" cy="65" r="3" className="fill-white stroke-primary stroke-2" />
              <circle cx="120" cy="40" r="3" className="fill-white stroke-primary stroke-2" />
              <circle cx="180" cy="50" r="3" className="fill-white stroke-primary stroke-2" />
              <circle cx="240" cy="25" r="3" className="fill-white stroke-primary stroke-2" />
              <circle cx="290" cy="15" r="3" className="fill-white stroke-primary stroke-2" />
            </svg>
            <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase px-1">
              <span>Apr</span>
              <span>Jun</span>
              <span>Aug</span>
              <span>Oct</span>
              <span>Dec</span>
              <span>Feb</span>
            </div>
          </div>
        </Card>

        {/* Gender ratio donut chart */}
        <Card title="Pupil Gender Ratio">
          <div className="h-44 flex flex-col items-center justify-center relative">
            <svg className="w-28 h-28 transform -rotate-95" viewBox="0 0 36 36">
              {/* Background circle */}
              <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
              
              {/* Blue segment (Boys - 60%) */}
              <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#3b82f6" strokeWidth="4.5"
                      strokeDasharray="60 40" strokeDashoffset="100" />
              
              {/* Pink segment (Girls - 40%) */}
              <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#ec4899" strokeWidth="4.5"
                      strokeDasharray="40 60" strokeDashoffset="40" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-lg font-black text-slate-800">1.5:1</span>
              <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">Ratio Index</span>
            </div>
            <div className="flex justify-center gap-4 text-[9px] font-bold uppercase mt-2">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Boys (60%)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-pink-500" />
                <span>Girls (40%)</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 4. Row 3: Class Strength, Activity Log & Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class strength horizontal progress */}
        <Card className="lg:col-span-2" title="Class Strength distribution">
          <div className="space-y-3">
            {classes.map((cls) => {
              const percent = activeStudentsCount > 0 ? (cls._count.enrollments / activeStudentsCount) * 100 : 0;
              return (
                <div key={cls.id} className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-700">{cls.name}</span>
                    <span className="text-slate-400 font-mono">{cls._count.enrollments} Students ({percent.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Quick Actions Panel */}
        <Card title="Quick actions console">
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
            <Link 
              href="/dashboard/admissions/registration"
              className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl flex flex-col items-center gap-1.5 text-center transition-colors"
            >
              <UserPlus className="h-4.5 w-4.5 text-blue-500" />
              Admit Pupil
            </Link>
            <Link 
              href="/dashboard/finance/fees"
              className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl flex flex-col items-center gap-1.5 text-center transition-colors"
            >
              <CreditCard className="h-4.5 w-4.5 text-green-500" />
              Collect Fees
            </Link>
            <Link 
              href="/dashboard/system/school-settings"
              className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl flex flex-col items-center gap-1.5 text-center transition-colors"
            >
              <Settings className="h-4.5 w-4.5 text-slate-500" />
              School Config
            </Link>
            <Link 
              href="/dashboard/system/maintenance"
              className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl flex flex-col items-center gap-1.5 text-center transition-colors"
            >
              <Wrench className="h-4.5 w-4.5 text-amber-500" />
              Maintenance
            </Link>
          </div>
        </Card>
      </div>

      {/* 5. Row 4: Recent log events */}
      <div className="grid grid-cols-1 gap-6">
        <Card title="Recent Activity Trail">
          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
            {recentLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex justify-between items-start text-xs font-semibold">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded uppercase">
                      {log.action}
                    </span>
                    <span className="text-slate-800 font-bold">{log.details}</span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                    Triggered by: {log.user?.name || 'System'} ({log.user?.role}) | IP: {log.ipAddress || 'Internal'}
                  </div>
                </div>
                <span className="text-[9px] text-slate-400 font-medium">
                  {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
