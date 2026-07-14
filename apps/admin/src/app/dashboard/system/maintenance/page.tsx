'use client';

import React, { useState } from 'react';
import { Loader2, Settings, Wrench, ShieldAlert, CheckCircle2, ClipboardList, Info } from 'lucide-react';

interface MaintenanceReport {
  repairedSequences: string[];
  brokenPhotos: string[];
  receiptIssues: string[];
  cleanedFiles: string[];
  reindexedTables: string[];
  vacuumed: boolean;
}

export default function SystemMaintenancePage() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<MaintenanceReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleMaintenance = async () => {
    setLoading(true);
    setReport(null);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/system/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Maintenance task failed.');

      setReport(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">System Maintenance Desk</h1>
        <p className="text-xs text-slate-500">Run table index rebuilds, sync sequence IDs, verify active student photos references, and run vacuum commands.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm h-fit space-y-4">
          <h3 className="text-xs font-bold text-slate-700 pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <Wrench className="h-4.5 w-4.5 text-blue-600" />
            Maintenance Tasks
          </h3>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Running system tasks will trigger structural checks. The database will be briefly locked during reindexing. Do not run during peak school admission hours.
          </p>
          <button
            onClick={handleMaintenance}
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs shadow-md transition-colors"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Settings className="h-4 w-4" />
            )}
            Run System Maintenance
          </button>
        </div>

        {/* Reports Panel */}
        <div className="lg:col-span-2 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-650" />
              <span>{errorMsg}</span>
            </div>
          )}

          {report ? (
            <div className="space-y-4">
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <ClipboardList className="h-4.5 w-4.5 text-blue-600" />
                  Maintenance Executions Results
                </h3>

                <div className="divide-y divide-slate-100 space-y-3 text-xs">
                  {/* Vacuum */}
                  <div className="flex justify-between items-center py-1.5 font-semibold">
                    <span className="text-slate-500">Database Vacuum & Table Stats</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      report.vacuumed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {report.vacuumed ? 'SUCCESS' : 'SKIPPED/AUTO'}
                    </span>
                  </div>

                  {/* Reindexed tables */}
                  <div className="py-2.5 space-y-1">
                    <span className="text-slate-500 block font-bold">Reindex Logs</span>
                    {report.reindexedTables.map((t, idx) => (
                      <p key={idx} className="text-slate-655 font-semibold pl-2">{t}</p>
                    ))}
                  </div>

                  {/* Repaired Sequences */}
                  <div className="py-2.5 space-y-1">
                    <span className="text-slate-500 block font-bold">Sequence Counters Repaired</span>
                    {report.repairedSequences.length === 0 ? (
                      <p className="text-slate-400 italic pl-2">All serial sequences were in sync.</p>
                    ) : (
                      report.repairedSequences.map((s, idx) => (
                        <p key={idx} className="text-slate-655 font-semibold pl-2">{s}</p>
                      ))
                    )}
                  </div>

                  {/* Cleaned Files */}
                  <div className="py-2.5 space-y-1">
                    <span className="text-slate-500 block font-bold">Storage Housekeeping (Temp/Empty Cleanups)</span>
                    {report.cleanedFiles.length === 0 ? (
                      <p className="text-slate-400 italic pl-2">No empty/orphan files found.</p>
                    ) : (
                      report.cleanedFiles.map((f, idx) => (
                        <p key={idx} className="text-slate-655 font-semibold pl-2">{f}</p>
                      ))
                    )}
                  </div>

                  {/* Broken Photos */}
                  <div className="py-2.5 space-y-1">
                    <span className="text-slate-500 block font-bold text-red-750">Broken Photo References</span>
                    {report.brokenPhotos.length === 0 ? (
                      <p className="text-green-700 font-bold pl-2 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        All student photo files verify successfully on server disk!
                      </p>
                    ) : (
                      report.brokenPhotos.map((bp, idx) => (
                        <p key={idx} className="text-red-700 font-semibold pl-2">{bp}</p>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 bg-white">
              No report available. Click "Run System Maintenance" to begin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
