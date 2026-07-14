'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CreditCard, Calendar, Plus, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import { PaymentMode } from '@prisma/client';

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  expenseDate: string;
  paidTo: string;
  paymentMode: PaymentMode;
  notes: string | null;
}

export default function ExpensesLogPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isClerk = userRole === 'CLERK';

  // State hooks
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Create expense form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Utility');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidTo, setPaidTo] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch expenses
  const loadExpenses = async () => {
    if (isClerk) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/finance/expenses');
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [isClerk]);

  // Clerk Restrictions Lock
  if (isClerk) {
    return (
      <div className="erp-card p-8 text-center space-y-4 max-w-lg mx-auto mt-12 border-red-200 bg-red-50">
        <AlertTriangle className="h-10 w-10 text-red-600 mx-auto" />
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Access Denied</h2>
        <p className="text-xs text-slate-600">
          Clerk accounts are restricted from viewing or registering operational expenses. Please consult your administrator.
        </p>
      </div>
    );
  }

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !paidTo) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          amount: Number(amount),
          category,
          expenseDate,
          paidTo,
          paymentMode,
          notes,
        }),
      });

      if (res.ok) {
        setSuccessMsg('Expense logged successfully!');
        setTitle('');
        setAmount('');
        setPaidTo('');
        setNotes('');
        setCategory('Utility');
        setPaymentMode('CASH');
        setExpenseDate(new Date().toISOString().split('T')[0]);
        // Reload list
        await loadExpenses();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to register expense log.');
      }
    } catch (err) {
      setErrorMsg('Network error while saving expense details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Operational Expenses Log</h1>
        <p className="text-xs text-slate-500">Record and review school expenditures, utility bills, salaries, and operational costs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: List of expenses */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Expense Vouchers</h3>
            <button
              onClick={loadExpenses}
              className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 flex items-center gap-1 text-xs"
              disabled={isLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="erp-card overflow-hidden">
            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="erp-table-header">Date</th>
                    <th className="erp-table-header">Expense Title</th>
                    <th className="erp-table-header">Category</th>
                    <th className="erp-table-header">Paid To</th>
                    <th className="erp-table-header text-right">Amount</th>
                    <th className="erp-table-header">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-xs text-slate-400">Loading expense logs...</td>
                    </tr>
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-xs text-slate-400">No expense vouchers registered yet.</td>
                    </tr>
                  ) : (
                    expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/50">
                        <td className="erp-table-cell font-mono">{new Date(exp.expenseDate).toLocaleDateString()}</td>
                        <td className="erp-table-cell font-medium text-slate-900">
                          <div>
                            <div>{exp.title}</div>
                            {exp.notes && <span className="text-[9px] text-slate-400 font-normal italic">{exp.notes}</span>}
                          </div>
                        </td>
                        <td className="erp-table-cell">
                          <span className="erp-badge bg-slate-100 text-slate-800">{exp.category}</span>
                        </td>
                        <td className="erp-table-cell">{exp.paidTo}</td>
                        <td className="erp-table-cell text-right font-bold text-red-600 font-mono">
                          ₹{Number(exp.amount).toFixed(2)}
                        </td>
                        <td className="erp-table-cell font-mono text-[10px]">{exp.paymentMode}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Add expense form */}
        <div className="erp-card space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-slate-400" />
            Log Operational Expense
          </h3>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-green-50 border border-green-200 rounded text-xs text-green-700 flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Expense Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="erp-input font-semibold"
                placeholder="Electricity bill, office stationery, etc."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Amount (₹) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  className="erp-input font-bold text-red-700"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Category</label>
                <select
                  className="erp-input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Salary">Salary</option>
                  <option value="Utility">Utility</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Rent">Rent</option>
                  <option value="Supplies">Supplies</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Expense Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  className="erp-input font-mono"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Payment Mode</label>
                <select
                  className="erp-input"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                >
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK">BANK / ONLINE</option>
                  <option value="CHEQUE">CHEQUE</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Paid To <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="erp-input font-semibold"
                placeholder="Vendor or recipient name"
                value={paidTo}
                onChange={(e) => setPaidTo(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Voucher Remarks / Notes</label>
              <textarea
                className="erp-input min-h-[60px]"
                placeholder="Invoice numbers, transaction references..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !title || !amount || !paidTo}
              className="erp-btn-primary w-full bg-red-600 hover:bg-red-700 text-xs font-bold uppercase tracking-wider mt-2"
            >
              {isSubmitting ? 'Logging expenditure...' : 'Log Expenditure Voucher'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
