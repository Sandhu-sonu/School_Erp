'use client';

import React, { useEffect, useState } from 'react';
import { Printer, Download, Eye, RotateCcw } from 'lucide-react';

export default function TransportReportClient() {
  const [reportType, setReportType] = useState('ROUTE_UTILIZATION');

  // Table Data & Meta
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset page when report type changes
  useEffect(() => {
    setPage(1);
  }, [reportType]);

  // Load Report Data
  const loadData = () => {
    setLoading(true);
    setError(null);

    fetch('/api/reports/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportType,
        filters: {},
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
  }, [reportType, page, limit]);

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, filters: {} }),
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
    // Log print audit
    await fetch('/api/reports/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportType, filters: {}, action: 'PRINT' }),
    });

    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Transport Operational Reports Desk</h1>
          <p className="text-xs text-slate-500">View route utilisation statistics, Stop-wise revenues, and transport adjustments history.</p>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
        {reportType === 'ROUTE_UTILIZATION' && summary.totalActiveAssignments !== undefined && (
          <div className="p-4 bg-slate-100 border border-slate-200 rounded">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Active Assigned Users</span>
            <p className="text-xl font-black text-slate-950 mt-1">{summary.totalActiveAssignments}</p>
          </div>
        )}
        {reportType === 'STOP_REVENUE' && summary.totalRevenue !== undefined && (
          <div className="p-4 bg-slate-100 border border-slate-200 rounded">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Net Stops Revenue</span>
            <p className="text-xl font-black text-slate-950 mt-1">₹{summary.totalRevenue.toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1 print:hidden">
        {[
          { id: 'ROUTE_UTILIZATION', label: 'Route Utilization' },
          { id: 'STOP_REVENUE', label: 'Stop Revenue' },
          { id: 'TRANSPORT_USERS', label: 'Active Transport Students' },
          { id: 'TRANSPORT_ADJUSTMENTS', label: 'Adjustment History' },
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
                {reportType === 'ROUTE_UTILIZATION' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Route Name</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Vehicle Number</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Driver Name</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Active Assigned Count</th>
                  </tr>
                )}
                {reportType === 'STOP_REVENUE' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Stop Name</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Route Name</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Debits (+)</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Credits (-)</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Net Revenue (=)</th>
                  </tr>
                )}
                {reportType === 'TRANSPORT_USERS' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Adm No</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Student Name</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Class (Section)</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Route</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Stop</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Monthly Fare</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Active From</th>
                  </tr>
                )}
                {reportType === 'TRANSPORT_ADJUSTMENTS' && (
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Student</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Adm No</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Type</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Amount</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Description</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Logged Date</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {reportType === 'ROUTE_UTILIZATION' &&
                  data.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-bold text-slate-900">{row.routeName}</td>
                      <td className="px-4 py-2 font-mono text-xs">{row.vehicleNumber}</td>
                      <td className="px-4 py-2">{row.driverName}</td>
                      <td className="px-4 py-2 font-bold">{row.capacityCount}</td>
                    </tr>
                  ))}
                {reportType === 'STOP_REVENUE' &&
                  data.map((row: any) => (
                    <tr key={row.stopId} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-semibold text-slate-900">{row.stopName}</td>
                      <td className="px-4 py-2 text-slate-600">{row.routeName}</td>
                      <td className="px-4 py-2 text-red-600">₹{row.debitTotal.toFixed(2)}</td>
                      <td className="px-4 py-2 text-green-700">₹{row.creditTotal.toFixed(2)}</td>
                      <td className="px-4 py-2 font-bold text-slate-900">₹{row.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                {reportType === 'TRANSPORT_USERS' &&
                  data.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-mono text-xs text-slate-500">{row.admissionNumber}</td>
                      <td className="px-4 py-2 font-semibold text-slate-900">{row.studentName}</td>
                      <td className="px-4 py-2">{row.className} ({row.sectionName})</td>
                      <td className="px-4 py-2">{row.routeName}</td>
                      <td className="px-4 py-2">{row.stopName}</td>
                      <td className="px-4 py-2 font-bold">₹{row.monthlyFare.toFixed(2)}</td>
                      <td className="px-4 py-2 text-xs text-slate-400">{new Date(row.activeFrom).toLocaleDateString()}</td>
                    </tr>
                  ))}
                {reportType === 'TRANSPORT_ADJUSTMENTS' &&
                  data.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-semibold text-slate-900">{row.studentName}</td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-500">{row.admissionNumber}</td>
                      <td className="px-4 py-2 font-bold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          row.type === 'DEBIT' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'
                        }`}>
                          {row.type}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-bold">₹{row.amount.toFixed(2)}</td>
                      <td className="px-4 py-2 text-xs text-slate-600">{row.description}</td>
                      <td className="px-4 py-2 text-xs text-slate-400">{new Date(row.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && !error && data.length > 0 && ['TRANSPORT_USERS', 'TRANSPORT_ADJUSTMENTS'].includes(reportType) && (
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
