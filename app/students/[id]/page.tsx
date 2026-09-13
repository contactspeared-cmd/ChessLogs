'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  ShieldCheck,
  GraduationCap,
  ExternalLink,
  Clock,
  Zap,
  Flame,
  Award,
  BookOpen,
  ArrowLeft,
  Cpu,
  Save,
  Check,
  Sparkles,
} from 'lucide-react';
import { getStoredUser, getStoredStudents, saveStudents, getStoredCourses } from '@/lib/store';
import { COACH_ADMIN } from '@/lib/initialData';
import { User, StudentProfile, ChessGame } from '@/lib/types';
import ChesscomGamesList from '@/components/ChesscomGamesList';

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.id as string;

  const [currentUser, setCurrentUser] = useState<User>(COACH_ADMIN);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [games, setGames] = useState<ChessGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [coachNotes, setCoachNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => {
    setCurrentUser(getStoredUser());
    const allStudents = getStoredStudents();
    const found = allStudents.find((s) => s.id === studentId);
    if (found) {
      setStudent(found);
      setCoachNotes(found.coachNotes || '');

      // Fetch live Chess.com games for this student
      fetch(`/api/chesscom/games/${found.chesscomUsername}?limit=15`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.games) {
            setGames(data.games);
          }
          setLoadingGames(false);
        })
        .catch((e) => {
          console.error(e);
          setLoadingGames(false);
        });
    } else {
      setLoadingGames(false);
    }
  }, [studentId]);

  const handleSaveNotes = () => {
    if (!student) return;
    const allStudents = getStoredStudents();
    const updated = allStudents.map((s) => {
      if (s.id === student.id) {
        return { ...s, coachNotes };
      }
      return s;
    });
    saveStudents(updated);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  if (!student) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Student not found.</p>
        <Link href="/students" className="text-xs text-sjsfi-900 font-bold hover:underline mt-2 inline-block">
          ← Back to Students Roster
        </Link>
      </div>
    );
  }

  const isCoach = currentUser.role === 'coach';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/students"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-sjsfi-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Students Roster</span>
      </Link>

      {/* Student Profile Banner */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sjsfi-900 to-sjsfi-950 text-white flex items-center justify-center font-bold text-2xl shadow-md border border-sjsfi-700">
            {student.name[0]}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900">{student.name}</h1>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-sjsfi-100 text-sjsfi-900 border border-sjsfi-200">
                SJSFI Varsity
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              {student.gradeLevel} • {student.school}
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <a
                href={`https://www.chess.com/member/${student.chesscomUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-sjsfi-900 font-bold hover:underline"
              >
                <span>Chess.com: @{student.chesscomUsername}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Ratings Pills */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-center min-w-[80px]">
            <span className="text-[10px] text-gray-500 font-medium flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-emerald-600" /> Rapid
            </span>
            <span className="text-sm font-black text-gray-900">{student.rapidRating}</span>
          </div>
          <div className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-center min-w-[80px]">
            <span className="text-[10px] text-gray-500 font-medium flex items-center justify-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" /> Blitz
            </span>
            <span className="text-sm font-black text-gray-900">{student.blitzRating}</span>
          </div>
          <div className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-center min-w-[80px]">
            <span className="text-[10px] text-gray-500 font-medium flex items-center justify-center gap-1">
              <Flame className="w-3 h-3 text-red-500" /> Bullet
            </span>
            <span className="text-sm font-black text-gray-900">{student.bulletRating}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Games and Coach Observations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Monitored Chess.com Games (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sjsfi-900" />
              <span>Live Monitored Chess.com Games</span>
            </h2>
            <span className="text-xs text-gray-400">Synced via Chess.com API</span>
          </div>

          <ChesscomGamesList
            games={games}
            targetUsername={student.chesscomUsername}
            loading={loadingGames}
          />
        </div>

        {/* Coach Notes & Performance Plan (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sjsfi-900" />
                <h3 className="text-sm font-bold text-gray-900">
                  {isCoach ? 'Coach Feedback & Training Plan' : "Coach's Notes for Me"}
                </h3>
              </div>
              {isCoach && (
                <span className="text-[10px] font-bold text-sjsfi-900 bg-sjsfi-100 px-2 py-0.5 rounded">
                  Admin Only
                </span>
              )}
            </div>

            {isCoach ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  Private coaching observations for {student.name}. Notes updated here are visible in the student's training dashboard.
                </p>
                <textarea
                  value={coachNotes}
                  onChange={(e) => setCoachNotes(e.target.value)}
                  placeholder="Record strengths, opening weaknesses, tactical blindspots, or homework assignments..."
                  className="w-full h-36 p-3 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sjsfi-600 text-gray-800 bg-gray-50/50 resize-none"
                />
                <button
                  onClick={handleSaveNotes}
                  className="w-full py-2.5 bg-sjsfi-900 hover:bg-sjsfi-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  {notesSaved ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Updated Successfully!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-sjsfi-gold" />
                      <span>Save Coaching Notes</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-4 bg-sjsfi-50 rounded-2xl border border-sjsfi-200 text-xs text-sjsfi-950 space-y-2">
                <div className="font-bold text-sjsfi-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sjsfi-gold" />
                  Coach's Guidance:
                </div>
                <p className="italic leading-relaxed">
                  "{student.coachNotes || 'Continue reviewing your games on the analysis board.'}"
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
