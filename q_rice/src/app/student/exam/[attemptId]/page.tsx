'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  ShieldAlert,
  AlertTriangle,
  Flag,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Save,
  Check,
  RotateCcw,
  Send,
  HelpCircle,
  FileText,
  AlertCircle
} from 'lucide-react';

interface Option {
  id: string;
  optionKey: string;
  text: string;
}

interface Question {
  quizQuestionId: string;
  questionId: string;
  orderIndex: number;
  marks: number;
  negativeMarks: number;
  statement: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  options: Option[];
}

export default function StudentExamPage({ params }: { params: { attemptId: string } }) {
  const router = useRouter();
  const attemptId = params.attemptId;

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Responses: questionId -> { selectedKeys: string, isFlagged: boolean }
  const [responses, setResponses] = useState<Record<string, { selectedKeys: string; isFlagged: boolean }>>({});
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'>('SAVED');

  // Timer
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isTimeUp, setIsTimeUp] = useState(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Integrity warning state
  const [integrityWarning, setIntegrityWarning] = useState<{
    show: boolean;
    violationNo: number;
    threshold: number;
    message: string;
    autoSubmitted?: boolean;
  } | null>(null);

  // Submit confirmation modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Save timeout ref for debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket ref for live broadcast if applicable
  const wsRef = useRef<WebSocket | null>(null);

  // Initial load
  useEffect(() => {
    async function fetchAttempt() {
      try {
        const res = await fetch(`/api/student/attempt/${attemptId}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Failed to load assessment.');
          setLoading(false);
          return;
        }

        const data = await res.json();

        // If already submitted, navigate directly to results
        if (data.attempt.status !== 'IN_PROGRESS') {
          router.push(`/student/results/${attemptId}`);
          return;
        }

        setQuiz(data.quiz);
        setAttempt(data.attempt);
        setQuestions(data.questions);
        setResponses(data.responses || {});
        setRemainingSeconds(data.attempt.remainingSeconds);

        // Try connecting to live session websocket if session active
        try {
          const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const socket = new WebSocket(`${wsProtocol}//${window.location.host}/api/ws`);
          wsRef.current = socket;
          socket.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === 'KICKED') {
                alert(msg.reason || 'You were removed from this session by the instructor.');
                router.push('/student');
              }
            } catch (e) {
              console.error(e);
            }
          };
        } catch {
          // Live telemetry optional in self-paced
        }
      } catch (err: any) {
        setError(err.message || 'Network error.');
      } finally {
        setLoading(false);
      }
    }

    fetchAttempt();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [attemptId, router]);

  // Submit assessment function
  const handleSubmit = useCallback(async (isAuto = false) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/student/attempt/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        router.push(`/student/results/${attemptId}`);
      } else {
        const data = await res.json();
        alert(data.error || 'Submission failed. Please contact your instructor.');
        setSubmitting(false);
        setShowSubmitModal(false);
      }
    } catch (err: any) {
      alert('Network failure during submission: ' + err.message);
      setSubmitting(false);
      setShowSubmitModal(false);
    }
  }, [attemptId, submitting, router]);

  // Timer countdown
  useEffect(() => {
    if (loading || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimeUp(true);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, remainingSeconds, handleSubmit]);

  // Save answer to server
  const persistAnswer = async (questionId: string, selectedKeys: string, isFlagged: boolean) => {
    setSaveStatus('SAVING');
    try {
      const res = await fetch(`/api/student/attempt/${attemptId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, selectedKeys, isFlagged }),
      });

      if (res.ok) {
        setSaveStatus('SAVED');
      } else {
        setSaveStatus('ERROR');
      }
    } catch {
      setSaveStatus('ERROR');
    }
  };

  // Integrity violation reporter
  const recordIntegrityViolation = useCallback(async (eventType: string, description: string) => {
    if (loading || isTimeUp || submitting) return;

    try {
      const res = await fetch(`/api/student/attempt/${attemptId}/integrity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, description }),
      });

      if (res.ok) {
        const data = await res.json();

        // Broadcast to live room if WS connected
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'INTEGRITY_ALERT',
              attemptId,
              eventType,
              violationNo: data.violationNo,
            })
          );
        }

        if (data.autoSubmitted) {
          setIntegrityWarning({
            show: true,
            violationNo: data.violationNo,
            threshold: data.threshold,
            message: data.message,
            autoSubmitted: true,
          });
          setTimeout(() => {
            router.push(`/student/results/${attemptId}`);
          }, 3500);
        } else {
          setIntegrityWarning({
            show: true,
            violationNo: data.violationNo,
            threshold: data.threshold,
            message: data.warning || 'Navigating away from the quiz window is prohibited.',
          });
        }
      }
    } catch (e) {
      console.error('Failed to log integrity event', e);
    }
  }, [attemptId, loading, isTimeUp, submitting, router]);

  // Setup Browser Visibility & Blur Event Listeners
  useEffect(() => {
    if (!quiz?.integritySettings?.integrityEnabled) return;

    let blurTimeout: NodeJS.Timeout | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordIntegrityViolation('TAB_SWITCH', 'Student switched browser tab or minimized window.');
      }
    };

    const handleWindowBlur = () => {
      // Small debounce to avoid false positives on quick system dialogs
      blurTimeout = setTimeout(() => {
        if (!document.hasFocus()) {
          recordIntegrityViolation('WINDOW_BLUR', 'Quiz window lost focus.');
        }
      }, 500);
    };

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(isCurrentlyFullscreen);

      if (quiz?.integritySettings?.requireFullscreen && !isCurrentlyFullscreen) {
        recordIntegrityViolation('FULLSCREEN_EXIT', 'Student exited required fullscreen mode.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (blurTimeout) clearTimeout(blurTimeout);
    };
  }, [quiz, recordIntegrityViolation]);

  // Handle Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err.message);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Handle Option Click
  const handleSelectOption = (optionKey: string) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const existing = responses[currentQ.questionId] || { selectedKeys: '', isFlagged: false };
    let newSelected = '';

    if (currentQ.type === 'MULTIPLE_CHOICE') {
      const keys = existing.selectedKeys ? existing.selectedKeys.split('|') : [];
      if (keys.includes(optionKey)) {
        newSelected = keys.filter((k) => k !== optionKey).sort().join('|');
      } else {
        newSelected = [...keys, optionKey].sort().join('|');
      }
    } else {
      // SINGLE_CHOICE or TRUE_FALSE
      newSelected = optionKey;
    }

    const updated = {
      ...responses,
      [currentQ.questionId]: {
        selectedKeys: newSelected,
        isFlagged: existing.isFlagged,
      },
    };

    setResponses(updated);

    // Debounced persist
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      persistAnswer(currentQ.questionId, newSelected, existing.isFlagged);
    }, 300);
  };

  // Toggle Flag
  const handleToggleFlag = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const existing = responses[currentQ.questionId] || { selectedKeys: '', isFlagged: false };
    const newFlagged = !existing.isFlagged;

    const updated = {
      ...responses,
      [currentQ.questionId]: {
        selectedKeys: existing.selectedKeys,
        isFlagged: newFlagged,
      },
    };

    setResponses(updated);
    persistAnswer(currentQ.questionId, existing.selectedKeys, newFlagged);
  };

  // Clear Selection for current question
  const handleClearSelection = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const existing = responses[currentQ.questionId] || { selectedKeys: '', isFlagged: false };
    const updated = {
      ...responses,
      [currentQ.questionId]: {
        selectedKeys: '',
        isFlagged: existing.isFlagged,
      },
    };

    setResponses(updated);
    persistAnswer(currentQ.questionId, '', existing.isFlagged);
  };

  // Time format helper (HH:MM:SS or MM:SS)
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Summary counts
  const totalQuestions = questions.length;
  const answeredCount = Object.values(responses).filter((r) => r.selectedKeys && r.selectedKeys.length > 0).length;
  const flaggedCount = Object.values(responses).filter((r) => r.isFlagged).length;
  const unansweredCount = totalQuestions - answeredCount;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Initializing Secure Assessment Environment...</h2>
          <p className="text-xs text-slate-500">Checking credentials and locking security telemetry.</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-rose-200 max-w-md w-full text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Assessment Error</h2>
          <p className="text-xs text-slate-600">{error || 'Unable to access the requested examination.'}</p>
          <button
            onClick={() => router.push('/student')}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800"
          >
            Return to Student Portal
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const currentResp = currentQ ? responses[currentQ.questionId] || { selectedKeys: '', isFlagged: false } : { selectedKeys: '', isFlagged: false };
  const selectedList = currentResp.selectedKeys ? currentResp.selectedKeys.split('|') : [];

  const isTimerUrgent = remainingSeconds < 60;
  const isTimerWarning = remainingSeconds < 300 && !isTimerUrgent;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none text-slate-900">
      {/* Top Fixed Exam Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs">
        {/* Left: Branding & Quiz Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-black text-sm tracking-tighter shadow-sm">
            Q
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 line-clamp-1">{quiz.title}</h1>
              <span className="badge badge-purple text-[10px] hidden sm:inline-flex">{quiz.subject}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span>Candidate: Assessment #{attemptId.slice(-6).toUpperCase()}</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline flex items-center gap-1 text-slate-600">
                {saveStatus === 'SAVING' ? (
                  <span className="flex items-center gap-1 text-amber-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    Saving...
                  </span>
                ) : saveStatus === 'SAVED' ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <Check className="w-3 h-3 text-emerald-600" />
                    All answers saved
                  </span>
                ) : (
                  <span className="text-rose-600 font-medium">Sync issue</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right Controls: Timer, Fullscreen, Submit */}
        <div className="flex items-center gap-3">
          {/* Real-time Server Countdown */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono font-bold text-sm border shadow-xs transition-colors ${
              isTimerUrgent
                ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                : isTimerWarning
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-slate-50 text-slate-800 border-slate-200'
            }`}
          >
            <Clock className={`w-4 h-4 ${isTimerUrgent ? 'text-rose-600' : isTimerWarning ? 'text-amber-600' : 'text-slate-500'}`} />
            <span>{formatTime(remainingSeconds)}</span>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Mode'}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors hidden sm:flex items-center justify-center"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Submit Button */}
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <span>Finish & Submit</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left 3 Columns: Active Question Card */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col justify-between min-h-[520px]">
            {/* Question Header & Meta */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-brand-50 text-brand-700 font-bold text-xs">
                    Question {currentIndex + 1} of {totalQuestions}
                  </span>
                  <span className="badge badge-gray text-xs">
                    {currentQ.type === 'SINGLE_CHOICE'
                      ? 'Single Choice'
                      : currentQ.type === 'MULTIPLE_CHOICE'
                      ? 'Multiple Answers'
                      : 'True / False'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-[11px] font-semibold text-slate-500">
                    <span className="text-emerald-700 font-bold">+{currentQ.marks} Marks</span>
                    {currentQ.negativeMarks > 0 && (
                      <span className="text-rose-600 ml-1.5">(-{currentQ.negativeMarks} Neg)</span>
                    )}
                  </div>

                  {/* Flag Toggle Button */}
                  <button
                    onClick={handleToggleFlag}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      currentResp.isFlagged
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Flag className={`w-3.5 h-3.5 ${currentResp.isFlagged ? 'fill-white' : ''}`} />
                    <span>{currentResp.isFlagged ? 'Flagged' : 'Flag for Review'}</span>
                  </button>
                </div>
              </div>

              {/* Question Statement */}
              <div className="mb-6">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed whitespace-pre-wrap">
                  {currentQ.statement}
                </h2>
                {currentQ.type === 'MULTIPLE_CHOICE' && (
                  <p className="text-xs text-indigoAccent-600 font-medium mt-2 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" />
                    Select all correct answers that apply.
                  </p>
                )}
              </div>

              {/* Answer Options */}
              <div className="space-y-3">
                {currentQ.options.map((opt) => {
                  const isSelected = selectedList.includes(opt.optionKey);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(opt.optionKey)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                        isSelected
                          ? 'border-brand-600 bg-brand-50/60 shadow-xs ring-2 ring-brand-500/20'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
                      }`}
                    >
                      {/* Key badge (A, B, C, D) */}
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {opt.optionKey}
                      </div>

                      {/* Option Text */}
                      <div className="flex-1 text-sm font-medium text-slate-800 leading-snug pt-0.5">
                        {opt.text}
                      </div>

                      {/* Check indicator */}
                      <div className="shrink-0 pt-0.5">
                        {currentQ.type === 'MULTIPLE_CHOICE' ? (
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                              isSelected ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        ) : (
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-brand-600 bg-brand-600' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Question Navigation Controls */}
            <div className="pt-6 mt-8 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {selectedList.length > 0 && (
                  <button
                    onClick={handleClearSelection}
                    className="px-3 py-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Selection</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {currentIndex < totalQuestions - 1 ? (
                  <button
                    onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span>Review & Submit</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Question Palette & Proctoring Status */}
        <div className="space-y-4">
          {/* Question Navigation Palette */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Question Palette</h3>
              <span className="text-[11px] font-bold text-slate-500">
                {answeredCount}/{totalQuestions} Answered
              </span>
            </div>

            {/* Grid of question numbers */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const resp = responses[q.questionId];
                const isAnswered = resp?.selectedKeys && resp.selectedKeys.length > 0;
                const isFlagged = resp?.isFlagged;
                const isCurrent = idx === currentIndex;

                let btnClass = 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50';
                if (isAnswered) {
                  btnClass = 'bg-emerald-600 border-emerald-600 text-white font-bold';
                }
                if (isFlagged) {
                  btnClass = 'bg-amber-500 border-amber-600 text-white font-bold';
                }
                if (isCurrent) {
                  btnClass += ' ring-2 ring-brand-500 ring-offset-2';
                }

                return (
                  <button
                    key={q.questionId}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-xl border text-xs font-mono font-semibold transition-all flex items-center justify-center relative ${btnClass}`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && isAnswered && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Palette Legend */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-600 inline-block" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-white border border-slate-300 inline-block" />
                <span>Unanswered ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-amber-500 inline-block" />
                <span>Flagged ({flaggedCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md border-2 border-brand-500 inline-block" />
                <span>Current ({currentIndex + 1})</span>
              </div>
            </div>
          </div>

          {/* Exam Integrity & Security Badge */}
          <div className="bg-slate-900 rounded-3xl p-5 text-white shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold">Proctoring Telemetry Active</h4>
                <p className="text-[10px] text-slate-400">Browser Page Visibility Enforced</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Window focus, tab-switching, and display events are securely recorded to ensure testing fairness.
            </p>

            <div className="bg-white/10 rounded-xl p-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-300 text-[11px]">Integrity Flags</span>
              <span className="font-mono font-bold text-emerald-400">
                {attempt.integrityEventCount || 0} Recorded
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* High-Visibility Integrity Warning Modal */}
      {integrityWarning && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 border-2 border-rose-500 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <span className="badge badge-red text-xs font-bold uppercase tracking-wider mb-2">
                Security Alert #{integrityWarning.violationNo}
              </span>
              <h3 className="text-lg font-black text-slate-900">
                {integrityWarning.autoSubmitted
                  ? 'Assessment Auto-Submitted'
                  : 'Proctoring Warning: Tab Switch Detected'}
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {integrityWarning.message}
            </p>

            {!integrityWarning.autoSubmitted && (
              <div className="bg-amber-50 rounded-xl p-3 text-amber-800 text-[11px] font-medium border border-amber-200">
                Warning {integrityWarning.violationNo} of {integrityWarning.threshold} maximum allowed violations before automated forfeiture.
              </div>
            )}

            {!integrityWarning.autoSubmitted ? (
              <button
                onClick={() => setIntegrityWarning(null)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
              >
                I Understand, Return to Assessment
              </button>
            ) : (
              <div className="text-xs font-bold text-rose-600 animate-pulse">
                Redirecting to verified submission record...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit Confirmation Dialog */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-2">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Confirm Assessment Submission</h3>
              <p className="text-xs text-slate-500">
                Please review your progress before finalizing. Once submitted, answers cannot be edited.
              </p>
            </div>

            {/* Progress Summary Chips */}
            <div className="grid grid-cols-3 gap-2 py-2">
              <div className="bg-emerald-50 rounded-2xl p-3 text-center border border-emerald-100">
                <span className="text-lg font-black text-emerald-700 block">{answeredCount}</span>
                <span className="text-[10px] font-bold uppercase text-emerald-600">Answered</span>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-200">
                <span className="text-lg font-black text-slate-700 block">{unansweredCount}</span>
                <span className="text-[10px] font-bold uppercase text-slate-500">Unanswered</span>
              </div>
              <div className="bg-amber-50 rounded-2xl p-3 text-center border border-amber-100">
                <span className="text-lg font-black text-amber-700 block">{flaggedCount}</span>
                <span className="text-[10px] font-bold uppercase text-amber-600">Flagged</span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  You still have <strong>{unansweredCount} unanswered</strong> question{unansweredCount > 1 ? 's' : ''}. Unanswered questions will receive 0 marks.
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
              >
                Back to Exam
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit(false)}
                className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Yes, Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
