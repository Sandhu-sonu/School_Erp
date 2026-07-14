'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, BookOpen, CreditCard, CalendarDays, Bus, 
  UserCheck, AlertCircle, FileSpreadsheet, ShieldAlert,
  Edit, Printer, Download, ArrowUpRight, Ban, Calendar, Activity, GraduationCap, Plus
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';

interface ProfileProps {
  student: any;
  calculatedAge: number;
}

type TabType = 'overview' | 'academic' | 'fees' | 'attendance' | 'transport' | 'timeline';

export default function StudentProfileClient({ student, calculatedAge }: ProfileProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [submitting, setSubmitting] = useState(false);
  const [statusVal, setStatusVal] = useState(student.status);

  // Indian currency formatting helper
  const formatINR = (val: any) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(num);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Image size exceeds 2MB limit.');
      return;
    }

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await fetch(`/api/students/${student.id}/photo`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to upload photo.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during upload.');
    }
  };

  const handlePhotoDelete = async () => {
    if (!confirm('Are you sure you want to delete this profile photo?')) return;

    try {
      const res = await fetch(`/api/students/${student.id}/photo`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.refresh();
      } else {
        alert('Failed to delete photo.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during delete.');
    }
  };

  const activeEnrollment = student.enrollments.find((e: any) => !e.isArchived) || student.enrollments[0];
  const className = activeEnrollment?.class?.name || 'Unassigned';
  const sectionName = activeEnrollment?.section?.name ? `Section ${activeEnrollment.section.name}` : 'No Section';
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const handleStatusChange = async (nextStatus: string) => {
    setStatusVal(nextStatus);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...student,
          status: nextStatus,
          parentId: student.parent.id,
          classId: activeEnrollment?.classId,
          sectionId: activeEnrollment?.sectionId,
        }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        alert('Failed to update student lifecycle status.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusVariant = (status: string) => {
    if (status === 'ACTIVE') return 'success';
    if (status === 'TRANSFERRED' || status === 'ALUMNI') return 'info';
    if (status === 'SUSPENDED') return 'warning';
    return 'danger';
  };

  // Mock timeline events for CRM timeline tab
  const timelineEvents = [
    { id: '1', title: 'Lifecycle Status Update', desc: `Student status set to ${statusVal}`, date: 'Today' },
    { id: '2', title: 'Academic Term Enrollment', desc: `Enrolled into Class ${className} for session 2026-27`, date: '01/04/2026' },
    { id: '3', title: 'System Admission Intake', desc: 'Registered student admissions profile into ERP', date: formatDate(student.createdAt) }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      {/* LEFT COLUMN: Profile CRM summary */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="flex flex-col items-center text-center p-6 space-y-4">
          {/* Photo */}
          <div className="relative group">
            <Avatar 
              src={student.photo ? (student.photo.startsWith('/') ? student.photo : `/uploads/${student.photo}`) : null} 
              name={student.name} 
              size="lg" 
            />
            <div className="absolute inset-0 bg-slate-900/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
              <label className="cursor-pointer text-[9px] text-white font-bold uppercase tracking-wider">
                Upload
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-800 leading-tight">{student.name}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Adm: {student.admissionNumber}</p>
          </div>

          <Badge variant={getStatusVariant(statusVal)}>{statusVal}</Badge>

          {/* Quick Actions List */}
          <div className="w-full pt-4 border-t border-slate-100 space-y-2 text-left text-xs font-semibold text-slate-655">
            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Quick Actions</h4>
            
            <button 
              onClick={() => router.push(`/dashboard/admissions/registration?edit=${student.id}`)}
              className="w-full p-2 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors"
            >
              <Edit className="h-4 w-4 text-blue-500" />
              Edit Profile
            </button>

            <button 
              onClick={() => window.print()}
              className="w-full p-2 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              Print Admission Form
            </button>

            <button 
              onClick={() => router.push(`/dashboard/finance/ledger?studentId=${student.id}`)}
              className="w-full p-2 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors"
            >
              <CreditCard className="h-4 w-4 text-green-500" />
              View Fees Ledger
            </button>

            <button 
              onClick={() => router.push(`/dashboard/finance/fees?search=${student.admissionNumber}`)}
              className="w-full p-2 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors"
            >
              <Plus className="h-4 w-4 text-emerald-500" />
              Collect Fee
            </button>

            {statusVal === 'ACTIVE' ? (
              <button 
                onClick={() => handleStatusChange('SUSPENDED')}
                disabled={submitting}
                className="w-full p-2 hover:bg-red-50 text-red-700 hover:text-red-800 rounded-xl flex items-center gap-2 transition-colors"
              >
                <Ban className="h-4 w-4" />
                Suspend Account
              </button>
            ) : (
              <button 
                onClick={() => handleStatusChange('ACTIVE')}
                disabled={submitting}
                className="w-full p-2 hover:bg-green-50 text-green-700 hover:text-green-800 rounded-xl flex items-center gap-2 transition-colors"
              >
                <UserCheck className="h-4 w-4" />
                Activate Account
              </button>
            )}
          </div>
        </Card>
      </div>

      {/* RIGHT COLUMN: Tab contents */}
      <div className="lg:col-span-3 space-y-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 overflow-x-auto gap-4">
          {(
            [
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'academic', label: 'Academics', icon: BookOpen },
              { id: 'fees', label: 'Fees Status', icon: CreditCard },
              { id: 'attendance', label: 'Attendance', icon: CalendarDays },
              { id: 'transport', label: 'Transport', icon: Bus },
              { id: 'timeline', label: 'Timeline log', icon: Activity }
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

        {/* Tab body contents */}
        <div className="animate-in fade-in duration-200">
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-semibold text-slate-700">
              <div className="space-y-4">
                <h3 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider border-b pb-1">Academic Snapshot</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] text-slate-450 uppercase font-bold">Class Level</p>
                    <p className="text-slate-800 mt-0.5">{className}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-450 uppercase font-bold">Section</p>
                    <p className="text-slate-800 mt-0.5">{sectionName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-450 uppercase font-bold">Admissions Session</p>
                    <p className="text-slate-800 mt-0.5">2026-27</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-450 uppercase font-bold">Age & DOB</p>
                    <p className="text-slate-800 mt-0.5">{calculatedAge} Yrs ({formatDate(student.dob)})</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-450 uppercase font-bold">Gender</p>
                    <p className="text-slate-800 mt-0.5">{student.gender}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-450 uppercase font-bold">Intake Date</p>
                    <p className="text-slate-800 mt-0.5">{formatDate(student.admissionDate)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider border-b pb-1">Parent & Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] text-slate-450 uppercase font-bold">Father's Name</p>
                    <p className="text-slate-800 mt-0.5">{student.parent.fatherName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-450 uppercase font-bold">Mother's Name</p>
                    <p className="text-slate-800 mt-0.5">{student.parent.motherName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-450 uppercase font-bold">Contact Mobile</p>
                    <p className="text-slate-800 mt-0.5 font-mono">{student.parent.mobile}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[9px] text-slate-450 uppercase font-bold">Address</p>
                    <p className="text-slate-800 mt-0.5 leading-relaxed">{student.parent.address || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ACADEMIC */}
          {activeTab === 'academic' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2.5">Session Enrollment Logs</h4>
                <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Academic Session</th>
                        <th className="px-4 py-2.5 text-left">Class & Section</th>
                        <th className="px-4 py-2.5 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {student.enrollments.map((en: any) => (
                        <tr key={en.id}>
                          <td className="px-4 py-2.5 font-mono">{en.session.name}</td>
                          <td className="px-4 py-2.5">{en.class.name} {en.section ? `(${en.section.name})` : ''}</td>
                          <td className="px-4 py-2.5">
                            <span className={en.isArchived ? 'text-slate-400' : 'text-green-700 font-bold'}>
                              {en.isArchived ? 'Archived' : 'Active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: FEES */}
          {activeTab === 'fees' && (
            <div className="space-y-6">
              {activeEnrollment?.feeAccount ? (
                <>
                  <div className="grid grid-cols-3 gap-4 text-xs font-semibold text-slate-700">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[9px] text-slate-400 uppercase font-bold">Total Fees Assigned</span>
                      <p className="text-sm font-extrabold text-slate-800 mt-1">{formatINR(activeEnrollment.feeAccount.totalFee)}</p>
                    </div>
                    <div className="p-4 bg-green-50/50 rounded-xl border border-green-100">
                      <span className="text-[9px] text-green-700 uppercase font-bold">Total Amount Paid</span>
                      <p className="text-sm font-extrabold text-green-700 mt-1">{formatINR(activeEnrollment.feeAccount.paidAmount)}</p>
                    </div>
                    <div className="p-4 bg-red-50/50 rounded-xl border border-red-100">
                      <span className="text-[9px] text-red-700 uppercase font-bold">Total Outstanding Dues</span>
                      <p className="text-sm font-extrabold text-red-750 mt-1">{formatINR(activeEnrollment.feeAccount.remainingFee)}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2.5">Receipt Collections Ledger</h4>
                    <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                      <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase">
                          <tr>
                            <th className="px-4 py-2.5 text-left">Receipt No</th>
                            <th className="px-4 py-2.5 text-left">Amount Paid</th>
                            <th className="px-4 py-2.5 text-left">Payment Mode</th>
                            <th className="px-4 py-2.5 text-left">Transaction Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {!activeEnrollment.feeAccount.transactions || activeEnrollment.feeAccount.transactions.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-6 text-center text-slate-400">No payment records saved.</td>
                            </tr>
                          ) : (
                            activeEnrollment.feeAccount.transactions.map((tx: any) => (
                              <tr key={tx.id}>
                                <td className="px-4 py-2.5 font-mono text-slate-900">{tx.receiptNumber}</td>
                                <td className="px-4 py-2.5 text-green-700 font-bold">{formatINR(tx.amount)}</td>
                                <td className="px-4 py-2.5 text-[10px] uppercase font-bold">{tx.paymentMode}</td>
                                <td className="px-4 py-2.5">{formatDate(tx.transactionDate)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-slate-400">No fee ledger attached.</div>
              )}
            </div>
          )}

          {/* TAB: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Month</th>
                    <th className="px-4 py-2.5 text-center">Present</th>
                    <th className="px-4 py-2.5 text-center">Absent</th>
                    <th className="px-4 py-2.5 text-center">Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {!activeEnrollment?.attendanceSummary || activeEnrollment.attendanceSummary.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-400">No attendance rollups compiled.</td>
                    </tr>
                  ) : (
                    activeEnrollment.attendanceSummary.map((sum: any) => {
                      const tot = sum.present + sum.absent;
                      const rate = tot > 0 ? (sum.present / tot) * 100 : 100;
                      return (
                        <tr key={sum.id}>
                          <td className="px-4 py-2.5 font-mono">{sum.yearMonth}</td>
                          <td className="px-4 py-2.5 text-center text-green-700 font-bold">{sum.present}</td>
                          <td className="px-4 py-2.5 text-center text-red-650 font-bold">{sum.absent}</td>
                          <td className="px-4 py-2.5 text-center font-bold">{rate.toFixed(1)}%</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: TRANSPORT */}
          {activeTab === 'transport' && (
            <div className="max-w-md border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-700">
              {student.transports?.find((t: any) => t.status === 'ACTIVE') ? (
                (() => {
                  const activeT = student.transports.find((t: any) => t.status === 'ACTIVE');
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-slate-400">Route Name</span>
                        <span className="text-slate-800">{activeT.route.name}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-slate-400">Vehicle Number</span>
                        <span className="text-slate-800">{activeT.route.vehicleNumber}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-slate-400">Driver</span>
                        <span className="text-slate-800">{activeT.route.driverName}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-slate-400">Bus Stop</span>
                        <span className="text-slate-800">{activeT.stop.name}</span>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-6 text-slate-400">No active transport routes.</div>
              )}
            </div>
          )}

          {/* TAB: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="relative border-l border-slate-200 ml-3 pl-6 space-y-6 text-xs font-semibold">
              {timelineEvents.map(ev => (
                <div key={ev.id} className="relative">
                  <span className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-4 ring-slate-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  </span>
                  <div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-850">{ev.title}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{ev.date}</span>
                    </div>
                    <p className="text-slate-500 font-medium mt-1 leading-relaxed">{ev.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
