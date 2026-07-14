'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Play, CheckCircle, AlertTriangle, AlertCircle, 
  HelpCircle, ChevronRight, RefreshCw
} from 'lucide-react';

interface SessionOption {
  id: string;
  name: string;
}

interface ClassOption {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

interface PromotionEngineProps {
  sessions: SessionOption[];
  classes: ClassOption[];
}

export default function PromotionEngineClient({ sessions, classes }: PromotionEngineProps) {
  const router = useRouter();

  // Selected parameters
  const [fromSessionId, setFromSessionId] = useState('');
  const [toSessionId, setToSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');

  // Dry-run preview list
  const [previewList, setPreviewList] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal / Confirm state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [promoResults, setPromoResults] = useState<any | null>(null);

  const selectedClass = classes.find((c) => c.id === classId);
  const sections = selectedClass ? selectedClass.sections : [];

  const handleFetchPreview = async () => {
    setError(null);
    setPromoResults(null);
    if (!fromSessionId || !toSessionId || !classId) {
      setError('Please select Source Session, Target Session, and Class.');
      return;
    }
    if (fromSessionId === toSessionId) {
      setError('Source and Target Sessions must be different.');
      return;
    }

    setLoading(true);
    try {
      const url = `/api/promotions?classId=${classId}&fromSessionId=${fromSessionId}&toSessionId=${toSessionId}${
        sectionId ? `&sectionId=${sectionId}` : ''
      }`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setPreviewList(data);
        // Pre-select all promotable students
        const promotableIds = data.filter((s: any) => s.promotable).map((s: any) => s.studentId);
        setSelectedStudentIds(promotableIds);
      } else {
        setError(data.error || 'Failed to fetch promotion preview.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while loading dry-run.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSelectAllPromotable = () => {
    const promotableIds = previewList.filter((s: any) => s.promotable).map((s: any) => s.studentId);
    if (selectedStudentIds.length === promotableIds.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(promotableIds);
    }
  };

  const handleExecutePromotion = async () => {
    setError(null);
    setLoading(true);
    setShowConfirmModal(false);

    try {
      const res = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: selectedStudentIds,
          fromSessionId,
          toSessionId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPromoResults(data);
        // Refresh preview grid
        await handleFetchPreview();
      } else {
        setError(data.error || 'Promotion execution failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred during promotion batch execution.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded bg-red-50 p-2.5 border border-red-200 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <span className="text-xs text-red-800 font-medium">{error}</span>
        </div>
      )}

      {promoResults && (
        <div className="rounded bg-green-50 p-3 border border-green-200 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-green-800 font-bold">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Batch Promotion Execution Complete
          </div>
          <p className="text-xs text-slate-700">
            Successfully promoted: <strong className="text-green-700">{promoResults.success}</strong> students. 
            Failed: <strong className="text-red-600">{promoResults.failed}</strong>.
          </p>
          {promoResults.errors.length > 0 && (
            <div className="text-[10px] text-red-700 mt-2 bg-red-50 p-2 rounded border max-h-24 overflow-y-auto font-mono">
              {promoResults.errors.map((err: string, idx: number) => (
                <div key={idx}>{err}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selector Options Card */}
      <div className="erp-card grid grid-cols-1 gap-3 sm:grid-cols-5 items-end">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase">Source Session *</label>
          <select
            value={fromSessionId}
            onChange={(e) => setFromSessionId(e.target.value)}
            className="erp-input mt-1"
            disabled={loading}
          >
            <option value="">-- Select Session --</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase">Target Session *</label>
          <select
            value={toSessionId}
            onChange={(e) => setToSessionId(e.target.value)}
            className="erp-input mt-1"
            disabled={loading}
          >
            <option value="">-- Select Session --</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase">Source Class *</label>
          <select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSectionId('');
            }}
            className="erp-input mt-1"
            disabled={loading}
          >
            <option value="">-- Select Class --</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase">Source Section (Optional)</label>
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="erp-input mt-1"
            disabled={loading || !classId}
          >
            <option value="">-- All Sections --</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                Section {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            onClick={handleFetchPreview}
            disabled={loading || !fromSessionId || !toSessionId || !classId}
            className="w-full erp-btn-primary flex items-center justify-center gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            Dry-Run Preview
          </button>
        </div>
      </div>

      {/* Two-Pane Promotion Preview Grid */}
      {previewList.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Student Promotion Preview List ({previewList.length} total)
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAllPromotable}
                className="erp-btn-secondary text-[10px]"
                disabled={loading}
              >
                Select/Deselect All Promotable
              </button>
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={selectedStudentIds.length === 0 || loading}
                className="erp-btn-primary text-[10px]"
              >
                Promote Selected ({selectedStudentIds.length})
              </button>
            </div>
          </div>

          <div className="erp-card overflow-hidden">
            <div className="overflow-x-auto border border-slate-200 rounded bg-white">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="erp-table-header w-10">Select</th>
                    <th className="erp-table-header">Admn No</th>
                    <th className="erp-table-header">Student Name</th>
                    <th className="erp-table-header">Source Class</th>
                    <th className="erp-table-header">Destination</th>
                    <th className="erp-table-header">Validation State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {previewList.map((item) => (
                    <tr key={item.studentId} className={`hover:bg-slate-50/50 ${!item.promotable ? 'bg-red-50/20' : ''}`}>
                      <td className="erp-table-cell text-center">
                        <input
                          type="checkbox"
                          disabled={!item.promotable || loading}
                          checked={selectedStudentIds.includes(item.studentId)}
                          onChange={() => handleToggleSelect(item.studentId)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="erp-table-cell font-mono font-semibold">{item.admissionNumber}</td>
                      <td className="erp-table-cell font-medium text-slate-900">{item.studentName}</td>
                      <td className="erp-table-cell">{item.currentClass}</td>
                      <td className="erp-table-cell">
                        <div className="flex items-center gap-1.5 text-blue-700 font-bold">
                          {item.currentClass}
                          <ChevronRight className="h-3 w-3 text-slate-400" />
                          {item.nextClass}
                        </div>
                      </td>
                      <td className="erp-table-cell">
                        {item.promotable ? (
                          <span className="text-green-600 font-bold flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Ready
                          </span>
                        ) : (
                          <span className="text-red-600 font-bold flex items-center gap-1" title={item.reason}>
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Blocked: {item.reason}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded shadow-md max-w-sm w-full p-4 space-y-4">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider border-b pb-2 flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-blue-600" />
              Confirm Batch Promotion?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to promote **{selectedStudentIds.length}** students to the target academic session **{
                sessions.find((s) => s.id === toSessionId)?.name
              }**. This will archive their current enrollments.
            </p>
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="erp-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleExecutePromotion}
                className="erp-btn-primary bg-blue-700 hover:bg-blue-800"
              >
                Execute Promotion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
