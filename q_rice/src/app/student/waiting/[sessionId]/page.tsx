'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  Radio,
  Users,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export default function StudentLiveWaitingRoom({
  params,
}: {
  params: { sessionId: string };
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [attemptId, setAttemptId] = useState<string>('');
  const [participantsCount, setParticipantsCount] = useState<number>(1);
  const [sessionStatus, setSessionStatus] = useState<string>('WAITING');
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

        // Fetch session info
        const sRes = await fetch(`/api/live/${params.sessionId}`);
        const sData = await sRes.json();
        if (!sRes.ok) {
          alert(sData.error || 'Live session not found.');
          router.push('/student');
          return;
        }
        setSessionData(sData);

        // Fetch or create student attempt for this quiz
        const joinRes = await fetch('/api/student/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: sData.session.sessionCode }),
        });
        const joinData = await joinRes.json();
        if (joinData.attemptId) {
          setAttemptId(joinData.attemptId);
        }

        // If session is already ACTIVE, go directly to exam
        if (sData.session.status === 'ACTIVE' && joinData.attemptId) {
          router.push(`/student/exam/${joinData.attemptId}?sessionId=${sData.session.id}`);
          return;
        }

        // Connect WebSocket
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/ws`;
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: 'JOIN_SESSION',
              sessionId: sData.session.id,
              sessionCode: sData.session.sessionCode,
              userId: me.user.id,
              name: me.user.name,
              role: 'STUDENT',
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'SESSION_STATE') {
              setSessionStatus(msg.status);
              if (msg.participantsCount !== undefined) {
                setParticipantsCount(msg.participantsCount);
              }
              if (msg.status === 'ACTIVE' && joinData.attemptId) {
                router.push(`/student/exam/${joinData.attemptId}?sessionId=${sData.session.id}`);
              }
            } else if (msg.type === 'ROSTER_UPDATE') {
              setParticipantsCount(msg.participantsCount || 1);
            } else if (msg.type === 'KICKED') {
              alert(msg.reason || 'You were removed from this session by the instructor.');
              router.push('/student');
            }
          } catch (e) {
            console.error('WS parse error:', e);
          }
        };
      } catch (e) {
        console.error('Waiting room init error:', e);
      } finally {
        setLoading(false);
      }
    }

    init();

    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [params.sessionId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-semibold text-slate-500">
        Connecting to live classroom session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Navbar user={user} />

      <main className="flex-1 max-w-xl mx-auto px-4 py-12 flex flex-col items-center justify-center text-center w-full">
        <div className="w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6 text-center">
          {/* Pulsing indicator */}
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping"></div>
            <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
          </div>

          <div>
            <span className="badge badge-purple mb-2">Live Session Waiting Room</span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {sessionData.quiz.title}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Instructor: <span className="font-semibold text-slate-700">{sessionData.quiz.instructorName}</span>
            </p>
          </div>

          {/* Join Code Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 max-w-xs mx-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Session Code</span>
            <span className="font-mono text-2xl font-black text-brand-700 tracking-wider">
              {sessionData.session.sessionCode}
            </span>
          </div>

          {/* Status Message */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-brand-600 animate-spin" />
            <span className="font-medium">
              Waiting for instructor to begin the assessment... You will be redirected automatically.
            </span>
          </div>

          {/* Instructions Notice */}
          <div className="text-left bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5 text-xs text-slate-600">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Exam Integrity Notice</span>
            </p>
            <p className="text-[11px] leading-relaxed">
              Once started, do not switch browser tabs or minimize your window. All navigation and focus events are monitored and logged to the instructor dashboard.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-brand-600" />
              <span>{participantsCount} students in waiting room</span>
            </span>
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Synced
            </span>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400">
        Q_Rice — Instructor-Led Quiz Management System
      </footer>
    </div>
  );
}
