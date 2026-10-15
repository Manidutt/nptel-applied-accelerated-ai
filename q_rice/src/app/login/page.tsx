'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Sparkles, GraduationCap, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const [email, setEmail] = useState('instructor@qrice.edu');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fillDemoAccount = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('Password123!');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed.');
        setLoading(false);
        return;
      }

      // Route based on role or redirect parameter
      if (redirectUrl) {
        router.push(redirectUrl);
      } else if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else if (data.user.role === 'INSTRUCTOR') {
        router.push('/instructor');
      } else {
        router.push('/student');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Logo */}
        <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-indigoAccent-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <span className="font-extrabold text-xl tracking-wider">Q</span>
          </div>
          <span className="font-bold text-2xl text-slate-900 tracking-tight">Q_Rice</span>
        </Link>
        <h2 className="text-xl font-bold text-slate-900">Sign in to your account</h2>
        <p className="mt-1 text-xs text-slate-500">Smart Assessments. Secure Quizzes. Meaningful Results.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200 sm:px-10">
          {/* Quick Demo Fill Pills */}
          <div className="mb-6 p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Instant 1-Click Demo Accounts:
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fillDemoAccount('admin@qrice.edu')}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200 transition-colors flex items-center gap-1"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('instructor@qrice.edu')}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold border border-blue-200 transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Instructor</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('alex.rivera@student.qrice.edu')}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold border border-emerald-200 transition-colors flex items-center gap-1"
              >
                <GraduationCap className="w-3 h-3" />
                <span>Student 1</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('marcus.chen@student.qrice.edu')}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold border border-amber-200 transition-colors flex items-center gap-1"
              >
                <GraduationCap className="w-3 h-3" />
                <span>Student 3</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Institutional Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs text-slate-900"
                  placeholder="name@qrice.edu"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs text-slate-900"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Don&apos;t have an account yet?{' '}
          <Link href="/signup" className="font-bold text-brand-600 hover:text-brand-700 underline">
            Register for Free
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">Loading login portal...</div>}>
      <LoginForm />
    </Suspense>
  );
}
