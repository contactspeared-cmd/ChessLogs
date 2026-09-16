import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCourses, getGamesForStudent } from '../lib/db';
import { fetchChesscomStats } from '../lib/chesscom';
import { detectOpening, openingFieldsFromDetection } from '../lib/openings';
import OpeningBadge from '../components/OpeningBadge';
import StatCard from '../components/StatCard';
import {
  Trophy,
  BookOpen,
  Database,
  Crosshair,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react';

export default function Dashboard() {
  const { profile } = useAuth();
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
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      }
    }

    loadDashboardData();
  }, [profile]);

  // Calculate statistics
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
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
              {profile?.role === 'admin' ? 'Coach Command View' : 'Student Improvement Portal'}
            </span>
            {profile?.chesscom_username && (
              <span className="text-xs text-slate-400 font-mono">
                Linked: @{profile.chesscom_username}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {profile?.display_name || 'Chess Champion'}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Track your positional mastery, review game accuracy with Stockfish 18 NNUE, and advance through assigned training modules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/analysis')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all"
          >
            <Crosshair className="w-4 h-4" />
            <span>Open Analysis Board</span>
          </button>
          <button
            onClick={() => navigate('/games')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Sync Games</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Chess.com Rapid Rating"
          value={chessStats?.chess_rapid?.last?.rating || '—'}
          subtitle={
            chessStats?.chess_rapid?.best?.rating
              ? `All-time peak: ${chessStats.chess_rapid.best.rating}`
              : 'Link username in Profile'
          }
          icon={Trophy}
          color="amber"
        />
        <StatCard
          title="Synced Games"
          value={totalGames}
          subtitle={`Win Rate: ${winRate}% (${wins}W / ${losses}L / ${draws}D)`}
          icon={Database}
          color="emerald"
        />
        <StatCard
          title="Average Review Accuracy"
          value={averageAccuracy ? `${averageAccuracy}%` : '—'}
          subtitle={
            reviewedGames.length > 0
              ? `Across ${reviewedGames.length} reviewed games`
              : 'Run Fast Review to benchmark'
          }
          icon={Zap}
          color="cyan"
        />
        <StatCard
          title="Assigned Courses"
          value={courses.length}
          subtitle={`${
            courses.filter((c) => (c.progress?.completed_chapter_ids?.length || 0) > 0).length
          } active in training`}
          icon={BookOpen}
          color="purple"
        />
      </div>

      {/* Two Column Section: Assigned Courses & Recent Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Assigned Courses Section */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <span>Assigned Curriculum</span>
            </h2>
            <button
              onClick={() => navigate('/courses')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {courses.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
              No courses assigned yet.
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
                    onClick={() => navigate(`/courses/${course.id}`)}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-sm transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {course.type === 'walkthrough' ? 'Interactive Board' : 'Video'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {completed} of {total} chapters
                        </span>
                      </div>
                      <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors text-sm">
                        {course.title}
                      </h3>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <button className="px-3.5 py-2 rounded-xl bg-slate-800 group-hover:bg-emerald-600 text-slate-200 group-hover:text-white text-xs font-semibold transition-colors shrink-0">
                      Resume
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Game Reviews Section */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span>Recent Game Reviews</span>
            </h2>
            <button
              onClick={() => navigate('/games')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>All Games</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {games.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
              No games synced yet. Sync Chess.com in the Game Database.
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800 overflow-hidden shadow-xl">
              {games.slice(0, 4).map((game) => (
                <div
                  key={game.id}
                  onClick={() => navigate(`/analysis?gameId=${game.id}`)}
                  className="p-4 hover:bg-slate-800/50 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          game.result === 'win'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : game.result === 'loss'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-slate-700/30 text-slate-300'
                        }`}
                      >
                        {game.result}
                      </span>
                      <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                        vs. {game.black_username}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                      <span className="capitalize">{game.time_class}</span>
                      <span>•</span>
                      <span>{new Date(game.played_at).toLocaleDateString()}</span>
                      {(game.opening || game.eco) && (
                        <>
                          <span>•</span>
                          <OpeningBadge
                            eco={game.eco}
                            opening={game.opening}
                            variation={game.variation}
                            size="sm"
                            className="max-w-[14rem]"
                          />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {game.review ? (
                      <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20">
                        {game.review.accuracy_white}% Acc
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 group-hover:text-emerald-400 transition-colors">
                        Review →
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
