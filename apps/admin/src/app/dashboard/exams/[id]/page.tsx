'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ClipboardList, AlertCircle, Check, HelpCircle, Save } from 'lucide-react';
import Link from 'next/link';

interface StudentRow {
  studentId: string;
  admissionNumber: string;
  name: string;
  obtained: number | null;
  maxMarks?: number;
  markId?: string;
}

interface ClassItem {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Exam {
  id: string;
  name: string;
  published: boolean;
}

export default function MarksEntryPanelPage() {
  const { id: examId } = useParams() as { id: string };
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isReadOnly = userRole === 'CLERK';

  const [exam, setExam] = useState<Exam | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [maxMarks, setMaxMarks] = useState<string>('100');

  const [studentRows, setStudentRows] = useState<StudentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-save status map: studentId -> 'saved' | 'saving' | 'unsaved' | 'error'
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saved' | 'saving' | 'unsaved' | 'error'>>({});
  
  // Timeout references for debouncing
  const debounceTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  // Cache of input values to avoid re-renders while typing
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  const loadExamAndClasses = async () => {
    try {
      const [examRes, classRes] = await Promise.all([
        fetch(`/api/exams/${examId}`),
        fetch('/api/finance/classes'),
      ]);

      if (examRes.ok && classRes.ok) {
        const examData = await examRes.json();
        const classData = await classRes.json();
        setExam(examData);
        setClasses(classData);
        if (classData.length > 0) {
          setSelectedClass(classData[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSubjects = async () => {
    if (!selectedClass) return;
    try {
      const res = await fetch(`/api/academics/subjects?classId=${selectedClass}`);
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
        if (data.length > 0) {
          setSelectedSubject(data[0].id);
        } else {
          setSelectedSubject('');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadMarksGrid = async () => {
    if (!selectedClass || !selectedSubject) {
      setStudentRows([]);
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/exams/${examId}?classId=${selectedClass}&subjectId=${selectedSubject}`);
      if (res.ok) {
        const data: StudentRow[] = await res.json();
        setStudentRows(data);
        
        // Initialize input values & save status
        const initialVals: Record<string, string> = {};
        const initialStatus: Record<string, 'saved'> = {};
        
        data.forEach((row) => {
          initialVals[row.studentId] = row.obtained !== null && row.obtained !== undefined ? String(row.obtained) : '';
          initialStatus[row.studentId] = 'saved';
        });

        setInputValues(initialVals);
        setSaveStatus(initialStatus);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to load marks worksheet.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExamAndClasses();
  }, [examId]);

  useEffect(() => {
    loadSubjects();
  }, [selectedClass]);

  useEffect(() => {
    loadMarksGrid();
  }, [selectedClass, selectedSubject]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimeouts.current).forEach(clearTimeout);
    };
  }, []);

  // Save mark function
  const saveSingleMark = async (studentId: string, obtainedStr: string) => {
    if (exam?.published) return;

    setSaveStatus(prev => ({ ...prev, [studentId]: 'saving' }));

    const obtainedVal = obtainedStr.trim() === '' ? null : Number(obtainedStr);

    try {
      const res = await fetch(`/api/exams/${examId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClass,
          subjectId: selectedSubject,
          maxMarks: Number(maxMarks),
          marks: [
            {
              studentId,
              obtained: obtainedVal,
            }
          ]
        })
      });

      if (res.ok) {
        setSaveStatus(prev => ({ ...prev, [studentId]: 'saved' }));
      } else {
        setSaveStatus(prev => ({ ...prev, [studentId]: 'error' }));
      }
    } catch (err) {
      setSaveStatus(prev => ({ ...prev, [studentId]: 'error' }));
    }
  };

  // Handle cell text change
  const handleMarkChange = (studentId: string, value: string) => {
    if (isReadOnly || exam?.published) return;

    // Allow digits, single decimal point, or empty
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;

    // Check obtained <= maxMarks
    if (value !== '' && Number(value) > Number(maxMarks)) {
      setSaveStatus(prev => ({ ...prev, [studentId]: 'error' }));
      setInputValues(prev => ({ ...prev, [studentId]: value }));
      return;
    }

    setInputValues(prev => ({ ...prev, [studentId]: value }));
    setSaveStatus(prev => ({ ...prev, [studentId]: 'unsaved' }));

    // Debounce save (500ms)
    if (debounceTimeouts.current[studentId]) {
      clearTimeout(debounceTimeouts.current[studentId]);
    }

    debounceTimeouts.current[studentId] = setTimeout(() => {
      saveSingleMark(studentId, value);
    }, 500);
  };

  const handleBlur = (studentId: string) => {
    // Save immediately on blur if unsaved
    if (saveStatus[studentId] === 'unsaved') {
      if (debounceTimeouts.current[studentId]) {
        clearTimeout(debounceTimeouts.current[studentId]);
      }
      saveSingleMark(studentId, inputValues[studentId]);
    }
  };

  // Keyboard arrow/Enter navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to next student row
      const nextInput = document.getElementById(`input-${idx + 1}`);
      if (nextInput) {
        (nextInput as HTMLInputElement).focus();
        (nextInput as HTMLInputElement).select();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.getElementById(`input-${idx + 1}`);
      if (nextInput) (nextInput as HTMLInputElement).focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.getElementById(`input-${idx - 1}`);
      if (prevInput) (prevInput as HTMLInputElement).focus();
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
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/exams" className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Marks Worksheet Desk: {exam?.name || 'Loading exam...'}
            </h1>
            <p className="text-xs text-slate-500">Auto-saves changes in real time. Use arrow keys or Enter to navigate columns.</p>
          </div>
        </div>
        {exam?.published && (
          <span className="font-mono text-xs font-bold text-green-700 bg-green-50 px-3 py-1 border border-green-200 rounded-lg self-start">
            Published (Worksheet Locked)
          </span>
        )}
      </div>

      {/* Grid selections */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Class</label>
          <select
            className="erp-input text-xs"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Subject</label>
          <select
            className="erp-input text-xs"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            disabled={subjects.length === 0}
          >
            {subjects.length === 0 ? (
              <option value="">No subjects registered</option>
            ) : (
              subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
              ))
            )}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Maximum Marks</label>
          <input
            type="number"
            className="erp-input text-xs font-bold text-blue-700 font-mono"
            value={maxMarks}
            onChange={(e) => setMaxMarks(e.target.value)}
            disabled={isReadOnly || exam?.published}
          />
        </div>

        <div className="flex items-end justify-end">
          <span className="text-[10px] text-slate-400 font-mono italic">
            * Absent: Leave input blank.
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2 max-w-xl">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Marks sheet table */}
      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto border border-slate-200 rounded">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50">
                <th className="erp-table-header w-32">Admission Number</th>
                <th className="erp-table-header">Student Name</th>
                <th className="erp-table-header text-right w-48">Marks Obtained / {maxMarks}</th>
                <th className="erp-table-header text-center w-36">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-xs text-slate-400">Loading worksheet data...</td>
                </tr>
              ) : studentRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-xs text-slate-400">No students enrolled in this class.</td>
                </tr>
              ) : (
                studentRows.map((row, idx) => {
                  const status = saveStatus[row.studentId] || 'saved';
                  return (
                    <tr key={row.studentId} className="hover:bg-slate-50/50">
                      <td className="erp-table-cell font-mono font-semibold">{row.admissionNumber}</td>
                      <td className="erp-table-cell font-medium text-slate-900">{row.name}</td>
                      <td className="erp-table-cell text-right">
                        <input
                          type="text"
                          id={`input-${idx}`}
                          className="w-32 px-3 py-1 border border-slate-200 rounded text-right font-mono font-bold text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          placeholder="ABSENT"
                          value={inputValues[row.studentId] !== undefined ? inputValues[row.studentId] : ''}
                          onChange={(e) => handleMarkChange(row.studentId, e.target.value)}
                          onBlur={() => handleBlur(row.studentId)}
                          onKeyDown={(e) => handleKeyDown(e, idx)}
                          disabled={isReadOnly || exam?.published}
                        />
                      </td>
                      <td className="erp-table-cell text-center">
                        {status === 'saved' && (
                          <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 border border-green-200 rounded inline-flex items-center gap-0.5">
                            Saved ✓
                          </span>
                        )}
                        {status === 'saving' && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 border border-blue-200 rounded inline-flex items-center gap-1 animate-pulse">
                            Saving...
                          </span>
                        )}
                        {status === 'unsaved' && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 border border-amber-200 rounded inline-flex items-center gap-0.5">
                            Unsaved •
                          </span>
                        )}
                        {status === 'error' && (
                          <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 border border-red-200 rounded inline-flex items-center gap-0.5">
                            Error!
                          </span>
                        )}
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
