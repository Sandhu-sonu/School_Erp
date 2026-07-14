'use client';

import React, { useEffect, useState } from 'react';
import { Printer, Download, Eye, RotateCcw } from 'lucide-react';

interface ResultsReportClientProps {
  exams: { id: string; name: string }[];
  classes: { id: string; name: string }[];
}

export default function ResultsReportClient({ exams, classes }: ResultsReportClientProps) {
  const [reportType, setReportType] = useState('EXAM_RESULTS');

  // Filters
  const [examId, setExamId] = useState(exams[0]?.id || '');
  const [classId, setClassId] = useState('');

  // Table Data & Meta
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subject details modal/overlay
  const [selectedSnapshot, setSelectedSnapshot] = useState<any[] | null>(null);

  // Reset page when report type or filters change
  useEffect(() => {
    //
  }, [reportType, examId, classId]);

  // Load Report Data
  const loadData = () => {
    if (!examId) {
      setData([]);
      setSummary({});
      return;
    }
    setLoading(true);
    setError(null);

    const filters: any = { examId };
    if (classId) filters.classId = classId;

    fetch('/api/reports/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportType,
        filters,
        page: 1,
        limit: 1000,
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
  }, [reportType, examId, classId]);

  // Export CSV
  const handleExportCSV = async () => {
    if (!examId) return;
    const filters: any = { examId };
    if (classId) filters.classId = classId;

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
    if (!examId) return;
    const filters: any = { examId };
    if (classId) filters.classId = classId;

    // Log print audit
    await fetch('/api/reports/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportType, filters, action: 'PRINT' }),
    });

    window.print();
  };

  const handleReset = () => {
    setExamId(exams[0]?.id || '');
    setClassId('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Academic & Results Snapshot Desk</h1>
          <p className="text-xs text-slate-500">Read-only published results history. Reconcile pass metrics and ranking reports.</p>
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

      {/* KPI Display */}
      {reportType === 'EXAM_RESULTS' && summary.count !== undefined && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
          <div className="p-4 bg-slate-100 border border-slate-200 rounded">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Students Evaluated</span>
            <p className="text-xl font-black text-slate-950 mt-1">{summary.count}</p>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1 print:hidden">
        {[
          { id: 'EXAM_RESULTS', label: 'Exam Results' },
          { id: 'CLASS_TOPPERS', label: 'Class Toppers' },
          { id: 'PASS_PERCENTAGE', label: 'Pass / Fail %' },
          { id: 'GRADE_DISTRIBUTION', label: 'Grade Distribution' },
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
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Exam</label>
          <select
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none"
          >
            <option value="">Select Exam</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Class</label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none"
          >
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

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
        ) : !examId ? (
          <div className="p-8 text-center text-xs text-slate-400">Please select an exam to load data.</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No records found matching current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                {reportType === 'EXAM_RESULTS' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Rank</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Student Name</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Adm No</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Class</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Section</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Total Marks</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Percentage</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Grade</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase print:hidden">Snapshot Info</th>
                  </tr>
                )}
                {reportType === 'CLASS_TOPPERS' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Rank</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Student Name</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Adm No</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Class</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Percentage</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Grade</th>
                  </tr>
                )}
                {reportType === 'PASS_PERCENTAGE' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Result Category</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Count</th>
                  </tr>
                )}
                {reportType === 'GRADE_DISTRIBUTION' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Final Grade</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Students Count</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {reportType === 'EXAM_RESULTS' &&
                  data.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-bold text-slate-900">{row.rank}</td>
                      <td className="px-4 py-2 font-semibold text-slate-900">{row.studentName}</td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-500">{row.admissionNumber}</td>
                      <td className="px-4 py-2">{row.className}</td>
                      <td className="px-4 py-2">{row.sectionName}</td>
                      <td className="px-4 py-2">{row.totalObtained}</td>
                      <td className="px-4 py-2 font-semibold">{row.percentage.toFixed(1)}%</td>
                      <td className="px-4 py-2 font-bold">{row.grade}</td>
                      <td className="px-4 py-2 print:hidden">
                        <button
                          onClick={() => setSelectedSnapshot(row.subjects)}
                          className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline"
                        >
                          <Eye className="h-3 w-3" /> View Cards
                        </button>
                      </td>
                    </tr>
                  ))}
                {reportType === 'CLASS_TOPPERS' &&
                  data.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 bg-yellow-50/10">
                      <td className="px-4 py-2 font-black text-amber-700">🏆 {row.rank}</td>
                      <td className="px-4 py-2 font-semibold text-slate-900">{row.studentName}</td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-500">{row.admissionNumber}</td>
                      <td className="px-4 py-2">{row.className} ({row.sectionName})</td>
                      <td className="px-4 py-2 font-bold text-indigo-700">{row.percentage.toFixed(1)}%</td>
                      <td className="px-4 py-2 font-bold">{row.grade}</td>
                    </tr>
                  ))}
                {reportType === 'PASS_PERCENTAGE' &&
                  data.map((row: any) => (
                    <tr key={row.name} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-bold text-slate-900">{row.name}</td>
                      <td className="px-4 py-2 font-semibold text-slate-700">{row.count}</td>
                    </tr>
                  ))}
                {reportType === 'GRADE_DISTRIBUTION' &&
                  data.map((row: any) => (
                    <tr key={row.grade} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-bold text-slate-900">{row.grade}</td>
                      <td className="px-4 py-2 font-semibold text-slate-700">{row.count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Snapshot overlay modal */}
      {selectedSnapshot && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-900 text-sm">Published Exam Snapshot Card</h3>
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                Close
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedSnapshot.map((sub: any, idx: number) => (
                <div key={idx} className="flex justify-between text-xs border-b pb-1">
                  <div>
                    <span className="font-semibold text-slate-800">{sub.name}</span>{' '}
                    <span className="text-[10px] text-slate-400">({sub.code})</span>
                  </div>
                  <div className="tabular-nums">
                    <span className="font-bold text-slate-900">{sub.obtained ?? 'ABS'}</span> / {sub.maxMarks}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 italic">This card was snapshotted at publishing and cannot be modified.</p>
          </div>
        </div>
      )}
    </div>
  );
}
