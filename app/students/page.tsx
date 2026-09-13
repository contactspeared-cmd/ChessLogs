'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  PlusCircle,
  ShieldCheck,
  GraduationCap,
  ExternalLink,
  ChevronRight,
  Clock,
  Zap,
  Flame,
  Award,
  BookOpen,
} from 'lucide-react';
import { getStoredUser, getStoredStudents, saveStudents } from '@/lib/store';
import { COACH_ADMIN } from '@/lib/initialData';
import { User, StudentProfile } from '@/lib/types';

export default function StudentsPage() {
  const [currentUser, setCurrentUser] = useState<User>(COACH_ADMIN);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newChesscom, setNewChesscom] = useState('');
  const [newGrade, setNewGrade] = useState('Grade 9 - St. Joseph');
  const [newRapid, setNewRapid] = useState('1500');

  useEffect(() => {
    setCurrentUser(getStoredUser());
    setStudents(getStoredStudents());
  }, []);

  const isCoach = currentUser.role === 'coach';

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newChesscom) return;

    const newStudent: StudentProfile = {
      id: `student-${Date.now()}`,
      name: newName,
      email: newEmail || `${newChesscom.toLowerCase()}@student.sjsfi.edu.ph`,
      chesscomUsername: newChesscom.trim(),
      school: 'Saint Joseph School Foundation Inc. - Zamboanga City',
      gradeLevel: newGrade,
      joinedDate: new Date().toISOString().split('T')[0],
      notesCount: 0,
      assignedCoursesCount: 2,
      rapidRating: parseInt(newRapid, 10) || 1500,
      blitzRating: parseInt(newRapid, 10) - 50 || 1450,
      bulletRating: parseInt(newRapid, 10) - 80 || 1420,
      puzzleRating: 1800,
      totalGamesAnalyzed: 0,
      coachNotes: 'Newly enrolled student in SJSFI Chess Academy.',
    };

    const updated = [newStudent, ...students];
    saveStudents(updated);
    setStudents(updated);
    setShowAddModal(false);
    setNewName('');
    setNewEmail('');
    setNewChesscom('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-sjsfi-100 text-sjsfi-900 border border-sjsfi-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-sjsfi-800" />
              SJSFI Chess Academy Roster
            </span>
            <span className="text-xs text-gray-500 font-medium">
              {students.length} Active Students
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">
            {isCoach ? 'Coaching Roster & Student Monitoring' : 'SJSFI Varsity & Classmates'}
          </h1>
        </div>

        {isCoach && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-sjsfi-900 hover:bg-sjsfi-800 text-white transition-all shadow-xs"
          >
            <PlusCircle className="w-4 h-4 text-sjsfi-gold" />
            <span>Add New Student</span>
          </button>
        )}
      </div>

      {/* Students Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map((st) => (
          <div
            key={st.id}
            className="bg-white rounded-2xl border border-gray-200 hover:border-sjsfi-300 shadow-card hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 group"
          >
            {/* Header info */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sjsfi-900 to-sjsfi-800 text-white flex items-center justify-center font-bold text-lg shadow-sm border border-sjsfi-700">
                    {st.name[0]}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-sjsfi-900 transition-colors">
                      {st.name}
                    </h3>
                    <p className="text-[11px] text-gray-500 font-medium">{st.gradeLevel}</p>
                    <a
                      href={`https://www.chess.com/member/${st.chesscomUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-sjsfi-800 font-semibold hover:underline mt-0.5"
                    >
                      <span>@{st.chesscomUsername}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sjsfi-50 text-sjsfi-900 border border-sjsfi-200">
                  Active
                </span>
              </div>

              {/* Ratings Badges */}
              <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-100 text-center my-2">
                <div className="bg-gray-50/70 p-2 rounded-xl">
                  <div className="text-[10px] text-gray-500 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-600" />
                    Rapid
                  </div>
                  <div className="text-xs font-bold text-gray-900 mt-0.5">
                    {st.rapidRating || 1500}
                  </div>
                </div>

                <div className="bg-gray-50/70 p-2 rounded-xl">
                  <div className="text-[10px] text-gray-500 flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    Blitz
                  </div>
                  <div className="text-xs font-bold text-gray-900 mt-0.5">
                    {st.blitzRating || 1450}
                  </div>
                </div>

                <div className="bg-gray-50/70 p-2 rounded-xl">
                  <div className="text-[10px] text-gray-500 flex items-center justify-center gap-1">
                    <Flame className="w-3 h-3 text-red-500" />
                    Bullet
                  </div>
                  <div className="text-xs font-bold text-gray-900 mt-0.5">
                    {st.bulletRating || 1400}
                  </div>
                </div>
              </div>

              {/* Coach Note Snippet */}
              {st.coachNotes && (
                <div className="text-[11px] text-gray-600 bg-sjsfi-50/50 p-2.5 rounded-xl border border-sjsfi-100 italic line-clamp-2">
                  "{st.coachNotes}"
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2">
              <Link
                href={`/students/${st.id}`}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-sjsfi-50 hover:bg-sjsfi-900 text-sjsfi-900 hover:text-white transition-all flex items-center justify-center gap-1.5 border border-sjsfi-200 hover:border-transparent"
              >
                <span>View Live Games & Analysis</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Add Student Modal (Only for Coach Admin) */}
      {showAddModal && isCoach && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sjsfi-900" />
                <h3 className="text-sm font-bold text-gray-900">Enroll Student to ChessLogs</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Mateo Villanueva"
                  required
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sjsfi-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Chess.com Username (For live game sync)
                </label>
                <input
                  type="text"
                  value={newChesscom}
                  onChange={(e) => setNewChesscom(e.target.value)}
                  placeholder="e.g. mateo_chess_sjsfi"
                  required
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sjsfi-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Grade / Section
                  </label>
                  <input
                    type="text"
                    value={newGrade}
                    onChange={(e) => setNewGrade(e.target.value)}
                    placeholder="Grade 10 - STEM"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sjsfi-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Initial Rapid Rating
                  </label>
                  <input
                    type="number"
                    value={newRapid}
                    onChange={(e) => setNewRapid(e.target.value)}
                    placeholder="1500"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sjsfi-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sjsfi-900 text-white hover:bg-sjsfi-800 shadow-sm"
                >
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
