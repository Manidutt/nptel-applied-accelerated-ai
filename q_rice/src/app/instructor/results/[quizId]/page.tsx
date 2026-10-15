'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ArrowLeft,
  ShieldAlert,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function QuizResultsAnalyticsPage({
  params,
}: {
  params: { quizId: string };
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/login');
          return;
        }
        const meData = await meRes.json();
        setUser(meData.user);

        const res = await fetch(`/api/results/${params.quizId}`);
        const result = await res.json();
        if (res.ok) {
          setData(result);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [params.quizId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-semibold text-slate-500">
        Loading analytics...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-semibold text-rose-500">
        Quiz analytics not found.
      </div>
    );
  }

  const { quiz, stats, questionAnalysis, attempts } = data;

  const filteredAttempts = attempts.filter((att: any) => {
    const matchesSearch =
      att.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'PASSED'
        ? att.isPassed
        : statusFilter === 'FAILED'
        ? !att.isPassed
        : statusFilter === 'FLAGGED'
        ? att.isFlaggedForReview || att.integrityEventCount > 0
        : true;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <div className="flex flex-1">
        <Sidebar role={user?.role} />

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <Link href="/instructor/quizzes" className="text-xs font-semibold text-slate-400 hover:text-brand-600 flex items-center gap-1 mb-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to All Quizzes</span>
              </Link>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {quiz.title}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {quiz.className} · {quiz.subject} · Total Marks: {quiz.totalMarks} pts · Pass Threshold: {quiz.passingPercentage}%
              </p>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2.5">
              <a
                href={`/api/export/csv?quizId=${quiz.id}`}
                download
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </a>

              <a
                href={`/api/export/pdf?type=class&quizId=${quiz.id}`}
                download
                className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-brand-500/20"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Download PDF Report</span>
              </a>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Submissions</span>
              <p className="text-2xl font-black text-slate-900">{stats.totalSubmissions}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Total completed</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Average Score</span>
              <p className="text-2xl font-black text-brand-600">{stats.averageScore.toFixed(1)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Median: {stats.medianScore.toFixed(1)}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Pass Rate</span>
              <p className="text-2xl font-black text-emerald-600">{stats.passPercentage.toFixed(1)}%</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Threshold: {quiz.passingPercentage}%</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">High Score</span>
              <p className="text-2xl font-black text-indigo-600">{stats.highestScore}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Low: {stats.lowestScore}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Flagged Attempts</span>
              <p className="text-2xl font-black text-amber-600">
                {attempts.filter((a: any) => a.isFlaggedForReview || a.integrityEventCount > 0).length}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Integrity anomalies</p>
            </div>
          </div>

          {/* Analytics Visualizations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Distribution Chart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-brand-500" />
                <span>Score Distribution (% Bands)</span>
              </h3>
              <div className="space-y-3">
                {stats.scoreDistribution.map((band: any) => {
                  const maxCount = Math.max(...stats.scoreDistribution.map((b: any) => b.count), 1);
                  const widthPercent = (band.count / maxCount) * 100;
                  return (
                    <div key={band.range} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>{band.range}</span>
                        <span>{band.count} students</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-brand-600 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${widthPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Question-level Correctness Rate */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Question Accuracy Breakdown</span>
              </h3>
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {questionAnalysis.map((q: any) => (
                  <div key={q.questionId} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex-1 pr-3 truncate">
                      <span className="font-bold text-slate-900 mr-2">Q{q.orderIndex}.</span>
                      <span className="text-slate-700">{q.statement}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] text-slate-400">
                        {q.correctCount}/{q.correctCount + q.incorrectCount + q.unansweredCount}
                      </span>
                      <span
                        className={`badge ${
                          q.correctnessRate >= 70
                            ? 'badge-green'
                            : q.correctnessRate >= 40
                            ? 'badge-amber'
                            : 'badge-red'
                        }`}
                      >
                        {q.correctnessRate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Student Submissions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-brand-500"
                >
                  <option value="ALL">All Submissions</option>
                  <option value="PASSED">Passed Only</option>
                  <option value="FAILED">Failed Only</option>
                  <option value="FLAGGED">Flagged / Integrity Warnings</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4">Percentage</th>
                    <th className="py-3 px-4">Time Taken</th>
                    <th className="py-3 px-4">Integrity Flags</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">PDF Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredAttempts.map((att: any) => {
                    const mins = Math.floor(att.timeSpentSeconds / 60);
                    const secs = att.timeSpentSeconds % 60;
                    return (
                      <tr key={att.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{att.studentName}</p>
                          <p className="text-[11px] text-slate-400">{att.email}</p>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {att.totalScore} / {att.maxScore}
                        </td>
                        <td className="py-3.5 px-4 font-semibold">
                          {att.percentage.toFixed(1)}%
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {mins}m {secs}s
                        </td>
                        <td className="py-3.5 px-4">
                          {att.integrityEventCount > 0 ? (
                            <span className="badge badge-amber flex items-center gap-1 w-fit">
                              <ShieldAlert className="w-3 h-3 text-amber-600" />
                              <span>{att.integrityEventCount} tab events</span>
                            </span>
                          ) : (
                            <span className="badge badge-green">Clean</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`badge ${att.isPassed ? 'badge-green' : 'badge-red'}`}>
                            {att.isPassed ? 'PASSED' : 'FAILED'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <a
                            href={`/api/export/pdf?type=student&attemptId=${att.id}`}
                            download
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            <span>PDF</span>
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
