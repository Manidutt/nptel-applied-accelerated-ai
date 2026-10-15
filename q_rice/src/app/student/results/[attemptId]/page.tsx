'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  FileDown,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Check,
  FileText
} from 'lucide-react';

export default function StudentResultsPage({ params }: { params: { attemptId: string } }) {
  const router = useRouter();
  const attemptId = params.attemptId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState<'ALL' | 'CORRECT' | 'INCORRECT' | 'UNANSWERED'>('ALL');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadResults() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData.user);
        }

        const res = await fetch(`/api/student/attempt/${attemptId}`);
        if (!res.ok) {
          const errData = await res.json();
          setError(errData.error || 'Failed to retrieve assessment results.');
          setLoading(false);
          return;
        }

        const resultData = await res.json();
        setData(resultData);
      } catch (err: any) {
        setError(err.message || 'Network error.');
      } finally {
        setLoading(false);
      }
    }

    loadResults();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar user={user} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-base font-bold text-slate-800">Calculating Official Assessment Results...</h2>
            <p className="text-xs text-slate-500">Checking scoring rules and proctoring telemetry.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar user={user} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl border border-rose-200 max-w-md w-full text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Unable to Display Results</h2>
            <p className="text-xs text-slate-600">{error || 'Record could not be retrieved.'}</p>
            <Link
              href="/student"
              className="inline-flex items-center justify-center w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
            >
              Back to Student Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { attempt, quiz, questions, responses } = data;
  const canViewDetailedAnswers = attempt.canViewAnswers;

  // Filtered questions
  const filteredQuestions = questions.filter((q: any) => {
    const resp = responses[q.questionId];
    if (filter === 'ALL') return true;
    if (filter === 'CORRECT') return resp?.isCorrect === true;
    if (filter === 'INCORRECT') return resp?.isCorrect === false && resp?.selectedKeys && resp?.selectedKeys.length > 0;
    if (filter === 'UNANSWERED') return !resp?.selectedKeys || resp?.selectedKeys.length === 0;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Top Breadcrumb & Action */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/student"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Assessments</span>
          </Link>

          <a
            href={`/api/export/pdf?type=student&attemptId=${attemptId}`}
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition-colors"
          >
            <FileDown className="w-3.5 h-3.5 text-brand-600" />
            <span>Download Official PDF Report</span>
          </a>
        </div>

        {/* Hero Score Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 overflow-hidden relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="badge badge-purple">{quiz.subject}</span>
                <span className="text-xs font-mono font-bold text-slate-400">ID: {attempt.id.slice(-8).toUpperCase()}</span>
                {attempt.isFlaggedForReview && (
                  <span className="badge badge-amber flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    Flagged for Review
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{quiz.title}</h1>
              <p className="text-xs text-slate-500 mt-1">
                Completed on {new Date(attempt.submittedAt || Date.now()).toLocaleDateString()} at{' '}
                {new Date(attempt.submittedAt || Date.now()).toLocaleTimeString()}
              </p>
            </div>

            {/* Score Banner */}
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="text-center sm:text-right">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Score</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">{attempt.totalScore ?? '—'}</span>
                  <span className="text-sm font-bold text-slate-500">/ {attempt.maxScore ?? '—'}</span>
                </div>
              </div>

              <div className="h-10 w-[1px] bg-slate-200" />

              <div className="text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Result</span>
                {attempt.isPassed !== undefined ? (
                  <span className={`badge font-bold text-xs ${attempt.isPassed ? 'badge-green' : 'badge-red'}`}>
                    {attempt.isPassed ? 'PASSED' : 'FAILED'} ({attempt.percentage}%)
                  </span>
                ) : (
                  <span className="badge badge-blue">RECORDED</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-black text-emerald-900 leading-none block">{attempt.correctCount ?? 0}</span>
                <span className="text-[11px] font-semibold text-emerald-700">Correct Answers</span>
              </div>
            </div>

            <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-black text-rose-900 leading-none block">{attempt.incorrectCount ?? 0}</span>
                <span className="text-[11px] font-semibold text-rose-700">Incorrect Answers</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-600 text-white flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-black text-slate-900 leading-none block">{attempt.unansweredCount ?? 0}</span>
                <span className="text-[11px] font-semibold text-slate-600">Unanswered</span>
              </div>
            </div>

            <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-black text-brand-900 leading-none block">
                  {attempt.integrityEventCount || 0}
                </span>
                <span className="text-[11px] font-semibold text-brand-700">Integrity Flags</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Question Review Section */}
        {canViewDetailedAnswers ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Question-by-Question Review</h2>
                <p className="text-xs text-slate-500">
                  Review your submitted responses alongside correct answers and detailed instructor explanations.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                {(['ALL', 'CORRECT', 'INCORRECT', 'UNANSWERED'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilter(mode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filter === mode
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {mode.charAt(0) + mode.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-6">
              {filteredQuestions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No questions match the selected filter.
                </div>
              ) : (
                filteredQuestions.map((q: any, idx: number) => {
                  const resp = responses[q.questionId];
                  const studentSelectedKeys = resp?.selectedKeys ? resp.selectedKeys.split('|') : [];
                  const correctKeys = q.correctKeys || [];
                  const isCorrect = resp?.isCorrect;
                  const isUnanswered = studentSelectedKeys.length === 0;

                  return (
                    <div
                      key={q.questionId}
                      className={`p-6 rounded-2xl border transition-all space-y-4 ${
                        isCorrect
                          ? 'border-emerald-200 bg-emerald-50/20'
                          : isUnanswered
                          ? 'border-slate-200 bg-slate-50/40'
                          : 'border-rose-200 bg-rose-50/20'
                      }`}
                    >
                      {/* Question Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-700">Q{idx + 1}.</span>
                          <span className="badge badge-gray text-xs">{q.type.replace('_', ' ')}</span>
                          {isCorrect ? (
                            <span className="badge badge-green flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Correct (+{resp?.marksAwarded ?? q.marks})
                            </span>
                          ) : isUnanswered ? (
                            <span className="badge badge-gray">Unanswered (0)</span>
                          ) : (
                            <span className="badge badge-red flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              Incorrect ({resp?.marksAwarded ?? 0})
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-mono font-bold text-slate-500">
                          Total: {q.marks} Marks
                        </div>
                      </div>

                      {/* Question Text */}
                      <p className="text-sm font-bold text-slate-900 whitespace-pre-wrap">{q.statement}</p>

                      {/* Options Grid */}
                      <div className="space-y-2">
                        {q.options.map((opt: any) => {
                          const wasSelected = studentSelectedKeys.includes(opt.optionKey);
                          const isOptionCorrect = correctKeys.includes(opt.optionKey);

                          let borderClass = 'border-slate-200 bg-white text-slate-700';
                          if (isOptionCorrect && wasSelected) {
                            borderClass = 'border-emerald-500 bg-emerald-100/50 text-emerald-950 font-semibold';
                          } else if (isOptionCorrect && !wasSelected) {
                            borderClass = 'border-emerald-400 bg-emerald-50/60 text-emerald-900 border-dashed';
                          } else if (!isOptionCorrect && wasSelected) {
                            borderClass = 'border-rose-400 bg-rose-50 text-rose-950';
                          }

                          return (
                            <div
                              key={opt.id}
                              className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${borderClass}`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[11px]">
                                  {opt.optionKey}
                                </span>
                                <span>{opt.text}</span>
                              </div>

                              <div className="flex items-center gap-2 text-[11px] font-bold">
                                {wasSelected && (
                                  <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800">
                                    Your Choice
                                  </span>
                                )}
                                {isOptionCorrect && (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    Correct Answer
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation box */}
                      {q.explanation && (
                        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 space-y-1">
                          <span className="font-bold flex items-center gap-1.5 text-brand-800">
                            <FileText className="w-3.5 h-3.5" />
                            Explanation:
                          </span>
                          <p className="text-slate-700 leading-relaxed pl-5">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* Delayed / Withheld Results Notification */
          <div className="bg-amber-50 rounded-3xl border border-amber-200 p-8 text-center space-y-3">
            <Clock className="w-10 h-10 text-amber-600 mx-auto" />
            <h3 className="text-base font-bold text-amber-900">Detailed Answer Review Withheld</h3>
            <p className="text-xs text-amber-800 max-w-lg mx-auto leading-relaxed">
              In accordance with instructor evaluation policies, correct answer keys and detailed explanations
              will be released after all cohorts have finalized their assessments.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
