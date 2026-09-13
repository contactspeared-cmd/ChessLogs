'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import SJSFIBrand from './SJSFIBrand';
import { getStoredUser, setStoredUser, getStoredStudents } from '@/lib/store';
import { COACH_ADMIN } from '@/lib/initialData';
import { User, StudentProfile } from '@/lib/types';
import {
  LayoutDashboard,
  Cpu,
  Users,
  BookOpen,
  PlusCircle,
  ShieldCheck,
  GraduationCap,
  ChevronDown,
  LogOut,
  Sparkles,
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User>(COACH_ADMIN);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(getStoredUser());
    setStudents(getStoredStudents());

    const handleStorage = () => {
      setCurrentUser(getStoredUser());
      setStudents(getStoredStudents());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const switchUser = (user: User) => {
    setStoredUser(user);
    setCurrentUser(user);
    setDropdownOpen(false);
    router.refresh();
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/analysis', label: 'Analysis Board', icon: Cpu },
    { href: '/students', label: currentUser.role === 'coach' ? 'Students Roster' : 'My Coach & Peers', icon: Users },
    { href: '/courses', label: 'Courses & Studies', icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/dashboard" className="hover:opacity-95 transition-opacity">
          <SJSFIBrand size="sm" showSubtitle={false} />
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sjsfi-900 text-white shadow-sm'
                    : 'text-gray-600 hover:text-sjsfi-900 hover:bg-sjsfi-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-sjsfi-700'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right side: Action + Profile switch */}
        <div className="flex items-center gap-3">
          {/* Coach Quick Create Course Button */}
          {currentUser.role === 'coach' && (
            <Link
              href="/courses/new"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-sjsfi-900 border border-sjsfi-200 hover:bg-sjsfi-100 transition-colors shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-sjsfi-700" />
              <span>New Course</span>
            </Link>
          )}

          {/* User Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full border border-gray-200 hover:border-sjsfi-300 hover:bg-gray-50 transition-all text-left bg-white shadow-xs"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentUser.role === 'coach'
                    ? 'bg-sjsfi-900 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {currentUser.role === 'coach' ? (
                  <ShieldCheck className="w-4 h-4 text-sjsfi-gold" />
                ) : (
                  <GraduationCap className="w-4 h-4" />
                )}
              </div>
              <div className="hidden lg:flex flex-col text-xs leading-tight">
                <span className="font-semibold text-gray-900 line-clamp-1 max-w-[130px]">
                  {currentUser.name.split(' ')[0]}
                </span>
                <span className="text-[10px] text-gray-500 flex items-center gap-1 font-medium">
                  {currentUser.role === 'coach' ? (
                    <span className="text-sjsfi-900 font-bold">Coach (Admin)</span>
                  ) : (
                    <span>Student</span>
                  )}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {dropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Current Account</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{currentUser.name}</p>
                  <p className="text-xs text-sjsfi-900 font-medium">
                    {currentUser.role === 'coach' ? '★ Head Coach & Administrator' : 'SJSFI Chess Student'}
                  </p>
                </div>

                <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Switch Role / Test View</span>
                  <Sparkles className="w-3 h-3 text-sjsfi-gold" />
                </div>

                {/* Coach option */}
                <button
                  onClick={() => switchUser(COACH_ADMIN)}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs hover:bg-sjsfi-50 transition-colors ${
                    currentUser.role === 'coach' ? 'bg-sjsfi-50/70 font-semibold text-sjsfi-900' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-sjsfi-900 text-white flex items-center justify-center">
                      <ShieldCheck className="w-3.5 h-3.5 text-sjsfi-gold" />
                    </div>
                    <div>
                      <div className="text-gray-900">Coach Admin (Me)</div>
                      <div className="text-[10px] text-gray-500">coach@sjsfi.edu.ph</div>
                    </div>
                  </div>
                  {currentUser.role === 'coach' && <span className="text-[10px] bg-sjsfi-900 text-white px-1.5 py-0.5 rounded">Active</span>}
                </button>

                {/* Student options */}
                {students.map((st) => {
                  const isCurrent = currentUser.id === st.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() =>
                        switchUser({
                          id: st.id,
                          name: st.name,
                          email: st.email,
                          role: 'student',
                          chesscomUsername: st.chesscomUsername,
                          school: st.school,
                          rating: st.rapidRating,
                        })
                      }
                      className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs hover:bg-emerald-50 transition-colors ${
                        isCurrent ? 'bg-emerald-50 font-semibold text-emerald-900' : 'text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center">
                          <GraduationCap className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-gray-900">{st.name}</div>
                          <div className="text-[10px] text-gray-500">chess.com: @{st.chesscomUsername}</div>
                        </div>
                      </div>
                      {isCurrent && <span className="text-[10px] bg-emerald-700 text-white px-1.5 py-0.5 rounded">Active</span>}
                    </button>
                  );
                })}

                <div className="border-t border-gray-100 mt-2 pt-1">
                  <Link
                    href="/login"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
