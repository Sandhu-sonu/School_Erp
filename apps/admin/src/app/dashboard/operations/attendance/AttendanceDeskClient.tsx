'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Play, CheckCircle2, AlertCircle } from 'lucide-react';

interface ClassOption {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

interface AttendanceDeskProps {
  classes: ClassOption[];
}

export default function AttendanceDeskClient({ classes }: AttendanceDeskProps) {
  const router = useRouter();

  // Selected parameters
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');

  // Roster states
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedClass = classes.find((c) => c.id === classId);
  const sections = selectedClass ? selectedClass.sections : [];

  const handleFetchRoster = async () => {
    setError(null);
    setSuccess(null);
    if (!date || !classId) {
      setError('Please select Date and Class.');
      return;
    }

    setLoading(true);
    try {
      const url = `/api/attendance?date=${date}&classId=${classId}${sectionId ? `&sectionId=${sectionId}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        // Map default attendanceStatus to 'PRESENT' if not recorded
        const mapped = data.map((r: any) => ({
          ...r,
          attendanceStatus: r.attendanceStatus || 'PRESENT',
        }));
        setRoster(mapped);
      } else {
        setError(data.error || 'Failed to load attendance roster.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while fetching roster.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllPresent = () => {
    setRoster(prev =>
      prev.map(item => ({
        ...item,
        attendanceStatus: 'PRESENT'
      }))
    );
  };

  const handleStatusChange = (enrollmentId: string, status: string) => {
    setRoster(prev =>
      prev.map(item =>
        item.enrollmentId === enrollmentId
          ? { ...item, attendanceStatus: status }
          : item
      )
    );
  };

  const handleRemarksChange = (enrollmentId: string, remarks: string) => {
    setRoster(prev =>
      prev.map(item =>
        item.enrollmentId === enrollmentId
          ? { ...item, remarks }
          : item
      )
    );
  };

  const handleSaveAttendance = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const records = roster.map((item) => ({
        enrollmentId: item.enrollmentId,
        status: item.attendanceStatus,
        remarks: item.remarks,
      }));

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          records,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`Attendance sheet updated successfully! Success: ${data.success}, Failed: ${data.failed}`);
        router.refresh();
      } else {
        setError(data.error || 'Failed to save attendance.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while saving attendance sheet.');
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
      {success && (
        <div className="rounded bg-green-50 p-2.5 border border-green-200 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
          <span className="text-xs text-green-800 font-medium">{success}</span>
        </div>
      )}

      {/* Selectors Panel */}
      <div className="erp-card grid grid-cols-1 gap-3 sm:grid-cols-4 items-end">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase">Target Date *</label>
          <div className="mt-1 relative rounded shadow-sm">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="erp-input pl-7"
              disabled={loading}
            />
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase">Class Level *</label>
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
          <label className="block text-[10px] font-bold text-slate-500 uppercase">Class Section</label>
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
            onClick={handleFetchRoster}
            disabled={loading || !date || !classId}
            className="w-full erp-btn-primary flex items-center justify-center gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            Load Student Roster
          </button>
        </div>
      </div>

      {/* Roster Grid Table */}
      {roster.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Student Attendance Sheet ({roster.length} enrolled)
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllPresent}
                className="erp-btn-secondary text-[10px]"
                disabled={loading}
              >
                Mark All Present
              </button>
              <button
                onClick={handleSaveAttendance}
                disabled={loading}
                className="erp-btn-primary text-[10px]"
              >
                Save Attendance Sheet
              </button>
            </div>
          </div>

          <div className="erp-card overflow-hidden">
            <div className="overflow-x-auto border border-slate-200 rounded bg-white">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="erp-table-header">Admn No</th>
                    <th className="erp-table-header">Student Name</th>
                    <th className="erp-table-header">Lifecycle Status</th>
                    <th className="erp-table-header w-64 text-center">Roster Code</th>
                    <th className="erp-table-header">Remarks / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {roster.map((item) => (
                    <tr key={item.enrollmentId} className="hover:bg-slate-50/50">
                      <td className="erp-table-cell font-mono font-semibold">{item.admissionNumber}</td>
                      <td className="erp-table-cell font-medium text-slate-900">{item.studentName}</td>
                      <td className="erp-table-cell">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="erp-table-cell text-center whitespace-nowrap">
                        <div className="flex justify-center gap-4">
                          {(
                            [
                              { code: 'PRESENT', label: 'P', color: 'text-green-700 font-bold border-green-600 bg-green-50' },
                              { code: 'ABSENT', label: 'A', color: 'text-red-600 font-bold border-red-600 bg-red-50' },
                              { code: 'LATE', label: 'L', color: 'text-yellow-600 font-bold border-yellow-600 bg-yellow-50' },
                              { code: 'HALF_DAY', label: 'H', color: 'text-blue-700 font-bold border-blue-600 bg-blue-50' },
                            ] as const
                          ).map((opt) => (
                            <label 
                              key={opt.code} 
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded border cursor-pointer select-none text-[10px] ${
                                item.attendanceStatus === opt.code 
                                  ? opt.color 
                                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`attendance-${item.enrollmentId}`}
                                value={opt.code}
                                checked={item.attendanceStatus === opt.code}
                                onChange={() => handleStatusChange(item.enrollmentId, opt.code)}
                                className="sr-only"
                              />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="erp-table-cell">
                        <input
                          type="text"
                          placeholder="Add remarks..."
                          value={item.remarks}
                          onChange={(e) => handleRemarksChange(item.enrollmentId, e.target.value)}
                          className="erp-input py-1"
                          disabled={loading}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
