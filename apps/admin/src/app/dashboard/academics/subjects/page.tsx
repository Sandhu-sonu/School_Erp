'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { BookOpen, Plus, AlertCircle, RefreshCw, Check } from 'lucide-react';
import Link from 'next/link';

interface Subject {
  id: string;
  name: string;
  code: string;
  classId: string;
  isOptional: boolean;
  weeklyPeriods: number;
  teacherId: string | null;
  consecutivePeriods: number;
  preferredTime: string;
  class: { name: string };
  teacher?: { name: string; employeeCode: string } | null;
}

interface Teacher {
  id: string;
  name: string;
  employeeCode: string;
}

interface ClassItem {
  id: string;
  name: string;
}

export default function SubjectsMatrixPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isClerk = userRole === 'CLERK';
  const isTeacher = userRole === 'TEACHER';
  const isReadOnly = isClerk || isTeacher;

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isOptional, setIsOptional] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [weeklyPeriods, setWeeklyPeriods] = useState<number>(6);
  const [teacherId, setTeacherId] = useState<string>('');
  const [consecutivePeriods, setConsecutivePeriods] = useState<number>(1);
  const [preferredTime, setPreferredTime] = useState<string>('ANY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadClasses = async () => {
    try {
      const res = await fetch('/api/finance/classes');
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
        if (data.length > 0) {
          setSelectedClass(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSubjects = async () => {
    if (!selectedClass) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/academics/subjects?classId=${selectedClass}`);
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeachers = async () => {
    try {
      const res = await fetch('/api/hr/staff');
      if (res.ok) {
        const data = await res.json();
        setTeachers(data.filter((t: any) => t.status === 'ACTIVE'));
      }
    } catch (err) {
      console.error('Failed to load teachers list:', err);
    }
  };

  useEffect(() => {
    loadClasses();
    loadTeachers();
  }, []);

  useEffect(() => {
    loadSubjects();
  }, [selectedClass]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !selectedClass) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/academics/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          code: code.toUpperCase().trim(),
          classId: selectedClass,
          isOptional,
          weeklyPeriods,
          teacherId: teacherId || null,
          consecutivePeriods,
          preferredTime,
        }),
      });

      if (res.ok) {
        setSuccessMsg('Subject registered successfully!');
        setName('');
        setCode('');
        setIsOptional(false);
        setWeeklyPeriods(6);
        setTeacherId('');
        setConsecutivePeriods(1);
        setPreferredTime('ANY');
        await loadSubjects();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to register subject.');
      }
    } catch (err) {
      setErrorMsg('Network error while saving subject details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userRole === 'ACCOUNTANT') {
    return (
      <div className="erp-card p-8 text-center space-y-4 max-w-lg mx-auto mt-12 border-red-200 bg-red-50">
        <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Access Denied</h2>
        <p className="text-xs text-slate-600">Accountants do not have access to academic configuration.</p>
        <Link href="/dashboard" className="erp-btn-secondary inline-block">Go to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Class Subjects Matrix</h1>
        <p className="text-xs text-slate-500">Configure and review subject listings across different classes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Subjects list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Class:</label>
              <select
                className="erp-input w-48 text-xs py-1"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={loadSubjects}
              className="p-1.5 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 flex items-center gap-1 text-xs self-end sm:self-auto"
              disabled={isLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="erp-card overflow-hidden">
            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="erp-table-header">Subject Code</th>
                    <th className="erp-table-header">Subject Name</th>
                    <th className="erp-table-header">Classification</th>
                    <th className="erp-table-header">Weekly Periods</th>
                    <th className="erp-table-header">Teacher</th>
                    <th className="erp-table-header">Consecutive</th>
                    <th className="erp-table-header">Timing Pref</th>
                    <th className="erp-table-header">Class Owner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-xs text-slate-400">Loading subjects list...</td>
                    </tr>
                  ) : subjects.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-xs text-slate-400">No subjects registered for this class.</td>
                    </tr>
                  ) : (
                    subjects.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/50">
                        <td className="erp-table-cell font-mono font-bold text-blue-700">{sub.code}</td>
                        <td className="erp-table-cell font-medium text-slate-900">{sub.name}</td>
                        <td className="erp-table-cell">
                          <span className={`erp-badge ${sub.isOptional ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                            {sub.isOptional ? 'Elective / Optional' : 'Core / Compulsory'}
                          </span>
                        </td>
                        <td className="erp-table-cell font-bold text-slate-800 text-center">{sub.weeklyPeriods}</td>
                        <td className="erp-table-cell font-semibold text-slate-700">
                          {sub.teacher ? `${sub.teacher.name} (${sub.teacher.employeeCode})` : <span className="text-slate-400">Unassigned</span>}
                        </td>
                        <td className="erp-table-cell font-semibold text-slate-600 text-center">
                          {sub.consecutivePeriods === 1 ? 'None' : `${sub.consecutivePeriods} Periods`}
                        </td>
                        <td className="erp-table-cell font-semibold text-slate-600 font-mono text-[10px]">
                          {sub.preferredTime}
                        </td>
                        <td className="erp-table-cell">{sub.class?.name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Register subject form (Principal only) */}
        <div className="erp-card space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-slate-400" />
            Add New Subject
          </h3>

          {isReadOnly ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Only Principal accounts can create subjects. Your account is read-only.</span>
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
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Subject Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="erp-input text-xs font-semibold"
                    placeholder="e.g., Physics, Social Studies"
                    value={name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setName(val);
                      const suggestedCode = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 5);
                      setCode(suggestedCode);
                    }}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Subject Code <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="erp-input text-xs font-mono font-bold uppercase"
                    placeholder="e.g., PHYS, SST"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Weekly Periods Required</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    className="erp-input text-xs font-semibold"
                    value={weeklyPeriods}
                    onChange={(e) => setWeeklyPeriods(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Assigned Teacher</label>
                  <select
                    className="erp-input text-xs font-semibold"
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                  >
                    <option value="">-- Select Teacher (Optional) --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.employeeCode})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Consecutive Block Requirements</label>
                  <select
                    className="erp-input text-xs font-semibold"
                    value={consecutivePeriods}
                    onChange={(e) => setConsecutivePeriods(Number(e.target.value))}
                  >
                    <option value={1}>None (Single Periods)</option>
                    <option value={2}>2 Periods Consecutive</option>
                    <option value={3}>3 Periods Consecutive</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Timing Preference</label>
                  <select
                    className="erp-input text-xs font-semibold"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                  >
                    <option value="ANY">Any Time / No Preference</option>
                    <option value="MORNING">Morning (Periods 1 - 3)</option>
                    <option value="AVOID_LAST">Avoid Last Period</option>
                    <option value="LAST_TWO">Last Two Periods</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="isOptional"
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    checked={isOptional}
                    onChange={(e) => setIsOptional(e.target.checked)}
                  />
                  <label htmlFor="isOptional" className="text-xs text-slate-600 select-none">Mark as optional/elective</label>
                </div>

                <button
                  type="submit"
                  className="erp-btn-primary w-full py-2 text-xs"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Register Subject'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
