import Link from 'next/link';
import SJSFIBrand from '@/components/SJSFIBrand';
import {
  Cpu,
  Users,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Zap,
  Flame,
  Award,
  Database,
  PlayCircle,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-12 py-4">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-sjsfi-950 via-sjsfi-900 to-sjsfi-850 text-white p-8 md:p-14 shadow-xl border border-sjsfi-800">
        {/* Ambient decorative elements */}
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-sjsfi-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-20 w-80 h-80 bg-sjsfi-gold/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-sjsfi-gold">
            <ShieldCheck className="w-4 h-4 text-sjsfi-gold" />
            <span>Saint Joseph School Foundation Inc. • Zamboanga City</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
            Elevating SJSFI Chess with Real-Time <span className="text-emerald-300">Coaching & Engine Analysis</span>
          </h1>

          <p className="text-base sm:text-lg text-emerald-100/90 leading-relaxed font-normal">
            Welcome to <span className="font-bold text-white">ChessLogs</span>. The dedicated platform for the Head Coach to monitor student progress, sync live Chess.com games, deliver digital move-by-move and video courses, and analyze positions with a high-performance chess engine.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-sjsfi-950 font-bold hover:bg-sjsfi-50 transition-all shadow-md hover:shadow-lg text-sm group"
            >
              <span>Launch Dashboard</span>
              <ArrowRight className="w-4 h-4 text-sjsfi-900 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/analysis"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold transition-all text-sm backdrop-blur-xs"
            >
              <Cpu className="w-4 h-4 text-sjsfi-gold" />
              <span>Open Analysis Board</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Core Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Feature 1: Coach to Student Monitoring */}
        <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-card hover:shadow-md transition-all space-y-4">
          <div className="w-12 h-12 rounded-xl bg-sjsfi-100 text-sjsfi-900 flex items-center justify-center border border-sjsfi-200">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Coach to Student Monitoring</h3>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
              Coach is the sole administrator. Track student roster, review their win/loss trends, inspect ratings across time controls, and leave private coaching guidance.
            </p>
          </div>
          <Link
            href="/students"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-sjsfi-900 hover:text-sjsfi-700 pt-2"
          >
            <span>View Students Roster</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Feature 2: Chess.com Games Database & Engine */}
        <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-card hover:shadow-md transition-all space-y-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center border border-emerald-200">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Chess.com Live Game Sync</h3>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
              Fetch games directly from students' Chess.com profiles. Analyze openings, inspect accuracy percentages, and load any game into the analysis engine with one click.
            </p>
          </div>
          <Link
            href="/analysis"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-700 pt-2"
          >
            <span>Launch Analysis Board</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Feature 3: Move-by-Move & Video Courses */}
        <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-card hover:shadow-md transition-all space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center border border-amber-200">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Custom Coach Courses</h3>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
              Coach creates digital courses with flexible lesson formats: purely interactive move-by-move boards, pure video masterclasses, or synchronized board + video dual mode.
            </p>
          </div>
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-700 pt-2"
          >
            <span>Explore Courses</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* SJSFI Heritage Banner */}
      <div className="bg-white rounded-2xl border border-sjsfi-200/80 p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <SJSFIBrand size="md" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-medium">Saint Joseph School Foundation Inc.</span>
          <Link
            href="/login"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-sjsfi-900 text-white hover:bg-sjsfi-800 transition-colors shadow-xs"
          >
            Sign In / Switch Account
          </Link>
        </div>
      </div>
    </div>
  );
}
