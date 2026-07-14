'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Award, Printer, ChevronDown, ChevronUp, FileDown, CheckSquare, X } from 'lucide-react';

interface MarkDetail {
  subjectName: string;
  marksObtained: number;
  maxMarks: number;
}

interface ResultDetails {
  resultId: string;
  examId: string;
  examName: string;
  total: number;
  percentage: number;
  finalGrade: string;
  rank: number | null;
  marks: MarkDetail[];
  snapshotJson: any;
}

export default function PortalResultsPage() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get('studentId');

  const [results, setResults] = useState<ResultDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [selectedReportCard, setSelectedReportCard] = useState<ResultDetails | null>(null);

  useEffect(() => {
    if (!studentId) return;

    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/portal/results?studentId=${studentId}`);
        if (!res.ok) throw new Error('Failed to load results.');
        const data = await res.json();
        setResults(data);
        if (data.length > 0) {
          setExpandedExamId(data[0].examId);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <Award className="h-10 w-10 text-slate-400 mx-auto mb-3" />
        <h3 className="font-bold text-slate-700">No Results Found</h3>
        <p className="text-xs text-slate-450 mt-1">There are no published examination results available for this student.</p>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 select-none pb-4">
      {/* Page Header */}
      <div>
        <h2 className="text-sm font-bold text-slate-800">Examination Results</h2>
        <p className="text-[10px] text-slate-500">View performance grades and download official progress reports.</p>
      </div>

      {/* Results List */}
      <div className="space-y-3">
        {results.map((r) => {
          const isExpanded = expandedExamId === r.examId;
          const totalMaxMarks = r.marks.reduce((sum, m) => sum + m.maxMarks, 0);

          return (
            <div key={r.examId} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              {/* Header Accordion Toggle */}
              <div 
                onClick={() => setExpandedExamId(isExpanded ? null : r.examId)}
                className="p-4 flex items-center justify-between gap-3 bg-slate-50 border-b border-slate-100 cursor-pointer"
              >
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">{r.examName}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Overall Status: Published</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-xs font-bold text-blue-750">{r.percentage.toFixed(1)}%</span>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wide">Grade: {r.finalGrade}</span>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
              </div>

              {/* Subject Breakdown Details */}
              {isExpanded && (
                <div className="p-4 space-y-4">
                  {/* Detailed marks grid */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                      <span>Subject</span>
                      <span className="text-center">Obtained</span>
                      <span className="text-right">Max Marks</span>
                    </div>

                    {r.marks.map((m, idx) => (
                      <div key={idx} className="grid grid-cols-3 text-xs py-1.5 border-b border-slate-50 last:border-b-0 font-medium">
                        <span className="text-slate-700">{m.subjectName}</span>
                        <span className="text-center text-slate-800 font-semibold">{m.marksObtained}</span>
                        <span className="text-right text-slate-500">{m.maxMarks}</span>
                      </div>
                    ))}
                  </div>

                  {/* Summary Footer */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between text-xs font-bold text-slate-750">
                    <div className="flex gap-4">
                      <div>
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Total Obtained</span>
                        <span>{r.total} / {totalMaxMarks}</span>
                      </div>
                      {r.rank !== null && (
                        <div>
                          <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Class Rank</span>
                          <span>#{r.rank}</span>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => setSelectedReportCard(r)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg border border-blue-500 text-[10px] tracking-wide uppercase transition-colors"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Report Card
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Report Card Slip Modal */}
      {selectedReportCard && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 flex flex-col relative print:border-0 print:shadow-none print:absolute print:inset-0 print:max-w-none">
            {/* Modal Actions */}
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 print:hidden">
              <h4 className="text-xs font-bold text-slate-700">Official Report Card</h4>
              <div className="flex gap-2">
                <button 
                  onClick={handlePrint}
                  className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center border border-blue-500 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                </button>
                <button 
                  onClick={() => setSelectedReportCard(null)}
                  className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg flex items-center justify-center border border-slate-100 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Print Slip Layout */}
            <div className="p-6 space-y-5 print:p-0">
              <div className="text-center border-b border-slate-150 pb-4">
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">STUDENT REPORT CARD</h2>
                <p className="text-[10px] text-slate-500 font-semibold mt-1">Academic Performance Summary</p>
              </div>

              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Exam Name</span>
                  <p className="font-bold text-slate-800 mt-0.5 uppercase">{selectedReportCard.examName}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Overall Grade</span>
                  <p className="font-bold text-blue-750 mt-0.5 uppercase">{selectedReportCard.finalGrade}</p>
                </div>
              </div>

              {/* Marks Table */}
              <div className="border border-slate-150 rounded-lg overflow-hidden print:rounded-none">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="p-2.5">Subject</th>
                      <th className="p-2.5 text-center">Marks</th>
                      <th className="p-2.5 text-right">Max</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {selectedReportCard.marks.map((m, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 text-slate-700">{m.subjectName}</td>
                        <td className="p-2.5 text-center text-slate-800 font-semibold">{m.marksObtained}</td>
                        <td className="p-2.5 text-right text-slate-500">{m.maxMarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 print:bg-white print:border-y print:rounded-none grid grid-cols-2 text-xs font-bold text-slate-750 gap-4">
                <div>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Total Marks</span>
                  <span>{selectedReportCard.total} / {selectedReportCard.marks.reduce((sum, m) => sum + m.maxMarks, 0)}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Percentage</span>
                  <span>{selectedReportCard.percentage.toFixed(1)}%</span>
                </div>
              </div>

              {selectedReportCard.rank !== null && (
                <div className="text-center bg-blue-50/50 p-2 rounded-lg border border-blue-100 text-xs font-bold text-blue-800 print:bg-white print:border-none print:text-slate-800">
                  Class Rank Secured: #{selectedReportCard.rank}
                </div>
              )}

              <div className="text-center text-[9px] text-slate-400 pt-4 border-t border-slate-100 mt-4">
                Official progress record statement. Authorized by School Controller of Examinations.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
