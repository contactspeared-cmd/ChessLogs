import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChessKnightIcon, ChessBoardIcon, ChessCrownIcon } from '../components/ChessIcons';
import {
  Sparkles,
  Zap,
  BookOpen,
  Award,
  CheckCircle2,
  Users,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Star,
  Activity,
  Layers,
} from 'lucide-react';

export default function Landing() {
  const { user } = useAuth();

  const features = [
    {
      title: 'MoveTrainer Spaced Repetition',
      desc: 'Lock chess opening lines, tactical motifs, and endgame conversion techniques into muscle memory with automated interval reviews.',
      icon: Zap,
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    {
      title: 'Stockfish 18 NNUE Evaluations',
      desc: 'In-browser WASM engine calculations provide instant Expected Points Lost (EPL), classification badges, and blunder diagnostics.',
      icon: Activity,
      color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    },
    {
      title: 'Grandmaster Author Studio',
      desc: 'Curriculum authored by verified FIDE trainers and masters. Browse free marketplace repertoires with variation commentary.',
      icon: Award,
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    {
      title: 'Direct Coach Mentorship',
      desc: 'Study any course freely on your own, or apply for official 1-on-1 private mentoring with certified federation instructors.',
      icon: Users,
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
  ];

  const popularCourses = [
    {
      title: 'Mastering the Sicilian Defense: Open Variations',
      author: 'GM Magnus Carlsen',
      level: '1300–2400 Elo',
      chapters: 2,
      side: 'Black',
      rating: 4.9,
    },
    {
      title: 'Rook & Pawn Endgames: Lucena & Philidor',
      author: 'GM Magnus Carlsen',
      level: '1200–2200 Elo',
      chapters: 1,
      side: 'White',
      rating: 4.8,
    },
    {
      title: 'The Italian Game: Giuoco Piano & Evans Gambit',
      author: 'GM Magnus Carlsen',
      level: '1000–2000 Elo',
      chapters: 1,
      side: 'White',
      rating: 4.9,
    },
  ];

  return (
    <div className="space-y-16 pb-16">
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-emerald-50/40 border-b border-slate-800 pt-12 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-500/30 text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next-Gen Chess LMS &amp; Spaced Repetition</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
                Learn chess fast with{' '}
                <span className="text-emerald-600 underline decoration-emerald-300 underline-offset-8">
                  science-backed
                </span>{' '}
                repetition.
              </h1>

              <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                ChessLogs brings Chessable-style MoveTrainer spaced repetition together with local Stockfish 18 NNUE analytics and verified federation coach masterclasses.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                {user ? (
                  <Link
                    to="/dashboard"
                    className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Open Learning Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/signup"
                      className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                    >
                      <span>Get Started Free</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      to="/marketplace"
                      className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-950 text-slate-200 font-bold text-sm border border-slate-700 shadow-sm transition-all"
                    >
                      Browse Marketplace
                    </Link>
                  </>
                )}
              </div>

              <div className="flex items-center justify-center lg:justify-start gap-6 pt-4 text-xs font-semibold text-slate-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Free open access</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Stockfish 18 NNUE</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>No credit card required</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                      <ChessKnightIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-white">MoveTrainer Studio</div>
                      <div className="text-[10px] text-slate-400">Sicilian Dragon: Yugoslav Attack</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Review Due
                  </span>
                </div>

                <div className="aspect-square bg-slate-900 rounded-2xl p-3 flex flex-col justify-between text-white relative overflow-hidden">
                  <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-xl overflow-hidden border border-slate-800">
                    {Array.from({ length: 64 }).map((_, i) => {
                      const row = Math.floor(i / 8);
                      const col = i % 8;
                      const isDark = (row + col) % 2 === 1;
                      return (
                        <div
                          key={i}
                          className={`${
                            isDark ? 'bg-[#769656]' : 'bg-[#eeeed2]'
                          } flex items-center justify-center text-[10px]`}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Target Move</span>
                    <div className="font-mono font-bold text-emerald-400">12... h4! Dynamic push</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Accuracy</span>
                    <div className="font-bold text-white">98.4%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            Engineered for Real Rating Gains
          </span>
          <h2 className="text-3xl font-extrabold text-white">
            Everything you need to reach your next milestone
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Combine structured repertoire memorization with deep position analysis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow space-y-3"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${feat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-white">{feat.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-white">Featured Masterclasses</h2>
            <p className="text-xs text-slate-400 mt-0.5">Explore open-enrollment courses authored by Grandmasters</p>
          </div>
          <Link
            to="/marketplace"
            className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>View All Courses</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {popularCourses.map((c, i) => (
            <div
              key={i}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="h-28 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 p-4 flex flex-col justify-between text-white">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900/20 self-start">
                  {c.side} Repertoire
                </span>
                <span className="text-xs font-mono">{c.level}</span>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">{c.author}</span>
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <span>{c.rating}</span>
                  </div>
                </div>
                <h3 className="font-bold text-sm text-white line-clamp-1">{c.title}</h3>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{c.chapters} Chapters</span>
                  <Link
                    to="/marketplace"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                  >
                    Start Free
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-8 sm:p-12 text-white text-center space-y-5 shadow-xl">
          <h2 className="text-3xl font-extrabold tracking-tight">Ready to level up your chess?</h2>
          <p className="text-sm text-emerald-100 max-w-xl mx-auto leading-relaxed">
            Create your account today, sync your games, and start studying with Spaced Repetition and Stockfish 18 NNUE.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              to="/signup"
              className="px-7 py-3 rounded-2xl bg-slate-900 text-white font-extrabold text-sm shadow-md hover:bg-slate-950 transition-all"
            >
              Sign Up Free
            </Link>
            <Link
              to="/marketplace"
              className="px-6 py-3 rounded-2xl bg-emerald-800/60 hover:bg-emerald-800 text-white font-bold text-sm border border-emerald-400/40 transition-all"
            >
              Explore Catalog
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
