'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function NewStaffOnboarding() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isClerk = userRole === 'CLERK';
  const router = useRouter();

  // Form states
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [designation, setDesignation] = useState('');
  const [qualification, setQualification] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [remarks, setRemarks] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (isClerk) {
    return (
      <div className="erp-card p-8 text-center space-y-4 max-w-lg mx-auto mt-12 border-red-200 bg-red-50">
        <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Access Denied</h2>
        <p className="text-xs text-slate-600">Clerks are restricted from onboarding staff members.</p>
        <Link href="/dashboard/hr/staff" className="erp-btn-secondary inline-block">Back to Directory</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile || !gender || !dob || !joiningDate || !designation || !qualification || !monthlySalary) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/hr/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          mobile,
          email,
          gender,
          dob,
          joiningDate,
          designation,
          qualification,
          monthlySalary: Number(monthlySalary),
          remarks,
        }),
      });

      if (res.ok) {
        router.push('/dashboard/hr/staff');
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to onboard staff member.');
      }
    } catch (err) {
      setErrorMsg('Network error while processing staff onboarding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/hr/staff" className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Onboard Staff Member</h1>
          <p className="text-xs text-slate-500">Create new staff profiles in the database with auto-generated Employee Codes.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form card */}
      <div className="erp-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Employee Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="erp-input"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Mobile Number <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="erp-input font-mono"
                placeholder="10-digit mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Email (Optional)</label>
              <input
                type="email"
                className="erp-input font-mono"
                placeholder="email@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Gender <span className="text-red-500">*</span></label>
              <select
                className="erp-input"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                required
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Date of Birth <span className="text-red-500">*</span></label>
              <input
                type="date"
                className="erp-input font-mono"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Joining Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                className="erp-input font-mono"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Designation <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="erp-input font-semibold"
                placeholder="e.g. Teacher, Admin Clerk, Accountant"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Qualification <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="erp-input"
                placeholder="e.g. B.Ed, M.Sc, MCA"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Monthly Salary (Base Dues) <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="0.01"
                className="erp-input font-bold text-blue-700"
                placeholder="0.00"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Onboarding Notes / Remarks</label>
              <textarea
                className="erp-input min-h-[60px]"
                placeholder="Qualification details, verification logs reference..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Link href="/dashboard/hr/staff" className="erp-btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="erp-btn-primary flex items-center gap-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4" />
              <span>{isSubmitting ? 'Onboarding...' : 'Confirm Onboarding'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
