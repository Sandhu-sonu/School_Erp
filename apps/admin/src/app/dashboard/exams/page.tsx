'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ClipboardList, Plus, AlertCircle, Check, Calendar, ArrowRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface SessionItem {
  id: string;
  name: string;
  isActive: boolean;
}

interface Exam {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  published: boolean;
  sessionId: string;
}

export default function ExamsControlPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isPrincipal = userRole === 'PRINCIPAL';
  const isReadOnly = userRole === 'CLERK' || userRole === 'TEACHER';

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [name, setName] = useState('Unit Test 1');
  const [customName, setCustomName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadSessionsAndExams = async () => {
    setIsLoading(true);
    try {
      const sessRes = await fetch('/api/finance/sessions');
      if (sessRes.ok) {
        const sessData = await sessRes.json();
        setSessions(sessData);
        const active = sessData.find((s: any) => s.isActive);
        if (active) setSelectedSession(active.id);
        else if (sessData.length > 0) setSelectedSession(sessData[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExams = async () => {
    if (!selectedSession) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/exams?sessionId=${selectedSession}`);
      if (res.ok) {
        const data = await res.json();
        setExams(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessionsAndExams();
  }, []);

  useEffect(() => {
    loadExams();
  }, [selectedSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name === 'Other' ? customName.trim() : name;
    if (!finalName || !selectedSession || !startDate || !endDate) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSession,
          name: finalName,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        }),
      });

      if (res.ok) {
        setSuccessMsg('Examination registered successfully!');
        setCustomName('');
        await loadExams();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to create exam.');
      }
    } catch (err) {
      setErrorMsg('Network error while saving exam details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userRole === 'ACCOUNTANT') {
    return (
      <div className="erp-card p-8 text-center space-y-4 max-w-lg mx-auto mt-12 border-red-200 bg-red-50">
        <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Access Denied</h2>
        <p className="text-xs text-slate-600">Accountants do not have access to examination records.</p>
        <Link href="/dashboard" className="erp-btn-secondary inline-block">Go to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Examination Control Desk</h1>
        <p className="text-xs text-slate-500">Manage school term tests, register examination dates, and input student marks.</p>
      </div>

      {/* Session Filter */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Academic Session:</label>
        <select
          className="erp-input w-48 text-xs py-1"
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.name} {s.isActive ? '(Active)' : ''}</option>
          ))}
        </select>
        <button
          onClick={loadExams}
          className="p-1.5 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 flex items-center gap-1 text-xs ml-auto"
          disabled={isLoading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: List of Exams */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Registered Exams</h3>
          
          {isLoading ? (
            <div className="erp-card p-10 text-center text-xs text-slate-400">Loading exams list...</div>
          ) : exams.length === 0 ? (
            <div className="erp-card p-10 text-center text-xs text-slate-400 border border-dashed rounded">
              No examination logs registered for this session.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exams.map((exam) => (
                <div key={exam.id} className="erp-card p-4 space-y-3 hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-900">{exam.name}</h4>
                    <span className={`erp-badge ${exam.published ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {exam.published ? 'Published' : 'Draft / Grading'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 space-y-1 font-mono">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Starts: {new Date(exam.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Ends: {new Date(exam.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">ID: {exam.id.slice(0, 8)}...</span>
                    <Link
                      href={`/dashboard/exams/${exam.id}`}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <span>Marks Entry</span>
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Create Exam Form (Principal Only) */}
        <div className="erp-card space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-slate-400" />
            Create Exam definition
          </h3>

          {!isPrincipal ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Only Principal accounts can define exams. Your account is restricted.</span>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-green-50 border border-green-200 rounded text-xs text-green-700 flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Exam Name</label>
                  <select
                    className="erp-input text-xs font-semibold"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  >
                    <option value="Unit Test 1">Unit Test 1</option>
                    <option value="Unit Test 2">Unit Test 2</option>
                    <option value="Half Yearly">Half Yearly</option>
                    <option value="Final Examination">Final Examination</option>
                    <option value="Other">Other (Custom Name)</option>
                  </select>
                </div>

                {name === 'Other' && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Custom Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      className="erp-input text-xs font-semibold"
                      placeholder="e.g. Monthly Class Test"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Start Date</label>
                    <input
                      type="date"
                      className="erp-input text-xs font-semibold font-mono"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">End Date</label>
                    <input
                      type="date"
                      className="erp-input text-xs font-semibold font-mono"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="erp-btn-primary w-full py-2 text-xs"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Registering...' : 'Register Exam'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
