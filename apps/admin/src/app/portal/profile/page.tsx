'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, User, Key, CheckCircle, ShieldAlert, Phone, MapPin, Mail, Award, Sparkles, Heart } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface ParentProfile {
  fatherName: string;
  motherName: string | null;
  mobile: string;
  alternateMobile: string | null;
  address: string | null;
}

interface SchoolSettings {
  schoolName: string;
  address: string;
  phone: string;
  email: string;
  board: string;
}

export default function PortalProfilePage() {
  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [school, setSchool] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [profRes, schoolRes] = await Promise.all([
          fetch('/api/portal/profile'),
          fetch('/api/system/school-settings')
        ]);

        if (profRes.ok) {
          const profData = await profRes.json();
          setProfile(profData);
        }

        if (schoolRes.ok) {
          const schoolData = await schoolRes.json();
          setSchool(schoolData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch('/api/portal/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password.');

      setSuccessMsg('Your portal password has been updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none pb-4 text-xs font-semibold text-slate-700">
      {/* Page Header */}
      <div className="flex items-center gap-2">
        <div className="bg-primary text-white p-1 rounded-xl">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">My Account Profile</h2>
          <p className="text-[10px] text-slate-455 font-bold uppercase">Inspect guardian specifications and security parameters.</p>
        </div>
      </div>

      {/* Profile cards grid */}
      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Father Details Card */}
          <Card title="Father / Primary Guardian details" className="p-5">
            <div className="space-y-4">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold">Father's Name</span>
                <p className="text-sm font-bold text-slate-850 mt-0.5">{profile.fatherName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Contact Mobile</span>
                  <p className="text-slate-800 mt-0.5 font-mono">{profile.mobile}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Alternate Contact</span>
                  <p className="text-slate-850 mt-0.5 font-mono">{profile.alternateMobile || 'None'}</p>
                </div>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold">Residential Address</span>
                <p className="text-slate-700 mt-1 leading-relaxed bg-slate-50 border border-slate-100 p-3 rounded-xl">{profile.address || 'None'}</p>
              </div>
            </div>
          </Card>

          {/* Mother Details Card */}
          <Card title="Mother Details card" className="p-5">
            <div className="space-y-4">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold">Mother's Name</span>
                <p className="text-sm font-bold text-slate-850 mt-0.5">{profile.motherName || 'Not Provided'}</p>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold">Contact Status</span>
                <p className="text-slate-700 mt-0.5">Primary Contact linked via Father account.</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Directory & Password Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* School Directory */}
        {school && (
          <Card title="School contact directories" className="p-5">
            <div className="space-y-4">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold">Institution Identity</span>
                <p className="text-sm font-bold text-slate-850 mt-0.5">{school.schoolName}</p>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                <span className="text-slate-700 leading-normal">{school.address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                <span className="text-slate-700 font-mono">{school.phone}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                <span className="text-slate-700 font-mono">{school.email}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Change Password */}
        <Card title="Change portal security password" className="p-5">
          {successMsg && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-850 rounded-xl text-xs font-semibold flex items-center gap-2 mb-4">
              <CheckCircle className="h-4.5 w-4.5 text-green-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-850 rounded-xl text-xs font-semibold flex items-center gap-2 mb-4">
              <ShieldAlert className="h-4.5 w-4.5 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-3">
            <Input
              type="password"
              label="Current Password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              type="password"
              label="New Password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              type="password"
              label="Confirm New Password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button type="submit" disabled={updating} fullWidth className="mt-2">
              {updating ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
