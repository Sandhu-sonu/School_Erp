'use client';

import React, { useEffect, useState } from 'react';
import { Printer, Download, Eye, RotateCcw } from 'lucide-react';

interface StudentsReportClientProps {
  sessions: { id: string; name: string }[];
  classes: { id: string; name: string; sections: { id: string; name: string }[] }[];
  routes: { id: string; name: string }[];
}

export default function StudentsReportClient({ sessions, classes, routes }: StudentsReportClientProps) {
  const [reportType, setReportType] = useState('STUDENT_REGISTER');
  
  // Filters
  const [sessionId, setSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [status, setStatus] = useState('');
  const [routeId, setRouteId] = useState('');

  // Table Data & Meta
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Sections based on Class
  const selectedClass = classes.find(c => c.id === classId);
  const sections = selectedClass ? selectedClass.sections : [];

  // Reset page when report type or filters change
  useEffect(() => {
    setPage(1);
  }, [reportType, sessionId, classId, sectionId, status, routeId]);

  // Load Data
  const loadData = () => {
    setLoading(true);
    setError(null);

    const filters: any = {};
    if (sessionId) filters.sessionId = sessionId;
    if (classId) filters.classId = classId;
    if (sectionId) filters.sectionId = sectionId;
    if (status) filters.status = status;
    if (routeId) filters.routeId = routeId;

    fetch('/api/reports/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportType,
        filters,
        page,
        limit,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load report data');
        return res.json();
      })
      .then((json) => {
        setData(json.data || []);
        setSummary(json.summary || {});
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages || 1);
          setTotalRecords(json.pagination.total || 0);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [reportType, sessionId, classId, sectionId, status, routeId, page, limit]);

  // Export CSV
  const handleExportCSV = async () => {
    const filters: any = {};
    if (sessionId) filters.sessionId = sessionId;
    if (classId) filters.classId = classId;
    if (sectionId) filters.sectionId = sectionId;
    if (status) filters.status = status;
    if (routeId) filters.routeId = routeId;

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
    if (sessionId) filters.sessionId = sessionId;
    if (classId) filters.classId = classId;
    if (sectionId) filters.sectionId = sectionId;
    if (status) filters.status = status;
    if (routeId) filters.routeId = routeId;

    // Log print audit
    await fetch('/api/reports/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportType, filters, action: 'PRINT' }),
    });

    window.print();
  };

  // Reset Filters
  const handleReset = () => {
    setSessionId('');
    setClassId('');
    setSectionId('');
    setStatus('');
    setRouteId('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Reports Desk</h1>
          <p className="text-xs text-slate-500">View and reconcile student registers, strength matrices, and DOB analytics.</p>
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

      {/* KPI Cards (System stats matching summary from API) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
        <div className="p-4 bg-slate-100 border border-slate-200 rounded">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Active</span>
          <p className="text-xl font-black text-slate-950 mt-1">{summary.totalStudents ?? '-'}</p>
        </div>
        <div className="p-4 bg-slate-100 border border-slate-200 rounded">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Status: ACTIVE</span>
          <p className="text-xl font-black text-slate-950 mt-1">{summary.active ?? '-'}</p>
        </div>
        <div className="p-4 bg-slate-100 border border-slate-200 rounded">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Status: DELETED</span>
          <p className="text-xl font-black text-slate-950 mt-1">{summary.deleted ?? '-'}</p>
        </div>
        <div className="p-4 bg-slate-100 border border-slate-200 rounded">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Transport Users</span>
          <p className="text-xl font-black text-slate-950 mt-1">{summary.transportUsers ?? '-'}</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1 print:hidden">
        {[
          { id: 'STUDENT_REGISTER', label: 'Student Register' },
          { id: 'CLASS_STRENGTH', label: 'Class Strength' },
          { id: 'GENDER_DISTRIBUTION', label: 'Gender Distribution' },
          { id: 'TRANSPORT_USERS', label: 'Transport Users' },
          { id: 'ADMISSIONS_MONTH', label: 'Admissions By Month' },
          { id: 'DOB_ANALYTICS', label: 'DOB Analytics' },
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
        <div className="flex flex-col">
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Session</label>
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none"
          >
            <option value="">All Sessions</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {reportType !== 'TRANSPORT_USERS' && (
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

        {reportType === 'STUDENT_REGISTER' && (
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none"
            >
              <option value="">All (Except Deleted)</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="TRANSFERRED">TRANSFERRED</option>
              <option value="DROPPED">DROPPED</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="ALUMNI">ALUMNI</option>
              <option value="DELETED">DELETED</option>
            </select>
          </div>
        )}

        {reportType === 'TRANSPORT_USERS' && (
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Route</label>
            <select
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none"
            >
              <option value="">All Routes</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
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
                {reportType === 'STUDENT_REGISTER' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Admission No</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Name</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Class</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Section</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Parent Mobile</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Date of Birth</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Admission Date</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Status</th>
                  </tr>
                )}
                {reportType === 'CLASS_STRENGTH' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Class Name</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Sections Strength</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Total Strength</th>
                  </tr>
                )}
                {reportType === 'GENDER_DISTRIBUTION' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Gender</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Count</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Percentage</th>
                  </tr>
                )}
                {reportType === 'TRANSPORT_USERS' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Admission No</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Student Name</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Class</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Section</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Route</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Stop</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Monthly Fare</th>
                  </tr>
                )}
                {reportType === 'ADMISSIONS_MONTH' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Month</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Admissions Count</th>
                  </tr>
                )}
                {reportType === 'DOB_ANALYTICS' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Age Bracket</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Count</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {reportType === 'STUDENT_REGISTER' &&
                  data.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-mono font-medium text-xs text-slate-600">{row.admissionNumber}</td>
                      <td className="px-4 py-2 font-semibold text-slate-900">{row.name}</td>
                      <td className="px-4 py-2">{row.className}</td>
                      <td className="px-4 py-2">{row.sectionName}</td>
                      <td className="px-4 py-2">{row.parentMobile}</td>
                      <td className="px-4 py-2">{new Date(row.dob).toLocaleDateString()}</td>
                      <td className="px-4 py-2">{new Date(row.admissionDate).toLocaleDateString()}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-50 text-slate-600 border border-slate-200'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                {reportType === 'CLASS_STRENGTH' &&
                  data.map((row: any) => (
                    <tr key={row.classId} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-bold text-slate-900">{row.className}</td>
                      <td className="px-4 py-2 text-xs text-slate-600">
                        {row.sections.map((s: any) => `${s.section}: ${s.count}`).join(' | ')}
                      </td>
                      <td className="px-4 py-2 font-bold">{row.total}</td>
                    </tr>
                  ))}
                {reportType === 'GENDER_DISTRIBUTION' &&
                  data.map((row: any) => (
                    <tr key={row.gender} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-semibold text-slate-900">{row.gender}</td>
                      <td className="px-4 py-2">{row.count}</td>
                      <td className="px-4 py-2">{row.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                {reportType === 'TRANSPORT_USERS' &&
                  data.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-mono text-xs">{row.admissionNumber}</td>
                      <td className="px-4 py-2 font-semibold text-slate-900">{row.studentName}</td>
                      <td className="px-4 py-2">{row.className}</td>
                      <td className="px-4 py-2">{row.sectionName}</td>
                      <td className="px-4 py-2">{row.routeName}</td>
                      <td className="px-4 py-2">{row.stopName}</td>
                      <td className="px-4 py-2 font-semibold">₹{row.monthlyFare.toFixed(2)}</td>
                    </tr>
                  ))}
                {reportType === 'ADMISSIONS_MONTH' &&
                  data.map((row: any) => (
                    <tr key={row.month} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-bold text-slate-900">{row.month}</td>
                      <td className="px-4 py-2">{row.count}</td>
                    </tr>
                  ))}
                {reportType === 'DOB_ANALYTICS' &&
                  data.map((row: any) => (
                    <tr key={row.group} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-semibold text-slate-900">{row.group}</td>
                      <td className="px-4 py-2">{row.count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && !error && data.length > 0 && ['STUDENT_REGISTER', 'TRANSPORT_USERS'].includes(reportType) && (
        <div className="flex justify-between items-center text-xs print:hidden">
          <span className="text-slate-500">
            Showing Page <strong className="text-slate-900">{page}</strong> of <strong className="text-slate-900">{totalPages}</strong> ({totalRecords} records)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-slate-300 rounded font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-slate-300 rounded font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
