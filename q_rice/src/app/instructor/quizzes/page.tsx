'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  FileQuestion,
  Plus,
  Upload,
  Search,
  Radio,
  BarChart3,
  Copy,
  Check,
  Clock,
  Award,
  Layers,
  Archive,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export default function InstructorQuizzesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

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

        const res = await fetch('/api/quizzes');
        if (res.ok) {
          const data = await res.json();
          setQuizzes(data.quizzes || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleLaunchLive = async (quizId: string) => {
    setLaunchingId(quizId);
    try {
      const res = await fetch('/api/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/instructor/live/${data.session.id}`);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to start live session.');
      }
    } catch (e: any) {
      alert('Error launching session: ' + e.message);
    } finally {
      setLaunchingId(null);
    }
  };

  const filteredQuizzes = quizzes.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.accessCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar user={user} />

      <div className="flex-1 flex">
        <Sidebar activePath="/instructor/quizzes" />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Quiz Library</h1>
              <p className="text-xs text-slate-500 mt-1">
                Manage, schedule, and launch your assessments.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/instructor/import-csv"
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-brand-600" />
                <span>Import CSV</span>
              </Link>
              <Link
                href="/instructor/quizzes/new"
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Quiz</span>
              </Link>
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
                placeholder="Search by title, subject, or code..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
              {(['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED'] as const).map((s) => (
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

          {/* Quizzes List */}
          <div className="space-y-3">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading quizzes...</div>
            ) : filteredQuizzes.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
                <FileQuestion className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">No Quizzes Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchQuery
                    ? 'No assessments match your search query.'
                    : 'Get started by creating your first quiz or importing multiple-choice questions via CSV.'}
                </p>
                <Link
                  href="/instructor/quizzes/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs hover:bg-brand-700 shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Assessment</span>
                </Link>
              </div>
            ) : (
              filteredQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-brand-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-purple text-xs font-semibold">{quiz.subject}</span>
                      <span
                        className={`badge text-[10px] font-bold ${
                          quiz.status === 'PUBLISHED'
                            ? 'badge-green'
                            : quiz.status === 'DRAFT'
                            ? 'badge-amber'
                            : 'badge-gray'
                        }`}
                      >
                        {quiz.status}
                      </span>
                      {quiz.class && (
                        <span className="badge badge-gray text-xs">{quiz.class.name}</span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">{quiz.title}</h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1 font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        <span>Code: {quiz.accessCode}</span>
                        <button
                          onClick={() => copyCode(quiz.accessCode)}
                          className="hover:text-brand-600"
                          title="Copy Access Code"
                        >
                          {copiedCode === quiz.accessCode ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </span>

                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{quiz.durationMinutes} mins</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        <span>{quiz.totalMarks} Marks</span>
                      </span>

                      <span>{quiz._count?.questions ?? 0} Questions</span>
                      <span>{quiz._count?.attempts ?? 0} Submissions</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <button
                      disabled={launchingId === quiz.id}
                      onClick={() => handleLaunchLive(quiz.id)}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs flex items-center gap-1 transition-colors"
                      title="Launch live instructor-led session"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>{launchingId === quiz.id ? 'Starting...' : 'Live Session'}</span>
                    </button>

                    <Link
                      href={`/instructor/results/${quiz.id}`}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-brand-700 font-bold text-xs flex items-center gap-1 transition-colors"
                      title="View class performance and export reports"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Results & Analytics</span>
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
