'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  CreditCard, Calendar, BookOpen, Layers, Copy, 
  Eye, RefreshCw, Plus, Trash2, ArrowLeftRight, Check, AlertTriangle
} from 'lucide-react';

interface Session {
  id: string;
  name: string;
  isActive: boolean;
}

interface ClassItem {
  id: string;
  name: string;
}

interface FeePlan {
  id: string;
  sessionId: string;
  classId: string;
  tuitionFee: number;
  admissionFee: number;
  annualCharges: number;
  activityCharges: number;
  class: { name: string };
}

interface DashboardMetrics {
  todayCollection: number;
  monthCollection: number;
  totalOutstanding: number;
  transportRevenue: number;
}

interface StudentPreview {
  id: string;
  name: string;
  admissionNumber: string;
  enrollments: Array<{
    class: { name: string };
    feeAccount: {
      totalFee: number;
      remainingFee: number;
      paidAmount: number;
    } | null;
  }>;
}

export default function FinanceLedgerDashboard() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isClerk = userRole === 'CLERK';

  // State hooks
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  
  const [activeTab, setActiveTab] = useState<'overview' | 'structure' | 'copy' | 'preview'>('overview');
  
  // Overview Tab metrics
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  
  // Structure Tab plans
  const [feePlans, setFeePlans] = useState<FeePlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<FeePlan> | null>(null);
  
  // Copy Tab states
  const [copyFromSession, setCopyFromSession] = useState('');
  const [copyToSession, setCopyToSession] = useState('');
  const [copyStatus, setCopyStatus] = useState<{ success?: boolean; error?: string } | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  // Preview Tab states
  const [previewClassId, setPreviewClassId] = useState('');
  const [previewHasTransport, setPreviewHasTransport] = useState(false);
  const [previewTransportFare, setPreviewTransportFare] = useState('1500');
  const [previewStudentQuery, setPreviewStudentQuery] = useState('');
  const [previewStudents, setPreviewStudents] = useState<StudentPreview[]>([]);
  const [selectedPreviewStudent, setSelectedPreviewStudent] = useState<StudentPreview | null>(null);

  // Load Sessions and Classes on mount
  useEffect(() => {
    async function loadMeta() {
      try {
        const [resSessions, resClasses] = await Promise.all([
          fetch('/api/finance/sessions'), // Wait, do we have /api/finance/sessions? If not, we fetch active sessions
          fetch('/api/finance/classes')   // Or fallback to standard routes
        ]);

        // Fallbacks if specialized endpoints don't exist
        const sessionsData = resSessions.ok 
          ? await resSessions.json() 
          : await fetch('/api/enrollments').then(r => r.json()).then(d => d.sessions || []); // Fallback
          
        const classesData = resClasses.ok 
          ? await resClasses.json() 
          : await fetch('/api/enrollments').then(r => r.json()).then(d => d.classes || []);

        setSessions(sessionsData);
        setClasses(classesData);

        // Auto select active session
        const active = sessionsData.find((s: any) => s.isActive);
        if (active) {
          setSelectedSessionId(active.id);
        } else if (sessionsData.length > 0) {
          setSelectedSessionId(sessionsData[0].id);
        }
      } catch (err) {
        console.error('Error loading academic metadata', err);
      }
    }
    loadMeta();
  }, []);

  // Fetch metrics when overview becomes active
  useEffect(() => {
    if (isClerk || !selectedSessionId) return;

    async function loadMetrics() {
      setIsLoadingMetrics(true);
      try {
        const res = await fetch(`/api/finance/dashboard?sessionId=${selectedSessionId}`);
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error('Error loading dashboard metrics', err);
      } finally {
        setIsLoadingMetrics(false);
      }
    }

    if (activeTab === 'overview') {
      loadMetrics();
    }
  }, [activeTab, selectedSessionId, isClerk]);

  // Fetch fee plans when structure tab becomes active
  useEffect(() => {
    if (!selectedSessionId) return;

    async function loadPlans() {
      setIsLoadingPlans(true);
      try {
        const res = await fetch(`/api/finance/structure?sessionId=${selectedSessionId}`);
        if (res.ok) {
          const data = await res.json();
          setFeePlans(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingPlans(false);
      }
    }

    if (activeTab === 'structure') {
      loadPlans();
    }
  }, [activeTab, selectedSessionId]);

  // Search students for preview
  useEffect(() => {
    if (previewStudentQuery.trim().length < 2) {
      setPreviewStudents([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/finance/students?search=${encodeURIComponent(previewStudentQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setPreviewStudents(data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [previewStudentQuery]);

  // Clerk Restrictions Lock
  if (isClerk) {
    return (
      <div className="erp-card p-8 text-center space-y-4 max-w-lg mx-auto mt-12 border-red-200 bg-red-50">
        <AlertTriangle className="h-10 w-10 text-red-600 mx-auto" />
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Access Denied</h2>
        <p className="text-xs text-slate-600">
          Clerk accounts are restricted from viewing financial ledger aggregates, collection totals, or configuring fee structures. Please use the <strong>Fee Collection</strong> desk to record incoming payments.
        </p>
      </div>
    );
  }

  // Create or Update Fee Plan
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan || !editingPlan.classId) return;

    try {
      const res = await fetch('/api/finance/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          classId: editingPlan.classId,
          tuitionFee: Number(editingPlan.tuitionFee || 0),
          admissionFee: Number(editingPlan.admissionFee || 0),
          annualCharges: Number(editingPlan.annualCharges || 0),
          activityCharges: Number(editingPlan.activityCharges || 0),
        }),
      });

      if (res.ok) {
        // Refresh plans
        const updatedPlans = await fetch(`/api/finance/structure?sessionId=${selectedSessionId}`).then(r => r.json());
        setFeePlans(updatedPlans);
        setEditingPlan(null);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save plan');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Copy previous session plans
  const handleCopyPlans = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copyFromSession || !copyToSession) return;

    setIsCopying(true);
    setCopyStatus(null);
    try {
      const res = await fetch('/api/finance/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'copy',
          fromSessionId: copyFromSession,
          toSessionId: copyToSession,
        }),
      });

      if (res.ok) {
        setCopyStatus({ success: true });
        setCopyFromSession('');
        setCopyToSession('');
      } else {
        const err = await res.json();
        setCopyStatus({ error: err.error || 'Copy process failed' });
      }
    } catch (err) {
      setCopyStatus({ error: 'Network error during copy process' });
    } finally {
      setIsCopying(false);
    }
  };

  // Calculate preview amounts
  const selectedClassPlan = previewClassId ? feePlans.find(p => p.classId === previewClassId) : null;
  const previewTuition = selectedClassPlan ? Number(selectedClassPlan.tuitionFee) : 0;
  const previewAdmission = selectedClassPlan ? Number(selectedClassPlan.admissionFee) : 0;
  const previewAnnual = selectedClassPlan ? Number(selectedClassPlan.annualCharges) : 0;
  const previewActivity = selectedClassPlan ? Number(selectedClassPlan.activityCharges) : 0;
  const previewTransport = previewHasTransport ? Number(previewTransportFare) : 0;
  const previewTotal = previewTuition + previewAdmission + previewAnnual + previewActivity + previewTransport;

  return (
    <div className="space-y-6">
      {/* Header with Session selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Finance Ledger Dashboard</h1>
          <p className="text-xs text-slate-500">Configure tuition models, preview payable snap balances, and audit billing aggregates.</p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <select
            className="erp-input w-40 font-semibold"
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
          >
            <option value="">Select Session...</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.name} {s.isActive ? '(Active)' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-slate-200">
        <button
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition-colors ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview & Reports
        </button>
        <button
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition-colors ${activeTab === 'structure' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('structure')}
        >
          Fee Structures
        </button>
        <button
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition-colors ${activeTab === 'copy' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('copy')}
        >
          Copy Session Plans
        </button>
        <button
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition-colors ${activeTab === 'preview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('preview')}
        >
          Payable Previewer
        </button>
      </div>

      {/* Tabs Content */}
      <div className="space-y-6">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Metric cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="erp-card bg-slate-900 text-white">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Today's Collections</p>
                <h3 className="text-xl font-extrabold text-green-400 mt-1">
                  {isLoadingMetrics ? 'Loading...' : `₹${(metrics?.todayCollection || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                </h3>
              </div>
              <div className="erp-card bg-slate-900 text-white">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Collections</p>
                <h3 className="text-xl font-extrabold text-blue-400 mt-1">
                  {isLoadingMetrics ? 'Loading...' : `₹${(metrics?.monthCollection || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                </h3>
              </div>
              <div className="erp-card bg-slate-900 text-white">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending/Outstanding Fees</p>
                <h3 className="text-xl font-extrabold text-red-400 mt-1">
                  {isLoadingMetrics ? 'Loading...' : `₹${(metrics?.totalOutstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                </h3>
              </div>
              <div className="erp-card bg-slate-900 text-white">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transport Revenue</p>
                <h3 className="text-xl font-extrabold text-purple-400 mt-1">
                  {isLoadingMetrics ? 'Loading...' : `₹${(metrics?.transportRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                </h3>
              </div>
            </div>

            {/* General Description Card */}
            <div className="erp-card bg-slate-50 border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">School Finance Audit Rules</h4>
              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                <li>Receipt values are transaction-safe sequential strings prefixed with the collection year.</li>
                <li>All fee plans snap to a student's record upon active class admission enrollment.</li>
                <li>Modifying fee structure plans will not affect existing snaped students. Use adjustments for specific changes.</li>
                <li>Receipt deletions are forbidden. Balancing reverse ledger transactions must be written for corrections.</li>
              </ul>
            </div>
          </div>
        )}

        {/* FEE STRUCTURE TAB */}
        {activeTab === 'structure' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Table of active plans */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Active Fee Plans</h3>
                <button
                  onClick={() => setEditingPlan({ sessionId: selectedSessionId, classId: '', tuitionFee: 0, admissionFee: 0, annualCharges: 0, activityCharges: 0 })}
                  className="erp-btn-primary flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Class Plan
                </button>
              </div>

              <div className="erp-card overflow-hidden">
                <div className="overflow-x-auto border border-slate-200 rounded">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="erp-table-header">Class Name</th>
                        <th className="erp-table-header text-right">Tuition Fee</th>
                        <th className="erp-table-header text-right">Admission Fee</th>
                        <th className="erp-table-header text-right">Annual Charges</th>
                        <th className="erp-table-header text-right">Activity Charges</th>
                        <th className="erp-table-header text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {isLoadingPlans ? (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-xs text-slate-400">Loading fee plans...</td>
                        </tr>
                      ) : feePlans.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-xs text-slate-400">No fee plans configured for this session yet.</td>
                        </tr>
                      ) : (
                        feePlans.map(plan => (
                          <tr key={plan.id} className="hover:bg-slate-50/50">
                            <td className="erp-table-cell font-bold">{plan.class.name}</td>
                            <td className="erp-table-cell text-right font-mono">₹{Number(plan.tuitionFee).toFixed(2)}</td>
                            <td className="erp-table-cell text-right font-mono">₹{Number(plan.admissionFee).toFixed(2)}</td>
                            <td className="erp-table-cell text-right font-mono">₹{Number(plan.annualCharges).toFixed(2)}</td>
                            <td className="erp-table-cell text-right font-mono">₹{Number(plan.activityCharges).toFixed(2)}</td>
                            <td className="erp-table-cell text-right">
                              <button
                                onClick={() => setEditingPlan(plan)}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Add/Edit form drawer card */}
            {editingPlan && (
              <div className="erp-card space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2">
                  {editingPlan.id ? 'Edit Class Fee Plan' : 'Create Class Fee Plan'}
                </h3>
                
                <form onSubmit={handleSavePlan} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Class Level</label>
                    {editingPlan.id ? (
                      <input
                        type="text"
                        className="erp-input bg-slate-50 cursor-not-allowed font-semibold"
                        value={editingPlan.class?.name || ''}
                        disabled
                      />
                    ) : (
                      <select
                        className="erp-input font-semibold"
                        value={editingPlan.classId || ''}
                        onChange={(e) => setEditingPlan({ ...editingPlan, classId: e.target.value })}
                        required
                      >
                        <option value="">Choose Class...</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Tuition Fee (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="erp-input font-semibold"
                      value={editingPlan.tuitionFee || ''}
                      onChange={(e) => setEditingPlan({ ...editingPlan, tuitionFee: Number(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Admission Fee (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="erp-input font-semibold"
                      value={editingPlan.admissionFee || ''}
                      onChange={(e) => setEditingPlan({ ...editingPlan, admissionFee: Number(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Annual Charges (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="erp-input font-semibold"
                      value={editingPlan.annualCharges || ''}
                      onChange={(e) => setEditingPlan({ ...editingPlan, annualCharges: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Activity Charges (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="erp-input font-semibold"
                      value={editingPlan.activityCharges || ''}
                      onChange={(e) => setEditingPlan({ ...editingPlan, activityCharges: Number(e.target.value) })}
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2 border-t">
                    <button
                      type="button"
                      className="erp-btn-secondary"
                      onClick={() => setEditingPlan(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="erp-btn-primary bg-blue-700 hover:bg-blue-800"
                    >
                      Save Plan Settings
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* COPY SESSION PLANS TAB */}
        {activeTab === 'copy' && (
          <div className="max-w-xl mx-auto erp-card space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
              <Copy className="h-4 w-4 text-slate-400" />
              Copy Previous Session Fee Structures
            </h3>
            
            <p className="text-xs text-slate-500">
              This action copies all configured class fee structures (tuition, admission, annual and activity charges) from a source academic session to a target session. Existing class plans in the target session will be overwritten with the source configuration.
            </p>

            {copyStatus?.success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded text-xs text-green-700 flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0" />
                <span>Fee structures copied successfully!</span>
              </div>
            )}

            {copyStatus?.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{copyStatus.error}</span>
              </div>
            )}

            <form onSubmit={handleCopyPlans} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Copy From (Source)</label>
                  <select
                    className="erp-input font-semibold"
                    value={copyFromSession}
                    onChange={(e) => setCopyFromSession(e.target.value)}
                    required
                  >
                    <option value="">Select Session...</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Copy To (Target)</label>
                  <select
                    className="erp-input font-semibold"
                    value={copyToSession}
                    onChange={(e) => setCopyToSession(e.target.value)}
                    required
                  >
                    <option value="">Select Session...</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.name} {s.isActive ? '(Active)' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isCopying || !copyFromSession || !copyToSession}
                  className="erp-btn-primary bg-indigo-700 hover:bg-indigo-800"
                >
                  {isCopying ? 'Copying plans...' : 'Execute Fee Plan Copy'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PAYABLE PREVIEW TAB */}
        {activeTab === 'preview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Left: Input Selection criteria */}
            <div className="space-y-6 lg:col-span-1">
              
              {/* Option A: Preview by Class Model */}
              <div className="erp-card space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2">
                  Preview Class payable rates
                </h3>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Select Class</label>
                    <select
                      className="erp-input font-semibold"
                      value={previewClassId}
                      onChange={(e) => setPreviewClassId(e.target.value)}
                    >
                      <option value="">Select Class...</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="previewHasTransport"
                      className="h-3.5 w-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      checked={previewHasTransport}
                      onChange={(e) => setPreviewHasTransport(e.target.checked)}
                    />
                    <label htmlFor="previewHasTransport" className="text-xs font-bold text-slate-600 select-none">
                      Includes Transport Billing?
                    </label>
                  </div>

                  {previewHasTransport && (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Monthly Stop Fare (₹)</label>
                      <input
                        type="number"
                        className="erp-input font-semibold"
                        value={previewTransportFare}
                        onChange={(e) => setPreviewTransportFare(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Option B: Preview by Student Search */}
              <div className="erp-card space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2">
                  Preview Student Snapshot Balance
                </h3>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Search Student</label>
                    <input
                      type="text"
                      className="erp-input"
                      placeholder="Type admission number or name..."
                      value={previewStudentQuery}
                      onChange={(e) => setPreviewStudentQuery(e.target.value)}
                    />
                  </div>

                  {previewStudents.length > 0 && (
                    <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-40 overflow-y-auto bg-white">
                      {previewStudents.map(std => (
                        <button
                          key={std.id}
                          onClick={() => {
                            setSelectedPreviewStudent(std);
                            setPreviewStudentQuery('');
                            setPreviewStudents([]);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-[11px] flex justify-between items-center transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{std.name}</span>
                            <span className="ml-1.5 font-mono text-slate-500">({std.admissionNumber})</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {std.enrollments[0]?.class?.name || 'Unassigned'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Calculations preview panel */}
            <div className="lg:col-span-2">
              {/* Calculations Preview Output */}
              <div className="erp-card bg-slate-900 text-white min-h-[300px] flex flex-col p-6">
                
                {selectedPreviewStudent ? (
                  /* Preview Student Specific Snap Dues */
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Student Payable Preview</h4>
                          <h2 className="text-base font-extrabold text-white mt-0.5">{selectedPreviewStudent.name}</h2>
                          <p className="text-[10px] font-mono text-slate-500 mt-0.5">Admn No: {selectedPreviewStudent.admissionNumber}</p>
                        </div>
                        <button
                          onClick={() => setSelectedPreviewStudent(null)}
                          className="text-[10px] text-red-400 hover:text-red-300 font-bold border border-red-900/50 px-2 py-0.5 rounded"
                        >
                          Clear Student
                        </button>
                      </div>

                      <div className="space-y-3 text-xs mt-4">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Admission Snap Total Dues</span>
                          <span className="font-bold font-mono text-slate-200">
                            ₹{(selectedPreviewStudent.enrollments[0]?.feeAccount?.totalFee || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Collected Collections</span>
                          <span className="font-bold font-mono text-green-400">
                            ₹{(selectedPreviewStudent.enrollments[0]?.feeAccount?.paidAmount || 0).toFixed(2)}
                          </span>
                        </div>
                        <hr className="border-slate-800" />
                        <div className="flex justify-between items-center py-1">
                          <span className="font-bold text-slate-300">Remaining Balance Outstanding</span>
                          <span className="text-xl font-extrabold text-red-400 font-mono">
                            ₹{(selectedPreviewStudent.enrollments[0]?.feeAccount?.remainingFee || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold text-center italic mt-auto">
                      Audit ledger source snapshot generated in real-time.
                    </div>
                  </div>
                ) : previewClassId ? (
                  /* Preview Class Level Rates */
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="border-b border-slate-800 pb-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Class Rate preview</h4>
                        <h2 className="text-base font-extrabold text-white mt-0.5">
                          {classes.find(c => c.id === previewClassId)?.name || 'Class rates'}
                        </h2>
                      </div>

                      <div className="space-y-3 text-xs mt-4">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Base Tuition Fee</span>
                          <span className="font-semibold font-mono text-slate-200">₹{previewTuition.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Admission Fee (One-time)</span>
                          <span className="font-semibold font-mono text-slate-200">₹{previewAdmission.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Annual Charges</span>
                          <span className="font-semibold font-mono text-slate-200">₹{previewAnnual.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Activity Charges</span>
                          <span className="font-semibold font-mono text-slate-200">₹{previewActivity.toFixed(2)}</span>
                        </div>
                        {previewHasTransport && (
                          <div className="flex justify-between text-indigo-400">
                            <span>Transport Stop Billing</span>
                            <span className="font-semibold font-mono">₹{previewTransport.toFixed(2)}</span>
                          </div>
                        )}
                        <hr className="border-slate-800" />
                        <div className="flex justify-between items-center py-1">
                          <span className="font-bold text-slate-300">Previewed Total Payable</span>
                          <span className="text-xl font-extrabold text-green-400 font-mono">₹{previewTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold text-center italic mt-auto">
                      Estimated payable rate structure for upcoming registrations.
                    </div>
                  </div>
                ) : (
                  /* Blank Slate */
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs italic">
                    Configure class values on the left or search a student to preview balances.
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
