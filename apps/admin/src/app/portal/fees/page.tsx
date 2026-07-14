'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CreditCard, ChevronRight, FileDown, CheckCircle, Printer, X } from 'lucide-react';

interface Transaction {
  id: string;
  receiptNumber: string;
  amount: number;
  discountAmount: number;
  waiverAmount: number;
  paymentMode: string;
  notes: string | null;
  status: string;
  createdAt: string;
}

interface Adjustment {
  id: string;
  amount: number;
  type: string;
  reason: string;
  createdAt: string;
}

interface FeeDetails {
  feeAccount: {
    totalFee: number;
    paidAmount: number;
    discount: number;
    waiver: number;
    remainingFee: number;
    feeStatus: string;
  } | null;
  transactions: Transaction[];
  adjustments: Adjustment[];
}

export default function PortalFeesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get('studentId');

  const [data, setData] = useState<FeeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!studentId) return;

    const fetchFees = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/portal/fees?studentId=${studentId}`);
        if (!res.ok) throw new Error('Failed to load fees data.');
        const feesData = await res.json();
        setData(feesData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFees();
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data || !data.feeAccount) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <CreditCard className="h-10 w-10 text-slate-400 mx-auto mb-3" />
        <h3 className="font-bold text-slate-700">No Billing Profile</h3>
        <p className="text-xs text-slate-450 mt-1">There is no billing account open for this student in the current session.</p>
      </div>
    );
  }

  const { feeAccount, transactions, adjustments } = data;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 select-none pb-4">
      {/* Page Header */}
      <div>
        <h2 className="text-sm font-bold text-slate-800">Fees & Billings</h2>
        <p className="text-[10px] text-slate-500">View detailed session invoices, payments, and print receipts.</p>
      </div>

      {/* Summary Card */}
      <div className="bg-slate-900 text-slate-300 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Balance</p>
            <h3 className="text-xl font-bold text-white mt-1">
              ₹{feeAccount.remainingFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
            feeAccount.feeStatus === 'PAID' ? 'bg-green-600 text-white' :
            feeAccount.feeStatus === 'PARTIAL' ? 'bg-amber-600 text-white' :
            'bg-red-600 text-white'
          }`}>
            {feeAccount.feeStatus}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-4 text-center">
          <div>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Total Billed</p>
            <p className="text-xs font-semibold text-slate-200 mt-0.5">₹{feeAccount.totalFee.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Total Paid</p>
            <p className="text-xs font-semibold text-green-400 mt-0.5">₹{feeAccount.paidAmount.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Adj / Waivers</p>
            <p className="text-xs font-semibold text-blue-400 mt-0.5">₹{(feeAccount.discount + feeAccount.waiver).toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Payment History List */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <CheckCircle className="h-3.5 w-3.5 text-slate-450" />
          Payment Transactions
        </h3>
        {transactions.length === 0 ? (
          <div className="p-4 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400 bg-white">
            No payments recorded yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {transactions.map((t) => (
              <div 
                key={t.id} 
                className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm flex justify-between items-center hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">{t.receiptNumber}</span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      t.status === 'COMPLETED' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-semibold mt-1">
                    {new Date(t.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                    {t.notes && ` • ${t.notes}`}
                  </p>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Mode: {t.paymentMode}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-xs font-bold text-green-700">₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    {t.discountAmount + t.waiverAmount > 0 && (
                      <p className="text-[9px] text-blue-600 font-medium">Adj: ₹{(t.discountAmount + t.waiverAmount).toLocaleString('en-IN')}</p>
                    )}
                  </div>
                  {t.status === 'COMPLETED' && (
                    <button 
                      onClick={() => setSelectedReceipt(t)}
                      className="p-1.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-100 transition-colors"
                      title="View Receipt"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Adjustments Summary List */}
      {adjustments.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-slate-450" />
            Adjustments & Allowances
          </h3>
          <div className="space-y-2 bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden shadow-sm">
            {adjustments.map((a) => (
              <div key={a.id} className="p-3 flex justify-between items-center">
                <div>
                  <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                    a.type === 'DEBIT' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {a.type}
                  </span>
                  <p className="text-xs font-semibold text-slate-800 mt-1">{a.reason}</p>
                  <span className="text-[9px] text-slate-400 font-semibold">
                    {new Date(a.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <span className={`text-xs font-bold ${a.type === 'DEBIT' ? 'text-red-600' : 'text-blue-600'}`}>
                  {a.type === 'DEBIT' ? '+' : '-'} ₹{a.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receipt Print Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 flex flex-col relative print:border-0 print:shadow-none print:absolute print:inset-0 print:max-w-none">
            {/* Modal Actions */}
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 print:hidden">
              <h4 className="text-xs font-bold text-slate-700">Receipt Details</h4>
              <div className="flex gap-2">
                <button 
                  onClick={handlePrint}
                  className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center border border-blue-500 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                </button>
                <button 
                  onClick={() => setSelectedReceipt(null)}
                  className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg flex items-center justify-center border border-slate-100 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Print Slip Layout */}
            <div className="p-6 space-y-5 print:p-0">
              <div className="text-center border-b border-slate-150 pb-4">
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">FEE TRANSACTION SLIP</h2>
                <p className="text-[10px] text-slate-500 font-semibold mt-1">Official Fee Payment Acknowledgement</p>
              </div>

              <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Receipt Number</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedReceipt.receiptNumber}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Payment Date</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {new Date(selectedReceipt.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Payment Mode</span>
                  <p className="font-semibold text-slate-800 mt-0.5 uppercase">{selectedReceipt.paymentMode}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Status</span>
                  <p className="font-bold text-green-700 mt-0.5 uppercase">{selectedReceipt.status}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 print:bg-white print:border-y print:rounded-none">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600">Amount Collected:</span>
                  <span className="font-bold text-slate-900 text-sm">₹{selectedReceipt.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {selectedReceipt.discountAmount + selectedReceipt.waiverAmount > 0 && (
                  <div className="flex justify-between items-center text-xs mt-2 border-t border-slate-100 pt-2 text-slate-500 font-medium">
                    <span>Adjudicated Reductions:</span>
                    <span>₹{(selectedReceipt.discountAmount + selectedReceipt.waiverAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              {selectedReceipt.notes && (
                <div>
                  <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Payment Notes / Remarks</span>
                  <p className="text-xs text-slate-650 mt-0.5 leading-relaxed italic">"{selectedReceipt.notes}"</p>
                </div>
              )}

              <div className="text-center text-[9px] text-slate-400 pt-4 border-t border-slate-100 mt-4">
                Thank you for your payment. This is a computer generated receipt, signature not required.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
