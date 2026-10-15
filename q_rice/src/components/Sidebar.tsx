'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileQuestion,
  PlusCircle,
  Database,
  UploadCloud,
  Users,
  ShieldAlert,
  BarChart3,
  Radio,
  GraduationCap,
} from 'lucide-react';

interface SidebarProps {
  role?: string;
}

export default function Sidebar({ role = 'INSTRUCTOR' }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/instructor', icon: LayoutDashboard },
    { label: 'All Quizzes', href: '/instructor/quizzes', icon: FileQuestion },
    { label: 'Live Sessions', href: '/instructor/sessions', icon: Radio },
    { label: 'Create Quiz', href: '/instructor/quizzes/new', icon: PlusCircle },
    { label: 'CSV Import Wizard', href: '/instructor/import-csv', icon: UploadCloud },
    { label: 'Question Bank', href: '/instructor/question-bank', icon: Database },
    { label: 'Classes & Cohorts', href: '/instructor/classes', icon: Users },
    { label: 'Google Classroom', href: '/instructor/google-classroom', icon: GraduationCap },
  ];

  if (role === 'ADMIN') {
    navItems.push({ label: 'Admin Center', href: '/admin', icon: ShieldAlert });
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden md:flex">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Assessment Operations
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Quick Launch Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100">
          <div className="flex items-center gap-2 mb-1.5">
            <Radio className="w-4 h-4 text-brand-600 animate-pulse" />
            <h4 className="text-xs font-bold text-indigo-950">Live Quiz Sessions</h4>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
            Host synchronized, instructor-led exams with real-time tab-switch detection.
          </p>
          <Link
            href="/instructor/quizzes"
            className="block text-center text-xs font-bold py-1.5 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors shadow-sm"
          >
            Launch Session
          </Link>
        </div>
      </div>

      {/* System Status info */}
      <div className="pt-4 border-t border-slate-100 px-3">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>Q_Rice Engine</span>
          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Active
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">PostgreSQL / SQLite + WebSockets</p>
      </div>
    </aside>
  );
}
