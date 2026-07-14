'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Phone, AlertCircle, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen bg-[#070a13] flex flex-col justify-between py-12 px-4 text-xs font-semibold text-slate-300 select-none relative overflow-hidden grid-bg-overlay">
      {/* Mesh gradients for glowing high-end background */}
      <div className="absolute top-[-25%] left-[-20%] w-[70%] h-[70%] rounded-full bg-blue-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-20%] w-[70%] h-[70%] rounded-full bg-purple-500/10 blur-[130px] pointer-events-none" />

      <div className="max-w-md w-full mx-auto my-auto space-y-7 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-gradient-to-tr from-blue-600 to-purple-600 text-white rounded-3xl shadow-2xl shadow-blue-500/20 hover:scale-105 transition-transform duration-300">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-widest uppercase">
              Greenwood High School
            </h1>
            <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest mt-1">
              Parent Portal Gateway
            </p>
          </div>
        </div>

        {/* Input Card */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 p-8 space-y-6 rounded-[24px] shadow-2xl relative overflow-hidden">
          <div className="border-b border-white/5 pb-4 mb-2">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Parent Sign In</h3>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mt-1">
              Access academic reports, attendance & fee transactions
            </span>
          </div>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/40 text-red-400 rounded-2xl flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
              <span className="font-medium text-[11px]">{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                Registered Mobile Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  className="block w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-white/5 rounded-xl text-xs text-white placeholder-slate-655 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-655" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-white/5 rounded-xl text-xs text-white placeholder-slate-655 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-655" />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 text-[10px] uppercase font-bold text-slate-500">
              <button 
                type="button"
                onClick={() => alert("Please contact the school office to register or update parent mobile numbers and passwords.")}
                className="hover:underline hover:text-white transition-colors"
              >
                Help Desk
              </button>
              <span className="font-mono text-[9px]">v1.0.0</span>
            </div>

            <Button 
              type="submit" 
              disabled={loading} 
              fullWidth 
              className="mt-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-650 hover:to-purple-650 text-white rounded-xl shadow-lg shadow-blue-500/20 py-2.5 text-xs font-black transition-all"
            >
              {loading ? 'Authenticating...' : 'Enter Portal'}
            </Button>
          </form>
        </div>

        {/* School Motto */}
        <div className="text-center italic text-[11px] text-slate-550 max-w-sm mx-auto leading-relaxed border-t border-slate-900 pt-5">
          "Vidya Dadati Vinayam"
          <span className="block mt-1 font-bold text-[9px] uppercase tracking-wider not-italic text-slate-600">— School Motto</span>
        </div>
      </div>

      <footer className="text-center text-[9px] font-bold text-slate-600 uppercase tracking-widest pt-8">
        © 2026 Greenwood High School. All rights reserved. Powered by School ERP v1.
      </footer>
    </div>
  );
}
