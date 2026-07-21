'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  CreditCard, Calendar, User, CheckCircle2, AlertCircle, 
  Printer, X, Search, RefreshCw, FileText, Plus, Shield, Landmark, BookOpen, Clock, Trash2
} from 'lucide-react';
import Link from 'next/link';
import { PaymentMode, SalaryPaymentType, FinalSettlementReason, PayrollCycleStatus, InterestType } from '@prisma/client';

interface StaffItem {
  id: string;
  employeeCode: string;
  name: string;
  designation: string;
  monthlySalary: number;
  status: string;
}

interface PayrollCycle {
  id: string;
  name: string;
  month: number;
  year: number;
  status: PayrollCycleStatus;
}

interface OutstandingData {
  advances: {
    id: string;
    amount: number;
    outstandingAmount: number;
    reason: string | null;
  }[];
  loans: {
    id: string;
    principal: number;
    outstandingAmount: number;
    monthlyEmi: number;
    reason: string | null;
  }[];
}

export default function EnhancedSalaryDashboard() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isClerk = userRole === 'CLERK';

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'disburse' | 'cycles' | 'advances' | 'loans' | 'history'>('disburse');

  // Cycle management states
  const [cycles, setCycles] = useState<PayrollCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [newCycleName, setNewCycleName] = useState('');
  const [newCycleMonth, setNewCycleMonth] = useState(new Date().getMonth() + 1);
  const [newCycleYear, setNewCycleYear] = useState(new Date().getFullYear());

  // Search staff states
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffSuggestions, setStaffSuggestions] = useState<StaffItem[]>([]);
  const [isSearchingStaff, setIsSearchingStaff] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffItem | null>(null);

  // Disbursement states
  const [paymentType, setPaymentType] = useState<SalaryPaymentType>('INSTALLMENT');
  const [settlementReason, setSettlementReason] = useState<FinalSettlementReason>('RESIGNATION');
  const [installmentAmount, setInstallmentAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [reference, setReference] = useState('');
  const [remarks, setRemarks] = useState('');
  
  // Recovery selections
  const [outstandingData, setOutstandingData] = useState<OutstandingData>({ advances: [], loans: [] });
  const [recoverAdvance, setRecoverAdvance] = useState(false);
  const [selectedAdvanceId, setSelectedAdvanceId] = useState('');
  const [recoverAdvanceAmt, setRecoverAdvanceAmt] = useState('');
  const [recoverLoan, setRecoverLoan] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [recoverLoanAmt, setRecoverLoanAmt] = useState('');

  // Custom adjustments list
  const [adjustments, setAdjustments] = useState<{ amount: number; reason: string }[]>([]);
  const [newAdjAmount, setNewAdjAmount] = useState('');
  const [newAdjReason, setNewAdjReason] = useState('');

  // Issuing Advance Form
  const [advStaffId, setAdvStaffId] = useState('');
  const [advAmount, setAdvAmount] = useState('');
  const [advReason, setAdvReason] = useState('');
  const [advMode, setAdvMode] = useState<PaymentMode>('CASH');

  // Issuing Loan Form
  const [loanStaffId, setLoanStaffId] = useState('');
  const [loanPrincipal, setLoanPrincipal] = useState('');
  const [loanEmi, setLoanEmi] = useState('');
  const [loanRate, setLoanRate] = useState('0');
  const [loanType, setLoanType] = useState<InterestType>('FLAT');
  const [loanReason, setLoanReason] = useState('');
  const [loanMode, setLoanMode] = useState<PaymentMode>('BANK');

  // History & logs states
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [activeVoucher, setActiveVoucher] = useState<any>(null);

  // Common UI feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load Cycles
  const loadCycles = async () => {
    try {
      const res = await fetch('/api/hr/payroll/cycle');
      if (res.ok) {
        const data = await res.json();
        setCycles(data);
        if (data.length > 0 && !selectedCycleId) {
          setSelectedCycleId(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load History Logs
  const loadHistoryLogs = async () => {
    try {
      const url = selectedStaff 
        ? `/api/hr/payroll/history?staffId=${selectedStaff.id}` 
        : '/api/hr/payroll/history';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCycles();
    loadHistoryLogs();
  }, [selectedStaff]);

  // Handle staff search autocompletion
  useEffect(() => {
    if (staffSearchQuery.trim().length < 1) {
      setStaffSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearchingStaff(true);
      try {
        const res = await fetch(`/api/hr/staff?search=${encodeURIComponent(staffSearchQuery)}&status=ACTIVE`);
        if (res.ok) {
          const data = await res.json();
          setStaffSuggestions(data.items);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingStaff(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [staffSearchQuery]);

  // Load outstanding details when staff changes
  useEffect(() => {
    if (!selectedStaff) {
      setOutstandingData({ advances: [], loans: [] });
      return;
    }
    const fetchOutstandings = async () => {
      try {
        const res = await fetch(`/api/hr/payroll/outstanding?staffId=${selectedStaff.id}`);
        if (res.ok) {
          const data = await res.json();
          setOutstandingData(data);
          if (data.advances.length > 0) {
            setSelectedAdvanceId(data.advances[0].id);
            setRecoverAdvanceAmt(data.advances[0].outstandingAmount.toString());
          }
          if (data.loans.length > 0) {
            setSelectedLoanId(data.loans[0].id);
            setRecoverLoanAmt(data.loans[0].monthlyEmi.toString());
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchOutstandings();
  }, [selectedStaff]);

  // Create Cycle Submit
  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/hr/payroll/cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCycleName,
          month: Number(newCycleMonth),
          year: Number(newCycleYear),
          startDate: new Date(newCycleYear, newCycleMonth - 1, 1),
          endDate: new Date(newCycleYear, newCycleMonth, 0),
        }),
      });
      if (res.ok) {
        setSuccessMsg('Payroll Cycle created successfully.');
        setNewCycleName('');
        loadCycles();
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to create cycle.');
      }
    } catch (err) {
      setErrorMsg('Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Cycle Status
  const handleToggleCycleStatus = async (id: string, status: PayrollCycleStatus) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/hr/payroll/cycle', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setSuccessMsg(`Cycle status updated to ${status}.`);
        loadCycles();
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to toggle status.');
      }
    } catch (err) {
      setErrorMsg('Network error.');
    }
  };

  // Issue Advance Submit
  const handleIssueAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advStaffId) {
      setErrorMsg('Please specify a staff ID or Employee Code.');
      return;
    }
    if (!advAmount) {
      setErrorMsg('Please specify the advance amount.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/hr/payroll/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: advStaffId,
          amount: parseFloat(advAmount),
          reason: advReason,
          paymentMode: advMode,
        }),
      });
      if (res.ok) {
        setSuccessMsg('Salary Advance issued successfully.');
        setAdvAmount('');
        setAdvReason('');
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to issue advance.');
      }
    } catch (err) {
      setErrorMsg('Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Issue Loan Submit
  const handleIssueLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanStaffId) {
      setErrorMsg('Please specify a staff ID or Employee Code.');
      return;
    }
    if (!loanPrincipal) {
      setErrorMsg('Please specify the principal loan amount.');
      return;
    }
    if (!loanEmi) {
      setErrorMsg('Please specify the monthly EMI.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/hr/payroll/loan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: loanStaffId,
          principal: parseFloat(loanPrincipal),
          interestRate: parseFloat(loanRate),
          interestType: loanType,
          monthlyEmi: parseFloat(loanEmi),
          reason: loanReason,
          paymentMode: loanMode,
        }),
      });
      if (res.ok) {
        setSuccessMsg('Staff Loan issued successfully.');
        setLoanPrincipal('');
        setLoanEmi('');
        setLoanRate('0');
        setLoanReason('');
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to issue loan.');
      }
    } catch (err) {
      setErrorMsg('Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Salary Disbursement Installment
  const handleDisburseSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) {
      setErrorMsg('Please search and select a staff member first.');
      return;
    }
    if (!selectedCycleId) {
      setErrorMsg('Please select a payroll cycle. If no cycle is available, create one under the "Payroll Cycles" tab first.');
      return;
    }
    if (!installmentAmount) {
      setErrorMsg('Please specify the gross installment amount.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/hr/payroll/installment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: selectedStaff.id,
          payrollCycleId: selectedCycleId,
          paymentType,
          installmentAmount: parseFloat(installmentAmount),
          paymentMode,
          transactionReference: reference,
          remarks,
          recoverAdvanceId: recoverAdvance ? selectedAdvanceId : undefined,
          recoverAdvanceAmount: recoverAdvance ? parseFloat(recoverAdvanceAmt) : undefined,
          recoverLoanId: recoverLoan ? selectedLoanId : undefined,
          recoverLoanAmount: recoverLoan ? parseFloat(recoverLoanAmt) : undefined,
          adjustments,
          finalSettlementReason: paymentType === 'FINAL_SETTLEMENT' ? settlementReason : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessMsg(`Salary payment processed successfully! Reference: ${data.salarySlipNo}`);
        setActiveVoucher(data);
        // Clear desk
        setSelectedStaff(null);
        setInstallmentAmount('');
        setReference('');
        setRemarks('');
        setAdjustments([]);
        setRecoverAdvance(false);
        setRecoverLoan(false);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Disbursement failed.');
      }
    } catch (err) {
      setErrorMsg('Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Custom Adjustment helper
  const addAdjustment = () => {
    if (!newAdjAmount || !newAdjReason) return;
    setAdjustments([
      ...adjustments,
      { amount: parseFloat(newAdjAmount), reason: newAdjReason },
    ]);
    setNewAdjAmount('');
    setNewAdjReason('');
  };

  if (isClerk) {
    return (
      <div className="erp-card p-8 text-center space-y-4 max-w-lg mx-auto mt-12 border-red-200 bg-red-50">
        <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Access Denied</h2>
        <p className="text-xs text-slate-600">Clerks are restricted from accessing the Salary Disbursement desk.</p>
        <Link href="/dashboard" className="erp-btn-secondary inline-block">Go to Dashboard</Link>
      </div>
    );
  }

  // Calculate Net Payable locally
  const localGross = selectedStaff ? Number(installmentAmount) || 0 : 0;
  const localDeduction = 
    (recoverAdvance ? Number(recoverAdvanceAmt) || 0 : 0) +
    (recoverLoan ? Number(recoverLoanAmt) || 0 : 0) +
    adjustments.filter(a => a.amount < 0).reduce((sum, a) => sum + Math.abs(a.amount), 0);
  const localIncentive = adjustments.filter(a => a.amount > 0).reduce((sum, a) => sum + a.amount, 0);
  const localNet = localGross + localIncentive - localDeduction;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Advanced Payroll Desk</h1>
          <p className="text-xs text-slate-500">Immutable ledger accounting: issue advances, loans, revisions, and multi-installment salary disbursements.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded text-xs text-green-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 overflow-x-auto">
        {[
          { id: 'disburse', label: 'Disburse Salary', icon: Landmark },
          { id: 'cycles', label: 'Payroll Cycles', icon: BookOpen },
          { id: 'advances', label: 'Salary Advances', icon: Clock },
          { id: 'loans', label: 'Staff Loans', icon: Shield },
          { id: 'history', label: 'Payroll Ledger Logs', icon: FileText },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`pb-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap focus:outline-none ${
                isActive ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="animate-in fade-in duration-150">
        
        {/* TAB: DISBURSE SALARY */}
        {activeTab === 'disburse' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Left Workspace Panel */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Employee Selection card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 relative space-y-4 shadow-sm">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  1. Select active staff & Payroll Cycle
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Select Payroll Cycle</label>
                    <select
                      className="erp-input font-semibold"
                      value={selectedCycleId}
                      onChange={(e) => setSelectedCycleId(e.target.value)}
                    >
                      {cycles.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 relative">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Search Active Staff</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        className="erp-input pl-8"
                        placeholder="Type name or code..."
                        value={staffSearchQuery}
                        onChange={(e) => setStaffSearchQuery(e.target.value)}
                      />
                      {isSearchingStaff && (
                        <div className="absolute right-2.5 top-2.5">
                          <RefreshCw className="h-3.5 w-3.5 text-slate-400 animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Autocomplete suggestions */}
                    {staffSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-50 divide-y max-h-48 overflow-y-auto">
                        {staffSuggestions.map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => {
                              setSelectedStaff(st);
                              setStaffSearchQuery('');
                              setStaffSuggestions([]);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex justify-between items-center"
                          >
                            <div>
                              <span className="font-bold text-slate-800">{st.name}</span>
                              <span className="text-slate-400 text-[10px] ml-1.5">({st.employeeCode})</span>
                            </div>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono uppercase">{st.designation}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {selectedStaff && (
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-2 text-xs font-semibold text-slate-700">
                    <div className="flex justify-between items-center border-b pb-1.5 border-blue-200">
                      <div>
                        <span className="text-[10px] text-blue-400 uppercase font-bold">Selected Employee</span>
                        <p className="text-blue-900 font-bold text-sm">{selectedStaff.name} ({selectedStaff.employeeCode})</p>
                      </div>
                      <button onClick={() => setSelectedStaff(null)} className="text-slate-400 hover:text-slate-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600 text-[11px] pt-1">
                      <div>
                        <span className="block text-[9px] text-slate-400 uppercase">Gross monthly salary</span>
                        <span className="font-bold text-slate-800">₹{Number(selectedStaff.monthlySalary).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 uppercase">Outstanding Advance</span>
                        <span className="font-bold text-amber-700">
                          ₹{outstandingData.advances.reduce((sum, a) => sum + Number(a.outstandingAmount), 0).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 uppercase">Outstanding Loan</span>
                        <span className="font-bold text-indigo-700">
                          ₹{outstandingData.loans.reduce((sum, l) => sum + Number(l.outstandingAmount), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedStaff && (
                <form onSubmit={handleDisburseSalary} className="space-y-6">
                  
                  {/* Disbursement inputs */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 relative space-y-4 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                      <Landmark className="h-3.5 w-3.5 text-slate-400" />
                      2. Transaction details & adjustments
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Disbursement Type</label>
                        <select
                          className="erp-input"
                          value={paymentType}
                          onChange={(e) => setPaymentType(e.target.value as any)}
                        >
                          <option value="INSTALLMENT">Salary Installment</option>
                          <option value="FINAL_SETTLEMENT">Final Settlement</option>
                        </select>
                      </div>

                      {paymentType === 'FINAL_SETTLEMENT' && (
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Settlement Reason</label>
                          <select
                            className="erp-input"
                            value={settlementReason}
                            onChange={(e) => setSettlementReason(e.target.value as any)}
                          >
                            <option value="RESIGNATION">Resignation</option>
                            <option value="RETIREMENT">Retirement</option>
                            <option value="CONTRACT_COMPLETION">Contract Completion</option>
                            <option value="TERMINATION">Termination</option>
                            <option value="DEATH_CASE">Death Case</option>
                          </select>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Gross Amount (INR)</label>
                        <input
                          type="number"
                          step="any"
                          required
                          className="erp-input font-mono font-bold"
                          placeholder="e.g. 20000"
                          value={installmentAmount}
                          onChange={(e) => setInstallmentAmount(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Recover Advance checkboxes */}
                    {outstandingData.advances.length > 0 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                        <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-amber-300"
                            checked={recoverAdvance}
                            onChange={(e) => setRecoverAdvance(e.target.checked)}
                          />
                          <span>Deduct / Recover Outstanding Advance</span>
                        </label>
                        {recoverAdvance && (
                          <div className="grid grid-cols-2 gap-3 pl-6">
                            <div>
                              <label className="block text-[9px] font-bold text-amber-800 uppercase">Select Advance</label>
                              <select
                                className="erp-input text-xs"
                                value={selectedAdvanceId}
                                onChange={(e) => {
                                  setSelectedAdvanceId(e.target.value);
                                  const adv = outstandingData.advances.find(a => a.id === e.target.value);
                                  if (adv) setRecoverAdvanceAmt(adv.outstandingAmount.toString());
                                }}
                              >
                                {outstandingData.advances.map(a => (
                                  <option key={a.id} value={a.id}>
                                    ₹{Number(a.outstandingAmount).toFixed(2)} ({a.reason || 'No Reason'})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-amber-800 uppercase">Deduction amount (INR)</label>
                              <input
                                type="number"
                                step="any"
                                className="erp-input text-xs font-mono font-bold"
                                value={recoverAdvanceAmt}
                                onChange={(e) => setRecoverAdvanceAmt(e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recover Loan checkboxes */}
                    {outstandingData.loans.length > 0 && (
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-3">
                        <label className="flex items-center gap-2 text-xs font-bold text-indigo-900 cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-indigo-300"
                            checked={recoverLoan}
                            onChange={(e) => setRecoverLoan(e.target.checked)}
                          />
                          <span>Deduct / Recover Loan EMI Installment</span>
                        </label>
                        {recoverLoan && (
                          <div className="grid grid-cols-2 gap-3 pl-6">
                            <div>
                              <label className="block text-[9px] font-bold text-indigo-800 uppercase">Select Loan</label>
                              <select
                                className="erp-input text-xs"
                                value={selectedLoanId}
                                onChange={(e) => {
                                  setSelectedLoanId(e.target.value);
                                  const l = outstandingData.loans.find(a => a.id === e.target.value);
                                  if (l) setRecoverLoanAmt(l.monthlyEmi.toString());
                                }}
                              >
                                {outstandingData.loans.map(l => (
                                  <option key={l.id} value={l.id}>
                                    ₹{Number(l.outstandingAmount).toFixed(2)} ({l.reason || 'No Reason'})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-indigo-800 uppercase">EMI deduction amount (INR)</label>
                              <input
                                type="number"
                                step="any"
                                className="erp-input text-xs font-mono font-bold"
                                value={recoverLoanAmt}
                                onChange={(e) => setRecoverLoanAmt(e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Custom Adjustments section */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Custom Adjustments (Bonus, Deductions, Incentives)</h4>
                      
                      {adjustments.length > 0 && (
                        <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 bg-slate-50 max-h-36 overflow-y-auto">
                          {adjustments.map((adj, i) => (
                            <div key={i} className="flex justify-between items-center px-3 py-1.5 text-[11px] font-semibold text-slate-700">
                              <span className="font-mono text-slate-500">{adj.reason}</span>
                              <div className="flex items-center gap-3">
                                <span className={adj.amount >= 0 ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>
                                  {adj.amount >= 0 ? '+' : ''}₹{adj.amount.toFixed(2)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setAdjustments(adjustments.filter((_, idx) => idx !== i))}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase">Adjustment amount (INR)</label>
                          <input
                            type="number"
                            step="any"
                            className="erp-input text-xs"
                            placeholder="e.g. -500 or 1200"
                            value={newAdjAmount}
                            onChange={(e) => setNewAdjAmount(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase">Adjustment Reason</label>
                          <input
                            type="text"
                            className="erp-input text-xs"
                            placeholder="e.g. Unpaid Leave or Festive Bonus"
                            value={newAdjReason}
                            onChange={(e) => setNewAdjReason(e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={addAdjustment}
                          className="erp-btn-secondary flex justify-center items-center gap-1.5 py-2 text-xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Row</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t pt-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Payment Mode</label>
                        <select
                          className="erp-input"
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value as any)}
                        >
                          <option value="CASH">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="BANK">Bank Transfer</option>
                          <option value="CHEQUE">Cheque</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Transaction reference</label>
                        <input
                          type="text"
                          className="erp-input"
                          placeholder="Reference No..."
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Remarks</label>
                        <input
                          type="text"
                          className="erp-input"
                          placeholder="Audit specifications..."
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submission control */}
                  <div className="flex justify-between items-center border border-slate-200 rounded-xl p-4 bg-slate-50 shadow-sm">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Net Payable (Calculated)</span>
                      <p className="text-lg font-bold font-mono text-green-700">₹{localNet.toFixed(2)}</p>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting || localNet < 0}
                      className="erp-btn-primary px-8 py-3 text-xs font-bold uppercase tracking-wider"
                    >
                      {isSubmitting ? 'Processing Transaction...' : 'Process Payment'}
                    </button>
                  </div>

                </form>
              )}
            </div>

            {/* Right side stats panel */}
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2">Payroll summary details</h3>
                
                <div className="space-y-3 text-xs font-semibold text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Active Cycle:</span>
                    <span className="font-bold text-slate-900">
                      {cycles.find(c => c.id === selectedCycleId)?.name || 'None'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Gross Salary:</span>
                    <span className="font-mono text-slate-800">₹{localGross.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Deductions:</span>
                    <span className="font-mono text-red-600">-₹{localDeduction.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Incentives:</span>
                    <span className="font-mono text-green-600">+₹{localIncentive.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-sm font-bold">
                    <span className="text-slate-850">Net Disbursed:</span>
                    <span className="font-mono text-green-800">₹{localNet.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB: PAYROLL CYCLES */}
        {activeTab === 'cycles' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Create cycle form */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2">Create New Cycle</h3>
              <form onSubmit={handleCreateCycle} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Cycle Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. July 2026"
                    className="erp-input"
                    value={newCycleName}
                    onChange={(e) => setNewCycleName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Month</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={12}
                      className="erp-input"
                      value={newCycleMonth}
                      onChange={(e) => setNewCycleMonth(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Year</label>
                    <input
                      type="number"
                      required
                      className="erp-input"
                      value={newCycleYear}
                      onChange={(e) => setNewCycleYear(Number(e.target.value))}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="erp-btn-primary w-full py-2.5 text-xs font-bold uppercase tracking-wider"
                >
                  Create Cycle
                </button>
              </form>
            </div>

            {/* Roster of cycles */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2">Active Payroll Cycles</h3>
              
              <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                {cycles.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs font-semibold">No payroll cycles created yet.</div>
                ) : (
                  cycles.map((c) => (
                    <div key={c.id} className="flex justify-between items-center px-4 py-3 text-xs font-semibold text-slate-700">
                      <div>
                        <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                        <span className="text-slate-400 text-[10px] block font-mono">Period: {c.month}/{c.year}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          c.status === 'LOCKED' ? 'bg-red-50 text-red-700 border border-red-200' :
                          c.status === 'PROCESSING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          c.status === 'ARCHIVED' ? 'bg-slate-100 text-slate-600' :
                          'bg-green-50 text-green-700 border border-green-200'
                        }`}>
                          {c.status}
                        </span>

                        <select
                          className="text-[10px] border border-slate-200 rounded p-1 bg-white"
                          value={c.status}
                          onChange={(e) => handleToggleCycleStatus(c.id, e.target.value as any)}
                        >
                          <option value="OPEN">Open</option>
                          <option value="PROCESSING">Processing</option>
                          <option value="LOCKED">Lock</option>
                          <option value="ARCHIVED">Archive</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB: SALARY ADVANCES */}
        {activeTab === 'advances' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Issue Advance Form */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2">Issue Salary Advance</h3>
              <form onSubmit={handleIssueAdvance} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Staff ID / Employee Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UUID or code"
                    className="erp-input text-xs"
                    value={advStaffId}
                    onChange={(e) => setAdvStaffId(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Advance Amount (INR)</label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder="e.g. 10000"
                    className="erp-input text-xs"
                    value={advAmount}
                    onChange={(e) => setAdvAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Advance Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Festival advance"
                    className="erp-input text-xs"
                    value={advReason}
                    onChange={(e) => setAdvReason(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Payment Mode</label>
                  <select
                    className="erp-input text-xs"
                    value={advMode}
                    onChange={(e) => setAdvMode(e.target.value as any)}
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK">Bank Transfer</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="erp-btn-primary w-full py-2.5 text-xs font-bold uppercase tracking-wider"
                >
                  Issue Advance
                </button>
              </form>
            </div>

            {/* Roster detail logs */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2">Active Outstanding Advances</h3>
              
              <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs font-semibold text-slate-700 bg-slate-50">
                {outstandingData.advances.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">Search for a staff member to view active advances.</div>
                ) : (
                  outstandingData.advances.map((adv: any) => (
                    <div key={adv.id} className="flex justify-between items-center px-4 py-3">
                      <div>
                        <span className="font-bold text-slate-800 text-sm">₹{Number(adv.amount).toFixed(2)}</span>
                        <span className="text-slate-400 text-[10px] block font-mono">Outstanding: ₹{Number(adv.outstandingAmount).toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block">{adv.reason || 'No reason'}</span>
                        <span className="text-[10px] text-amber-700 font-bold uppercase">{adv.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB: STAFF LOANS */}
        {activeTab === 'loans' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Issue Loan Form */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2">Issue Staff Loan</h3>
              <form onSubmit={handleIssueLoan} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Staff ID / Employee Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UUID or code"
                    className="erp-input text-xs"
                    value={loanStaffId}
                    onChange={(e) => setLoanStaffId(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Principal Amount (INR)</label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder="e.g. 100000"
                    className="erp-input text-xs"
                    value={loanPrincipal}
                    onChange={(e) => setLoanPrincipal(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Interest Rate (%)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 5"
                      className="erp-input text-xs"
                      value={loanRate}
                      onChange={(e) => setLoanRate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Interest Type</label>
                    <select
                      className="erp-input text-xs"
                      value={loanType}
                      onChange={(e) => setLoanType(e.target.value as any)}
                    >
                      <option value="FLAT">Flat</option>
                      <option value="REDUCING">Reducing</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Monthly EMI (INR)</label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder="e.g. 10000"
                    className="erp-input text-xs"
                    value={loanEmi}
                    onChange={(e) => setLoanEmi(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Loan Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Home repair"
                    className="erp-input text-xs"
                    value={loanReason}
                    onChange={(e) => setLoanReason(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Payment Mode</label>
                  <select
                    className="erp-input text-xs"
                    value={loanMode}
                    onChange={(e) => setLoanMode(e.target.value as any)}
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK">Bank Transfer</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="erp-btn-primary w-full py-2.5 text-xs font-bold uppercase tracking-wider"
                >
                  Issue Loan
                </button>
              </form>
            </div>

            {/* Roster details */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2">Active Staff Loans</h3>
              
              <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs font-semibold text-slate-700 bg-slate-50">
                {outstandingData.loans.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">Search for a staff member to view active loans.</div>
                ) : (
                  outstandingData.loans.map((ln: any) => (
                    <div key={ln.id} className="flex justify-between items-center px-4 py-3">
                      <div>
                        <span className="font-bold text-slate-800 text-sm">₹{Number(ln.principal).toFixed(2)}</span>
                        <span className="text-slate-400 text-[10px] block font-mono">Outstanding: ₹{Number(ln.outstandingAmount).toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block">{ln.reason || 'No reason'}</span>
                        <span className="text-[10px] text-indigo-700 font-bold block">EMI: ₹{Number(ln.monthlyEmi).toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB: PAYROLL HISTORY */}
        {activeTab === 'history' && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2">Payroll Ledger Transactions</h3>
            
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Cycle</th>
                    <th className="px-4 py-2.5 text-left">Slip No</th>
                    <th className="px-4 py-2.5 text-left">Staff Name</th>
                    <th className="px-4 py-2.5 text-left">Type</th>
                    <th className="px-4 py-2.5 text-left">Gross Paid</th>
                    <th className="px-4 py-2.5 text-left">Net Paid</th>
                    <th className="px-4 py-2.5 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {historyLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-400">No payroll disbursements recorded.</td>
                    </tr>
                  ) : (
                    historyLogs.map((log: any) => (
                      <tr key={log.id}>
                        <td className="px-4 py-2.5">{log.payrollCycle?.name || `${log.month}/${log.year}`}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-500">{log.salarySlipNo}</td>
                        <td className="px-4 py-2.5">{log.staff?.name}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono uppercase font-bold">
                            {log.paymentType}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono">₹{Number(log.grossSalary).toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-bold font-mono text-green-700">₹{Number(log.netAmount).toFixed(2)}</td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => {
                              // Link selectedStaff detail mockup for slip printer
                              setSelectedStaff(log.staff);
                              setActiveVoucher(log);
                            }}
                            className="text-primary hover:underline font-bold flex items-center gap-1 text-[10px] uppercase tracking-wider"
                          >
                            <Printer className="h-3 w-3" />
                            <span>Voucher</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Printable Payslip Modal */}
      {activeVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            
            <div className="flex justify-between items-center px-4 py-3 border-b bg-slate-50">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Salary Voucher Receipt</h3>
              <button onClick={() => setActiveVoucher(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div id="print-salary-receipt" className="p-6 space-y-4 text-xs font-mono text-slate-800 bg-white">
              <div className="text-center border-b border-dashed pb-3 mb-3">
                <h1 className="text-sm font-bold uppercase text-slate-900">SCHOOL ERP</h1>
                <p className="text-[9px] text-slate-500">123 Education Blvd, New Delhi</p>
                <p className="text-[10px] font-bold border border-slate-850 px-2 mt-2 inline-block">SALARY DISBURSEMENT SLIP</p>
              </div>

              <div className="space-y-1.5 border-b border-dashed pb-3 mb-3">
                <p>Slip No: <strong>{activeVoucher.salarySlipNo}</strong></p>
                <p>Date: {new Date(activeVoucher.paymentDate || activeVoucher.createdAt).toLocaleString()}</p>
                <p>Staff: {selectedStaff?.name || activeVoucher.staff?.name} ({selectedStaff?.employeeCode || activeVoucher.staff?.employeeCode})</p>
                <p>Designation: {selectedStaff?.designation || activeVoucher.staff?.designation}</p>
                <p>Period Cycle: {activeVoucher.payrollCycle?.name || `${activeVoucher.month}/${activeVoucher.year}`}</p>
                <p>Type: <strong className="uppercase">{activeVoucher.paymentType}</strong></p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span>Basic Component (50%)</span>
                  <span>₹{Number(activeVoucher.basicSalary || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>DA Component (15%)</span>
                  <span>₹{Number(activeVoucher.da || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>HRA Component (20%)</span>
                  <span>₹{Number(activeVoucher.hra || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gross Contract Installment</span>
                  <span className="font-bold">₹{Number(activeVoucher.grossSalary).toFixed(2)}</span>
                </div>
                
                {activeVoucher.recoveries?.map((rec: any) => (
                  <div key={rec.id} className="flex justify-between text-red-700">
                    <span>Deduction: {rec.recoveryType} Recovery</span>
                    <span>-₹{Number(rec.amount).toFixed(2)}</span>
                  </div>
                ))}

                {activeVoucher.adjustments?.map((adj: any) => (
                  <div key={adj.id} className={`flex justify-between ${Number(adj.amount) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    <span>Adjust: {adj.reason}</span>
                    <span>{Number(adj.amount) >= 0 ? '+' : ''}₹{Number(adj.amount).toFixed(2)}</span>
                  </div>
                ))}

                <div className="flex justify-between font-bold border-t border-dashed pt-2 mt-2 text-slate-950 text-sm">
                  <span>Net Disbursed</span>
                  <span>₹{Number(activeVoucher.netAmount).toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-6 flex justify-between text-[9px] text-slate-500 border-t border-dashed">
                <span>Method: {activeVoucher.paymentMode}</span>
                <span>Audit trail sequence locked</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t bg-slate-50">
              <button
                type="button"
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors"
                onClick={() => setActiveVoucher(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                onClick={() => {
                  const printContent = document.getElementById('print-salary-receipt')?.innerHTML;
                  const originalContent = document.body.innerHTML;
                  if (printContent) {
                    document.body.innerHTML = printContent;
                    window.print();
                    document.body.innerHTML = originalContent;
                    window.location.reload();
                  }
                }}
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print slip</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
