'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, ShieldAlert, CheckCircle, Info, Calendar, User, Eye, Check } from 'lucide-react';

interface ErrorLog {
  id: string;
  level: string;
  module: string;
  route: string | null;
  message: string;
  stackTrace: string | null;
  requestId: string | null;
  userId: string | null;
  resolved: boolean;
  createdAt: string;
}

interface ErrorKPIs {
  todayCount: number;
  criticalCount: number;
  openCount: number;
  resolvedCount: number;
}

export default function SystemErrorsPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [kpis, setKpis] = useState<ErrorKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);

  const fetchErrors = async () => {
    try {
      const res = await fetch('/api/system/errors');
      if (!res.ok) throw new Error('Failed to fetch error logs.');
      const data = await res.json();
      setLogs(data.list);
      setKpis(data.kpis);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, []);

  const handleResolveToggle = async (id: string, currentlyResolved: boolean) => {
    setUpdatingId(id);
    try {
      const res = await fetch('/api/system/errors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, resolved: !currentlyResolved })
      });

      if (!res.ok) throw new Error('Failed to update resolution status.');
      await fetchErrors();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

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
        <h1 className="text-xl font-bold text-slate-800">Error Logs Console</h1>
        <p className="text-xs text-slate-500">Track and resolve runtime stack traces, Prisma connection failures, and API errors.</p>
      </div>

      {/* KPI Headers */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Today's Errors</span>
            <p className={`text-lg font-bold mt-1 ${kpis.todayCount > 0 ? 'text-red-650' : 'text-slate-800'}`}>{kpis.todayCount}</p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Critical Errors</span>
            <p className={`text-lg font-bold mt-1 ${kpis.criticalCount > 0 ? 'text-red-750 font-extrabold' : 'text-slate-800'}`}>{kpis.criticalCount}</p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Open (Unresolved)</span>
            <p className="text-lg font-bold text-slate-800 mt-1">{kpis.openCount}</p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Resolved</span>
            <p className="text-lg font-bold text-green-700 mt-1">{kpis.resolvedCount}</p>
          </div>
        </div>
      )}

      {/* Error Logs List Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="p-3.5">Timestamp</th>
              <th className="p-3.5">Severity</th>
              <th className="p-3.5">Module</th>
              <th className="p-3.5">Error Message</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  No system error logs found. System health is clean!
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className={log.resolved ? 'opacity-60 bg-slate-50/30' : ''}>
                  <td className="p-3.5 text-slate-450 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                      log.level === 'CRITICAL' ? 'bg-red-950 text-red-400 border border-red-800' :
                      log.level === 'ERROR' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {log.level}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-700 uppercase tracking-wide">{log.module}</td>
                  <td className="p-3.5 text-slate-800 font-semibold truncate max-w-xs">{log.message}</td>
                  <td className="p-3.5 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="p-1.5 rounded bg-slate-50 border border-slate-150 hover:bg-slate-100 text-slate-600"
                      title="View Details"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleResolveToggle(log.id, log.resolved)}
                      disabled={updatingId === log.id}
                      className={`p-1.5 rounded border transition-colors ${
                        log.resolved 
                          ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
                          : 'bg-slate-50 border-slate-200 text-slate-450 hover:bg-slate-100'
                      }`}
                      title={log.resolved ? 'Mark Unresolved' : 'Mark Resolved'}
                    >
                      {updatingId === log.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Error Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4.5 w-4.5 text-red-600" />
                <h4 className="text-xs font-bold text-slate-700">Error Details & Stack Trace</h4>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-xs font-bold text-slate-450 hover:text-slate-750"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Error Message</span>
                <p className="font-bold text-slate-900 mt-1">{selectedLog.message}</p>
              </div>

              {selectedLog.route && (
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Route</span>
                  <p className="font-semibold text-slate-750 mt-1">{selectedLog.route}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedLog.requestId && (
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Request ID</span>
                    <p className="font-semibold text-slate-650 mt-0.5 truncate">{selectedLog.requestId}</p>
                  </div>
                )}
                {selectedLog.userId && (
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">User ID</span>
                    <p className="font-semibold text-slate-650 mt-0.5 truncate">{selectedLog.userId}</p>
                  </div>
                )}
              </div>

              {selectedLog.stackTrace && (
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Stack Trace</span>
                  <pre className="p-3 bg-slate-900 text-slate-350 rounded-lg overflow-x-auto text-[10px] leading-relaxed mt-1 whitespace-pre max-h-[300px]">
                    {selectedLog.stackTrace}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
