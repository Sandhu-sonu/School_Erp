'use client';

import React, { useEffect, useState } from 'react';

interface ReportsDashboardClientProps {
  role: string;
}

export default function ReportsDashboardClient({ role }: ReportsDashboardClientProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/analytics')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load dashboard analytics');
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8 bg-white border border-slate-200 rounded-lg text-center text-slate-500 text-sm">
        Loading analytics engine metrics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-center text-red-600 text-sm">
        Error loading analytics: {error}
      </div>
    );
  }

  const isTeacher = role === 'TEACHER';
  const isAccountant = role === 'ACCOUNTANT';
  const isClerk = role === 'CLERK';
  const isPrincipalOrHead = role === 'PRINCIPAL' || role === 'HEAD';

  return (
    <div className="space-y-6">
      {/* Widget KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {(isPrincipalOrHead || isClerk || isTeacher) && (
          <div className="p-6 bg-white border border-slate-200 rounded-lg">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Attendance Rate</h4>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {data.attendancePercentage ? `${data.attendancePercentage.toFixed(1)}%` : 'N/A'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">System-wide active roll average</p>
          </div>
        )}

        {(isPrincipalOrHead || isClerk || isAccountant) && (
          <div className="p-6 bg-white border border-slate-200 rounded-lg">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Transport Revenue</h4>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              ₹{data.transportRevenue ? data.transportRevenue.toLocaleString() : '0'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Net (Debits minus Credits)</p>
          </div>
        )}

        <div className="p-6 bg-white border border-slate-200 rounded-lg">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Published Notices</h4>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {data.publishedNoticesCount ?? 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Currently active boards</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Admissions Trend */}
        {(isPrincipalOrHead || isClerk) && data.admissionsTrend?.length > 0 && (
          <div className="p-6 bg-white border border-slate-200 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Admissions Trend (Last 6 Months)</h3>
            <div className="max-h-[240px] overflow-hidden flex items-end justify-center">
              <LineChart data={data.admissionsTrend} xKey="month" yKey="count" height={200} strokeColor="#3b82f6" />
            </div>
          </div>
        )}

        {/* Collections Trend */}
        {(isPrincipalOrHead || isClerk || isAccountant) && data.collectionsTrend?.length > 0 && (
          <div className="p-6 bg-white border border-slate-200 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Fee Collections Trend (Last 6 Months)</h3>
            <div className="max-h-[240px] overflow-hidden flex items-end justify-center">
              <LineChart data={data.collectionsTrend} xKey="month" yKey="amount" height={200} strokeColor="#10b981" />
            </div>
          </div>
        )}

        {/* Expense Trend */}
        {(isPrincipalOrHead || isClerk || isAccountant) && data.expenseTrend?.length > 0 && (
          <div className="p-6 bg-white border border-slate-200 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Expense Trend (Last 6 Months)</h3>
            <div className="max-h-[240px] overflow-hidden flex items-end justify-center">
              <LineChart data={data.expenseTrend} xKey="month" yKey="amount" height={200} strokeColor="#f59e0b" />
            </div>
          </div>
        )}

        {/* Top Classes Bar Chart */}
        {(isPrincipalOrHead || isClerk) && data.topClasses?.length > 0 && (
          <div className="p-6 bg-white border border-slate-200 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Top Classes (by Enrollment Strength)</h3>
            <div className="max-h-[240px] overflow-y-auto">
              <HorizontalBarChart data={data.topClasses} nameKey="className" valueKey="studentCount" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LineChart({ data, xKey, yKey, height = 200, strokeColor }: { data: any[]; xKey: string; yKey: string; height?: number; strokeColor: string }) {
  const values = data.map((d) => Number(d[yKey]));
  const maxVal = Math.max(...values, 10);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;
  const padding = 24;

  const points = data.map((d, idx) => {
    const x = padding + (idx / (data.length - 1)) * (360 - padding * 2);
    const y = height - padding - ((Number(d[yKey]) - minVal) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  return (
    <div className="w-full flex justify-center">
      <svg viewBox={`0 0 360 ${height}`} className="w-full max-w-[360px] overflow-visible">
        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={360 - padding} y2={padding} stroke="#f1f5f9" />
        <line x1={padding} y1={height / 2} x2={360 - padding} y2={height / 2} stroke="#f1f5f9" />
        <line x1={padding} y1={height - padding} x2={360 - padding} y2={height - padding} stroke="#cbd5e1" strokeWidth="1.5" />

        {/* Path line */}
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots & labels */}
        {points.map((pt, idx) => {
          const coords = pt.split(',');
          const x = parseFloat(coords[0]);
          const y = parseFloat(coords[1]);
          return (
            <g key={idx}>
              <circle cx={x} cy={y} r="3.5" fill={strokeColor} stroke="#ffffff" strokeWidth="1.5" />
              <text x={x} y={y - 8} textAnchor="middle" className="text-[8px] font-bold fill-slate-700">
                {Number(data[idx][yKey]) > 1000 ? `${(Number(data[idx][yKey]) / 1000).toFixed(0)}k` : data[idx][yKey]}
              </text>
              <text x={x} y={height - 8} textAnchor="middle" className="text-[8px] fill-slate-400">
                {data[idx][xKey].slice(-2)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function HorizontalBarChart({ data, nameKey, valueKey }: { data: any[]; nameKey: string; valueKey: string }) {
  const maxVal = Math.max(...data.map((d) => Number(d[valueKey])), 1);

  return (
    <div className="space-y-3.5 pr-2">
      {data.map((item, idx) => {
        const val = Number(item[valueKey]);
        const pct = (val / maxVal) * 100;
        return (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>{item[nameKey]}</span>
              <span className="tabular-nums">{val}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
