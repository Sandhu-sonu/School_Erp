'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Database, Download, RefreshCw, CheckCircle, ShieldAlert, Archive, FileDown, Plus } from 'lucide-react';

interface BackupRecord {
  id: string;
  backupName: string;
  backupType: string;
  fileSize: string;
  filePath: string;
  duration: number;
  backupVersion: string;
  databaseVersion: string;
  checksum: string;
  status: string;
  createdBy: string;
  createdAt: string;
}

export default function SystemBackupsPage() {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchBackups = async () => {
    try {
      const res = await fetch('/api/system/backups');
      if (!res.ok) throw new Error('Failed to retrieve backup history.');
      const data = await res.json();
      setBackups(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleBackup = async () => {
    setBackingUp(true);
    setMsg(null);
    try {
      const res = await fetch('/api/system/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'MANUAL' })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger backup.');

      setMsg({ text: `Backup completed successfully! Created: ${data.backupName}`, type: 'success' });
      await fetchBackups();
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = async (id: string, name: string) => {
    if (!confirm(`Are you absolutely sure you want to restore backup "${name}"? This will overwrite the entire database and uploads files!`)) {
      return;
    }

    setRestoringId(id);
    setMsg(null);
    try {
      const res = await fetch('/api/system/backups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to run restore.');

      setMsg({ text: 'Database and uploaded assets restored successfully!', type: 'success' });
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setRestoringId(null);
    }
  };

  const formatSize = (sizeStr: string) => {
    const bytes = Number(sizeStr);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Backup & Restore Panel</h1>
          <p className="text-xs text-slate-500">Generate manual hot-backups of the database and uploaded images, or restore snapshots.</p>
        </div>
        <button
          onClick={handleBackup}
          disabled={backingUp}
          className="flex items-center gap-1.5 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-md transition-colors disabled:opacity-50"
        >
          {backingUp ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Create Snapshot
        </button>
      </div>

      {msg && (
        <div className={`p-3 border rounded-lg text-xs font-semibold flex items-center gap-2.5 ${
          msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {msg.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0 text-green-600" /> : <ShieldAlert className="h-4 w-4 shrink-0 text-red-650" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Backup Lists */}
      <div className="space-y-3">
        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Archive className="h-4.5 w-4.5 text-slate-450" />
          Backup Archives History
        </h2>

        {backups.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 bg-white">
            No backup history found. Click "Create Snapshot" to back up.
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map((b) => (
              <div 
                key={b.id} 
                className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex justify-between items-center hover:border-slate-350 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-800 truncate max-w-xs">{b.backupName}</h4>
                    <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      b.backupType === 'AUTO' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {b.backupType}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-slate-400 font-semibold mt-1">
                    <span>Size: {formatSize(b.fileSize)}</span>
                    <span>•</span>
                    <span>Time: {b.duration}ms</span>
                    <span>•</span>
                    <span>Ver: {b.backupVersion}</span>
                  </div>
                  <span className="block text-[9px] text-slate-500 mt-1 font-semibold">
                    Created By: {b.createdBy} on {new Date(b.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRestore(b.id, b.backupName)}
                    disabled={restoringId !== null}
                    className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                  >
                    {restoringId === b.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
