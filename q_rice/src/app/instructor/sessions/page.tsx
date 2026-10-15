'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  Radio,
  Users,
  Clock,
  Award,
  Play,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Search,
  ExternalLink,
  ChevronRight,
  PlusCircle,
  BarChart3,
  Calendar
} from 'lucide-react';

export default function InstructorSessionsHistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'WAITING' | 'COMPLETED'>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

        const res = await fetch('/api/live');
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const copySessionCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.sessionCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.quiz.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = sessions.filter((s) => s.status === 'ACTIVE').length;
  const waitingCount = sessions.filter((s) => s.status === 'WAITING').length;
  const completedCount = sessions.filter((s) => s.status === 'COMPLETED').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar user={user} />

      <div className="flex-1 flex">
        <Sidebar role={user?.role} />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold mb-2">
                <Radio className="w-3.5 h-3.5 text-purple-700 animate-pulse" />
                <span>Live Orchestration History</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Live Quiz Sessions & History
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Monitor active classroom assessments, control rooms, and examine historical session logs.
              </p>
            </div>

            <Link
              href="/instructor/quizzes"
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Launch Live Session</span>
            </Link>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Active Live Rooms
                </span>
                <span className="text-2xl font-black text-emerald-600">{activeCount}</span>
                <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Interactive Real-Time</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Radio className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Waiting / Staging Rooms
                </span>
                <span className="text-2xl font-black text-amber-600">{waitingCount}</span>
                <div className="text-[11px] text-slate-500 mt-0.5">Ready for student check-in</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Completed Sessions
                </span>
                <span className="text-2xl font-black text-slate-900">{completedCount}</span>
                <div className="text-[11px] text-slate-500 mt-0.5">Submissions finalized</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by PIN or quiz title..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
              {(['ALL', 'ACTIVE', 'WAITING', 'COMPLETED'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === s
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Sessions List */}
          <div className="space-y-3">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading session history...</div>
            ) : filteredSessions.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
                <Radio className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">No Sessions Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchQuery
                    ? 'No sessions matched your filter.'
                    : 'Start your first live session by launching any quiz from your Quiz Library.'}
                </p>
                <Link
                  href="/instructor/quizzes"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs hover:bg-brand-700 shadow-sm transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>View Quizzes to Launch</span>
                </Link>
              </div>
            ) : (
              filteredSessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-brand-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-purple text-xs font-semibold">{s.quiz.subject}</span>
                      <span
                        className={`badge text-[10px] font-bold ${
                          s.status === 'ACTIVE'
                            ? 'badge-green animate-pulse'
                            : s.status === 'WAITING'
                            ? 'badge-amber'
                            : 'badge-gray'
                        }`}
                      >
                        {s.status}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(s.createdAt).toLocaleDateString()} at{' '}
                        {new Date(s.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">{s.quiz.title}</h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1 font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-lg">
                        <span>PIN: {s.sessionCode}</span>
                        <button
                          onClick={() => copySessionCode(s.sessionCode)}
                          className="hover:text-purple-900"
                          title="Copy Session PIN"
                        >
                          {copiedCode === s.sessionCode ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </span>

                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s._count?.participants ?? 0} Connected</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s._count?.attempts ?? 0} Submissions</span>
                      </span>

                      <span>{s.quiz._count?.questions ?? 0} Questions</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <Link
                      href={`/instructor/live/${s.id}`}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>{s.status === 'COMPLETED' ? 'Review Room' : 'Enter Control Room'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>

                    <Link
                      href={`/instructor/results/${s.quiz.id}`}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors"
                      title="View class performance and export reports"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Results</span>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
