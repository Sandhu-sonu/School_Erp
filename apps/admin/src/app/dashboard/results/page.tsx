'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { BarChart2, Calendar, Award, CheckCircle, RefreshCw, AlertCircle, Eye, Printer } from 'lucide-react';
import Link from 'next/link';

interface ClassItem {
  id: string;
  name: string;
}

interface Exam {
  id: string;
  name: string;
  published: boolean;
}

interface ResultItem {
  id: string;
  studentId: string;
  total: number;
  percentage: number;
  finalGrade: string;
  rank: number;
  student: {
    name: string;
    admissionNumber: string;
  };
}

export default function ResultsDeskPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isPrincipal = userRole === 'PRINCIPAL';
  const isReadOnly = userRole === 'CLERK' || userRole === 'TEACHER';

  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  
  const [resultsList, setResultsList] = useState<ResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadExamsAndClasses = async () => {
    try {
      const [examRes, classRes] = await Promise.all([
        fetch('/api/exams'),
        fetch('/api/finance/classes'),
      ]);

      if (examRes.ok && classRes.ok) {
        const examData = await examRes.json();
        const classData = await classRes.json();
        setExams(examData);
        setClasses(classData);

        if (examData.length > 0) setSelectedExam(examData[0].id);
        if (classData.length > 0) setSelectedClass(classData[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadResults = async () => {
    if (!selectedExam || !selectedClass) return;
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/results?examId=${selectedExam}&classId=${selectedClass}`);
      if (res.ok) {
        const data = await res.json();
        setResultsList(data);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to retrieve results.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExamsAndClasses();
  }, []);

  useEffect(() => {
    loadResults();
  }, [selectedExam, selectedClass]);

  const handlePublish = async () => {
    if (!isPrincipal || !selectedExam) return;
    
    setIsPublishing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/results/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: selectedExam }),
      });

      if (res.ok) {
        setSuccessMsg('Results compiled, ranked, and published successfully!');
        // Update exam state in dropdown
        setExams(prev => prev.map(e => e.id === selectedExam ? { ...e, published: true } : e));
        await loadResults();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to publish results.');
      }
    } catch (err) {
      setErrorMsg('Network error while executing publish sequence.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Helper stats calculation
  const totalStudents = resultsList.length;
  const passedStudents = resultsList.filter(r => r.finalGrade !== 'FAIL').length;
  const passPercentage = totalStudents > 0 ? (passedStudents / totalStudents) * 100 : 0;
  const highestPercentage = totalStudents > 0 ? Math.max(...resultsList.map(r => Number(r.percentage))) : 0;

  // Grade distributions
  const gradeDistribution: Record<string, number> = {
    'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'D': 0, 'FAIL': 0
  };
  resultsList.forEach((r) => {
    if (gradeDistribution[r.finalGrade] !== undefined) {
      gradeDistribution[r.finalGrade]++;
    }
  });

  const activeExamObj = exams.find(e => e.id === selectedExam);
  const isPublished = activeExamObj?.published || false;

  if (userRole === 'ACCOUNTANT') {
    return (
      <div className="erp-card p-8 text-center space-y-4 max-w-lg mx-auto mt-12 border-red-200 bg-red-50">
        <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Access Denied</h2>
        <p className="text-xs text-slate-600">Accountants do not have access to academic results.</p>
        <Link href="/dashboard" className="erp-btn-secondary inline-block">Go to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Results & Analytics Desk</h1>
          <p className="text-xs text-slate-500">Calculate student percentile standings, assign dense rankings, and publish immutable report cards.</p>
        </div>
        {isPrincipal && (
          <button
            onClick={handlePublish}
            disabled={isPublishing || isPublished || resultsList.length === 0}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-colors flex items-center gap-1.5 ${
              isPublished
                ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                : resultsList.length === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
            }`}
          >
            {isPublished ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Results Published</span>
              </>
            ) : (
              <span>{isPublishing ? 'Compiling Ranks...' : 'Publish & Lock Results'}</span>
            )}
          </button>
        )}
      </div>

      {/* Filter panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Examination</label>
          <select
            className="erp-input text-xs"
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
          >
            {exams.map((e) => (
              <option key={e.id} value={e.id}>{e.name} {e.published ? '(Published)' : '(Draft)'}</option>
            ))}
          </select>
        </div>

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
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2 max-w-xl">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded text-xs text-green-700 flex items-center gap-2 max-w-xl">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Summary stats */}
      {resultsList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Class Pass Rate</span>
              <span className="text-xl font-bold text-slate-800">{passPercentage.toFixed(1)}%</span>
              <span className="text-[9px] text-slate-400 block">{passedStudents} of {totalStudents} passed</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Highest Marks</span>
              <span className="text-xl font-bold text-slate-800">{highestPercentage.toFixed(1)}%</span>
              <span className="text-[9px] text-slate-400 block">Top percentile standing</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <BarChart2 className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Grade Distribution</span>
              <div className="flex gap-2 text-[10px] font-mono mt-1">
                {Object.entries(gradeDistribution).map(([grade, count]) => (
                  <div key={grade} className="flex flex-col items-center">
                    <span className="font-bold text-slate-700">{grade}</span>
                    <span className="text-slate-400">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rankings table list */}
      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto border border-slate-200 rounded">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50">
                <th className="erp-table-header w-20 text-center">Rank</th>
                <th className="erp-table-header">Admission No</th>
                <th className="erp-table-header">Student Name</th>
                <th className="erp-table-header text-right">Total Score</th>
                <th className="erp-table-header text-right">Percentage</th>
                <th className="erp-table-header text-center">Final Grade</th>
                <th className="erp-table-header text-right">Report Card</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-xs text-slate-400">Loading exam rankings...</td>
                </tr>
              ) : resultsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-xs text-slate-400">No results compiled for this selection yet.</td>
                </tr>
              ) : (
                resultsList.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="erp-table-cell text-center font-bold">
                      {row.rank === 1 ? (
                        <span className="bg-yellow-100 text-yellow-800 border border-yellow-200 rounded px-1.5 py-0.5 font-mono text-[10px]">
                          🥇 Rank 1
                        </span>
                      ) : row.rank === 2 ? (
                        <span className="bg-slate-100 text-slate-800 border border-slate-200 rounded px-1.5 py-0.5 font-mono text-[10px]">
                          🥈 Rank 2
                        </span>
                      ) : row.rank === 3 ? (
                        <span className="bg-amber-100 text-amber-800 border border-amber-200 rounded px-1.5 py-0.5 font-mono text-[10px]">
                          🥉 Rank 3
                        </span>
                      ) : (
                        <span className="font-mono text-slate-600 font-bold">#{row.rank}</span>
                      )}
                    </td>
                    <td className="erp-table-cell font-mono">{row.student.admissionNumber}</td>
                    <td className="erp-table-cell font-medium text-slate-900">{row.student.name}</td>
                    <td className="erp-table-cell text-right font-mono font-semibold">{Number(row.total).toFixed(1)}</td>
                    <td className="erp-table-cell text-right font-mono font-semibold text-blue-700">{Number(row.percentage).toFixed(1)}%</td>
                    <td className="erp-table-cell text-center">
                      <span className={`erp-badge font-bold ${row.finalGrade === 'FAIL' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {row.finalGrade}
                      </span>
                    </td>
                    <td className="erp-table-cell text-right">
                      <Link
                        href={`/dashboard/results/${row.studentId}?examId=${selectedExam}`}
                        className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 inline-flex items-center gap-1 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Report Card</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
