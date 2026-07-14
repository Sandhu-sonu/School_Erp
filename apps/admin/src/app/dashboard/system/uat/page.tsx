'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertOctagon, HelpCircle, Plus, Eye, Check } from 'lucide-react';

interface UatTestCase {
  id: string;
  testCase: string;
  module: string;
  executedBy: string;
  verifiedBy: string;
  date: string;
  status: string;
  severity: string;
  remarks: string | null;
  priority: string;
  executionTime: number;
}

export default function SystemUatPage() {
  const [cases, setCases] = useState<UatTestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Form states
  const [newCase, setNewCase] = useState({
    testCase: '',
    module: '',
    executedBy: '',
    verifiedBy: '',
    status: 'PENDING',
    severity: 'MEDIUM',
    priority: 'MEDIUM',
    remarks: ''
  });

  const fetchCases = async () => {
    try {
      const res = await fetch('/api/system/uat');
      if (!res.ok) throw new Error('Failed to retrieve UAT cases.');
      const data = await res.json();
      setCases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch('/api/system/uat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCase)
      });

      if (!res.ok) throw new Error('Failed to create UAT case.');
      setNewCase({
        testCase: '',
        module: '',
        executedBy: '',
        verifiedBy: '',
        status: 'PENDING',
        severity: 'MEDIUM',
        priority: 'MEDIUM',
        remarks: ''
      });
      await fetchCases();
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch('/api/system/uat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });

      if (!res.ok) throw new Error('Failed to update status.');
      await fetchCases();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const computeCompletionRate = () => {
    if (cases.length === 0) return 0;
    const passed = cases.filter(c => c.status === 'PASSED').length;
    return Math.round((passed / cases.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">UAT Tracking Desk</h1>
          <p className="text-xs text-slate-500">Track end-to-end user acceptance testing cycles, testers, priorities, and defect severity levels.</p>
        </div>
        <div className="text-right">
          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">UAT Completion Rate</span>
          <span className="text-lg font-extrabold text-blue-600">{computeCompletionRate()}% Pass Rate</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Case Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm h-fit space-y-4">
          <h3 className="text-xs font-bold text-slate-700 pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <Plus className="h-4.5 w-4.5 text-blue-600" />
            Add Test Case
          </h3>

          <form onSubmit={handleCreate} className="space-y-3 text-xs font-semibold">
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Test Case Title</label>
              <input
                type="text"
                required
                value={newCase.testCase}
                onChange={(e) => setNewCase({ ...newCase, testCase: e.target.value })}
                placeholder="e.g. Verify fee receipt PDF layout currency tokens"
                className="block w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Module</label>
              <input
                type="text"
                required
                value={newCase.module}
                onChange={(e) => setNewCase({ ...newCase, module: e.target.value })}
                placeholder="e.g. FINANCE"
                className="block w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tester Name</label>
                <input
                  type="text"
                  required
                  value={newCase.executedBy}
                  onChange={(e) => setNewCase({ ...newCase, executedBy: e.target.value })}
                  placeholder="Rajesh"
                  className="block w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Verifier Name</label>
                <input
                  type="text"
                  required
                  value={newCase.verifiedBy}
                  onChange={(e) => setNewCase({ ...newCase, verifiedBy: e.target.value })}
                  placeholder="Principal"
                  className="block w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Severity</label>
                <select
                  value={newCase.severity}
                  onChange={(e) => setNewCase({ ...newCase, severity: e.target.value })}
                  className="block w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="BLOCKER">BLOCKER</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Priority</label>
                <select
                  value={newCase.priority}
                  onChange={(e) => setNewCase({ ...newCase, priority: e.target.value })}
                  className="block w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Remarks</label>
              <textarea
                value={newCase.remarks}
                onChange={(e) => setNewCase({ ...newCase, remarks: e.target.value })}
                placeholder="Observation notes..."
                className="block w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 h-16 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={adding}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-md transition-colors"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit Case
            </button>
          </form>
        </div>

        {/* UAT Table List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-3.5">Test Case</th>
                  <th className="p-3.5">Module</th>
                  <th className="p-3.5">Tester/Verifier</th>
                  <th className="p-3.5">Severity</th>
                  <th className="p-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No UAT test cases logged. Add one to start tracking.
                    </td>
                  </tr>
                ) : (
                  cases.map((c) => (
                    <tr key={c.id}>
                      <td className="p-3.5">
                        <span className="block font-bold text-slate-800">{c.testCase}</span>
                        {c.remarks && <span className="block text-[10px] text-slate-455 font-medium mt-0.5">{c.remarks}</span>}
                      </td>
                      <td className="p-3.5 uppercase text-slate-655 font-bold tracking-wide">{c.module}</td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="block text-[10px] text-slate-800">T: {c.executedBy}</span>
                        <span className="block text-[10px] text-slate-450">V: {c.verifiedBy}</span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          c.severity === 'BLOCKER' ? 'bg-red-950 text-red-400 border border-red-850' :
                          c.severity === 'HIGH' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {c.severity}
                        </span>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1.5 items-center justify-end">
                          <button
                            onClick={() => handleUpdateStatus(c.id, 'PASSED')}
                            disabled={updatingId === c.id}
                            className={`p-1.5 rounded border ${
                              c.status === 'PASSED'
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                            }`}
                            title="Pass"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(c.id, 'FAILED')}
                            disabled={updatingId === c.id}
                            className={`p-1.5 rounded border ${
                              c.status === 'FAILED'
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                            }`}
                            title="Fail"
                          >
                            <AlertOctagon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
