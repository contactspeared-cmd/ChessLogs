'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import SJSFIBrand from '@/components/SJSFIBrand';
import { COACH_ADMIN, INITIAL_STUDENTS } from '@/lib/initialData';
import { setStoredUser } from '@/lib/store';
import { ShieldCheck, GraduationCap, ArrowRight, Lock, Mail, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'coach' | 'student'>('coach');
  const [email, setEmail] = useState('coach@sjsfi.edu.ph');
  const [password, setPassword] = useState('sjsfi-chess-coach');

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (selectedRole === 'coach') {
      setStoredUser(COACH_ADMIN);
    } else {
      const student = INITIAL_STUDENTS[0];
      setStoredUser({
        id: student.id,
        name: student.name,
        email: student.email,
        role: 'student',
        chesscomUsername: student.chesscomUsername,
        school: student.school,
        rating: student.rapidRating,
      });
    }
    router.push('/dashboard');
  };

  const loginAsStudent = (student: (typeof INITIAL_STUDENTS)[0]) => {
    setStoredUser({
      id: student.id,
      name: student.name,
      email: student.email,
      role: 'student',
      chesscomUsername: student.chesscomUsername,
      school: student.school,
      rating: student.rapidRating,
    });
    router.push('/dashboard');
  };

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-sjsfi-950 via-sjsfi-900 to-sjsfi-850 p-6 text-white text-center relative">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-sjsfi-gold" />
            </div>
          </div>
          <h2 className="text-xl font-bold tracking-tight">ChessLogs Portal</h2>
          <p className="text-xs text-sjsfi-200 mt-1">Saint Joseph School Foundation Inc. • Zamboanga City</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Role Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('coach');
                setEmail('coach@sjsfi.edu.ph');
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedRole === 'coach'
                  ? 'bg-sjsfi-900 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sjsfi-gold" />
              <span>Coach (Admin)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedRole('student');
                setEmail(INITIAL_STUDENTS[0].email);
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedRole === 'student'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student Account</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sjsfi-600 bg-gray-50/50"
                  placeholder="user@sjsfi.edu.ph"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Password / Passcode
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sjsfi-600 bg-gray-50/50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className={`w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                selectedRole === 'coach'
                  ? 'bg-sjsfi-900 hover:bg-sjsfi-800'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              <span>Sign In to {selectedRole === 'coach' ? 'Coach Admin' : 'Student Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">
              Quick 1-Click Demo Login
            </p>

            <button
              onClick={() => {
                setStoredUser(COACH_ADMIN);
                router.push('/dashboard');
              }}
              className="w-full p-2.5 rounded-xl border border-sjsfi-300 bg-sjsfi-50/80 hover:bg-sjsfi-100 text-left flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-sjsfi-900 text-white flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-sjsfi-gold" />
                </div>
                <div>
                  <p className="text-xs font-bold text-sjsfi-950">Coach Admin (Head Coach)</p>
                  <p className="text-[10px] text-gray-500">Sole administrator • Full control</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-sjsfi-900">Sign In →</span>
            </button>

            <div className="space-y-1.5">
              {INITIAL_STUDENTS.map((st) => (
                <button
                  key={st.id}
                  onClick={() => loginAsStudent(st)}
                  className="w-full p-2 rounded-xl border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-left flex items-center justify-between transition-colors text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[11px] font-bold">
                      {st.name[0]}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-800">{st.name}</span>
                      <span className="text-[10px] text-gray-400 ml-1.5">@{st.chesscomUsername}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-emerald-800 font-semibold">Student →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
