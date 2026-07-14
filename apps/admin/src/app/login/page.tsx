'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sparkles, Key, Mail, ShieldAlert, BookOpen } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        router.refresh();
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a13] flex flex-col justify-between py-12 px-4 text-xs font-semibold text-slate-300 select-none relative overflow-hidden grid-bg-overlay">
      {/* Mesh gradients for glowing high-end background */}
      <div className="absolute top-[-25%] left-[-20%] w-[70%] h-[70%] rounded-full bg-primary/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-20%] w-[70%] h-[70%] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none" />

      <div className="max-w-md w-full mx-auto my-auto space-y-7 relative z-10">
        {/* Brand identity header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-gradient-to-tr from-primary to-indigo-500 text-white rounded-3xl shadow-2xl shadow-primary/20 hover:scale-105 transition-transform duration-300">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-widest uppercase">
              Greenwood High School
            </h1>
            <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest mt-1">
              Administration & Operations Console
            </p>
          </div>
        </div>

        {/* Login form card */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 p-8 space-y-6 rounded-[24px] shadow-2xl relative overflow-hidden">
          <div className="border-b border-white/5 pb-4 mb-2">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Sign in to console</h3>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mt-1">
              Session: 2026–27 | Board: CBSE
            </span>
          </div>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/40 text-red-400 rounded-2xl flex items-center gap-2.5 animate-in fade-in duration-200">
              <ShieldAlert className="h-4.5 w-4.5 text-red-500 shrink-0" />
              <span className="font-medium text-[11px]">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@school.com"
                  className="block w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-white/5 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all font-medium"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-655" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-white/5 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-655" />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 text-[10px] uppercase font-bold text-slate-500">
              <button 
                type="button"
                onClick={() => alert("Please contact the school's HR department or Administrator to reset your password.")}
                className="hover:underline hover:text-white transition-colors"
              >
                Forgot Password?
              </button>
              <span className="font-mono text-[9px]">v1.0.0 Release</span>
            </div>

            <Button 
              type="submit" 
              disabled={loading} 
              fullWidth 
              className="mt-3 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white rounded-xl shadow-lg shadow-primary/20 py-2.5 text-xs font-black transition-all"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>

        {/* Principal Quote */}
        <div className="text-center italic text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed border-t border-slate-900 pt-5">
          "Education is the manifestation of the perfection already in man."
          <span className="block mt-1 font-bold text-[9px] uppercase tracking-wider not-italic text-slate-600">— Swami Vivekananda</span>
        </div>
      </div>

      {/* Footer copyright */}
      <footer className="text-center text-[9px] font-bold text-slate-600 uppercase tracking-widest pt-8">
        © 2026 Greenwood High School. All rights reserved. Powered by School ERP v1.
      </footer>
    </div>
  );
}
