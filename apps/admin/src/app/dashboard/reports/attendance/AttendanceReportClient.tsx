'use client';

import React, { useEffect, useState } from 'react';
import { Printer, Download, Eye, RotateCcw } from 'lucide-react';

interface AttendanceReportClientProps {
  sessions: { id: string; name: string }[];
  classes: { id: string; name: string; sections: { id: string; name: string }[] }[];
}

export default function AttendanceReportClient({ sessions, classes }: AttendanceReportClientProps) {
  const [reportType, setReportType] = useState('DAILY_ATTENDANCE');

  // Filters
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');

  // Table Data & Meta
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Sections based on Class
  const selectedClass = classes.find(c => c.id === classId);
  const sections = selectedClass ? selectedClass.sections : [];

  // Reset page when report type or filters change
  useEffect(() => {
    // page reset not needed as we show full list for aggregates, but let's keep it simple
  }, [reportType, date, classId, sectionId]);

  // Load Report Data
  const loadData = () => {
    setLoading(true);
    setError(null);

    const filters: any = {};
    if (date) filters.date = date;
    if (classId) filters.classId = classId;
    if (sectionId) filters.sectionId = sectionId;

    fetch('/api/reports/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportType,
        filters,
        page: 1,
        limit: 500, // Large limit for attendance rolls
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load report data');
        return res.json();
      })
      .then((json) => {
        setData(json.data || []);
        setSummary(json.summary || {});
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [reportType, date, classId, sectionId]);

  // Export CSV
  const handleExportCSV = async () => {
    const filters: any = {};
    if (date) filters.date = date;
    if (classId) filters.classId = classId;
    if (sectionId) filters.sectionId = sectionId;

    try {
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, filters }),
      });

      if (!response.ok) throw new Error('CSV Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.download = `school-report-${todayStr}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Print Report
  const handlePrint = async () => {
    const filters: any = {};
    if (date) filters.date = date;
    if (classId) filters.classId = classId;
    if (sectionId) filters.sectionId = sectionId;

    // Log print audit
    await fetch('/api/reports/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportType, filters, action: 'PRINT' }),
    });

    window.print();
  };

  const handleReset = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setClassId('');
    setSectionId('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Attendance Reports Desk</h1>
          <p className="text-xs text-slate-500">Track and analyze daily, monthly, and class-wise attendance statistics.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold hover:bg-slate-700 transition"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-500 transition"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards (for active day status summary) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
        <div className="p-4 bg-slate-100 border border-slate-200 rounded">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Present Count</span>
          <p className="text-xl font-black text-slate-950 mt-1">{summary.present ?? '-'}</p>
        </div>
        <div className="p-4 bg-slate-100 border border-slate-200 rounded">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Absent Count</span>
          <p className="text-xl font-black text-slate-950 mt-1">{summary.absent ?? '-'}</p>
        </div>
        <div className="p-4 bg-slate-100 border border-slate-200 rounded">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Late / Half Day</span>
          <p className="text-xl font-black text-slate-950 mt-1">{summary.late ?? '-'}</p>
        </div>
        <div className="p-4 bg-slate-100 border border-slate-200 rounded">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Holiday</span>
          <p className="text-xl font-black text-slate-950 mt-1">{summary.holiday ?? '0'}</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1 print:hidden">
        {[
          { id: 'DAILY_ATTENDANCE', label: 'Daily Attendance' },
          { id: 'ABSENTEE_LIST', label: 'Absentee List' },
          { id: 'STUDENT_ATTENDANCE_PERCENT', label: 'Student Attendance %' },
          { id: 'CLASS_ATTENDANCE_PERCENT', label: 'Class Attendance %' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id)}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition ${
              reportType === tab.id
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sticky Filters Panel */}
      <div className="sticky top-0 z-10 bg-slate-50 p-4 border border-slate-200 rounded flex flex-wrap items-center gap-4 print:hidden">
        {['DAILY_ATTENDANCE', 'ABSENTEE_LIST'].includes(reportType) && (
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none"
            />
          </div>
        )}

        {reportType !== 'CLASS_ATTENDANCE_PERCENT' && (
          <>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Class</label>
              <select
                value={classId}
                onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}
                className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none"
              >
                <option value="">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Section</label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                disabled={!classId}
                className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none disabled:bg-slate-100"
              >
                <option value="">All Sections</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </>
        )}

        <button
          onClick={handleReset}
          className="flex items-center gap-1 mt-5 px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition"
        >
          <RotateCcw className="h-3 w-3" /> Reset Filters
        </button>
      </div>

      {/* Main Data Table */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading dataset...</div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-red-600 font-semibold">{error}</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No records found matching current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                {reportType === 'DAILY_ATTENDANCE' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Adm No</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Student Name</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Class</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Section</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Attendance Status</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Remarks</th>
                  </tr>
                )}
                {reportType === 'ABSENTEE_LIST' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Adm No</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Student Name</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Class</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Section</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Remarks</th>
                  </tr>
                )}
                {reportType === 'STUDENT_ATTENDANCE_PERCENT' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Adm No</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Student</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Class</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Section</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Present / Total Days</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Attendance Rate</th>
                  </tr>
                )}
                {reportType === 'CLASS_ATTENDANCE_PERCENT' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Class Name</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Total Records</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Average Attendance Rate</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {reportType === 'DAILY_ATTENDANCE' &&
                  data.map((row: any, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-mono text-xs text-slate-500">{row.admissionNumber}</td>
                      <td className="px-4 py-2 font-semibold text-slate-900">{row.studentName}</td>
                      <td className="px-4 py-2">{row.className}</td>
                      <td className="px-4 py-2">{row.sectionName}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.status === 'PRESENT' ? 'bg-green-50 text-green-700 border border-green-100' :
                          row.status === 'ABSENT' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-500">{row.remarks || '-'}</td>
                    </tr>
                  ))}
                {reportType === 'ABSENTEE_LIST' &&
                  data.map((row: any, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-mono text-xs text-slate-500">{row.admissionNumber}</td>
                      <td className="px-4 py-2 font-semibold text-red-700">{row.studentName}</td>
                      <td className="px-4 py-2">{row.className}</td>
                      <td className="px-4 py-2">{row.sectionName}</td>
                      <td className="px-4 py-2 text-xs text-slate-500">{row.remarks || '-'}</td>
                    </tr>
                  ))}
                {reportType === 'STUDENT_ATTENDANCE_PERCENT' &&
                  data.map((row: any, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-mono text-xs text-slate-500">{row.admissionNumber}</td>
                      <td className="px-4 py-2 font-semibold text-slate-900">{row.studentName}</td>
                      <td className="px-4 py-2">{row.className}</td>
                      <td className="px-4 py-2">{row.sectionName}</td>
                      <td className="px-4 py-2">{row.present} / {row.total}</td>
                      <td className={`px-4 py-2 font-bold ${row.percentage < 75 ? 'text-red-600' : 'text-green-600'}`}>
                        {row.percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                {reportType === 'CLASS_ATTENDANCE_PERCENT' &&
                  data.map((row: any, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-bold text-slate-900">{row.className}</td>
                      <td className="px-4 py-2">{row.totalRecords}</td>
                      <td className={`px-4 py-2 font-bold ${row.percentage < 75 ? 'text-red-600' : 'text-green-600'}`}>
                        {row.percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
