'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  Database,
  Search,
  Plus,
  UploadCloud,
  CheckCircle2,
  HelpCircle,
  Eye,
  EyeOff,
  Filter,
} from 'lucide-react';

export default function QuestionBankPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [revealedExplanations, setRevealedExplanations] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadBank() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/login');
          return;
        }
        const meData = await meRes.json();
        setUser(meData.user);

        const res = await fetch('/api/questions');
        const data = await res.json();
        setQuestions(data.questions || []);
        setBanks(data.banks || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadBank();
  }, [router]);

  const toggleExplanation = (id: string) => {
    setRevealedExplanations((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.statement.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.tags && q.tags.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.explanation && q.explanation.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = !typeFilter || q.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <div className="flex flex-1">
        <Sidebar role={user?.role} />

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Question Bank
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Centralized repository of validated questions for quizzes and assessments.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/instructor/import-csv"
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <UploadCloud className="w-3.5 h-3.5 text-brand-600" />
                <span>Import via CSV</span>
              </Link>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search questions by keyword, tags, or concepts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-brand-500"
              >
                <option value="">All Question Types</option>
                <option value="single_choice">Single Choice</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True / False</option>
              </select>
            </div>
          </div>

          {/* Questions List */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">Loading questions...</div>
          ) : filteredQuestions.length === 0 ? (
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center">
              <Database className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No questions found</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Import MCQs using the CSV wizard to populate your question bank.</p>
              <Link
                href="/instructor/import-csv"
                className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Import CSV</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((q, idx) => (
                <div key={q.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-blue">{q.type}</span>
                      <span className="text-xs font-bold text-slate-700">{q.marks} Marks</span>
                      {q.negativeMarks > 0 && (
                        <span className="text-xs text-rose-600 font-semibold">(-{q.negativeMarks} Neg)</span>
                      )}
                      {q.tags && <span className="text-xs text-slate-400 italic">#{q.tags}</span>}
                    </div>

                    <button
                      onClick={() => toggleExplanation(q.id)}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                    >
                      {revealedExplanations[q.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{revealedExplanations[q.id] ? 'Hide Answer & Explanation' : 'View Answer & Explanation'}</span>
                    </button>
                  </div>

                  <p className="text-sm font-semibold text-slate-900 leading-relaxed">{q.statement}</p>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {q.options.map((opt: any) => {
                      const showAnswer = revealedExplanations[q.id];
                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 transition-colors ${
                            showAnswer && opt.isCorrect
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] ${
                              showAnswer && opt.isCorrect
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white border border-slate-300 text-slate-600'
                            }`}
                          >
                            {opt.optionKey}
                          </span>
                          <span className="flex-1">{opt.text}</span>
                          {showAnswer && opt.isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation Block */}
                  {revealedExplanations[q.id] && q.explanation && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                      <p className="font-bold mb-0.5">Explanation & Concepts:</p>
                      <p className="text-amber-800 leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
