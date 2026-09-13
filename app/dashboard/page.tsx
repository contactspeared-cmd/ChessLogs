'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  BookOpen,
  Cpu,
  PlusCircle,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  TrendingUp,
  Clock,
  Award,
  ChevronRight,
  ExternalLink,
  Flame,
  Zap,
} from 'lucide-react';
import { getStoredUser, getStoredStudents, getStoredCourses, getStoredGames } from '@/lib/store';
import { User, StudentProfile, Course, ChessGame } from '@/lib/types';
import { COACH_ADMIN } from '@/lib/initialData';
import StatCard from '@/components/StatCard';
import ChesscomGamesList from '@/components/ChesscomGamesList';

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<User>(COACH_ADMIN);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [recentGames, setRecentGames] = useState<ChessGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getStoredUser();
    setCurrentUser(user);
    const studList = getStoredStudents();
    setStudents(studList);
    setCourses(getStoredCourses());
    setRecentGames(getStoredGames());
    setLoading(false);

    // If student, try to fetch their live games from Chess.com API route
    if (user.role === 'student' && user.chesscomUsername) {
      fetch(`/api/chesscom/games/${user.chesscomUsername}?limit=10`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.games?.length) {
            setRecentGames(data.games);
          }
        })
        .catch((e) => console.warn(e));
    }
  }, []);

  const isCoach = currentUser.role === 'coach';

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-sjsfi-950 via-sjsfi-900 to-sjsfi-850 text-white p-6 sm:p-8 shadow-lg border border-sjsfi-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-sjsfi-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-sjsfi-gold border border-white/15">
                {isCoach ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-sjsfi-gold" />
                    <span>Head Coach & Administrator (Sole Admin)</span>
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-3.5 h-3.5 text-sjsfi-gold" />
                    <span>SJSFI Chess Student Portal</span>
                  </>
                )}
              </span>
              <span className="text-xs text-sjsfi-200 font-medium hidden sm:inline">
                Saint Joseph School Foundation Inc.
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Mabuhay, {currentUser.name}!
            </h1>
            <p className="text-xs sm:text-sm text-sjsfi-100/90 max-w-2xl">
              {isCoach
                ? "Here is your coaching dashboard. Monitor student Chess.com performance, publish move-by-move digital courses, and review tactical game analysis."
                : "Welcome to your personal training center. Review your latest Chess.com matches, learn from Coach's custom video & board courses, and analyze games with the engine."}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isCoach ? (
              <>
                <Link
                  href="/courses/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-sjsfi-gold text-gray-950 hover:bg-yellow-400 transition-colors shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Course</span>
                </Link>
                <Link
                  href="/analysis"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 border border-white/20 text-white transition-colors backdrop-blur-xs"
                >
                  <Cpu className="w-4 h-4 text-sjsfi-gold" />
                  <span>Analysis Board</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-sjsfi-gold text-gray-950 hover:bg-yellow-400 transition-colors shadow-sm"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Browse Courses</span>
                </Link>
                <Link
                  href="/analysis"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 border border-white/20 text-white transition-colors"
                >
                  <Cpu className="w-4 h-4 text-sjsfi-gold" />
                  <span>Analyze Game</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      {isCoach ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Total Students"
            value={students.length}
            subtitle="SJSFI Varsity & Club"
            icon={Users}
            trend="+1 this month"
            trendUp={true}
          />
          <StatCard
            title="Games Monitored"
            value="87"
            subtitle="Chess.com live sync"
            icon={Clock}
            trend="Active tracking"
            trendUp={true}
          />
          <StatCard
            title="Published Courses"
            value={courses.length}
            subtitle="Board, Video & Both"
            icon={BookOpen}
            trend="Curriculum ready"
            trendUp={true}
          />
          <StatCard
            title="Engine Reviews"
            value="34"
            subtitle="Coach annotations"
            icon={Cpu}
            trend="Updated today"
            trendUp={true}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Rapid Rating"
            value={currentUser.rating || 1640}
            subtitle="Chess.com Live"
            icon={Clock}
            trend="+32 pts peak"
            trendUp={true}
          />
          <StatCard
            title="Tactics / Puzzles"
            value="2,100"
            subtitle="Tactical trainer"
            icon={Zap}
            trend="Master level"
            trendUp={true}
          />
          <StatCard
            title="Assigned Courses"
            value={courses.length}
            subtitle="SJSFI Academy"
            icon={BookOpen}
            trend="2 In Progress"
            trendUp={true}
          />
          <StatCard
            title="Coach Reviews"
            value="5"
            subtitle="Detailed feedback"
            icon={Award}
            trend="Available now"
            trendUp={true}
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Recent Monitored Games (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sjsfi-900" />
              <h2 className="text-base font-bold text-gray-900">
                {isCoach ? "Students' Recent Chess.com Matches" : "My Recent Chess.com Games"}
              </h2>
            </div>
            <Link
              href="/analysis"
              className="text-xs font-semibold text-sjsfi-900 hover:text-sjsfi-700 flex items-center gap-1"
            >
              <span>Engine Analysis</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <ChesscomGamesList
            games={recentGames}
            targetUsername={currentUser.chesscomUsername}
            loading={loading}
          />
        </div>

        {/* Right Column: Coaching Roster or Courses (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* If Coach: Student Quick Roster */}
          {isCoach && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-sjsfi-900" />
                  <h3 className="text-sm font-bold text-gray-900">Monitored Students</h3>
                </div>
                <Link
                  href="/students"
                  className="text-xs font-semibold text-sjsfi-900 hover:text-sjsfi-700"
                >
                  Manage Roster →
                </Link>
              </div>

              <div className="space-y-3">
                {students.map((st) => (
                  <Link
                    key={st.id}
                    href={`/students/${st.id}`}
                    className="p-3 rounded-xl border border-gray-100 hover:border-sjsfi-300 hover:bg-sjsfi-50/40 transition-all flex items-center justify-between group block"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sjsfi-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        {st.name[0]}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900 group-hover:text-sjsfi-950">
                          {st.name}
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                          <span>@{st.chesscomUsername}</span>
                          <span>•</span>
                          <span className="font-semibold text-sjsfi-800">
                            {st.rapidRating} Rapid
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-sjsfi-900 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Quick Courses Preview */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sjsfi-900" />
                <h3 className="text-sm font-bold text-gray-900">Academy Courses</h3>
              </div>
              <Link
                href="/courses"
                className="text-xs font-semibold text-sjsfi-900 hover:text-sjsfi-700"
              >
                View All →
              </Link>
            </div>

            <div className="space-y-3">
              {courses.slice(0, 2).map((c) => (
                <Link
                  key={c.id}
                  href={`/courses/${c.id}`}
                  className="p-3 rounded-xl border border-gray-100 hover:border-sjsfi-300 hover:bg-sjsfi-50/40 transition-all block group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-sjsfi-100 text-sjsfi-900 border border-sjsfi-200">
                      {c.level}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">
                      {c.chapters.length} Chapters
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 group-hover:text-sjsfi-900 line-clamp-1">
                    {c.title}
                  </h4>
                  <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">
                    {c.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
