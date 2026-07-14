'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, FileText, CheckCircle, HelpCircle, Eye, GitCompare, Calendar, User, Laptop } from 'lucide-react';

interface AuditLog {
  id: string;
  userId: string | null;
  role: string | null;
  action: string;
  entity: string | null;
  beforeJson: any;
  afterJson: any;
  ipAddress: string | null;
  browser: string | null;
  requestId: string | null;
  createdAt: string;
}

export default function SystemAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiff, setSelectedDiff] = useState<{ before: any; after: any; action: string } | null>(null);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const res = await fetch('/api/system/audit');
        if (!res.ok) throw new Error('Failed to retrieve audit logs.');
        const data = await res.json();
        setLogs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAudit();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Client-side Git-style JSON diff calculation
  const getDiffs = (before: any, after: any) => {
    const diffs: Array<{ field: string; oldVal: any; newVal: any }> = [];
    const beforeObj = before || {};
    const afterObj = after || {};
    const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

    for (const key of keys) {
      const valB = beforeObj[key];
      const valA = afterObj[key];

      const strB = typeof valB === 'object' ? JSON.stringify(valB) : valB;
      const strA = typeof valA === 'object' ? JSON.stringify(valA) : valA;

      if (strB !== strA) {
        diffs.push({
          field: key,
          oldVal: valB,
          newVal: valA
        });
      }
    }
    return diffs;
  };

  const renderValue = (val: any) => {
    if (val === null || val === undefined) return <span className="text-slate-400 italic">null</span>;
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">System Audit Logs</h1>
        <p className="text-xs text-slate-500">Trace transactional actions, security modifications, and state mutations across all entities.</p>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="p-3.5">Timestamp</th>
              <th className="p-3.5">Actor & Role</th>
              <th className="p-3.5">Action</th>
              <th className="p-3.5">Entity</th>
              <th className="p-3.5">IP Address</th>
              <th className="p-3.5 text-right">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  No audit log entries recorded.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="p-3.5 text-slate-450 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className="block text-slate-800 font-semibold">{log.userId ? 'Admin' : 'System'}</span>
                    <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{log.role || 'CORE'}</span>
                  </td>
                  <td className="p-3.5 text-slate-850 font-bold uppercase tracking-wide">{log.action}</td>
                  <td className="p-3.5 text-slate-655 truncate max-w-[150px]">{log.entity || 'N/A'}</td>
                  <td className="p-3.5 text-slate-500 font-mono">{log.ipAddress || '127.0.0.1'}</td>
                  <td className="p-3.5 text-right">
                    {(log.beforeJson || log.afterJson) ? (
                      <button
                        onClick={() => setSelectedDiff({ before: log.beforeJson, after: log.afterJson, action: log.action })}
                        className="p-1.5 rounded bg-blue-50 border border-blue-150 hover:bg-blue-100 text-blue-650 inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider"
                      >
                        <GitCompare className="h-3.5 w-3.5" />
                        Compare
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No Snapshots</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* JSON Diff Compare Modal */}
      {selectedDiff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <GitCompare className="h-4.5 w-4.5 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-700">Audit State Difference: {selectedDiff.action}</h4>
              </div>
              <button 
                onClick={() => setSelectedDiff(null)}
                className="text-xs font-bold text-slate-450 hover:text-slate-750"
              >
                Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {getDiffs(selectedDiff.before, selectedDiff.after).length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs font-medium">
                  No state changes found. Snapshots are identical.
                </div>
              ) : (
                <div className="border border-slate-150 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="p-2.5">Field Name</th>
                        <th className="p-2.5 bg-red-50/50 text-red-700">Old Value</th>
                        <th className="p-2.5 bg-green-50/50 text-green-700">New Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {getDiffs(selectedDiff.before, selectedDiff.after).map((diff, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-semibold text-slate-700">{diff.field}</td>
                          <td className="p-2.5 bg-red-50/30 text-red-800 line-through">
                            {renderValue(diff.oldVal)}
                          </td>
                          <td className="p-2.5 bg-green-50/30 text-green-800 font-bold">
                            {renderValue(diff.newVal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
