'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  Users,
  Shield,
  BookOpen,
  FileQuestion,
  Award,
  Radio,
  Search,
  CheckCircle2,
  XCircle,
  Activity,
  UserCheck,
  UserX,
  RefreshCw,
  Clock,
  Layers,
  Settings
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'INSTRUCTOR' | 'STUDENT'>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const meData = await meRes.json();
      if (meData.user.role !== 'ADMIN') {
        router.push('/instructor');
        return;
      }
      setUser(meData.user);

      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
        setAuditLogs(statsData.recentAuditLogs || []);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const toggleUserActive = async (targetUserId: string, currentActive: boolean) => {
    setActionLoading(targetUserId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId, isActive: !currentActive }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, isActive: !currentActive } : u))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold mb-2">
              <Shield className="w-3.5 h-3.5 text-brand-400" />
              <span>Platform Administration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">System Control Console</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Platform-wide telemetry, user lifecycle management, and audit verification.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLoading(true);
                loadData();
              }}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Telemetry</span>
            </button>
          </div>
        </div>

        {/* Global Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Users</span>
            <span className="text-2xl font-black text-slate-900">{stats?.totalUsers ?? '—'}</span>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <Users className="w-3 h-3 text-brand-500" />
              <span>Registered</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Instructors</span>
            <span className="text-2xl font-black text-brand-600">{stats?.totalInstructors ?? '—'}</span>
            <div className="text-[11px] text-slate-500 mt-1">Faculty & Creators</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Students</span>
            <span className="text-2xl font-black text-indigoAccent-600">{stats?.totalStudents ?? '—'}</span>
            <div className="text-[11px] text-slate-500 mt-1">Active Learners</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Quizzes</span>
            <span className="text-2xl font-black text-slate-900">{stats?.totalQuizzes ?? '—'}</span>
            <div className="text-[11px] text-slate-500 mt-1">Created Assessments</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Questions</span>
            <span className="text-2xl font-black text-slate-900">{stats?.totalQuestions ?? '—'}</span>
            <div className="text-[11px] text-slate-500 mt-1">In Question Bank</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Submissions</span>
            <span className="text-2xl font-black text-emerald-600">{stats?.totalAttempts ?? '—'}</span>
            <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              <span>Evaluated</span>
            </div>
          </div>
        </div>

        {/* User Management Section */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">User Accounts & Access Control</h2>
              <p className="text-xs text-slate-500">
                Inspect permissions, role assignments, and activate or suspend platform credentials.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50"
                />
              </div>

              {/* Role filter buttons */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                {(['ALL', 'INSTRUCTOR', 'STUDENT', 'ADMIN'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      roleFilter === r
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3">Registered</th>
                  <th className="px-4 py-3 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                      No accounts matched the query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge text-[10px] font-bold ${
                            u.role === 'ADMIN'
                              ? 'badge-blue'
                              : u.role === 'INSTRUCTOR'
                              ? 'badge-purple'
                              : 'badge-gray'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                            u.isActive ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {u.isActive ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Suspended
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {u.role === 'INSTRUCTOR' ? (
                          <span>{u._count?.createdQuizzes ?? 0} Quizzes</span>
                        ) : (
                          <span>{u._count?.quizAttempts ?? 0} Attempts</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.role !== 'ADMIN' && (
                          <button
                            disabled={actionLoading === u.id}
                            onClick={() => toggleUserActive(u.id, u.isActive)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                              u.isActive
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {actionLoading === u.id
                              ? 'Updating...'
                              : u.isActive
                              ? 'Suspend'
                              : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log Inspection Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Security & Administrative Audit Trail</h2>
              <p className="text-xs text-slate-500">Immutable ledger of platform actions and system state modifications.</p>
            </div>
            <span className="badge badge-gray text-xs font-mono">{auditLogs.length} Recent Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Initiated By</th>
                  <th className="px-4 py-3 rounded-r-xl">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400 font-sans text-xs">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-slate-400 text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge badge-purple text-[10px] font-bold">{log.action}</span>
                      </td>
                      <td className="px-4 py-3 font-sans text-slate-700">{log.entity}</td>
                      <td className="px-4 py-3 font-sans text-slate-800">
                        {log.user ? `${log.user.name} (${log.user.role})` : 'System Daemon'}
                      </td>
                      <td className="px-4 py-3 font-sans text-slate-500 text-[11px] truncate max-w-xs">
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
