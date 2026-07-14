'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, FileSpreadsheet, Download, Calendar, User, ShieldCheck } from 'lucide-react';

interface ExportRecord {
  id: string;
  module: string;
  exportType: string;
  totalRows: number;
  downloadedAt: string;
  ipAddress: string | null;
  browser: string | null;
  exportedBy: string | null;
  createdAt: string;
}

export default function SystemExportsPage() {
  const [logs, setLogs] = useState<ExportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExports = async () => {
      try {
        const res = await fetch('/api/system/exports');
        if (!res.ok) throw new Error('Failed to retrieve export logs.');
        const data = await res.json();
        setLogs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchExports();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Export History Console</h1>
        <p className="text-xs text-slate-500">View and audit all exported CSV, Excel, and PDF lists downloaded from the ERP admin interface.</p>
      </div>

      {/* Exports Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="p-3.5">Downloaded At</th>
              <th className="p-3.5">Module</th>
              <th className="p-3.5">Export Format</th>
              <th className="p-3.5">Rows Count</th>
              <th className="p-3.5">Author (Admin)</th>
              <th className="p-3.5 text-right">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-450">
                  No export operations logged yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="p-3.5 text-slate-450 whitespace-nowrap">
                    {new Date(log.downloadedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="p-3.5 font-bold uppercase tracking-wide">{log.module}</td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded uppercase ${
                      log.exportType === 'PDF' ? 'bg-red-50 text-red-700' :
                      log.exportType === 'EXCEL' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {log.exportType}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-slate-800">{log.totalRows} Rows</td>
                  <td className="p-3.5 flex items-center gap-1.5 whitespace-nowrap">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>{log.exportedBy || 'Admin'}</span>
                  </td>
                  <td className="p-3.5 text-right text-slate-450 font-mono">{log.ipAddress || '127.0.0.1'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
