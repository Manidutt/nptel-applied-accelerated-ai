'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  FileText,
  HelpCircle,
  Award,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Database,
  UploadCloud,
} from 'lucide-react';

export default function QuizCreationWizard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('Read each question carefully before submitting your answer.');
  const [subject, setSubject] = useState('Computer Science');
  const [classId, setClassId] = useState('');

  // Step 2: Questions
  const [questions, setQuestions] = useState<any[]>([
    {
      statement: 'What is the primary function of an operating system kernel?',
      type: 'single_choice',
      marks: 2.0,
      negativeMarks: 0.5,
      explanation: 'The kernel is the core component that manages system resources and hardware communication.',
      options: [
        { optionKey: 'A', text: 'Hardware resource management and process isolation', isCorrect: true },
        { optionKey: 'B', text: 'Rendering web pages in the browser', isCorrect: false },
        { optionKey: 'C', text: 'Compiling high-level source code into bytecode', isCorrect: false },
        { optionKey: 'D', text: 'Scanning local disks for antivirus definitions', isCorrect: false },
      ],
    },
  ]);

  // Step 3: Scoring
  const [passingPercentage, setPassingPercentage] = useState(50.0);
  const [negativeMarkingEnabled, setNegativeMarkingEnabled] = useState(true);
  const [partialCreditEnabled, setPartialCreditEnabled] = useState(true);
  const [releaseResultsImmediately, setReleaseResultsImmediately] = useState(true);

  // Step 4: Timing & Availability
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [allowedAttempts, setAllowedAttempts] = useState(1);

  // Step 5: Exam Integrity
  const [integrityEnabled, setIntegrityEnabled] = useState(true);
  const [requireFullscreen, setRequireFullscreen] = useState(false);
  const [tabSwitchThreshold, setTabSwitchThreshold] = useState(3);
  const [autoSubmitOnViolation, setAutoSubmitOnViolation] = useState(false);
  const [flagForReview, setFlagForReview] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/login');
          return;
        }
        const meData = await meRes.json();
        setUser(meData.user);

        const classRes = await fetch('/api/classes');
        const classData = await classRes.json();
        setClasses(classData.classes || []);
        if (classData.classes?.length > 0) {
          setClassId(classData.classes[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    }
    init();
  }, [router]);

  const addEmptyQuestion = () => {
    setQuestions([
      ...questions,
      {
        statement: '',
        type: 'single_choice',
        marks: 1.0,
        negativeMarks: 0.0,
        explanation: '',
        options: [
          { optionKey: 'A', text: '', isCorrect: true },
          { optionKey: 'B', text: '', isCorrect: false },
          { optionKey: 'C', text: '', isCorrect: false },
          { optionKey: 'D', text: '', isCorrect: false },
        ],
      },
    ]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    const updated = [...questions];
    updated[idx] = { ...updated[idx], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIdx: number, optIdx: number, field: string, value: any) => {
    const updated = [...questions];
    const opts = [...updated[qIdx].options];
    opts[optIdx] = { ...opts[optIdx], [field]: value };

    // If single choice or true_false and isCorrect is set true, uncheck others
    if (field === 'isCorrect' && value === true && updated[qIdx].type !== 'multiple_choice') {
      opts.forEach((o, i) => {
        if (i !== optIdx) o.isCorrect = false;
      });
    }

    updated[qIdx].options = opts;
    setQuestions(updated);
  };

  const totalCalculatedMarks = questions.reduce((sum, q) => sum + parseFloat(q.marks || 0), 0);

  const handlePublish = async () => {
    if (!title.trim()) {
      setError('Please provide a quiz title.');
      setCurrentStep(1);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        title,
        description,
        instructions,
        subject,
        classId,
        durationMinutes,
        passingPercentage,
        allowedAttempts,
        negativeMarkingEnabled,
        partialCreditEnabled,
        integrityEnabled,
        requireFullscreen,
        tabSwitchThreshold,
        autoSubmitOnViolation,
        flagForReview,
        releaseResultsImmediately,
        questions,
      };

      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create quiz.');
        setSubmitting(false);
        return;
      }

      // Automatically publish
      await fetch(`/api/quizzes/${data.quiz.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PUBLISHED' }),
      });

      router.push(`/instructor/results/${data.quiz.id}`);
    } catch (e: any) {
      setError(e.message || 'Error publishing quiz.');
      setSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: 'Basic Info', icon: FileText },
    { num: 2, title: 'Questions', icon: HelpCircle },
    { num: 3, title: 'Scoring', icon: Award },
    { num: 4, title: 'Timing', icon: Clock },
    { num: 5, title: 'Exam Integrity', icon: ShieldAlert },
    { num: 6, title: 'Publication', icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <div className="flex flex-1">
        <Sidebar role={user?.role} />

        <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
          {/* Header */}
          <div className="mb-6">
            <Link href="/instructor/quizzes" className="text-xs font-semibold text-slate-400 hover:text-brand-600">
              ← Back to Quizzes
            </Link>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
              Quiz Creation Wizard
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Follow the guided steps to construct, configure, and publish an assessment.
            </p>
          </div>

          {/* Stepper Header */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {steps.map((s) => {
                const Icon = s.icon;
                const isActive = currentStep === s.num;
                const isPassed = currentStep > s.num;
                return (
                  <button
                    key={s.num}
                    onClick={() => setCurrentStep(s.num)}
                    className={`flex flex-col items-center p-2 rounded-xl text-center transition-all ${
                      isActive
                        ? 'bg-brand-50 border border-brand-200 text-brand-700 font-bold'
                        : isPassed
                        ? 'text-emerald-700 bg-emerald-50/50'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${isActive ? 'text-brand-600' : isPassed ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-[11px] font-semibold">{s.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 mb-4">Step 1: Basic Assessment Information</h2>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quiz Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Midterm Examination: Distributed Systems & Kubernetes"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject / Domain</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Class / Cohort</label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 text-slate-900 bg-white"
                  >
                    <option value="">Open Enrollment (Anyone with Access Code)</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief synopsis for students before entering..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student Instructions</label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 text-slate-900 font-mono text-[11px]"
                />
              </div>
            </div>
          )}

          {/* Step 2: Questions */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Step 2: Questions ({questions.length})</h2>
                  <p className="text-xs text-slate-500">Total Marks: {totalCalculatedMarks} pts</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/instructor/import-csv"
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-brand-600" />
                    <span>Upload CSV</span>
                  </Link>
                  <button
                    type="button"
                    onClick={addEmptyQuestion}
                    className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </button>
                </div>
              </div>

              {questions.map((q, qIdx) => (
                <div key={qIdx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="badge badge-blue">Question #{qIdx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIdx)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={q.statement}
                      onChange={(e) => updateQuestion(qIdx, 'statement', e.target.value)}
                      placeholder="Enter question statement..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500">Type</label>
                      <select
                        value={q.type}
                        onChange={(e) => updateQuestion(qIdx, 'type', e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white"
                      >
                        <option value="single_choice">Single Choice (1 Correct)</option>
                        <option value="multiple_choice">Multiple Choice (Multiple Correct)</option>
                        <option value="true_false">True / False</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500">Marks</label>
                      <input
                        type="number"
                        step="0.5"
                        value={q.marks}
                        onChange={(e) => updateQuestion(qIdx, 'marks', e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500">Negative Marks</label>
                      <input
                        type="number"
                        step="0.25"
                        value={q.negativeMarks}
                        onChange={(e) => updateQuestion(qIdx, 'negativeMarks', e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Answer Options & Correct Key:</p>
                    {q.options.map((opt: any, optIdx: number) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <span className="w-6 font-mono font-bold text-xs text-slate-500 text-center">{opt.optionKey}</span>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => updateOption(qIdx, optIdx, 'text', e.target.value)}
                          placeholder={`Option ${opt.optionKey} text...`}
                          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800"
                        />
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={opt.isCorrect}
                            onChange={(e) => updateOption(qIdx, optIdx, 'isCorrect', e.target.checked)}
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                          <span>Correct</span>
                        </label>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500">Explanation (Shown after exam)</label>
                    <input
                      type="text"
                      value={q.explanation || ''}
                      onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)}
                      placeholder="Why is this answer correct? References..."
                      className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Scoring */}
          {currentStep === 3 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 mb-4">Step 3: Scoring Policies</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Passing Percentage (%)</label>
                  <input
                    type="number"
                    value={passingPercentage}
                    onChange={(e) => setPassingPercentage(parseFloat(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={negativeMarkingEnabled}
                    onChange={(e) => setNegativeMarkingEnabled(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800">Enable Negative Marking</span>
                    <p className="text-[11px] text-slate-500">Deduct negative marks for incorrect answers. Unanswered questions always receive 0.</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={partialCreditEnabled}
                    onChange={(e) => setPartialCreditEnabled(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800">Allow Partial Credit for Multiple Choice</span>
                    <p className="text-[11px] text-slate-500">Award proportional marks if a student selects a subset of correct options without choosing incorrect ones.</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={releaseResultsImmediately}
                    onChange={(e) => setReleaseResultsImmediately(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800">Release Results Immediately Upon Submission</span>
                    <p className="text-[11px] text-slate-500">Students can immediately review their score, percentage, and detailed question explanations.</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 4: Timing */}
          {currentStep === 4 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 mb-4">Step 4: Timing & Availability</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Overall Time Limit (Minutes)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Server enforces strict deadline upon submission.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Allowed Attempts</label>
                  <input
                    type="number"
                    value={allowedAttempts}
                    onChange={(e) => setAllowedAttempts(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Exam Integrity */}
          {currentStep === 5 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 mb-4">Step 5: Exam Integrity & Tab-Switch Monitoring</h2>

              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={integrityEnabled}
                    onChange={(e) => setIntegrityEnabled(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800">Enable Browser Tab-Switch & Focus Loss Monitoring</span>
                    <p className="text-[11px] text-slate-500">Tracks Page Visibility hidden states, window blur, and records timestamped violations.</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireFullscreen}
                    onChange={(e) => setRequireFullscreen(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800">Require Fullscreen Mode</span>
                    <p className="text-[11px] text-slate-500">Student must enter fullscreen before beginning; exits will be logged as integrity events.</p>
                  </div>
                </label>

                <div className="pl-6 pt-2 space-y-3 border-l-2 border-brand-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Warning Threshold Before Action</label>
                    <input
                      type="number"
                      value={tabSwitchThreshold}
                      onChange={(e) => setTabSwitchThreshold(parseInt(e.target.value, 10))}
                      className="w-32 px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-900"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Number of tab switches or window blurs permitted before flagging or submitting.</p>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSubmitOnViolation}
                      onChange={(e) => setAutoSubmitOnViolation(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-xs font-bold text-slate-800">Auto-submit attempt when threshold is reached</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={flagForReview}
                      onChange={(e) => setFlagForReview(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-xs font-bold text-slate-800">Flag attempt for instructor review if violations occur</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Publication */}
          {currentStep === 6 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h2 className="text-base font-bold text-slate-900">Step 6: Review & Final Publication</h2>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <p><span className="font-bold text-slate-500">Title:</span> <span className="font-semibold text-slate-900">{title}</span></p>
                <p><span className="font-bold text-slate-500">Subject:</span> {subject}</p>
                <p><span className="font-bold text-slate-500">Total Questions:</span> {questions.length}</p>
                <p><span className="font-bold text-slate-500">Total Marks:</span> {totalCalculatedMarks} pts</p>
                <p><span className="font-bold text-slate-500">Duration:</span> {durationMinutes} minutes</p>
                <p><span className="font-bold text-slate-500">Negative Marking:</span> {negativeMarkingEnabled ? 'Enabled' : 'Disabled'}</p>
                <p><span className="font-bold text-slate-500">Integrity Policy:</span> {integrityEnabled ? `Active (Warning threshold: ${tabSwitchThreshold})` : 'Disabled'}</p>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigoAccent-600 hover:from-brand-700 hover:to-indigoAccent-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{submitting ? 'Creating Assessment...' : 'Publish Assessment'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer Controls (Previous / Next) */}
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5 disabled:opacity-40"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {currentStep < 6 && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <span>Continue to Step {currentStep + 1}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
