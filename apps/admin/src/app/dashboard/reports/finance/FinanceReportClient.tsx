'use client';

import React, { useEffect, useState } from 'react';
import { Printer, Download, Eye, RotateCcw } from 'lucide-react';

interface FinanceReportClientProps {
  classes: { id: string; name: string }[];
}

export default function FinanceReportClient({ classes }: FinanceReportClientProps) {
  const [reportType, setReportType] = useState('FEE_COLLECTIONS');

  // Filters
  const [classId, setClassId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMode, setPaymentMode] = useState('');

  // Table Data & Meta
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Net Balance stats
  const [netStats, setNetStats] = useState<any>(null);

  // Load Net Stats (for KPI summary cards)
  const loadNetStats = () => {
    fetch('/api/reports/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportType: 'NET_BALANCE' }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.data && json.data.length > 0) {
          setNetStats(json.data[0]);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadNetStats();
  }, [reportType]);

  // Reset page when report type or filters change
  useEffect(() => {
    setPage(1);
  }, [reportType, classId, startDate, endDate, paymentMode]);

  // Load Report Data
  const loadData = () => {
    setLoading(true);
    setError(null);

    const filters: any = {};
    if (classId) filters.classId = classId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (paymentMode) filters.paymentMode = paymentMode;

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
  }, [reportType, classId, startDate, endDate, paymentMode, page, limit]);

  // Export CSV
  const handleExportCSV = async () => {
    const filters: any = {};
    if (classId) filters.classId = classId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (paymentMode) filters.paymentMode = paymentMode;

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
    if (classId) filters.classId = classId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (paymentMode) filters.paymentMode = paymentMode;

    // Log print audit
    await fetch('/api/reports/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportType, filters, action: 'PRINT' }),
    });

    window.print();
  };

  const handleReset = () => {
    setClassId('');
    setStartDate('');
    setEndDate('');
    setPaymentMode('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Finance & Collections Reports Desk</h1>
          <p className="text-xs text-slate-500">Reconcile fee ledgers, outstanding balances, expense summaries, and payroll accounts.</p>
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

      {/* KPI Cards (Reconciled totals from NET_BALANCE) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 print:hidden">
        <div className="p-4 bg-slate-100 border border-slate-200 rounded">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Collections</span>
          <p className="text-xl font-black text-slate-950 mt-1">
            ₹{netStats ? netStats.collections.toLocaleString() : '-'}
          </p>
        </div>
        <div className="p-4 bg-slate-100 border border-slate-200 rounded">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Expenses Logged</span>
          <p className="text-xl font-black text-slate-950 mt-1">
            ₹{netStats ? netStats.expenses.toLocaleString() : '-'}
          </p>
        </div>
        <div className="p-4 bg-slate-100 border border-slate-200 rounded">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Salaries Paid</span>
          <p className="text-xl font-black text-slate-950 mt-1">
            ₹{netStats ? netStats.salaryPaid.toLocaleString() : '-'}
          </p>
        </div>
        <div className="p-4 bg-slate-100 border border-slate-200 rounded">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Net Operational Balance</span>
          <p className={`text-xl font-black mt-1 ${netStats && netStats.netBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
            ₹{netStats ? netStats.netBalance.toLocaleString() : '-'}
          </p>
        </div>
        <div className="p-4 bg-slate-100 border border-slate-200 rounded">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Outstanding Dues</span>
          <p className="text-xl font-black text-slate-950 mt-1">
            ₹{summary.totalOutstanding ? summary.totalOutstanding.toLocaleString() : '-'}
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1 print:hidden">
        {[
          { id: 'FEE_COLLECTIONS', label: 'Fee Collections' },
          { id: 'OUTSTANDING_DUES', label: 'Outstanding Dues' },
          { id: 'DAILY_COLLECTION', label: 'Daily Collection' },
          { id: 'MONTHLY_COLLECTION', label: 'Monthly Collection' },
          { id: 'FEE_STATUS', label: 'Fee Status Summary' },
          { id: 'DISCOUNT_SUMMARY', label: 'Discounts & Waivers' },
          { id: 'TRANSPORT_REVENUE', label: 'Transport Revenue' },
          { id: 'EXPENSE_SUMMARY', label: 'Expense Summary' },
          { id: 'SALARY_SUMMARY', label: 'Salary Summary' },
          { id: 'NET_BALANCE', label: 'Net Balance Ledger' },
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
        {reportType === 'OUTSTANDING_DUES' && (
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
        )}

        {['FEE_COLLECTIONS', 'DAILY_COLLECTION', 'MONTHLY_COLLECTION', 'EXPENSE_SUMMARY'].includes(reportType) && (
          <>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none"
              />
            </div>
          </>
        )}

        {reportType === 'FEE_COLLECTIONS' && (
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none"
            >
              <option value="">All Modes</option>
              <option value="CASH">CASH</option>
              <option value="UPI">UPI</option>
              <option value="BANK">BANK</option>
              <option value="CHEQUE">CHEQUE</option>
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
                {reportType === 'FEE_COLLECTIONS' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Receipt No</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Student Name</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Class</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Collected Amt</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Discount</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Waiver</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Mode</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Date</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Reversed</th>
                  </tr>
                )}
                {reportType === 'OUTSTANDING_DUES' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Adm No</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Student</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Class</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Total Fee</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Paid</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Discount</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Waiver</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Remaining Dues</th>
                  </tr>
                )}
                {['DAILY_COLLECTION', 'MONTHLY_COLLECTION'].includes(reportType) && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Period</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Collected Amount</th>
                  </tr>
                )}
                {reportType === 'FEE_STATUS' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Fee Status</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Students Count</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Total Paid</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Remaining Balance</th>
                  </tr>
                )}
                {reportType === 'DISCOUNT_SUMMARY' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Adjustment Ledger Type</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Total Sum</th>
                  </tr>
                )}
                {reportType === 'TRANSPORT_REVENUE' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Transport Flow Category</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Total Sum</th>
                  </tr>
                )}
                {reportType === 'EXPENSE_SUMMARY' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Title</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Category</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Date</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Paid To</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Mode</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Amount</th>
                  </tr>
                )}
                {reportType === 'SALARY_SUMMARY' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Receipt No</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Month / Year</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Gross Salary</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Adjustment total</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Effective Paid</th>
                  </tr>
                )}
                {reportType === 'NET_BALANCE' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Fee Collections (+)</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Expenses (-)</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Salary Effective Paid (-)</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Net Balance (=)</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {reportType === 'FEE_COLLECTIONS' &&
                  data.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-mono font-medium text-xs text-slate-600">{row.receiptNumber}</td>
                      <td className="px-4 py-2 font-semibold text-slate-900">{row.studentName}</td>
                      <td className="px-4 py-2">{row.className}</td>
                      <td className="px-4 py-2 font-semibold">₹{row.amount.toFixed(2)}</td>
                      <td className="px-4 py-2">₹{row.discountAmount.toFixed(2)}</td>
                      <td className="px-4 py-2">₹{row.waiverAmount.toFixed(2)}</td>
                      <td className="px-4 py-2">{row.paymentMode}</td>
                      <td className="px-4 py-2 text-xs text-slate-500">{new Date(row.transactionDate).toLocaleDateString()}</td>
                      <td className="px-4 py-2">
                        {row.isReversed ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-100">
                            REVERSED
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                {reportType === 'OUTSTANDING_DUES' &&
                  data.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-mono text-xs text-slate-500">{row.admissionNumber}</td>
                      <td className="px-4 py-2 font-semibold text-slate-900">{row.studentName}</td>
                      <td className="px-4 py-2">{row.className}</td>
                      <td className="px-4 py-2">₹{row.totalFee.toFixed(2)}</td>
                      <td className="px-4 py-2">₹{row.paidAmount.toFixed(2)}</td>
                      <td className="px-4 py-2">₹{row.discount.toFixed(2)}</td>
                      <td className="px-4 py-2">₹{row.waiver.toFixed(2)}</td>
                      <td className="px-4 py-2 font-bold text-red-600">₹{row.remainingFee.toFixed(2)}</td>
                    </tr>
                  ))}
                {['DAILY_COLLECTION', 'MONTHLY_COLLECTION'].includes(reportType) &&
                  data.map((row: any) => (
                    <tr key={row.date || row.month} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-semibold text-slate-900">{row.date || row.month}</td>
                      <td className="px-4 py-2 font-bold text-green-700">₹{row.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                {reportType === 'FEE_STATUS' &&
                  data.map((row: any) => (
                    <tr key={row.status} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-bold text-slate-900">{row.status}</td>
                      <td className="px-4 py-2">{row.count}</td>
                      <td className="px-4 py-2 font-semibold text-green-700">₹{row.totalPaid.toFixed(2)}</td>
                      <td className="px-4 py-2 font-semibold text-red-600">₹{row.totalRemaining.toFixed(2)}</td>
                    </tr>
                  ))}
                {reportType === 'DISCOUNT_SUMMARY' &&
                  data.map((row: any) => (
                    <tr key={row.type} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-semibold text-slate-900">{row.type}</td>
                      <td className="px-4 py-2 font-bold">₹{row.total.toFixed(2)}</td>
                    </tr>
                  ))}
                {reportType === 'TRANSPORT_REVENUE' &&
                  data.map((row: any) => (
                    <tr key={row.type} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-semibold text-slate-900">{row.type}</td>
                      <td className="px-4 py-2 font-bold text-indigo-700">₹{row.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                {reportType === 'EXPENSE_SUMMARY' &&
                  data.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-semibold text-slate-900">{row.title}</td>
                      <td className="px-4 py-2">{row.category}</td>
                      <td className="px-4 py-2 text-xs text-slate-500">{new Date(row.expenseDate).toLocaleDateString()}</td>
                      <td className="px-4 py-2">{row.paidTo}</td>
                      <td className="px-4 py-2">{row.paymentMode}</td>
                      <td className="px-4 py-2 font-bold text-red-600">₹{row.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                {reportType === 'SALARY_SUMMARY' &&
                  data.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-mono text-xs">{row.receiptNumber}</td>
                      <td className="px-4 py-2">{row.month} / {row.year}</td>
                      <td className="px-4 py-2">₹{row.grossSalary.toFixed(2)}</td>
                      <td className="px-4 py-2">₹{row.adjustments.toFixed(2)}</td>
                      <td className="px-4 py-2 font-bold text-indigo-700">₹{row.effectivePaid.toFixed(2)}</td>
                    </tr>
                  ))}
                {reportType === 'NET_BALANCE' &&
                  data.map((row: any, idx) => (
                    <tr key={idx} className="font-bold text-slate-900 bg-slate-50/30">
                      <td className="px-4 py-3 text-green-700">₹{row.collections.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-red-600">₹{row.expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-indigo-600">₹{row.salaryPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className={`px-4 py-3 text-lg font-black ${row.netBalance < 0 ? 'text-red-700' : 'text-green-700'}`}>
                        ₹{row.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && !error && data.length > 0 && ['FEE_COLLECTIONS', 'OUTSTANDING_DUES', 'EXPENSE_SUMMARY'].includes(reportType) && (
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
