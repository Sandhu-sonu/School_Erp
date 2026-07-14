'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Settings, Save, AlertCircle } from 'lucide-react';

export default function SchoolSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/system/school-settings');
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to load school settings.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/system/school-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings.');
      }
      setMessage({ text: 'School settings successfully saved.', type: 'success' });
      setSettings(data);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-600" />
          School Settings Configuration
        </h1>
        <p className="text-xs text-slate-500 mt-1">Configure profile details, academic settings, and region settings for this installation.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-start gap-3 border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-xs font-medium">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Identity Profile */}
        <div className="erp-card space-y-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
            School Identity & Affiliation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="erp-label">School Name</label>
              <input
                type="text"
                required
                className="erp-input text-xs"
                value={settings.schoolName}
                onChange={(e) => handleChange('schoolName', e.target.value)}
              />
            </div>
            <div>
              <label className="erp-label">Affiliated School Board</label>
              <select
                className="erp-input text-xs"
                value={settings.board}
                onChange={(e) => handleChange('board', e.target.value)}
              >
                <option value="CBSE">CBSE (Central Board of Secondary Education)</option>
                <option value="ICSE">ICSE (Indian Certificate of Secondary Education)</option>
                <option value="PSEB">PSEB (Punjab School Education Board)</option>
                <option value="HBSE">HBSE (Haryana Board of School Education)</option>
                <option value="UP_BOARD">UP Board (Uttar Pradesh Madhyamik Shiksha Parishad)</option>
                <option value="STATE_BOARD">General State Board</option>
                <option value="OTHER">Other Board</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="erp-label">Postal Address</label>
              <textarea
                required
                className="erp-input text-xs h-16"
                value={settings.address}
                onChange={(e) => handleChange('address', e.target.value)}
              />
            </div>
            <div>
              <label className="erp-label">Principal Name</label>
              <input
                type="text"
                required
                className="erp-input text-xs"
                value={settings.principalName}
                onChange={(e) => handleChange('principalName', e.target.value)}
              />
            </div>
            <div>
              <label className="erp-label">Contact Number</label>
              <input
                type="text"
                required
                className="erp-input text-xs"
                value={settings.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>
            <div>
              <label className="erp-label">Official Email</label>
              <input
                type="email"
                required
                className="erp-input text-xs"
                value={settings.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>
            <div>
              <label className="erp-label">Website (Optional)</label>
              <input
                type="url"
                className="erp-input text-xs"
                value={settings.website || ''}
                onChange={(e) => handleChange('website', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Academic & Prefix Config */}
        <div className="erp-card space-y-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
            Academic Sequences & Prefixes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="erp-label">Session ID Prefix</label>
              <input
                type="text"
                required
                className="erp-input text-xs"
                value={settings.sessionPrefix}
                onChange={(e) => handleChange('sessionPrefix', e.target.value)}
              />
            </div>
            <div>
              <label className="erp-label">Admission ID Prefix</label>
              <input
                type="text"
                required
                className="erp-input text-xs"
                value={settings.admissionPrefix}
                onChange={(e) => handleChange('admissionPrefix', e.target.value)}
              />
            </div>
            <div>
              <label className="erp-label">Employee ID Prefix</label>
              <input
                type="text"
                required
                className="erp-input text-xs"
                value={settings.employeePrefix}
                onChange={(e) => handleChange('employeePrefix', e.target.value)}
              />
            </div>
            <div>
              <label className="erp-label">Receipt Prefix</label>
              <input
                type="text"
                required
                className="erp-input text-xs"
                value={settings.receiptPrefix}
                onChange={(e) => handleChange('receiptPrefix', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Regional settings */}
        <div className="erp-card space-y-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
            Regional Formats & Defaults
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="erp-label">Currency Symbol</label>
              <input
                type="text"
                required
                className="erp-input text-xs"
                value={settings.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
              />
            </div>
            <div>
              <label className="erp-label">Time Zone</label>
              <input
                type="text"
                required
                className="erp-input text-xs"
                value={settings.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
              />
            </div>
            <div>
              <label className="erp-label">Date Format</label>
              <input
                type="text"
                required
                className="erp-input text-xs"
                value={settings.dateFormat}
                onChange={(e) => handleChange('dateFormat', e.target.value)}
              />
            </div>
            <div>
              <label className="erp-label">Default Instruction Language</label>
              <input
                type="text"
                required
                className="erp-input text-xs"
                value={settings.language}
                onChange={(e) => handleChange('language', e.target.value)}
              />
            </div>
            <div>
              <label className="erp-label">Annual Working Days</label>
              <input
                type="number"
                required
                className="erp-input text-xs"
                value={settings.workingDays}
                onChange={(e) => handleChange('workingDays', e.target.value)}
              />
            </div>
            <div>
              <label className="erp-label">Default Passing Percentage (%)</label>
              <input
                type="number"
                step="0.1"
                required
                className="erp-input text-xs"
                value={settings.passingPercent}
                onChange={(e) => handleChange('passingPercent', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-sm hover:shadow transition-all disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
