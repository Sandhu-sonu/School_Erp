'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { 
  CreditCard, Calendar, User, CheckCircle2, AlertCircle, 
  Printer, X, Search, RefreshCw, FileText
} from 'lucide-react';
import Link from 'next/link';
import { PaymentMode } from '@prisma/client';

interface StaffItem {
  id: string;
  employeeCode: string;
  name: string;
  designation: string;
  monthlySalary: number;
  status: string;
}

interface SalaryReceipt {
  id: string;
  receiptNumber: string;
  month: number;
  year: number;
  grossSalary: number;
  adjustment: number;
  paymentMethod: string;
  remarks: string | null;
  createdAt: string;
}

export default function ManualSalaryDesk() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isClerk = userRole === 'CLERK';

  // Selection states
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Staff search states
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffSuggestions, setStaffSuggestions] = useState<StaffItem[]>([]);
  const [isSearchingStaff, setIsSearchingStaff] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffItem | null>(null);

  // Form payment input states
  const [adjustment, setAdjustment] = useState<string>('0');
  const [remarks, setRemarks] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMode>('CASH');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Receipt printable modal state
  const [activeReceipt, setActiveReceipt] = useState<SalaryReceipt | null>(null);

  // Search staff suggestions
  useEffect(() => {
    if (staffSearchQuery.trim().length < 1) {
      setStaffSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearchingStaff(true);
      try {
        // Query ACTIVE staff only
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

  // Clerk Access Block
  if (isClerk) {
    return (
      <div className="erp-card p-8 text-center space-y-4 max-w-lg mx-auto mt-12 border-red-200 bg-red-50">
        <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Access Denied</h2>
        <p className="text-xs text-slate-600">Clerks are restricted from accessing the Salary Disbursement Desk.</p>
        <Link href="/dashboard" className="erp-btn-secondary inline-block">Go to Dashboard</Link>
      </div>
    );
  }

  // Calculations
  const gross = selectedStaff ? Number(selectedStaff.monthlySalary) : 0;
  const adjAmt = Number(adjustment) || 0;
  const finalPaid = Math.max(0, gross + adjAmt);

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/hr/salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: selectedStaff.id,
          month: Number(selectedMonth),
          year: Number(selectedYear),
          grossSalary: gross,
          adjustment: adjAmt,
          paymentMethod,
          remarks,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Salary Payment Recorded successfully! Receipt: ${data.receiptNumber}`);
        setActiveReceipt(data);
        // Clear desk form
        setSelectedStaff(null);
        setAdjustment('0');
        setRemarks('');
        setStaffSearchQuery('');
        setPaymentMethod('CASH');
      } else {
        setErrorMsg(data.error || 'Failed to record salary payment.');
      }
    } catch (err) {
      setErrorMsg('Network error while processing salary transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Salary Disbursement Desk</h1>
          <p className="text-xs text-slate-500">Record manual salary payments and generate locked transaction-safe expense logs.</p>
        </div>
        <Link href="/dashboard/hr/staff" className="erp-btn-secondary flex items-center gap-1">
          <Search className="h-4 w-4" />
          <span>Staff Directory</span>
        </Link>
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

      {/* Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Form Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded shadow-sm p-3 relative space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              1. Salary Period & Employee Selection
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Select Month</label>
                <select
                  className="erp-input font-semibold"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1).toLocaleString('en-US', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Select Year</label>
                <select
                  className="erp-input font-semibold"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {[2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Staff suggestion search */}
              <div className="space-y-1 col-span-2 md:col-span-1 relative">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Select Active Staff</label>
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
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-[11px] flex justify-between items-center transition-colors"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{st.name}</span>
                          <span className="ml-1.5 font-mono text-slate-500">({st.employeeCode})</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{st.designation}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected staff panel detail */}
            {selectedStaff && (
              <div className="bg-slate-50 border border-slate-200 p-3 rounded text-xs grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-slate-400 block text-[10px]">Staff Name</span>
                  <span className="font-bold text-slate-800">{selectedStaff.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Employee Code</span>
                  <span className="font-mono font-bold text-slate-700">{selectedStaff.employeeCode}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Designation</span>
                  <span className="font-semibold text-slate-800">{selectedStaff.designation}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Contract Salary</span>
                  <span className="font-bold text-blue-700 font-mono">₹{Number(selectedStaff.monthlySalary).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Form details input */}
          {selectedStaff && (
            <div className="erp-card space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                2. Payment Details & Adjustments
              </h3>

              <form onSubmit={handleSubmitPayment} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Adjustment Dues (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="erp-input font-bold"
                      placeholder="0.00"
                      value={adjustment}
                      onChange={(e) => setAdjustment(e.target.value)}
                    />
                    <span className="text-[9px] text-slate-400 block">Use negative prefix for deductions (e.g. -500)</span>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Payment Method</label>
                    <select
                      className="erp-input font-semibold"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMode)}
                    >
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI</option>
                      <option value="BANK">BANK / ONLINE</option>
                      <option value="CHEQUE">CHEQUE</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Remarks / Notes</label>
                    <input
                      type="text"
                      className="erp-input"
                      placeholder="Voucher details, cheque reference..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || finalPaid <= 0}
                    className="erp-btn-primary bg-green-600 hover:bg-green-700 w-full md:w-auto px-8"
                  >
                    {isSubmitting ? 'Recording Disbursement...' : 'Disburse & Print Receipt'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {!selectedStaff && (
            <div className="erp-card py-16 text-center text-slate-400 text-xs border-dashed">
              Select a period and search for an active employee to load the salary disbursement ledger.
            </div>
          )}
        </div>

        {/* Right Sticky Summary Column */}
        <div>
          {selectedStaff && (
            <div className="erp-card bg-slate-900 border-slate-800 text-slate-100 sticky top-6 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
                Disbursement Preview
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Contract Base Salary</span>
                  <span className="font-semibold font-mono text-slate-200">₹{gross.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Adjustment Entry</span>
                  <span className={`font-semibold font-mono ${adjAmt < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                    {adjAmt >= 0 ? '+' : ''}₹{adjAmt.toFixed(2)}
                  </span>
                </div>
                <hr className="border-slate-800" />
                <div className="flex justify-between items-center py-1">
                  <span className="font-bold text-slate-300">Final Net Paid</span>
                  <span className="text-lg font-extrabold text-green-400 font-mono">₹{finalPaid.toFixed(2)}</span>
                </div>

                <div className="bg-slate-950 p-2.5 border border-slate-800 rounded mt-2 space-y-1.5 text-[10px] text-slate-400">
                  <p>• Period: {selectedMonth}/{selectedYear}</p>
                  <p>• Method: {paymentMethod}</p>
                  <p>• Payee: {selectedStaff.name}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Salary Receipt Modal */}
      {activeReceipt && selectedStaff && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full flex flex-col">
            <div className="flex justify-between items-center px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="text-xs font-bold text-slate-800">Salary Payment Receipt</h3>
              <button onClick={() => setActiveReceipt(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div id="print-salary-receipt" className="p-6 space-y-4 text-xs font-mono text-slate-800">
              <div className="text-center border-b border-dashed pb-3 mb-3">
                <h1 className="text-sm font-bold uppercase text-slate-900">SCHOOL ERP</h1>
                <p className="text-[9px] text-slate-500">123 Education Blvd, New Delhi</p>
                <p className="text-[10px] font-bold border border-slate-850 px-2 mt-2 inline-block">SALARY VOUCHER</p>
              </div>

              <div className="space-y-1.5 border-b border-dashed pb-3 mb-3">
                <p>Receipt: <strong>{activeReceipt.receiptNumber}</strong></p>
                <p>Date: {new Date(activeReceipt.createdAt).toLocaleString()}</p>
                <p>Staff: {selectedStaff.name} ({selectedStaff.employeeCode})</p>
                <p>Designation: {selectedStaff.designation}</p>
                <p>Salary Period: {activeReceipt.month}/{activeReceipt.year}</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span>Gross Contract Salary</span>
                  <span>₹{Number(activeReceipt.grossSalary).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Adjustments Applied</span>
                  <span>{Number(activeReceipt.adjustment) >= 0 ? '+' : ''}₹{Number(activeReceipt.adjustment).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-dashed pt-2 mt-2 text-slate-950 text-sm">
                  <span>Net Disbursed</span>
                  <span>₹{(Number(activeReceipt.grossSalary) + Number(activeReceipt.adjustment)).toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-6 flex justify-between text-[9px] text-slate-500">
                <span>Method: {activeReceipt.paymentMethod}</span>
                <span>Audit trail sequence locked</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t bg-slate-50">
              <button
                type="button"
                className="erp-btn-secondary"
                onClick={() => setActiveReceipt(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="erp-btn-primary flex items-center gap-1.5"
                onClick={() => window.print()}
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
