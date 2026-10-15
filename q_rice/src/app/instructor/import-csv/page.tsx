'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  UploadCloud,
  Download,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Database,
  RefreshCw,
  X,
  FileQuestion,
  HelpCircle,
} from 'lucide-react';

export default function CsvImportWizard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [targetQuizId, setTargetQuizId] = useState<string>('');
  
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [globalError, setGlobalError] = useState<string>('');
  
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [importSummary, setImportSummary] = useState<any>(null);

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

        const qRes = await fetch('/api/quizzes');
        const qData = await qRes.json();
        setQuizzes(qData.quizzes || []);
      } catch (e) {
        console.error(e);
      }
    }
    loadData();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');
    setGlobalError('');
    setImportSummary(null);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      await parseCsvPreview(content);
    };
    reader.readAsText(file);
  };

  const parseCsvPreview = async (content: string) => {
    setIsParsing(true);
    setGlobalError('');
    try {
      const res = await fetch('/api/questions/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: content, commit: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.error || data.globalErrors?.join(', ') || 'Failed to parse CSV.');
        setPreviewResult(null);
      } else {
        setPreviewResult(data);
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Error parsing CSV file.');
      setPreviewResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleCommitImport = async () => {
    if (!csvContent) return;
    setIsCommitting(true);
    setGlobalError('');

    try {
      const res = await fetch('/api/questions/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent,
          commit: true,
          quizId: targetQuizId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.error || 'Failed to commit import.');
      } else {
        setImportSummary(data);
      }
    } catch (e: any) {
      setGlobalError(e.message || 'Failed to complete import.');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDownloadErrorReport = () => {
    if (!previewResult?.errorCsvContent) return;
    const blob = new Blob([previewResult.errorCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'q_rice_import_errors.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <div className="flex flex-1">
        <Sidebar role={user?.role} />

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Link href="/instructor" className="text-xs font-semibold text-slate-400 hover:text-brand-600">
                  Dashboard
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-xs font-bold text-slate-700">CSV Import Wizard</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                Import Multiple Choice Questions (CSV)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload single-choice, multiple-choice, or true/false questions formatted according to the standard schema.
              </p>
            </div>

            {/* Template Download Actions */}
            <div className="flex items-center gap-2.5">
              <a
                href="/q_rice_mcq_template.csv"
                download="q_rice_mcq_template.csv"
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-brand-600" />
                <span>Download Template CSV</span>
              </a>
              <a
                href="/q_rice_mcq_sample.csv"
                download="q_rice_mcq_sample.csv"
                className="px-3.5 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-brand-600" />
                <span>Download Sample Dataset</span>
              </a>
            </div>
          </div>

          {/* Import Success Banner */}
          {importSummary && (
            <div className="mb-6 p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-base font-bold text-emerald-900">CSV Import Completed Successfully!</h3>
                  <p className="text-xs text-emerald-700 mt-1">
                    Successfully imported <span className="font-bold">{importSummary.importedCount} questions</span> into your database
                    {targetQuizId ? ' and linked them directly to your quiz.' : ' (Question Bank).'}
                    {importSummary.skippedCount > 0 && ` ${importSummary.skippedCount} invalid rows were skipped.`}
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <Link
                      href={targetQuizId ? `/instructor/results/${targetQuizId}` : '/instructor/question-bank'}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors"
                    >
                      {targetQuizId ? 'View Quiz & Questions' : 'Go to Question Bank'}
                    </Link>
                    <button
                      onClick={() => {
                        setImportSummary(null);
                        setPreviewResult(null);
                        setCsvContent('');
                        setFileName('');
                      }}
                      className="px-4 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors"
                    >
                      Import Another File
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Global Error Banner */}
          {globalError && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Import Error:</p>
                <p className="mt-0.5">{globalError}</p>
              </div>
            </div>
          )}

          {/* Drag & Drop Upload Zone */}
          {!importSummary && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <label className="text-xs font-bold text-slate-800">
                    1. Target Destination:
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Link questions directly to:</span>
                    <select
                      value={targetQuizId}
                      onChange={(e) => setTargetQuizId(e.target.value)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Question Bank Only (Reusable)</option>
                      {quizzes.map((q) => (
                        <option key={q.id} value={q.id}>
                          Quiz: {q.title} ({q.accessCode})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-blue-50/20 transition-all cursor-pointer relative"
                >
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {fileName ? fileName : 'Choose a CSV file or drag and drop here'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {fileSize ? `File Size: ${fileSize} · Ready for schema validation` : 'Must adhere to standard q_rice_mcq_template.csv headers (UTF-8)'}
                  </p>
                </div>
              </div>

              {/* Validation Summary & Preview Table */}
              {previewResult && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Parsed Questions Preview</h3>
                      <div className="flex items-center gap-3 text-xs mt-1">
                        <span className="text-slate-500">Total Rows: {previewResult.totalRows}</span>
                        <span>•</span>
                        <span className="font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {previewResult.validRowsCount} Valid
                        </span>
                        {previewResult.invalidRowsCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-rose-600 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {previewResult.invalidRowsCount} Invalid
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {previewResult.errorCsvContent && (
                        <button
                          type="button"
                          onClick={handleDownloadErrorReport}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Error Report</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleCommitImport}
                        disabled={isCommitting || previewResult.validRowsCount === 0}
                        className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isCommitting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Persisting Questions...</span>
                          </>
                        ) : (
                          <>
                            <span>Confirm & Import ({previewResult.validRowsCount} Questions)</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto max-h-[480px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Row</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Question Statement</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Answer</th>
                          <th className="py-2.5 px-3">Marks</th>
                          <th className="py-2.5 px-3">Validation Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewResult.questions.map((q: any) => (
                          <tr
                            key={q.rowNumber}
                            className={q.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/30 hover:bg-rose-50/50'}
                          >
                            <td className="py-3 px-3 font-mono text-slate-500 font-bold">#{q.rowNumber}</td>
                            <td className="py-3 px-3">
                              {q.isValid ? (
                                <span className="badge badge-green">Valid</span>
                              ) : (
                                <span className="badge badge-red">Error</span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-900 max-w-xs truncate">
                              {q.statement}
                            </td>
                            <td className="py-3 px-3">
                              <span className="badge badge-blue">{q.type}</span>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-800">{q.correctAnswer}</td>
                            <td className="py-3 px-3 text-slate-600">
                              +{q.marks} {q.negativeMarks > 0 ? `(-${q.negativeMarks})` : ''}
                            </td>
                            <td className="py-3 px-3 text-xs">
                              {q.isValid ? (
                                <span className="text-emerald-700 font-medium">Ready to import</span>
                              ) : (
                                <span className="text-rose-600 font-semibold">{q.errors.join('; ')}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
