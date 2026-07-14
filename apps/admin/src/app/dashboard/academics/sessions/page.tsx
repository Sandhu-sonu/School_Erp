'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Check, Archive, Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface SessionItem {
  id: string;
  name: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

export default function AcademicSessionsPage() {
  const { data: sessionData } = useSession();
  const userRole = sessionData?.user?.role;
  const isPrincipal = userRole === 'PRINCIPAL';

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/academics/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to fetch sessions');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isPrincipal) {
      fetchSessions();
    }
  }, [isPrincipal]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/academics/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name, startDate, endDate }),
      });
      if (res.ok) {
        setName('');
        setStartDate('');
        setEndDate('');
        await fetchSessions();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to create session');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async (id: string) => {
    setError(null);
    try {
      const res = await fetch('/api/academics/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', id }),
      });
      if (res.ok) {
        await fetchSessions();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to activate session');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to activate session');
    }
  };

  const handleArchive = async (id: string) => {
    setError(null);
    try {
      const res = await fetch('/api/academics/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive', id }),
      });
      if (res.ok) {
        await fetchSessions();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to archive session');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to archive session');
    }
  };

  if (!isPrincipal && userRole) {
    return (
      <div className="erp-card p-8 text-center space-y-4 max-w-lg mx-auto mt-12 border-red-200 bg-red-50">
        <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Access Denied</h2>
        <p className="text-xs text-slate-600">Only the Principal can access the Academic Sessions console.</p>
        <Link href="/dashboard" className="erp-btn-secondary inline-block">Go to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Academic Sessions Console</h1>
        <p className="text-xs text-slate-500">Configure academic years, toggle the active session, and archive historic years.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="erp-card h-fit">
          <h2 className="text-xs font-bold uppercase text-slate-700 border-b pb-2 mb-3 flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-blue-600" />
            Create Academic Session
          </h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Session Name</label>
              <input
                type="text"
                className="erp-input"
                placeholder="e.g. 2026-27"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Start Date</label>
              <input
                type="date"
                className="erp-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">End Date</label>
              <input
                type="date"
                className="erp-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="erp-btn-primary w-full text-xs font-semibold gap-1.5 mt-2"
            >
              <span>{isSubmitting ? 'Creating...' : 'Create Session'}</span>
            </button>
          </form>
        </div>

        <div className="erp-card lg:col-span-2">
          <h2 className="text-xs font-bold uppercase text-slate-700 border-b pb-2 mb-3 flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-slate-500" />
            Existing Sessions
          </h2>
          <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-slate-50">
                  <th className="erp-table-header">Session Name</th>
                  <th className="erp-table-header">Start Date</th>
                  <th className="erp-table-header">End Date</th>
                  <th className="erp-table-header">Status</th>
                  <th className="erp-table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400 text-xs">Loading sessions...</td>
                  </tr>
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400 text-xs">No sessions created yet.</td>
                  </tr>
                ) : (
                  sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="erp-table-cell font-bold text-slate-800">{s.name}</td>
                      <td className="erp-table-cell font-mono">{new Date(s.startDate).toLocaleDateString()}</td>
                      <td className="erp-table-cell font-mono">{new Date(s.endDate).toLocaleDateString()}</td>
                      <td className="erp-table-cell">
                        {s.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="erp-table-cell text-right space-x-1.5">
                        {!s.isActive ? (
                          <button
                            onClick={() => handleActivate(s.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                          >
                            <Check className="h-3 w-3" />
                            <span>Activate</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchive(s.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors"
                          >
                            <Archive className="h-3 w-3" />
                            <span>Deactivate</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
