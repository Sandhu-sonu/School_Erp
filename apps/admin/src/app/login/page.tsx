'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sparkles, Key, Mail, ShieldAlert, Phone, HelpCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-8 px-4 text-xs font-semibold text-slate-700 select-none">
      <div className="max-w-md w-full mx-auto my-auto space-y-6">
        {/* Brand identity header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-primary text-white rounded-3xl shadow-xl">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Greenwood High School</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Administration & Operations Portal</p>
          </div>
        </div>

        {/* Login form card */}
        <Card className="p-6 sm:p-8 space-y-5">
          <div className="border-b border-slate-100 pb-3 mb-1">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Sign in to console</h3>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">Session: 2026–27 | Board: CBSE</span>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-850 rounded-xl flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              type="email"
              label="Email Address"
              placeholder="name@school.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />

            <div className="flex justify-between items-center pt-1 text-[10px] uppercase font-bold text-slate-400">
              <button 
                type="button"
                onClick={() => alert("Please contact the school's HR department or Administrator to reset your password.")}
                className="hover:underline hover:text-primary"
              >
                Forgot Password?
              </button>
              <span className="font-mono">v1.0.0 Release</span>
            </div>

            <Button type="submit" disabled={loading} fullWidth className="mt-2">
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </Card>

        {/* Principal Quote */}
        <div className="text-center italic text-[11px] text-slate-455 max-w-sm mx-auto leading-relaxed border-t border-slate-200 pt-4">
          "Education is the manifestation of the perfection already in man."
          <span className="block mt-1 font-bold text-[9px] uppercase tracking-wider not-italic text-slate-400">— Swami Vivekananda</span>
        </div>
      </div>

      {/* Footer copyright */}
      <footer className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest pt-6">
        © 2026 Greenwood High School. All rights reserved. Powered by School ERP v1.
      </footer>
    </div>
  );
}
