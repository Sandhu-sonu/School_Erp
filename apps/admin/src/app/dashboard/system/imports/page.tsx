'use client';

import React, { useState } from 'react';
import { Loader2, UploadCloud, CheckCircle2, AlertTriangle, Play, HelpCircle } from 'lucide-react';

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  duplicates: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
  preview: any[];
}

export default function SystemImportsPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [module, setModule] = useState('CLASSES');
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
      setErrorMsg(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select a CSV or Excel spreadsheet file.');
      return;
    }

    setLoading(true);
    setResult(null);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('module', module);
    formData.append('dryRun', String(dryRun));

    try {
      const res = await fetch('/api/system/imports', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process import.');

      setResult(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">CSV & Excel Import Console</h1>
        <p className="text-xs text-slate-500">Upload bulk data tables for classes, parent listings, or employees. Supports dry-run safety validation and rollbacks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm h-fit space-y-4">
          <h3 className="text-xs font-bold text-slate-700 pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <UploadCloud className="h-4.5 w-4.5 text-blue-600" />
            Upload File
          </h3>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Module</label>
              <select
                value={module}
                onChange={(e) => setModule(e.target.value)}
                className="block w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="CLASSES">Classes & Sequences</option>
                <option value="PARENTS">Guardians Directory</option>
                <option value="STAFF">Employee Staff Directory</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Spreadsheet</label>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="dryRun"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="rounded border-slate-350 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="dryRun" className="text-xs font-semibold text-slate-655 cursor-pointer select-none">
                Dry Run Mode (Validate only, do not save)
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedFile}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-md transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {dryRun ? 'Validate Import' : 'Execute Import'}
            </button>
          </form>
        </div>

        {/* Validation and Preview Report */}
        <div className="lg:col-span-2 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <div className="text-center">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Total Rows</span>
                  <p className="text-base font-bold text-slate-800 mt-1">{result.total}</p>
                </div>
                <div className="text-center">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Success</span>
                  <p className="text-base font-bold text-green-700 mt-1">{result.success}</p>
                </div>
                <div className="text-center">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Duplicates</span>
                  <p className="text-base font-bold text-amber-700 mt-1">{result.duplicates}</p>
                </div>
                <div className="text-center">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Failed</span>
                  <p className="text-base font-bold text-red-700 mt-1">{result.failed}</p>
                </div>
              </div>

              {/* Error messages */}
              {result.errors.length > 0 && (
                <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm space-y-2">
                  <h4 className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Validation Errors Report
                  </h4>
                  <div className="max-h-[150px] overflow-y-auto space-y-1.5 text-xs">
                    {result.errors.map((err, idx) => (
                      <p key={idx} className="text-slate-655">
                        <span className="font-bold text-slate-800">Row {err.row}:</span> {err.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Preview */}
              {result.preview.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden space-y-3 p-4">
                  <h4 className="text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">Spreadsheet Columns Preview</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          {Object.keys(result.preview[0]).map((key) => (
                            <th key={key} className="p-2">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {result.preview.map((row, idx) => (
                          <tr key={idx}>
                            {Object.values(row).map((val: any, cellIdx) => (
                              <td key={cellIdx} className="p-2 text-slate-600 truncate max-w-[120px]">{String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
