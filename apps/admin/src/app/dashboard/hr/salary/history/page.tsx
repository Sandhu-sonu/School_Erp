'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CreditCard, Search, Printer, Eye, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface Adjustment {
  id: string;
  amount: number;
  reason: string;
}

interface SalaryHistoryItem {
  id: string;
  staffId: string;
  month: number;
  year: number;
  grossSalary: number;
  adjustment: number;
  paymentMethod: string;
  receiptNumber: string;
  remarks: string | null;
  createdAt: string;
  staff: {
    name: string;
    employeeCode: string;
    designation: string;
  };
  createdBy: {
    name: string;
  };
  adjustments: Adjustment[];
}

export default function SalaryHistoryLogs() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isClerk = userRole === 'CLERK';

  // Filters state
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  
  const [historyList, setHistoryList] = useState<SalaryHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadHistory = async () => {
    if (isClerk) return;
    setIsLoading(true);
    try {
      let url = '/api/hr/salary/history?';
      if (selectedMonth) url += `&month=${selectedMonth}`;
      if (selectedYear) url += `&year=${selectedYear}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [selectedMonth, selectedYear, isClerk]);

  // Clerk Block
  if (isClerk) {
    return (
      <div className="erp-card p-8 text-center space-y-4 max-w-lg mx-auto mt-12 border-red-200 bg-red-50">
        <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Access Denied</h2>
        <p className="text-xs text-slate-600">Clerks are restricted from viewing salary histories.</p>
        <Link href="/dashboard" className="erp-btn-secondary inline-block">Go to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Salary Payment Ledger Logs</h1>
          <p className="text-xs text-slate-500">Search and audit historical salary disbursement vouchers.</p>
        </div>
        <Link href="/dashboard/hr/salary" className="erp-btn-primary flex items-center gap-1">
          <CreditCard className="h-4 w-4" />
          <span>Disburse Salary</span>
        </Link>
      </div>

      {/* Sticky Filters row */}
      <div className="erp-card bg-slate-50 border-slate-200 flex flex-wrap gap-4 items-end">
        <div className="w-full sm:w-48 space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase">Filter Month</label>
          <select
            className="erp-input font-semibold"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1).toLocaleString('en-US', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-48 space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase">Filter Year</label>
          <select
            className="erp-input font-semibold"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="">All Years</option>
            {[2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedMonth('');
            setSelectedYear('');
            setTimeout(() => loadHistory(), 50);
          }}
          className="erp-btn-secondary"
        >
          Reset Filters
        </button>
      </div>

      {/* History Table */}
      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto border border-slate-200 rounded">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-100">
                <th className="erp-table-header">Receipt No</th>
                <th className="erp-table-header">Employee Name</th>
                <th className="erp-table-header">Period</th>
                <th className="erp-table-header text-right">Gross Salary</th>
                <th className="erp-table-header text-right">Adjustments</th>
                <th className="erp-table-header text-right">Effective Paid</th>
                <th className="erp-table-header">Method</th>
                <th className="erp-table-header">Remarks</th>
                <th className="erp-table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">Loading disbursement logs...</td>
                </tr>
              ) : historyList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">No salary disbursement records found.</td>
                </tr>
              ) : (
                historyList.map((item) => {
                  const finalPaid = Number(item.grossSalary) + Number(item.adjustment);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="erp-table-cell font-mono font-semibold">{item.receiptNumber}</td>
                      <td className="erp-table-cell font-medium text-slate-900">
                        <div>
                          <div>{item.staff.name}</div>
                          <span className="text-[9px] text-slate-400 font-mono">({item.staff.employeeCode})</span>
                        </div>
                      </td>
                      <td className="erp-table-cell font-mono">{item.month}/{item.year}</td>
                      <td className="erp-table-cell text-right font-mono">₹{Number(item.grossSalary).toFixed(2)}</td>
                      <td className={`erp-table-cell text-right font-mono ${Number(item.adjustment) < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        {Number(item.adjustment) >= 0 ? '+' : ''}₹{Number(item.adjustment).toFixed(2)}
                      </td>
                      <td className="erp-table-cell text-right font-mono font-bold text-green-700">₹{finalPaid.toFixed(2)}</td>
                      <td className="erp-table-cell font-mono text-[10px]">{item.paymentMethod}</td>
                      <td className="erp-table-cell truncate max-w-xs">{item.remarks || 'None'}</td>
                      <td className="erp-table-cell text-right">
                        <div className="flex justify-end gap-1.5">
                          <Link
                            href={`/dashboard/hr/staff/${item.staffId}`}
                            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                            title="View Employee Ledger"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                            title="Print Voucher"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
