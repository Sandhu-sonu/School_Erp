'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, User, CreditCard, Plus, Check, AlertCircle, 
  Edit, Printer, Ban, UserCheck, Calendar, Activity, GraduationCap 
} from 'lucide-react';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';

interface Adjustment {
  id: string;
  amount: number;
  reason: string;
  createdBy: { name: string };
  createdAt: string;
}

interface Payment {
  id: string;
  month: number;
  year: number;
  grossSalary: number;
  adjustment: number;
  paymentMethod: string;
  receiptNumber: string;
  remarks: string | null;
  createdBy: { name: string };
  createdAt: string;
  adjustments: Adjustment[];
}

interface StaffDetail {
  id: string;
  employeeCode: string;
  name: string;
  mobile: string;
  email: string | null;
  gender: string;
  dob: string;
  joiningDate: string;
  designation: string;
  qualification: string;
  monthlySalary: number;
  status: string;
  remarks: string | null;
  salaryPayments: Payment[];
}

type TabType = 'personal' | 'employment' | 'salary' | 'activity';

export default function StaffProfilePage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  
  const params = useParams();
  const staffId = params.id as string;
  const router = useRouter();

  // State hooks
  const [staff, setStaff] = useState<StaffDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('employment');

  // Adjustment form states
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  const loadStaffDetail = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/hr/staff/${staffId}`);
      if (res.ok) {
        const data = await res.json();
        setStaff(data);
      } else {
        setErrorMsg('Failed to load employee details.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error loading profile.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (staffId) loadStaffDetail();
  }, [staffId]);

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    if (!adjustmentAmount || !adjustmentReason) {
      alert('Please enter amount and reason.');
      return;
    }

    setIsSubmittingAdjustment(true);
    try {
      const res = await fetch(`/api/hr/salary/${selectedPayment.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(adjustmentAmount),
          reason: adjustmentReason,
        }),
      });

      if (res.ok) {
        setSuccessMsg('Salary adjustment successfully applied.');
        setAdjustmentAmount('');
        setAdjustmentReason('');
        setSelectedPayment(null);
        loadStaffDetail();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to apply adjustment.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating salary logs.');
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  const handleStatusChange = async (nextStatus: string) => {
    if (!staff) return;
    if (!confirm(`Are you sure you want to change staff status to ${nextStatus}?`)) return;

    try {
      const res = await fetch(`/api/hr/staff/${staff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...staff,
          status: nextStatus,
        }),
      });

      if (res.ok) {
        loadStaffDetail();
      } else {
        alert('Failed to update status.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (isLoading) {
    return <div className="text-center py-10 text-xs font-bold text-slate-400">Loading staff records...</div>;
  }

  if (errorMsg || !staff) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-semibold">
        {errorMsg || 'Employee profile not found.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link 
          href="/dashboard/hr/staff" 
          className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl transition-colors shadow-sm"
        >
          <ArrowLeft className="h-4 w-4 text-slate-655" />
        </Link>
        <div>
          <h1 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Staff HR Profile Card</h1>
          <p className="text-[10px] text-slate-455 font-bold uppercase">Inspect and manage payroll, logs, and metadata specifications.</p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <Check className="h-4.5 w-4.5" />
          {successMsg}
        </div>
      )}

      {/* Main CRM layouts split */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Card: Summary details */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="flex flex-col items-center text-center p-6 space-y-4">
            <Avatar name={staff.name} size="lg" />
            <div>
              <h2 className="text-sm font-bold text-slate-800 leading-tight">{staff.name}</h2>
              <span className="text-[10px] text-slate-400 font-bold uppercase mt-1 block">Emp Code: {staff.employeeCode}</span>
            </div>

            <Badge variant={staff.status === 'ACTIVE' ? 'success' : 'danger'}>{staff.status}</Badge>

            {/* Quick action buttons list */}
            <div className="w-full pt-4 border-t border-slate-100 space-y-2 text-left text-xs font-semibold text-slate-655">
              <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Quick Actions</h4>
              
              <button 
                onClick={() => router.push(`/dashboard/hr/staff/new?edit=${staff.id}`)}
                className="w-full p-2 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors"
              >
                <Edit className="h-4 w-4 text-blue-500" />
                Edit HR Info
              </button>

              {staff.status === 'ACTIVE' ? (
                <button 
                  onClick={() => handleStatusChange('INACTIVE')}
                  className="w-full p-2 hover:bg-red-50 text-red-700 rounded-xl flex items-center gap-2 transition-colors"
                >
                  <Ban className="h-4 w-4" />
                  Deactivate Account
                </button>
              ) : (
                <button 
                  onClick={() => handleStatusChange('ACTIVE')}
                  className="w-full p-2 hover:bg-green-50 text-green-700 rounded-xl flex items-center gap-2 transition-colors"
                >
                  <UserCheck className="h-4 w-4" />
                  Activate Account
                </button>
              )}
            </div>
          </Card>
        </div>

        {/* Right Card: Tab details */}
        <div className="lg:col-span-3 space-y-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {/* Tabs */}
          <div className="flex border-b border-slate-100 overflow-x-auto gap-4">
            {(
              [
                { id: 'employment', label: 'Employment Details', icon: GraduationCap },
                { id: 'personal', label: 'Personal Information', icon: User },
                { id: 'salary', label: 'Salary Ledger', icon: CreditCard },
                { id: 'activity', label: 'Activity Logs', icon: Activity }
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const isAct = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`pb-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap focus:outline-none ${
                    isAct ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="animate-in fade-in duration-200 text-xs font-semibold text-slate-700">
            {/* TAB: EMPLOYMENT */}
            {activeTab === 'employment' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Designation Role</span>
                  <p className="text-slate-800 mt-0.5">{staff.designation}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Base Monthly Salary</span>
                  <p className="text-slate-800 mt-0.5 font-bold font-mono text-green-700">{formatINR(staff.monthlySalary)}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Joining Date</span>
                  <p className="text-slate-800 mt-0.5 font-mono">{formatDate(staff.joiningDate)}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Qualification Specifications</span>
                  <p className="text-slate-800 mt-0.5">{staff.qualification}</p>
                </div>
                {staff.remarks && (
                  <div className="col-span-2 pt-2">
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Remarks / HR Profile Notes</span>
                    <p className="text-slate-600 mt-1 bg-slate-50 border border-slate-100 p-3 rounded-xl italic font-mono">{staff.remarks}</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: PERSONAL */}
            {activeTab === 'personal' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Full Legal Name</span>
                  <p className="text-slate-800 mt-0.5">{staff.name}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Gender</span>
                  <p className="text-slate-800 mt-0.5">{staff.gender}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Contact Mobile</span>
                  <p className="text-slate-800 mt-0.5 font-mono">{staff.mobile}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Email Address</span>
                  <p className="text-slate-800 mt-0.5 font-mono truncate">{staff.email || 'None'}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Date of Birth</span>
                  <p className="text-slate-800 mt-0.5 font-mono">{formatDate(staff.dob)}</p>
                </div>
              </div>
            )}

            {/* TAB: SALARY */}
            {activeTab === 'salary' && (
              <div className="space-y-6">
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Period Month</th>
                        <th className="px-4 py-2.5 text-left">Slip No</th>
                        <th className="px-4 py-2.5 text-left">Base salary</th>
                        <th className="px-4 py-2.5 text-left">Adjustments</th>
                        <th className="px-4 py-2.5 text-left">Net Paid</th>
                        <th className="px-4 py-2.5 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {staff.salaryPayments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-slate-400">No salary payment slips issued.</td>
                        </tr>
                      ) : (
                        staff.salaryPayments.map((pmt) => {
                          const totalAdjustment = pmt.adjustments?.reduce((sum: number, adj: any) => sum + Number(adj.amount), 0) || 0;
                          const net = Number(pmt.grossSalary) + totalAdjustment;
                          return (
                            <tr key={pmt.id}>
                              <td className="px-4 py-2.5 font-mono">{pmt.month}/{pmt.year}</td>
                              <td className="px-4 py-2.5 font-mono text-slate-500">{pmt.receiptNumber}</td>
                              <td className="px-4 py-2.5 font-mono">{formatINR(Number(pmt.grossSalary))}</td>
                              <td className="px-4 py-2.5 font-mono text-slate-655">
                                {totalAdjustment >= 0 ? '+' : ''}{formatINR(totalAdjustment)}
                              </td>
                              <td className="px-4 py-2.5 font-bold font-mono text-green-700">{formatINR(net)}</td>
                              <td className="px-4 py-2.5">
                                <button
                                  onClick={() => setSelectedPayment(pmt)}
                                  className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider"
                                >
                                  Adjust
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Salary Adjustment Drawer Modal */}
                {selectedPayment && (
                  <div className="p-4 border border-slate-200 bg-slate-50 rounded-2xl space-y-4 animate-in slide-in-from-bottom duration-150">
                    <h5 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider">
                      Apply adjustment for slip: {selectedPayment.receiptNumber} ({selectedPayment.month}/{selectedPayment.year})
                    </h5>
                    <form onSubmit={handleAdjustmentSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Adjustment Amount (INR)</label>
                        <input
                          type="number"
                          step="any"
                          value={adjustmentAmount}
                          onChange={(e) => setAdjustmentAmount(e.target.value)}
                          placeholder="e.g. -500 or 1200"
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 bg-white rounded-xl focus:outline-none focus:border-primary text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Reason / Spec</label>
                        <input
                          type="text"
                          value={adjustmentReason}
                          onChange={(e) => setAdjustmentReason(e.target.value)}
                          placeholder="e.g. Deducted leave or bonus"
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 bg-white rounded-xl focus:outline-none focus:border-primary text-slate-900"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isSubmittingAdjustment}
                          className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-[10px] uppercase tracking-wide hover:opacity-90 disabled:opacity-50"
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPayment(null)}
                          className="px-4 py-2 bg-white border border-slate-200 text-slate-655 font-bold rounded-xl text-[10px] uppercase tracking-wide hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* TAB: ACTIVITY */}
            {activeTab === 'activity' && (
              <div className="relative border-l border-slate-200 ml-3 pl-6 space-y-6">
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-4 ring-slate-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  </span>
                  <div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-800">Employment Account Registered</span>
                      <span className="text-[10px] text-slate-400 font-medium">{formatDate(staff.joiningDate)}</span>
                    </div>
                    <p className="text-slate-500 font-medium mt-1 leading-relaxed">Employee profile was onboarded into the school HR system.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
