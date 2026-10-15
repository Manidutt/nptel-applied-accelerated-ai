'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  Radio,
  Users,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Square,
  AlertTriangle,
  Copy,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  UserX,
  UserPlus,
  Eye,
  EyeOff,
  Share2,
} from 'lucide-react';

export default function InstructorLiveControlRoom({
  params,
}: {
  params: { sessionId: string };
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Live WebSocket state
  const [status, setStatus] = useState<string>('WAITING');
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [participants, setParticipants] = useState<any[]>([]);
  const [answeredCount, setAnsweredCount] = useState<number>(0);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [solutionRevealed, setSolutionRevealed] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/login');
          return;
        }
        const me = await meRes.json();
        setUser(me.user);

        const sRes = await fetch(`/api/live/${params.sessionId}`);
        const sData = await sRes.json();
        if (!sRes.ok) {
          alert(sData.error || 'Session not found.');
          router.push('/instructor');
          return;
        }

        setSessionData(sData);
        setStatus(sData.session.status);
        setCurrentQIndex(sData.session.currentQuestionIndex || 0);

        // Connect WebSocket
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/ws`;
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: 'REGISTER_SESSION',
              sessionId: sData.session.id,
              sessionCode: sData.session.sessionCode,
              quizId: sData.quiz.id,
              userId: me.user.id,
              name: me.user.name,
              totalQuestions: sData.questions.length,
              mode: sData.session.mode,
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'SESSION_STATE') {
              setStatus(msg.status);
              if (msg.currentQuestionIndex !== undefined) {
                setCurrentQIndex(msg.currentQuestionIndex);
              }
              if (msg.answeredCount !== undefined) {
                setAnsweredCount(msg.answeredCount);
              }
            } else if (msg.type === 'ROSTER_UPDATE') {
              setParticipants(msg.roster || []);
            } else if (msg.type === 'QUESTION_CHANGED') {
              setCurrentQIndex(msg.currentQuestionIndex);
              setAnsweredCount(msg.answeredCount || 0);
            } else if (msg.type === 'ANSWER_COUNT_UPDATE') {
              setAnsweredCount(msg.answeredCount);
            } else if (msg.type === 'INTEGRITY_ALERT') {
              setAlerts((prev) => [
                {
                  id: Date.now(),
                  studentName: msg.studentName,
                  eventType: msg.eventType,
                  violationNo: msg.violationNo,
                  timestamp: new Date().toLocaleTimeString(),
                },
                ...prev.slice(0, 9), // keep last 10
              ]);
            }
          } catch (e) {
            console.error('WS parse error:', e);
          }
        };
      } catch (e) {
        console.error('Live init error:', e);
      } finally {
        setLoading(false);
      }
    }
    init();

    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [params.sessionId, router]);

  const sendWs = (payload: object) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  };

  const handleStart = () => sendWs({ type: 'START_SESSION' });
  const handlePause = () => sendWs({ type: 'PAUSE_SESSION' });
  const handleResume = () => sendWs({ type: 'RESUME_SESSION' });
  const handleNext = () => sendWs({ type: 'NEXT_QUESTION' });
  const handlePrev = () => sendWs({ type: 'PREV_QUESTION' });
  const handleEnd = () => {
    if (confirm('Conclude this live session? Submissions will be finalized.')) {
      sendWs({ type: 'END_SESSION' });
      setStatus('COMPLETED');
    }
  };

  const handleKickParticipant = (targetUserId: string, targetName: string) => {
    if (confirm(`Are you sure you want to remove ${targetName} from this active session?`)) {
      sendWs({
        type: 'KICK_PARTICIPANT',
        targetUserId,
        reason: 'Removed by host instructor.',
      });
    }
  };

  const handleToggleReveal = () => {
    const nextState = !solutionRevealed;
    setSolutionRevealed(nextState);
    sendWs({
      type: 'REVEAL_ANSWER',
      reveal: nextState,
    });
  };

  const copyCode = () => {
    if (sessionData?.session?.sessionCode) {
      navigator.clipboard.writeText(sessionData.session.sessionCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}/student/waiting/${sessionData?.session?.id}`;
    navigator.clipboard.writeText(url);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs">Loading Live Session...</div>;
  }

  const currentQ = sessionData?.questions?.[currentQIndex];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <div className="flex flex-1">
        <Sidebar role={user?.role} />

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="badge badge-blue flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-brand-600 animate-pulse" />
                  <span>Instructor-Led Live Mode</span>
                </span>
                <span
                  className={`badge ${
                    status === 'ACTIVE'
                      ? 'badge-green'
                      : status === 'PAUSED'
                      ? 'badge-amber'
                      : status === 'COMPLETED'
                      ? 'badge-red'
                      : 'badge-purple'
                  }`}
                >
                  Status: {status}
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 mt-1">{sessionData.quiz.title}</h1>
            </div>

            {/* Session Join Code Box */}
            <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Join Code</span>
                <span className="font-mono text-xl font-black text-brand-700 tracking-wider">
                  {sessionData.session.sessionCode}
                </span>
              </div>
              <button
                onClick={copyCode}
                title="Copy Code"
                className="p-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
              {copiedCode && <span className="text-xs text-emerald-600 font-bold">Copied!</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Center Stage: Active Question & Live Controls */}
            <div className="lg:col-span-2 space-y-6">
              {/* Controls Toolbar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {status === 'WAITING' && (
                    <button
                      onClick={handleStart}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Start Assessment</span>
                    </button>
                  )}

                  {status === 'ACTIVE' && (
                    <button
                      onClick={handlePause}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
                    >
                      <Pause className="w-4 h-4 fill-white" />
                      <span>Pause Session</span>
                    </button>
                  )}

                  {status === 'PAUSED' && (
                    <button
                      onClick={handleResume}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Resume Session</span>
                    </button>
                  )}

                  <button
                    onClick={handlePrev}
                    disabled={currentQIndex === 0 || status !== 'ACTIVE'}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors disabled:opacity-40 flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Prev Q</span>
                  </button>

                  <button
                    onClick={handleNext}
                    disabled={currentQIndex >= sessionData.questions.length - 1 || status !== 'ACTIVE'}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors disabled:opacity-40 flex items-center gap-1"
                  >
                    <span>Next Q</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleToggleReveal}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      solutionRevealed
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {solutionRevealed ? <EyeOff className="w-4 h-4 text-amber-700" /> : <Eye className="w-4 h-4 text-slate-600" />}
                    <span>{solutionRevealed ? 'Hide Solution' : 'Reveal Solution'}</span>
                  </button>
                </div>

                <button
                  onClick={handleEnd}
                  disabled={status === 'COMPLETED'}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
                  <span>Conclude Session</span>
                </button>
              </div>

              {/* Active Question Display */}
              {currentQ ? (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="badge badge-purple">
                      Question {currentQIndex + 1} of {sessionData.questions.length}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      Answered: <span className="text-brand-600 font-black">{answeredCount}</span> of {participants.filter(p => p.role === 'STUDENT').length} students
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-slate-900 leading-relaxed">
                    {currentQ.statement}
                  </h2>

                  {/* Options */}
                  <div className="space-y-2.5">
                    {currentQ.options.map((opt: any) => (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border text-xs flex items-center gap-3 transition-colors ${
                          opt.isCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                            opt.isCorrect
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white border border-slate-300 text-slate-700'
                          }`}
                        >
                          {opt.optionKey}
                        </span>
                        <span className="flex-1">{opt.text}</span>
                        {opt.isCorrect && <span className="badge badge-green text-[10px]">Correct Answer</span>}
                      </div>
                    ))}
                  </div>

                  {currentQ.explanation && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                      <span className="font-bold">Official Solution: </span>
                      <span>{currentQ.explanation}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                  No questions loaded for this session.
                </div>
              )}
            </div>

            {/* Sidebar: Roster & Live Security Alerts */}
            <div className="space-y-6">
              {/* Participant Roster */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-brand-600" />
                      <span>Live Roster ({participants.length})</span>
                    </h3>
                    <p className="text-[10px] text-slate-400">Host has full participant control</p>
                  </div>
                  <button
                    onClick={copyInviteLink}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 transition-colors"
                    title="Copy direct invite link for students"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>{copiedInvite ? 'Copied!' : 'Invite'}</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {participants.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">Waiting for students to join...</p>
                  ) : (
                    participants.map((p, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${p.role === 'INSTRUCTOR' ? 'bg-brand-500' : 'bg-emerald-500'}`} />
                          <div>
                            <span className="font-bold text-slate-800 block leading-tight">{p.name}</span>
                            <span className="text-[10px] text-slate-400">{p.role}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {p.role !== 'INSTRUCTOR' ? (
                            <button
                              onClick={() => handleKickParticipant(p.userId, p.name)}
                              className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-100 text-[11px] font-bold flex items-center gap-1 transition-colors border border-rose-200"
                              title={`Remove ${p.name} from this session`}
                            >
                              <UserX className="w-3 h-3" />
                              <span>Kick</span>
                            </button>
                          ) : (
                            <span className="badge badge-purple text-[10px]">Host</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Real-Time Security & Tab-Switch Alerts */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Live Integrity Telemetry</span>
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400">WebSocket Push</span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {alerts.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 text-center text-slate-400 text-xs">
                      No integrity anomalies detected.
                    </div>
                  ) : (
                    alerts.map((alt) => (
                      <div
                        key={alt.id}
                        className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-0.5"
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>{alt.studentName}</span>
                          <span className="text-[10px] text-rose-500">{alt.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-rose-700">
                          {alt.eventType} · Warning #{alt.violationNo}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
