'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Phone, AlertCircle, Sparkles } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function ParentLoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate.');
      }

      router.push('/portal/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between py-8 px-4 text-xs font-semibold text-slate-350 select-none">
      <div className="max-w-md w-full mx-auto my-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-600 text-white rounded-3xl shadow-xl">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white uppercase tracking-wider">Greenwood High School</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 font-mono">Parent Portal Gateway</p>
          </div>
        </div>

        {/* Input Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
          <div className="border-b border-slate-700 pb-3 mb-1">
            <h3 className="text-xs font-bold text-white uppercase tracking-wide">Parent Sign In</h3>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">Access academic reports, attendance & fee transactions</span>
          </div>

          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800 text-red-400 rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Registered Mobile Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  className="block w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <div className="flex justify-between items-center pt-1 text-[10px] uppercase font-bold text-slate-400">
              <button 
                type="button"
                onClick={() => alert("Please contact the school office to register or update parent mobile numbers and passwords.")}
                className="hover:underline hover:text-blue-400"
              >
                Help Desk
              </button>
              <span className="font-mono">v1.0.0</span>
            </div>

            <Button type="submit" disabled={loading} fullWidth className="bg-blue-600 text-white hover:bg-blue-700 mt-2">
              {loading ? 'Authenticating...' : 'Enter Portal'}
            </Button>
          </form>
        </div>

        {/* School Motto */}
        <div className="text-center italic text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed border-t border-slate-800 pt-4">
          "Vidya Dadati Vinayam"
          <span className="block mt-1 font-bold text-[9px] uppercase tracking-wider not-italic text-slate-500">— School Motto</span>
        </div>
      </div>

      <footer className="text-center text-[9px] font-bold text-slate-500 uppercase tracking-widest pt-6">
        © 2026 Greenwood High School. All rights reserved. Powered by School ERP v1.
      </footer>
    </div>
  );
}
