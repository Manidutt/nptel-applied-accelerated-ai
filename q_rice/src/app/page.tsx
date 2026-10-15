'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  UploadCloud,
  Radio,
  FileSpreadsheet,
  FileText,
  Clock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/student/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        // If not logged in, route to login with redirect
        if (res.status === 401) {
          router.push(`/login?redirect=/student/join&code=${encodeURIComponent(accessCode.trim())}`);
          return;
        }
        setError(data.error || 'Failed to join quiz.');
        setLoading(false);
        return;
      }

      if (data.type === 'LIVE_SESSION') {
        router.push(`/student/waiting/${data.sessionId}`);
      } else {
        router.push(`/student/exam/${data.attemptId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Connection error.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-indigoAccent-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <span className="font-extrabold text-lg tracking-wider">Q</span>
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">Q_Rice</span>
              <span className="text-[10px] text-slate-500 block -mt-1 font-medium">Instructor-Led Quiz Management</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold px-4 py-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/instructor"
              className="text-xs font-bold px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>Instructor Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          <span>Smart Assessments. Secure Quizzes. Meaningful Results.</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl leading-tight">
          Modern Instructor-Led Assessments & Exam Integrity Platform
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
          Create assessments in seconds, bulk-import MCQs from validated CSVs, conduct synchronized live classroom sessions, and monitor browser tab-switching with server-authoritative scoring.
        </p>

        {/* Join Quiz Card */}
        <div className="mt-10 w-full max-w-md bg-white p-6 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 text-left">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span>Have a Quiz Access Code?</span>
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">Live or Self-Paced</span>
          </div>

          <form onSubmit={handleJoin} className="space-y-3">
            <div>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="e.g. QRICE-401 or Session Code"
                maxLength={12}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-mono text-sm tracking-wider uppercase text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !accessCode.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigoAccent-600 hover:from-brand-700 hover:to-indigoAccent-700 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Validating...' : 'Join Assessment'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[11px] text-slate-500 mt-3 text-center">
            Demo code: <span className="font-mono font-bold text-brand-600 cursor-pointer" onClick={() => setAccessCode('QRICE-401')}>QRICE-401</span>
          </p>
        </div>

        {/* Feature Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          {/* Feature 1 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-600 flex items-center justify-center mb-4">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">CSV MCQ Bulk Import</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Standardized CSV template with row-level error reporting, quoted text handling, single/multiple-choice, and true/false validation.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Exam Integrity & Tab Monitoring</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Real-time detection of browser tab switches, focus loss, and fullscreen exits with configurable warning thresholds and automatic submission.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-indigo-600 flex items-center justify-center mb-4">
              <Radio className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Instructor-Led Live Mode</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Host real-time synchronized quizzes with low-latency WebSockets, question pacing controls, and live submission telemetry.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>© 2026 Q_Rice — Instructor-Led Quiz Management System. All rights reserved.</p>
        <p className="text-[11px] text-slate-400 mt-1">Smart Assessments. Secure Quizzes. Meaningful Results.</p>
      </footer>
    </div>
  );
}
