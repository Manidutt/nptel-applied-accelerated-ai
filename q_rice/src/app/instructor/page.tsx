'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  FileQuestion,
  Users,
  CheckCircle,
  TrendingUp,
  PlusCircle,
  UploadCloud,
  Database,
  Radio,
  BarChart2,
  Copy,
  ExternalLink,
  Search,
  ArrowRight,
  AlertTriangle,
  Play,
  Archive,
} from 'lucide-react';

export default function InstructorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
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

        const quizRes = await fetch('/api/quizzes');
        const quizData = await quizRes.json();
        setQuizzes(quizData.quizzes || []);
      } catch (e) {
        console.error('Load dashboard error:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleStartLive = async (quizId: string) => {
    try {
      const res = await fetch('/api/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId, mode: 'INSTRUCTOR_LED' }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/instructor/live/${data.session.id}`);
      } else {
        alert(data.error || 'Failed to start live session.');
      }
    } catch (e: any) {
      alert(e.message || 'Error starting session.');
    }
  };

  // Filter quizzes
  const filteredQuizzes = quizzes.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.accessCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.subject && q.subject.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate real dashboard statistics
  const totalQuizzes = quizzes.length;
  const draftQuizzes = quizzes.filter((q) => q.status === 'DRAFT').length;
  const publishedQuizzes = quizzes.filter((q) => q.status === 'PUBLISHED' || q.status === 'ACTIVE').length;
  const totalAttempts = quizzes.reduce((sum, q) => sum + (q._count?.attempts || 0), 0);
  const activeSessionsCount = quizzes.reduce((sum, q) => sum + (q._count?.sessions || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <div className="flex flex-1">
        <Sidebar role={user?.role} />

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          {/* Welcome Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Instructor Dashboard
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Welcome back, {user?.name || 'Professor'}. Manage assessments, live sessions, and analytics.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/instructor/quizzes/new"
                className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Quiz</span>
              </Link>
              <Link
                href="/instructor/import-csv"
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <UploadCloud className="w-4 h-4 text-brand-600" />
                <span>Import CSV</span>
              </Link>
              <Link
                href="/instructor/question-bank"
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Database className="w-4 h-4 text-indigoAccent-600" />
                <span>Question Bank</span>
              </Link>
            </div>
          </div>

          {/* Real Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Quizzes</span>
                <FileQuestion className="w-4 h-4 text-brand-500" />
              </div>
              <p className="text-2xl font-black text-slate-900">{totalQuizzes}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                <span className="font-semibold text-emerald-600">{publishedQuizzes} published</span> · {draftQuizzes} drafts
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Submissions</span>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-slate-900">{totalAttempts}</p>
              <p className="text-[11px] text-slate-500 mt-1">Evaluated across all cohorts</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Sessions</span>
                <Radio className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-black text-slate-900">{activeSessionsCount}</p>
              <p className="text-[11px] text-slate-500 mt-1">Synchronized room sessions</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Integrity Engine</span>
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-emerald-600">Active</p>
              <p className="text-[11px] text-slate-500 mt-1">Tab-switch & focus monitoring</p>
            </div>
          </div>

          {/* Quizzes Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Table Filter Toolbar */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search quizzes by title or access code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-500">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ACTIVE">Active (Live)</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs font-medium">Loading quizzes...</div>
            ) : filteredQuizzes.length === 0 ? (
              <div className="p-12 text-center">
                <FileQuestion className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700">No assessments found</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  {searchTerm ? 'Try adjusting your search criteria.' : 'Create your first quiz or import MCQs via CSV.'}
                </p>
                <Link
                  href="/instructor/quizzes/new"
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Quiz</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Quiz Title & Subject</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Access Code</th>
                      <th className="py-3 px-4">Questions</th>
                      <th className="py-3 px-4">Submissions</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredQuizzes.map((quiz) => (
                      <tr key={quiz.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/instructor/results/${quiz.id}`}
                            className="font-bold text-slate-900 hover:text-brand-600 transition-colors block text-sm"
                          >
                            {quiz.title}
                          </Link>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span>{quiz.subject}</span>
                            <span>•</span>
                            <span>{quiz.durationMinutes} mins</span>
                            {quiz.class && (
                              <>
                                <span>•</span>
                                <span className="text-indigo-600 font-medium">{quiz.class.name}</span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`badge ${
                              quiz.status === 'PUBLISHED'
                                ? 'badge-green'
                                : quiz.status === 'ACTIVE'
                                ? 'badge-blue'
                                : quiz.status === 'DRAFT'
                                ? 'badge-amber'
                                : 'badge-red'
                            }`}
                          >
                            {quiz.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 font-mono font-bold text-xs text-slate-800">
                            <span>{quiz.accessCode}</span>
                            <button
                              onClick={() => copyToClipboard(quiz.accessCode)}
                              title="Copy Access Code"
                              className="text-slate-400 hover:text-brand-600 transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {copiedCode === quiz.accessCode && (
                            <span className="text-[10px] text-emerald-600 block mt-0.5 font-bold">Copied!</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {quiz._count?.questions || 0} Qs
                          <span className="text-slate-400 block text-[11px] font-normal">
                            {quiz.totalMarks} Total Marks
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <Link
                            href={`/instructor/results/${quiz.id}`}
                            className="font-bold text-brand-600 hover:underline flex items-center gap-1"
                          >
                            <span>{quiz._count?.attempts || 0} Submissions</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Start Live Session Button */}
                            <button
                              onClick={() => handleStartLive(quiz.id)}
                              title="Launch Live Session"
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200 transition-colors flex items-center gap-1"
                            >
                              <Radio className="w-3 h-3 text-indigo-600" />
                              <span>Live</span>
                            </button>

                            {/* Results & Analytics */}
                            <Link
                              href={`/instructor/results/${quiz.id}`}
                              title="View Analytics"
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 transition-colors flex items-center gap-1"
                            >
                              <BarChart2 className="w-3 h-3" />
                              <span>Results</span>
                            </Link>

                            {/* Preview */}
                            <Link
                              href={`/instructor/quizzes/${quiz.id}/preview`}
                              title="Preview Quiz as Student"
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
