import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCourses, getGamesForStudent } from '../lib/db';
import { fetchChesscomStats } from '../lib/chesscom';
import { detectOpening, openingFieldsFromDetection } from '../lib/openings';
import OpeningBadge from '../components/OpeningBadge';
import {
  Trophy,
  BookOpen,
  Database,
  Crosshair,
  ArrowRight,
  Sparkles,
  Zap,
  GraduationCap,
  ShoppingBag,
  MessageSquare,
} from 'lucide-react';

export default function Dashboard() {
  const { profile, isCoach } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [games, setGames] = useState([]);
  const [chessStats, setChessStats] = useState(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [cData, gData] = await Promise.all([
          getCourses(profile).catch(() => []),
          profile?.id ? getGamesForStudent(profile.id).catch(() => []) : [],
        ]);
        setCourses(cData || []);
        setGames(
          (gData || []).map((game) =>
            game.opening || game.eco || !game.pgn
              ? game
              : { ...game, ...openingFieldsFromDetection(detectOpening(game.pgn)) }
          )
        );

        if (profile?.chesscom_username) {
          const stats = await fetchChesscomStats(profile.chesscom_username);
          setChessStats(stats);
        }
      } catch (err) {}
    }

    loadDashboardData();
  }, [profile]);

  const totalGames = games.length;
  const wins = games.filter((g) => g.result === 'win').length;
  const losses = games.filter((g) => g.result === 'loss').length;
  const draws = games.filter((g) => g.result === 'draw').length;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  const reviewedGames = games.filter((g) => g.review);
  const averageAccuracy =
    reviewedGames.length > 0
      ? Math.round(
          reviewedGames.reduce((sum, g) => sum + (Number(g.review.accuracy_white) || 75), 0) /
            reviewedGames.length
        )
      : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {isCoach && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-amber-300 font-semibold">
            <GraduationCap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              You are a certified coach. This is your personal student learning portal.
            </span>
          </div>
          <Link
            to="/coach"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shrink-0"
          >
            <span>Coach Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              MoveTrainer Daily Study
            </span>
            {profile?.chesscom_username && (
              <span className="text-xs text-slate-400 font-mono">
                @{profile.chesscom_username}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {profile?.display_name || 'Champion'}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
            Strengthen your memory with MoveTrainer spaced repetition, evaluate your moves with Stockfish 18 NNUE, and explore the curriculum catalog.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Browse Marketplace</span>
          </Link>
          <Link
            to="/analysis"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
          >
            <Crosshair className="w-4 h-4 text-emerald-400" />
            <span>Analysis Board</span>
          </Link>
          {isCoach && (
            <Link
              to="/messages"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
            >
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span>Messages</span>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Chess.com Rating</span>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-white">
            {chessStats?.chess_rapid?.last?.rating || profile?.current_elo || '1200'} Elo
          </div>
          <p className="text-[11px] text-slate-400">
            {chessStats?.chess_rapid?.best?.rating ? `Peak: ${chessStats.chess_rapid.best.rating}` : 'Rapid Rating'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Synced Matches</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalGames}</div>
          <p className="text-[11px] text-emerald-400 font-semibold">
            {winRate}% Win Rate ({wins}W / {losses}L / {draws}D)
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Engine Accuracy</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {averageAccuracy ? `${averageAccuracy}%` : '—'}
          </div>
          <p className="text-[11px] text-slate-400">Stockfish 18 NNUE Review</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Active Courses</span>
            <BookOpen className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">{courses.length}</div>
          <p className="text-[11px] text-purple-400 font-semibold">MoveTrainer Enrolled</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <span>Current MoveTrainer Study Courses</span>
            </h2>
            <Link
              to="/courses"
              className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {courses.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3 shadow-sm">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No courses enrolled in your personal study track yet.</p>
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Explore Course Marketplace</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {courses.slice(0, 3).map((course) => {
                const completed = course.progress?.completed_chapter_ids?.length || 0;
                const total = course.chapters?.length || 1;
                const percent = Math.round((completed / total) * 100);

                return (
                  <div
                    key={course.id}
                    className="bg-slate-900 border border-slate-800 hover:border-emerald-500/30 hover:shadow-md rounded-2xl p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {course.trained_side || 'White'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {completed} of {total} chapters
                        </span>
                        {course.coach_name && (
                          <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <GraduationCap className="w-3 h-3 text-amber-400" />
                            <span>Coach {course.coach_name}</span>
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-white text-sm line-clamp-1">
                        {course.title}
                      </h3>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <Link
                      to={`/courses/${course.id}`}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors shrink-0 text-center"
                    >
                      Study Now
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span>Recent Game Evaluations</span>
            </h2>
            <Link
              to="/games"
              className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>All Games</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {games.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400 text-xs shadow-sm space-y-2">
              <Database className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No games synced yet.</p>
              <Link to="/games" className="text-emerald-400 font-bold hover:underline">
                Sync Chess.com Database
              </Link>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800 overflow-hidden shadow-sm">
              {games.slice(0, 4).map((game) => (
                <div
                  key={game.id}
                  onClick={() => navigate(`/analysis?gameId=${game.id}`)}
                  className="p-4 hover:bg-slate-950 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          game.result === 'win'
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : game.result === 'loss'
                            ? 'bg-rose-500/10 text-rose-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {game.result}
                      </span>
                      <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                        vs. {game.black_username || 'Opponent'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="capitalize">{game.time_class || 'Rapid'}</span>
                      <span>•</span>
                      <span>{new Date(game.played_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {game.review ? (
                    <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20">
                      {game.review.accuracy_white}% Acc
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 group-hover:text-emerald-400">
                      Analyze
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
