'use client';

import React, { useEffect, useState } from 'react';
import { Printer, Download, Eye, RotateCcw } from 'lucide-react';

interface HrReportClientProps {
  staffList: { id: string; name: string; code: string }[];
}

export default function HrReportClient({ staffList }: HrReportClientProps) {
  const [reportType, setReportType] = useState('STAFF_REGISTER');

  // Filters
  const [designation, setDesignation] = useState('');
  const [staffId, setStaffId] = useState('');
  const [status, setStatus] = useState('');

  // Table Data & Meta
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset page when report type or filters change
  useEffect(() => {
    setPage(1);
  }, [reportType, designation, staffId, status]);

  // Load Report Data
  const loadData = () => {
    setLoading(true);
    setError(null);

    const filters: any = {};
    if (designation) filters.designation = designation;
    if (staffId) filters.staffId = staffId;
    if (status) filters.status = status;

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
  }, [reportType, designation, staffId, status, page, limit]);

  // Export CSV
  const handleExportCSV = async () => {
    const filters: any = {};
    if (designation) filters.designation = designation;
    if (staffId) filters.staffId = staffId;
    if (status) filters.status = status;

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
    if (designation) filters.designation = designation;
    if (staffId) filters.staffId = staffId;
    if (status) filters.status = status;

    // Log print audit
    await fetch('/api/reports/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportType, filters, action: 'PRINT' }),
    });

    window.print();
  };

  const handleReset = () => {
    setDesignation('');
    setStaffId('');
    setStatus('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900">HR & Payroll Reports Desk</h1>
          <p className="text-xs text-slate-500">Track employee registers, Designation breakdowns, and salary adjustment trails.</p>
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
      {reportType === 'STAFF_REGISTER' && summary.count !== undefined && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
          <div className="p-4 bg-slate-100 border border-slate-200 rounded">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono font-bold">Staff Count</span>
            <p className="text-xl font-black text-slate-950 mt-1">{summary.count}</p>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1 print:hidden">
        {[
          { id: 'STAFF_REGISTER', label: 'Staff Register' },
          { id: 'SALARY_HISTORY', label: 'Salary History' },
          { id: 'ADJUSTMENT_HISTORY', label: 'Adjustment History' },
          { id: 'MONTHLY_SALARY_SUMMARY', label: 'Monthly Salary Summary' },
          { id: 'DESIGNATION_SUMMARY', label: 'Designation Summary' },
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
        {reportType === 'STAFF_REGISTER' && (
          <>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Designation</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Teacher"
                className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none"
              >
                <option value="">All (Except Deleted)</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="DELETED">DELETED</option>
              </select>
            </div>
          </>
        )}

        {['SALARY_HISTORY', 'ADJUSTMENT_HISTORY'].includes(reportType) && (
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Staff Member</label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none"
            >
              <option value="">All Staff</option>
              {staffList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
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
                {reportType === 'STAFF_REGISTER' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Employee Code</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Name</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Designation</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Monthly Salary</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Mobile</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Joining Date</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Status</th>
                  </tr>
                )}
                {reportType === 'SALARY_HISTORY' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Receipt No</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Employee Code</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Staff Name</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Period</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Gross Salary</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Adjustments</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Effective Paid</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Date</th>
                  </tr>
                )}
                {reportType === 'ADJUSTMENT_HISTORY' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Salary Receipt No</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Employee Code</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Staff Name</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Amount</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Reason</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Created By</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Date</th>
                  </tr>
                )}
                {reportType === 'MONTHLY_SALARY_SUMMARY' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Month</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Gross Sum</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Adjustment Sum</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Effective Paid Sum</th>
                  </tr>
                )}
                {reportType === 'DESIGNATION_SUMMARY' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Designation</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Active Count</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Monthly Budget</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {reportType === 'STAFF_REGISTER' &&
                  data.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-mono font-semibold text-xs text-slate-600">{row.employeeCode}</td>
                      <td className="px-4 py-2 font-semibold text-slate-900">{row.name}</td>
                      <td className="px-4 py-2">{row.designation}</td>
                      <td className="px-4 py-2 font-bold">₹{row.monthlySalary.toFixed(2)}</td>
                      <td className="px-4 py-2">{row.mobile}</td>
                      <td className="px-4 py-2 text-xs text-slate-500">{new Date(row.joiningDate).toLocaleDateString()}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-slate-50 text-slate-600 border border-slate-200'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                {reportType === 'SALARY_HISTORY' &&
                  data.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-mono text-xs text-slate-500">{row.receiptNumber}</td>
                      <td className="px-4 py-2 font-mono text-xs">{row.employeeCode}</td>
                      <td className="px-4 py-2 font-semibold text-slate-900">{row.staffName}</td>
                      <td className="px-4 py-2">{row.month} / {row.year}</td>
                      <td className="px-4 py-2">₹{row.grossSalary.toFixed(2)}</td>
                      <td className="px-4 py-2">₹{row.adjustmentTotal.toFixed(2)}</td>
                      <td className="px-4 py-2 font-bold text-indigo-700">₹{row.effectivePaid.toFixed(2)}</td>
                      <td className="px-4 py-2 text-xs text-slate-400">{new Date(row.paidDate).toLocaleDateString()}</td>
                    </tr>
                  ))}
                {reportType === 'ADJUSTMENT_HISTORY' &&
                  data.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 bg-red-50/5">
                      <td className="px-4 py-2 font-mono text-xs text-slate-500">{row.receiptNumber}</td>
                      <td className="px-4 py-2 font-mono text-xs">{row.employeeCode}</td>
                      <td className="px-4 py-2 font-semibold text-slate-900">{row.staffName}</td>
                      <td className="px-4 py-2 font-bold text-red-600">₹{row.amount.toFixed(2)}</td>
                      <td className="px-4 py-2 text-xs text-slate-600">{row.reason}</td>
                      <td className="px-4 py-2">{row.createdBy}</td>
                      <td className="px-4 py-2 text-xs text-slate-400">{new Date(row.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                {reportType === 'MONTHLY_SALARY_SUMMARY' &&
                  data.map((row: any) => (
                    <tr key={row.month} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-bold text-slate-900">{row.month}</td>
                      <td className="px-4 py-2">₹{row.grossSalary.toFixed(2)}</td>
                      <td className="px-4 py-2">₹{row.adjustmentTotal.toFixed(2)}</td>
                      <td className="px-4 py-2 font-bold text-indigo-700">₹{row.effectivePaid.toFixed(2)}</td>
                    </tr>
                  ))}
                {reportType === 'DESIGNATION_SUMMARY' &&
                  data.map((row: any) => (
                    <tr key={row.designation} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-semibold text-slate-900">{row.designation}</td>
                      <td className="px-4 py-2 font-bold">{row.count}</td>
                      <td className="px-4 py-2 font-bold text-indigo-700">₹{row.totalMonthlySalaryBudget.toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && !error && data.length > 0 && ['STAFF_REGISTER', 'SALARY_HISTORY', 'ADJUSTMENT_HISTORY'].includes(reportType) && (
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
