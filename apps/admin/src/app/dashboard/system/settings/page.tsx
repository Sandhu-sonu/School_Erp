'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Settings, Save, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface SettingField {
  key: string;
  value: string;
  group: 'PROFILE' | 'PREFIX' | 'DEFAULTS' | 'LIMITS';
}

export default function SystemSettingsPage() {
  const { data: sessionData } = useSession();
  const userRole = sessionData?.user?.role;
  const isPrincipal = userRole === 'PRINCIPAL';

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form states maps to keys
  const [schoolName, setSchoolName] = useState('School ERP Academy');
  const [schoolAddress, setSchoolAddress] = useState('123 Education Lane');
  const [schoolPhone, setSchoolPhone] = useState('+1 (555) 019-2834');
  const [schoolEmail, setSchoolEmail] = useState('office@school.erp');

  const [feePrefix, setFeePrefix] = useState('SCH-FEE');
  const [salaryPrefix, setSalaryPrefix] = useState('SCH-SAL');

  const [passingPercentage, setPassingPercentage] = useState('33');
  const [attendanceThreshold, setAttendanceThreshold] = useState('75');

  const [maxUploadSize, setMaxUploadSize] = useState('2');

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/system/settings');
      if (res.ok) {
        const data: SettingField[] = await res.json();
        data.forEach((s) => {
          if (s.key === 'school_name') setSchoolName(s.value);
          if (s.key === 'school_address') setSchoolAddress(s.value);
          if (s.key === 'school_phone') setSchoolPhone(s.value);
          if (s.key === 'school_email') setSchoolEmail(s.value);
          if (s.key === 'fee_receipt_prefix') setFeePrefix(s.value);
          if (s.key === 'salary_receipt_prefix') setSalaryPrefix(s.value);
          if (s.key === 'passing_percentage') setPassingPercentage(s.value);
          if (s.key === 'attendance_threshold') setAttendanceThreshold(s.value);
          if (s.key === 'max_upload_size_mb') setMaxUploadSize(s.value);
        });
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to fetch settings');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userRole) {
      fetchSettings();
    }
  }, [userRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPrincipal) return;
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const settingsPayload: SettingField[] = [
      { key: 'school_name', value: schoolName, group: 'PROFILE' },
      { key: 'school_address', value: schoolAddress, group: 'PROFILE' },
      { key: 'school_phone', value: schoolPhone, group: 'PROFILE' },
      { key: 'school_email', value: schoolEmail, group: 'PROFILE' },
      { key: 'fee_receipt_prefix', value: feePrefix, group: 'PREFIX' },
      { key: 'salary_receipt_prefix', value: salaryPrefix, group: 'PREFIX' },
      { key: 'passing_percentage', value: passingPercentage, group: 'DEFAULTS' },
      { key: 'attendance_threshold', value: attendanceThreshold, group: 'DEFAULTS' },
      { key: 'max_upload_size_mb', value: maxUploadSize, group: 'LIMITS' },
    ];

    try {
      const res = await fetch('/api/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsPayload }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        await fetchSettings();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to save settings');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isPrincipal && userRole) {
    return (
      <div className="erp-card p-8 text-center space-y-4 max-w-lg mx-auto mt-12 border-red-200 bg-red-50">
        <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Access Denied</h2>
        <p className="text-xs text-slate-600">Only the Principal can edit general system settings.</p>
        <Link href="/dashboard" className="erp-btn-secondary inline-block">Go to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">System Configuration settings</h1>
          <p className="text-xs text-slate-500">Configure institutional metadata, receipt prefixes, pass/fail thresholds, and upload size boundaries.</p>
        </div>
        <button
          type="button"
          onClick={fetchSettings}
          className="erp-btn-secondary flex items-center gap-1 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Reload</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded flex items-center gap-2 font-semibold">
          <span>Settings saved successfully!</span>
        </div>
      )}

      {isLoading ? (
        <div className="erp-card py-12 text-center text-slate-400 text-xs">Loading configurations...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* School Profile */}
            <div className="erp-card">
              <h2 className="text-xs font-bold uppercase text-slate-700 border-b pb-2 mb-3">School Profile Details</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">School Name</label>
                  <input
                    type="text"
                    className="erp-input"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Address</label>
                  <input
                    type="text"
                    className="erp-input"
                    value={schoolAddress}
                    onChange={(e) => setSchoolAddress(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Contact Phone</label>
                  <input
                    type="text"
                    className="erp-input"
                    value={schoolPhone}
                    onChange={(e) => setSchoolPhone(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    className="erp-input"
                    value={schoolEmail}
                    onChange={(e) => setSchoolEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Receipt Prefixes */}
            <div className="erp-card">
              <h2 className="text-xs font-bold uppercase text-slate-700 border-b pb-2 mb-3">Voucher & Receipt Prefixes</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fee Receipt Prefix</label>
                  <input
                    type="text"
                    className="erp-input font-mono font-semibold"
                    value={feePrefix}
                    onChange={(e) => setFeePrefix(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Salary Payment Prefix</label>
                  <input
                    type="text"
                    className="erp-input font-mono font-semibold"
                    value={salaryPrefix}
                    onChange={(e) => setSalaryPrefix(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Academic Defaults */}
            <div className="erp-card">
              <h2 className="text-xs font-bold uppercase text-slate-700 border-b pb-2 mb-3">Academic Policy Thresholds</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Minimum Passing Marks Percentage (%)</label>
                  <input
                    type="number"
                    className="erp-input"
                    value={passingPercentage}
                    onChange={(e) => setPassingPercentage(e.target.value)}
                    required
                    min={1}
                    max={100}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Minimum Attendance Requirement (%)</label>
                  <input
                    type="number"
                    className="erp-input"
                    value={attendanceThreshold}
                    onChange={(e) => setAttendanceThreshold(e.target.value)}
                    required
                    min={1}
                    max={100}
                  />
                </div>
              </div>
            </div>

            {/* Upload Limits */}
            <div className="erp-card">
              <h2 className="text-xs font-bold uppercase text-slate-700 border-b pb-2 mb-3">System Upload Limits</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Max Upload Image Size (MB)</label>
                  <input
                    type="number"
                    className="erp-input"
                    value={maxUploadSize}
                    onChange={(e) => setMaxUploadSize(e.target.value)}
                    required
                    min={1}
                    max={10}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="erp-btn-primary flex items-center gap-1.5 font-bold"
            >
              <Save className="h-4 w-4" />
              <span>{isSubmitting ? 'Saving settings...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
