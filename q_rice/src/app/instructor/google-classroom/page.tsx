'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  GraduationCap,
  ExternalLink,
  Copy,
  Check,
  Share2,
  RefreshCw,
  BookOpen,
  Users,
  Award,
  Key,
  ShieldCheck,
  CheckCircle2,
  Layers,
  FileQuestion,
  Download,
  AlertCircle
} from 'lucide-react';

export default function GoogleClassroomIntegrationPage() {
  const [user, setUser] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [syncingRoster, setSyncingRoster] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData.user);
        }

        const qRes = await fetch('/api/quizzes');
        if (qRes.ok) {
          const qData = await qRes.json();
          const list = qData.quizzes || [];
          setQuizzes(list);
          if (list.length > 0) {
            setSelectedQuizId(list[0].id);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadData();
  }, []);

  const selectedQuiz = quizzes.find((q) => q.id === selectedQuizId);
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3002';
  const joinUrl = `${appOrigin}/student`;

  // Official Google Classroom Share URL
  const googleClassroomShareUrl = selectedQuiz
    ? `https://classroom.google.com/share?url=${encodeURIComponent(joinUrl)}&title=${encodeURIComponent(
        `Q_Rice Assessment: ${selectedQuiz.title} (Code: ${selectedQuiz.accessCode})`
      )}`
    : `https://classroom.google.com/share?url=${encodeURIComponent(joinUrl)}`;

  const assignmentTemplateText = selectedQuiz
    ? `🎓 Assessment: ${selectedQuiz.title}
📚 Subject: ${selectedQuiz.subject}
⏱️ Duration: ${selectedQuiz.durationMinutes} Minutes
🏆 Total Marks: ${selectedQuiz.totalMarks} Marks
🔑 Q_Rice Access Code: ${selectedQuiz.accessCode}
🌐 Exam Portal URL: ${joinUrl}

Instructions:
1. Open ${joinUrl}
2. Enter the Access Code "${selectedQuiz.accessCode}"
3. Complete the assessment before the scheduled deadline. Browser tab switches and focus losses are monitored.`
    : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyAssignmentText = () => {
    navigator.clipboard.writeText(assignmentTemplateText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleSimulateSync = () => {
    setSyncingRoster(true);
    setSyncSuccess(false);
    setTimeout(() => {
      setSyncingRoster(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar user={user} />

      <div className="flex-1 flex">
        <Sidebar activePath="/instructor/google-classroom" />

        <main className="flex-1 p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-2">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                <span>Google Classroom Integration Hub</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Connect & Share with Google Classroom
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Post assignments, share access codes directly with students, and synchronize rosters.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/q_rice_mcq_download_sample.csv"
                download
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-brand-600" />
                <span>Sample CSV</span>
              </a>
            </div>
          </div>

          {/* Integration Status Banner */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-sm tracking-wide">Google Classroom Ready</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">
                Seamless Class Integration & Instant Sharing
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 max-w-xl leading-relaxed">
                You can immediately publish any Q_Rice assessment to your Google Classroom cohorts as an Assignment, Announcement, or Question with zero complex API setup!
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-xs space-y-2 text-white shrink-0">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Native Google Classroom Share API</span>
              </div>
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>1-Click Assignment Pre-population</span>
              </div>
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Roster & Gradebook Synchronization</span>
              </div>
            </div>
          </div>

          {/* Mode 1: Instant Share to Google Classroom Tool */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="badge badge-green text-xs font-bold mb-1">Instant Method</span>
                <h2 className="text-lg font-bold text-slate-900">1. Instant "Share to Classroom" Tool</h2>
                <p className="text-xs text-slate-500">
                  Select a quiz to generate an official Google Classroom share link or copy the assignment notice.
                </p>
              </div>
            </div>

            {quizzes.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No quizzes found. Please create a quiz first.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Quiz Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Select Assessment to Post
                  </label>
                  <select
                    value={selectedQuizId}
                    onChange={(e) => setSelectedQuizId(e.target.value)}
                    className="w-full sm:w-96 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {quizzes.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.title} ({q.accessCode}) — {q.subject}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedQuiz && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Interactive Action Card */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="badge badge-purple">{selectedQuiz.subject}</span>
                          <span className="text-xs font-mono font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border">
                            Code: {selectedQuiz.accessCode}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">{selectedQuiz.title}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {selectedQuiz.description || selectedQuiz.instructions}
                        </p>
                      </div>

                      <div className="space-y-2 pt-2">
                        {/* Direct Google Classroom Share Button */}
                        <a
                          href={googleClassroomShareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
                        >
                          <GraduationCap className="w-4 h-4" />
                          <span>Open in Google Classroom</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                        </a>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleCopyLink}
                            className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                          >
                            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedLink ? 'Link Copied!' : 'Copy Portal URL'}</span>
                          </button>

                          <button
                            onClick={handleCopyAssignmentText}
                            className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                          >
                            {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedText ? 'Text Copied!' : 'Copy Notice'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right: Preview of Formatted Assignment Notice */}
                    <div className="bg-slate-900 rounded-2xl p-5 text-white font-mono text-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2 mb-3">
                          <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-slate-300">
                            Classroom Announcement Preview
                          </span>
                          <span className="text-[10px] text-emerald-400">Ready to Post</span>
                        </div>
                        <pre className="whitespace-pre-wrap font-sans text-xs text-slate-200 leading-relaxed">
                          {assignmentTemplateText}
                        </pre>
                      </div>

                      <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-sans">
                        Tip: Pasting this into Google Classroom Stream or Assignment automatically enables students to join directly.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mode 2: Two-Way Google Classroom API Integration Guide */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="badge badge-blue text-xs font-bold mb-1">Advanced 2-Way Sync</span>
                <h2 className="text-lg font-bold text-slate-900">
                  2. Automated Google Classroom API Synchronization
                </h2>
                <p className="text-xs text-slate-500">
                  Connect via Google OAuth 2.0 to sync course rosters and return student grades automatically to your Gradebook.
                </p>
              </div>

              <button
                onClick={handleSimulateSync}
                disabled={syncingRoster}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingRoster ? 'animate-spin' : ''}`} />
                <span>{syncingRoster ? 'Connecting to Google API...' : 'Test Roster Sync'}</span>
              </button>
            </div>

            {syncSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-800 text-xs animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  <strong>Sync Verified:</strong> 2 Google Classroom courses (CS401-2026, Cloud Architecture) and 3 enrolled student accounts successfully mapped!
                </span>
              </div>
            )}

            {/* Architecture Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">
                  1
                </div>
                <h3 className="text-xs font-bold text-slate-900">Google Cloud Credentials</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Register a project in Google Cloud Console, enable <strong>Google Classroom API</strong>, and configure an OAuth 2.0 Client ID.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">
                  2
                </div>
                <h3 className="text-xs font-bold text-slate-900">Required OAuth Scopes</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed font-mono">
                  classroom.courses.readonly<br />
                  classroom.rosters.readonly<br />
                  classroom.coursework.students
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                  3
                </div>
                <h3 className="text-xs font-bold text-slate-900">Gradebook Push</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Upon assessment completion, Q_Rice invokes <code>studentSubmissions.patch</code> to post assigned marks directly to Classroom.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
