'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, User, ShieldCheck, GraduationCap, LayoutDashboard, Sparkles } from 'lucide-react';

interface NavbarProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-indigoAccent-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <span className="font-extrabold text-lg tracking-wider">Q</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-slate-900 tracking-tight">Q_Rice</span>
                <span className="text-[10px] font-semibold bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded border border-brand-200">PRO</span>
              </div>
              <p className="text-[10px] text-slate-500 hidden sm:block font-medium">Smart Assessments. Secure Quizzes.</p>
            </div>
          </Link>
        </div>

        {/* Navigation & User Profile */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Dashboard Link based on role */}
              <Link
                href={user.role === 'ADMIN' ? '/admin' : user.role === 'INSTRUCTOR' ? '/instructor' : '/student'}
                className="hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-700 hover:text-brand-600 hover:bg-slate-100 transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>

              {/* Role Badge */}
              <span
                className={`badge ${
                  user.role === 'ADMIN'
                    ? 'badge-purple'
                    : user.role === 'INSTRUCTOR'
                    ? 'badge-blue'
                    : 'badge-green'
                }`}
              >
                {user.role === 'ADMIN' && <ShieldCheck className="w-3 h-3" />}
                {user.role === 'INSTRUCTOR' && <Sparkles className="w-3 h-3" />}
                {user.role === 'STUDENT' && <GraduationCap className="w-3 h-3" />}
                <span>{user.role}</span>
              </span>

              {/* User Dropdown / Name */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-800 leading-tight">{user.name}</p>
                  <p className="text-[11px] text-slate-500 leading-tight truncate max-w-[150px]">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs font-bold px-3.5 py-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="text-xs font-bold px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors"
              >
                Register Free
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
