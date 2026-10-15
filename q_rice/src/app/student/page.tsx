'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  GraduationCap,
  FileQuestion,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Radio,
  ExternalLink,
  Award,
} from 'lucide-react';

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessCode, setAccessCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/login');
          return;
        }
        const meData = await meRes.json();
        setUser(meData.user);

        const qRes = await fetch('/api/quizzes');
        const qData = await qRes.json();
        setQuizzes(qData.quizzes || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;

    setJoining(true);
    setJoinError('');

    try {
      const res = await fetch('/api/student/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error || 'Failed to join assessment.');
        setJoining(false);
        return;
      }

      if (data.type === 'LIVE_SESSION') {
        router.push(`/student/waiting/${data.sessionId}`);
      } else {
        router.push(`/student/exam/${data.attemptId}`);
      }
    } catch (err: any) {
      setJoinError(err.message || 'Connection error.');
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-indigoAccent-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-brand-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-md mb-2">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student Assessment Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome, {user?.name || 'Student'}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-xl">
              Access your authorized examinations, join live classroom sessions, and review your verified test results.
            </p>
          </div>

          {/* Quick Access Code Input */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 w-full md:w-80 text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-100 block mb-2">
              Join with Access Code
            </span>
            <form onSubmit={handleJoin} className="space-y-2">
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="e.g. QRICE-401"
                className="w-full px-3 py-2 rounded-xl bg-white text-slate-900 font-mono font-bold text-xs uppercase focus:outline-none focus:ring-2 focus:ring-white"
              />
              {joinError && (
                <p className="text-[11px] text-rose-200 font-medium bg-rose-900/40 p-2 rounded-lg">
                  {joinError}
                </p>
              )}
              <button
                type="submit"
                disabled={joining || !accessCode.trim()}
                className="w-full py-2 px-3 rounded-xl bg-white text-brand-700 hover:bg-blue-50 font-bold text-xs transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <span>{joining ? 'Connecting...' : 'Start Assessment'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Assigned & Available Quizzes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Available Quizzes & Assessments</h2>
              <p className="text-xs text-slate-500">Select an assessment to start or review results.</p>
            </div>
            <span className="badge badge-blue">{quizzes.length} Available</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading assessments...</div>
          ) : quizzes.length === 0 ? (
            <div className="p-8 text-center">
              <FileQuestion className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No active assessments found.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Enter an access code provided by your instructor above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizzes.map((q) => (
                <div
                  key={q.id}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-brand-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4 bg-slate-50/50"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="badge badge-purple">{q.subject}</span>
                      <span className="text-[11px] font-mono font-bold text-slate-500">{q.accessCode}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{q.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{q.description || q.instructions}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{q.durationMinutes} mins</span>
                      </span>
                      <span>{q.totalMarks} Marks</span>
                    </div>

                    <button
                      onClick={() => {
                        setAccessCode(q.accessCode);
                        handleJoin({ preventDefault: () => {} } as any);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-colors"
                    >
                      <span>Start</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
