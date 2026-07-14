'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { 
  Search, User, CreditCard, Receipt, Printer, X, 
  ArrowLeftRight, AlertCircle, CheckCircle2, RefreshCw 
} from 'lucide-react';
import { PaymentMode } from '@prisma/client';

interface Transaction {
  id: string;
  amount: number;
  discountAmount: number;
  waiverAmount: number;
  receiptNumber: string;
  paymentMode: PaymentMode;
  transactionDate: string;
  collectedBy: { name: string };
  notes: string | null;
  isReversed: boolean;
}

interface StudentDetail {
  id: string;
  admissionNumber: string;
  name: string;
  parent: {
    fatherName: string;
    mobile: string;
  };
  status: string;
  enrollments: Array<{
    id: string;
    class: { name: string };
    section: { name: string } | null;
    feeAccount: {
      id: string;
      totalFee: number;
      paidAmount: number;
      discount: number;
      waiver: number;
      remainingFee: number;
      feeStatus: string;
      transactions: Transaction[];
    } | null;
    transport: {
      stop: {
        name: string;
        fare: number;
        route: { name: string };
      };
    } | null;
  }>;
}

export default function FeeCollectionDesk() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isClerk = userRole === 'CLERK';

  const searchParams = useSearchParams();
  const querySearch = searchParams.get('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentDetail[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Selected student details
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Auto-fetch student on mount if search parameter is present in URL
  useEffect(() => {
    if (querySearch) {
      const fetchAndSelectStudent = async () => {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/finance/students?search=${encodeURIComponent(querySearch)}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              loadStudentDetail(data[0].id);
            }
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearching(false);
        }
      };
      fetchAndSelectStudent();
    }
  }, [querySearch]);

  // Form collection states
  const [amount, setAmount] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<string>('');
  const [waiverAmount, setWaiverAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Receipt modal states
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);
  const [receiptPrintLayout, setReceiptPrintLayout] = useState<'A4' | 'THERMAL'>('A4');
  
  // Reversal state
  const [reversalTarget, setReversalTarget] = useState<Transaction | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isReversing, setIsReversing] = useState(false);

  // Ref for focus
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Search debounce/fetch
  useEffect(() => {
    if (searchQuery.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/finance/students?search=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Load student detail helper
  const loadStudentDetail = async (id: string) => {
    setIsLoadingDetails(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/finance/students/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedStudent(data);
        setSearchQuery('');
        setSearchResults([]);
        // Clear form
        setAmount('');
        setDiscountAmount('');
        setWaiverAmount('');
        setNotes('');
        setPaymentMode('CASH');
        
        // Autofocus Collected Amount input for fast cashier workflow
        setTimeout(() => {
          amountInputRef.current?.focus();
        }, 100);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to load student details');
      }
    } catch (err) {
      setErrorMsg('Error loading student details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Quick amount buttons helper
  const addQuickAmount = (val: number) => {
    const current = Number(amount) || 0;
    const remaining = selectedStudent?.enrollments[0]?.feeAccount?.remainingFee || 0;
    const nextAmount = Math.min(remaining, current + val);
    setAmount(nextAmount.toString());
    amountInputRef.current?.focus();
  };

  const handleClearDues = () => {
    const remaining = selectedStudent?.enrollments[0]?.feeAccount?.remainingFee || 0;
    setAmount(remaining.toString());
    amountInputRef.current?.focus();
  };

  // Submit payment handler
  const handleCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    const enrollment = selectedStudent.enrollments[0];
    if (!enrollment) {
      setErrorMsg('No active enrollment found for student.');
      return;
    }

    const collectAmt = Number(amount) || 0;
    const discountAmt = Number(discountAmount) || 0;
    const waiverAmt = Number(waiverAmount) || 0;
    const remaining = Number(enrollment.feeAccount?.remainingFee || 0);

    if (collectAmt + discountAmt + waiverAmt <= 0) {
      setErrorMsg('Total collection amount/adjustment must be greater than zero.');
      return;
    }

    if (collectAmt + discountAmt + waiverAmt > remaining) {
      setErrorMsg(`Collection amount exceeds outstanding balance of ₹${remaining.toFixed(2)}.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/finance/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId: enrollment.id,
          amount: collectAmt,
          discountAmount: discountAmt,
          waiverAmount: waiverAmt,
          paymentMode,
          notes,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(`Collection successful! Receipt Generated: ${data.receiptNumber}`);
        // Refresh details
        await loadStudentDetail(selectedStudent.id);
        // Set receipt active to display receipt modal immediately
        setActiveReceipt(data);
      } else {
        setErrorMsg(data.error || 'Fee collection failed');
      }
    } catch (err) {
      setErrorMsg('Network error while processing fee collection');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reversal handler
  const handleReversalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTarget || !selectedStudent) return;

    setIsReversing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/finance/reversals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: reversalTarget.id,
          reason: reversalReason,
        }),
      });

      if (res.ok) {
        setSuccessMsg(`Reversal completed for receipt ${reversalTarget.receiptNumber}.`);
        setReversalTarget(null);
        setReversalReason('');
        // Reload details
        await loadStudentDetail(selectedStudent.id);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Reversal failed');
      }
    } catch (err) {
      setErrorMsg('Error processing transaction reversal');
    } finally {
      setIsReversing(false);
    }
  };

  // Helper variables for computations
  const activeEnrollment = selectedStudent?.enrollments[0];
  const feeAccount = activeEnrollment?.feeAccount;
  const transport = activeEnrollment?.transport;

  const currentOutstanding = feeAccount ? Number(feeAccount.remainingFee) : 0;
  const proposedAmount = Number(amount) || 0;
  const proposedDiscount = Number(discountAmount) || 0;
  const proposedWaiver = Number(waiverAmount) || 0;
  const totalAdjusted = proposedAmount + proposedDiscount + proposedWaiver;
  const newOutstanding = Math.max(0, currentOutstanding - totalAdjusted);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Fee Collection Desk</h1>
          <p className="text-xs text-slate-500">Collect dues, apply waivers/discounts, and print localized receipts instantly.</p>
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Search & Student Info & Collection Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Search Box */}
          <div className="erp-card relative">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Search Student</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                className="erp-input pl-9"
                placeholder="Type Admission No, Student Name, or Parent Mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isSearching && (
                <div className="absolute right-3 top-2.5">
                  <RefreshCw className="h-3.5 w-3.5 text-slate-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Suggestions drop */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-55 divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {searchResults.map((std) => (
                  <button
                    key={std.id}
                    onClick={() => loadStudentDetail(std.id)}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{std.name}</span>
                      <span className="ml-2 font-mono text-slate-500">({std.admissionNumber})</span>
                    </div>
                    <div className="text-right text-slate-400">
                      <span>F: {std.parent.fatherName}</span>
                      <span className="ml-3 font-mono">{std.parent.mobile}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Student Profile Card (Only if selected) */}
          {selectedStudent && (
            <div className="erp-card bg-slate-50 border-slate-200">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  Student Ledger Record
                </h3>
                <span className="erp-badge bg-blue-100 text-blue-800 font-mono text-[10px] font-bold">
                  {selectedStudent.admissionNumber}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Name</span>
                  <span className="font-bold text-slate-800">{selectedStudent.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Class & Sec</span>
                  <span className="font-semibold text-slate-800">
                    {activeEnrollment?.class?.name || 'Unassigned'} 
                    {activeEnrollment?.section ? ` - ${activeEnrollment.section.name}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Parent Name</span>
                  <span className="font-medium text-slate-800">{selectedStudent.parent.fatherName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Parent Mobile</span>
                  <span className="font-mono text-slate-800">{selectedStudent.parent.mobile}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error and Success Alerts */}
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

          {/* Cashier Desk Input Form */}
          {selectedStudent && (
            <div className="erp-card space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                Collection details
              </h3>

              <form onSubmit={handleCollect} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Collected Amount Input */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">
                      Collected Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={amountInputRef}
                      type="number"
                      step="0.01"
                      className="erp-input text-base font-semibold py-2"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                    {/* Quick Amount Buttons */}
                    <div className="flex gap-1 mt-1.5">
                      <button
                        type="button"
                        onClick={() => addQuickAmount(500)}
                        className="flex-1 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded"
                      >
                        +₹500
                      </button>
                      <button
                        type="button"
                        onClick={() => addQuickAmount(1000)}
                        className="flex-1 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded"
                      >
                        +₹1000
                      </button>
                      <button
                        type="button"
                        onClick={() => addQuickAmount(5000)}
                        className="flex-1 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded"
                      >
                        +₹5000
                      </button>
                      <button
                        type="button"
                        onClick={handleClearDues}
                        className="px-2 py-1 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded whitespace-nowrap"
                      >
                        Clear Dues
                      </button>
                    </div>
                  </div>

                  {/* Discount / Waiver Adjustments */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Discount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="erp-input text-base font-semibold py-2"
                      placeholder="0.00"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Waiver (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="erp-input text-base font-semibold py-2"
                      placeholder="0.00"
                      value={waiverAmount}
                      onChange={(e) => setWaiverAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Payment Mode Selection */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Payment Mode</label>
                    <select
                      className="erp-input py-2"
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                    >
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI</option>
                      <option value="BANK">BANK / ONLINE</option>
                      <option value="CHEQUE">CHEQUE</option>
                    </select>
                  </div>

                  {/* Notes / Remarks */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Notes / Remarks</label>
                    <input
                      type="text"
                      className="erp-input py-2"
                      placeholder="Cheque number, transaction ID reference..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || totalAdjusted <= 0 || totalAdjusted > currentOutstanding}
                    className="erp-btn-primary w-full md:w-auto px-6 py-2 bg-green-600 hover:bg-green-700 text-xs font-bold uppercase tracking-wider"
                  >
                    {isSubmitting ? 'Processing Payment...' : 'Collect & Generate Receipt'}
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {!selectedStudent && (
            <div className="erp-card py-16 text-center text-slate-400 text-xs border-dashed">
              Search and select a student to load the cashier desk.
            </div>
          )}
        </div>

        {/* Right Column: Sticky Summary & History logs */}
        <div className="space-y-6">
          {/* Sticky Fee Account Dues Summary */}
          {selectedStudent && feeAccount && (
            <div className="erp-card border-slate-300 shadow sticky top-6 bg-slate-900 text-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">
                Outstanding Balance Snapshot
              </h3>
              
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Billable Fee</span>
                  <span className="font-semibold text-slate-200">₹{Number(feeAccount.totalFee).toFixed(2)}</span>
                </div>
                {transport && (
                  <div className="flex justify-between text-[11px] text-slate-400 pl-3">
                    <span>• Transport: {transport.stop.name}</span>
                    <span>₹{Number(transport.stop.fare).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Paid Till Date</span>
                  <span className="font-semibold text-green-400">₹{Number(feeAccount.paidAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Discount Applied</span>
                  <span className="font-semibold text-blue-400">₹{Number(feeAccount.discount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Waiver Applied</span>
                  <span className="font-semibold text-amber-400">₹{Number(feeAccount.waiver).toFixed(2)}</span>
                </div>
                <hr className="border-slate-800" />
                <div className="flex justify-between items-center py-1">
                  <span className="font-bold text-slate-300">Outstanding Dues</span>
                  <span className="text-lg font-extrabold text-red-400">₹{currentOutstanding.toFixed(2)}</span>
                </div>

                {/* Proposed State Calculations */}
                {totalAdjusted > 0 && (
                  <div className="bg-slate-950 p-2.5 border border-slate-800 rounded mt-2 space-y-1.5 text-[11px]">
                    <div className="text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-1">
                      Proposed Collection
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Paying Amount</span>
                      <span className="font-bold text-green-400">₹{proposedAmount.toFixed(2)}</span>
                    </div>
                    {proposedDiscount > 0 && (
                      <div className="flex justify-between text-slate-300">
                        <span>New Discount</span>
                        <span className="font-bold text-blue-400">₹{proposedDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    {proposedWaiver > 0 && (
                      <div className="flex justify-between text-slate-300">
                        <span>New Waiver</span>
                        <span className="font-bold text-amber-400">₹{proposedWaiver.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-1 mt-1">
                      <span>New Dues Balance</span>
                      <span className="font-bold text-slate-100">₹{newOutstanding.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Transaction History Log / Reversals */}
          {selectedStudent && feeAccount && (
            <div className="erp-card">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 border-b pb-2 flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-slate-400" />
                Receipts History
              </h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {(!feeAccount.transactions || feeAccount.transactions.length === 0) ? (
                  <p className="text-[11px] text-slate-400 text-center py-4">No receipts generated yet.</p>
                ) : (
                  feeAccount.transactions.map((tx) => (
                    <div 
                      key={tx.id} 
                      className={`p-2.5 border rounded text-xs space-y-1.5 transition-all ${
                        tx.isReversed 
                          ? 'border-red-100 bg-red-50/50 opacity-70' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-bold text-slate-800">{tx.receiptNumber}</span>
                        <span className={`erp-badge font-semibold text-[9px] ${
                          tx.isReversed 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {tx.isReversed ? 'REVERSED / VOID' : 'PAID'}
                        </span>
                      </div>

                      <div className="flex justify-between text-slate-600">
                        <span>Paid: <strong>₹{Number(tx.amount).toFixed(2)}</strong></span>
                        <span className="font-mono text-[10px]">{tx.paymentMode}</span>
                      </div>

                      {(Number(tx.discountAmount) > 0 || Number(tx.waiverAmount) > 0) && (
                        <div className="flex gap-2 text-[10px] text-slate-500">
                          {Number(tx.discountAmount) > 0 && <span>Disc: ₹{Number(tx.discountAmount).toFixed(2)}</span>}
                          {Number(tx.waiverAmount) > 0 && <span>Waiv: ₹{Number(tx.waiverAmount).toFixed(2)}</span>}
                        </div>
                      )}

                      <div className="text-[10px] text-slate-400 flex justify-between">
                        <span>By: {tx.collectedBy.name}</span>
                        <span>{new Date(tx.transactionDate).toLocaleDateString()}</span>
                      </div>

                      {tx.notes && (
                        <p className="text-[10px] text-slate-500 italic bg-slate-50 p-1 rounded font-mono">
                          Note: {tx.notes}
                        </p>
                      )}

                      <div className="flex justify-end gap-1.5 border-t border-slate-100 pt-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveReceipt(tx)}
                          className="flex items-center gap-1 p-1 rounded hover:bg-slate-100 text-blue-600 font-bold"
                          title="Print Receipt"
                        >
                          <Printer className="h-3 w-3" />
                          <span>Print</span>
                        </button>
                        
                        {!tx.isReversed && !isClerk && (
                          <button
                            type="button"
                            onClick={() => setReversalTarget(tx)}
                            className="flex items-center gap-1 p-1 rounded hover:bg-slate-100 text-red-600 font-bold"
                            title="Reverse Transaction"
                          >
                            <ArrowLeftRight className="h-3 w-3" />
                            <span>Reverse</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 1. Receipt Print/Modal (A4 & 80mm layout toggling) */}
      {activeReceipt && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-bold text-slate-800">Print Receipt: {activeReceipt.receiptNumber}</h3>
                
                {/* Print Layout Toggle */}
                <div className="flex border border-slate-200 rounded overflow-hidden">
                  <button
                    className={`px-3 py-1 text-xs font-semibold ${receiptPrintLayout === 'A4' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                    onClick={() => setReceiptPrintLayout('A4')}
                  >
                    A4 Page
                  </button>
                  <button
                    className={`px-3 py-1 text-xs font-semibold ${receiptPrintLayout === 'THERMAL' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                    onClick={() => setReceiptPrintLayout('THERMAL')}
                  >
                    80mm Thermal
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setActiveReceipt(null)}
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Scrollable Receipt View */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
              
              {/* Conditional Layouts based on Selection */}
              {receiptPrintLayout === 'A4' ? (
                /* A4 Layout View */
                <div id="print-area-a4" className="w-[210mm] bg-white border border-slate-300 p-8 shadow-sm flex flex-col font-sans text-slate-800">
                  <div className="flex justify-between border-b pb-6 mb-6">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900">SCHOOL ERP PRIMARY</h1>
                      <p className="text-xs text-slate-500">123 Education Boulevard, New Delhi, India</p>
                      <p className="text-xs text-slate-500 font-mono">GSTIN: 07AAAAA1111A1Z1 | Phone: +91 11 2345 6789</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-lg font-bold text-slate-700">FEE RECEIPT</h2>
                      <p className="text-sm font-mono font-bold text-blue-600 mt-1">{activeReceipt.receiptNumber}</p>
                      <p className="text-xs text-slate-500 mt-1">Date: {new Date(activeReceipt.transactionDate).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Student profile details row */}
                  <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 border rounded mb-6 text-xs">
                    <div className="space-y-1">
                      <p className="text-slate-400">Student Profile</p>
                      <p className="font-bold text-slate-900">{selectedStudent.name}</p>
                      <p className="font-mono text-slate-600">Admission No: {selectedStudent.admissionNumber}</p>
                      <p className="text-slate-600">
                        Class: {activeEnrollment?.class?.name || 'N/A'}
                        {activeEnrollment?.section ? ` (Sec ${activeEnrollment.section.name})` : ''}
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-slate-400">Parent Details</p>
                      <p className="font-bold text-slate-900">F: {selectedStudent.parent.fatherName}</p>
                      <p className="font-mono text-slate-600">Mobile: {selectedStudent.parent.mobile}</p>
                    </div>
                  </div>

                  {/* Line item details */}
                  <table className="w-full text-xs text-left mb-6 border-collapse">
                    <thead>
                      <tr className="border-b bg-slate-100">
                        <th className="py-2.5 px-3 font-bold text-slate-700">Particulars Description</th>
                        <th className="py-2.5 px-3 text-right font-bold text-slate-700">Total Dues</th>
                        <th className="py-2.5 px-3 text-right font-bold text-slate-700">Paid Amount</th>
                        <th className="py-2.5 px-3 text-right font-bold text-slate-700">Remaining Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2.5 px-3 font-medium">Academic Fees (Tuition + Admission + Charges)</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{Number(feeAccount?.totalFee || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{Number(activeReceipt.amount).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          ₹{Math.max(0, Number(feeAccount?.remainingFee || 0)).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Summary grid */}
                  <div className="grid grid-cols-2 gap-8 items-end mt-auto pt-8 border-t">
                    <div className="flex items-center gap-4">
                      {/* QR Ready placeholder */}
                      <div className="border border-slate-300 p-2 bg-slate-50 flex items-center justify-center rounded">
                        <div className="w-16 h-16 bg-white border border-slate-200 flex flex-col items-center justify-center text-[7px] text-slate-400 font-mono select-none">
                          <span>QR READY</span>
                          <span>{activeReceipt.receiptNumber}</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        <p className="font-semibold text-slate-700">Terms & Conditions:</p>
                        <p>1. Receipts are immutable and transaction-safe.</p>
                        <p>2. Corrections create an audited reversal transaction.</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-right">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Subtotal Paid</span>
                        <span className="font-semibold font-mono text-slate-800">₹{Number(activeReceipt.amount).toFixed(2)}</span>
                      </div>
                      {Number(activeReceipt.discountAmount) > 0 && (
                        <div className="flex justify-between text-blue-600">
                          <span>Discount Applied</span>
                          <span className="font-semibold font-mono">-₹{Number(activeReceipt.discountAmount).toFixed(2)}</span>
                        </div>
                      )}
                      {Number(activeReceipt.waiverAmount) > 0 && (
                        <div className="flex justify-between text-amber-600">
                          <span>Waiver Applied</span>
                          <span className="font-semibold font-mono">-₹{Number(activeReceipt.waiverAmount).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-1.5 text-sm font-bold text-slate-900">
                        <span>Total Collection</span>
                        <span className="font-mono text-green-700">₹{Number(activeReceipt.amount).toFixed(2)}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 font-mono">
                        Mode: {activeReceipt.paymentMode} | Collected by: {activeReceipt.collectedBy.name}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* 80mm Thermal Receipt Layout */
                <div id="print-area-thermal" className="w-[80mm] bg-white border border-slate-300 p-4 shadow-sm font-mono text-slate-800 text-[10px] flex flex-col">
                  <div className="text-center border-b border-dashed pb-3 mb-3">
                    <h1 className="text-xs font-bold uppercase text-slate-900">SCHOOL ERP</h1>
                    <p className="text-[8px] text-slate-500">123 Education Blvd, New Delhi</p>
                    <p className="text-[8px] text-slate-500">Ph: +91 11 2345 6789</p>
                    <h2 className="text-[10px] font-bold border border-slate-800 px-1 mt-2 inline-block">FEE RECEIPT</h2>
                  </div>

                  <div className="space-y-1 border-b border-dashed pb-3 mb-3">
                    <p>Receipt: <strong>{activeReceipt.receiptNumber}</strong></p>
                    <p>Date: {new Date(activeReceipt.transactionDate).toLocaleDateString()}</p>
                    <p>Student: {selectedStudent.name}</p>
                    <p>Admn No: {selectedStudent.admissionNumber}</p>
                    <p>Class: {activeEnrollment?.class?.name || 'N/A'}</p>
                  </div>

                  <table className="w-full text-left border-collapse mb-3">
                    <thead>
                      <tr className="border-b border-dashed">
                        <th className="pb-1 font-bold text-slate-700">Particulars</th>
                        <th className="pb-1 text-right font-bold text-slate-700">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="py-1">
                        <td>Academic Fee Dues</td>
                        <td className="text-right">₹{Number(activeReceipt.amount).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="space-y-1 border-t border-dashed pt-3 text-right">
                    <div className="flex justify-between">
                      <span>Amt Paid</span>
                      <span>₹{Number(activeReceipt.amount).toFixed(2)}</span>
                    </div>
                    {Number(activeReceipt.discountAmount) > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Discount</span>
                        <span>-₹{Number(activeReceipt.discountAmount).toFixed(2)}</span>
                      </div>
                    )}
                    {Number(activeReceipt.waiverAmount) > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Waiver</span>
                        <span>-₹{Number(activeReceipt.waiverAmount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t border-dashed pt-1 mt-1 text-slate-900">
                      <span>Total Collection</span>
                      <span>₹{Number(activeReceipt.amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[8px] text-slate-500 pt-2 text-left">
                      <span>Mode: {activeReceipt.paymentMode}</span>
                      <span>By: {activeReceipt.collectedBy.name}</span>
                    </div>
                  </div>

                  {/* QR Place */}
                  <div className="flex flex-col items-center justify-center mt-4 pt-3 border-t border-dashed">
                    <div className="w-12 h-12 border border-slate-300 flex items-center justify-center bg-slate-50 text-[6px] text-slate-400">
                      QR Ready
                    </div>
                    <p className="text-[7px] text-slate-400 mt-1 select-none">Immutable Receipt Sequence</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50">
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
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Reversal Confirmation Modal */}
      {reversalTarget && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full flex flex-col p-6">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
              <ArrowLeftRight className="h-5 w-5 text-red-500" />
              Reverse Transaction: {reversalTarget.receiptNumber}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Reversing a transaction is a secure, audited correction process. 
              The original transaction will be marked as reversed, and a balancing negative transaction ledger row will be written.
            </p>

            <form onSubmit={handleReversalSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Reason for Reversal</label>
                <input
                  type="text"
                  className="erp-input py-2"
                  placeholder="e.g. Paid in wrong account, wrong payment mode selected..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="erp-btn-secondary"
                  onClick={() => {
                    setReversalTarget(null);
                    setReversalReason('');
                  }}
                  disabled={isReversing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="erp-btn-primary bg-red-600 hover:bg-red-700"
                  disabled={isReversing || !reversalReason}
                >
                  {isReversing ? 'Processing Reversal...' : 'Confirm Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
