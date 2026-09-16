import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { useAuth } from '../context/AuthContext';
import {
  fetchChesscomAllGames,
  formatChesscomGame,
} from '../lib/chesscom';
import { getGamesForStudent, upsertGames, replaceSyncedChesscomGames } from '../lib/db';
import { detectOpening, openingFieldsFromDetection } from '../lib/openings';
import OpeningBadge from '../components/OpeningBadge';
import {
  Database,
  RefreshCw,
  Search,
  ArrowRight,
  ExternalLink,
  PlusCircle,
  Clock,
  Zap,
  Flame,
  Calendar,
  AlertTriangle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const GAMES_PER_PAGE = 50;

export default function Games() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [syncFeedback, setSyncFeedback] = useState(null);

  // Filters
  const [timeFilter, setTimeFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // PGN Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pastedPgn, setPastedPgn] = useState('');
  const [importError, setImportError] = useState('');

  const loadGames = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const data = await getGamesForStudent(profile.id);
      setGames(data || []);
    } catch (err) {
      console.error('Failed to load games:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, profile?.chesscom_username]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  // Reset to first page whenever filters change
  useEffect(() => {
    setPage(1);
  }, [timeFilter, resultFilter, searchQuery, games.length]);

  // Sync entire Chess.com history (all monthly archives), replacing prior synced games
  const handleSyncGames = async () => {
    const username = profile?.chesscom_username;
    if (!username) {
      setSyncFeedback({
        type: 'error',
        text: 'Please link a Chess.com username in your Profile first.',
      });
      return;
    }

    setSyncing(true);
    setSyncFeedback(null);
    setSyncProgress({ completed: 0, total: 0, gameCount: 0 });

    try {
      const rawGames = await fetchChesscomAllGames(username, (progress) => {
        setSyncProgress(progress);
      });

      const formatted = (rawGames || []).map((g) =>
        formatChesscomGame(g, username, profile.id)
      );

      await replaceSyncedChesscomGames(profile.id, formatted);
      await loadGames();
      setPage(1);

      if (formatted.length === 0) {
        setSyncFeedback({
          type: 'info',
          text: `No games found for @${username}. Your Chess.com game list is empty.`,
        });
      } else {
        setSyncFeedback({
          type: 'success',
          text: `Synced ${formatted.length.toLocaleString()} games from @${username} (all-time).`,
        });
      }
    } catch (err) {
      setSyncFeedback({
        type: 'error',
        text: err.message || 'Failed to sync games from Chess.com Public API.',
      });
    } finally {
      setSyncing(false);
      setSyncProgress(null);
      setTimeout(() => setSyncFeedback(null), 6000);
    }
  };

  const handleImportCustomPgn = async (e) => {
    e.preventDefault();
    setImportError('');
    if (!pastedPgn.trim()) {
      setImportError('Please enter valid PGN text.');
      return;
    }

    try {
      const pgn = pastedPgn.trim();
      const chess = new Chess();
      chess.loadPgn(pgn);
      const moves = chess.history();
      if (moves.length === 0) {
        throw new Error('No moves found in the provided PGN.');
      }

      const headers = typeof chess.header === 'function' ? chess.header() : {};
      const openingInfo = openingFieldsFromDetection(detectOpening(pgn));

      const customGame = {
        id: `pgn-${Date.now()}`,
        student_id: profile.id,
        chesscom_game_id: `custom-${Date.now()}`,
        pgn,
        time_class: headers.TimeControl ? 'live' : 'rapid',
        result: 'win',
        white_username: headers.White || 'Custom White',
        black_username: headers.Black || 'Custom Black',
        white_rating: Number(headers.WhiteElo) || 1500,
        black_rating: Number(headers.BlackElo) || 1500,
        url: '',
        played_at: headers.Date
          ? new Date(headers.Date.replace(/\./g, '-')).toISOString()
          : new Date().toISOString(),
        synced_at: new Date().toISOString(),
        ...openingInfo,
      };

      await upsertGames([customGame]);
      setIsImportModalOpen(false);
      setPastedPgn('');
      await loadGames();
      navigate(`/analysis?gameId=${customGame.id}`);
    } catch (err) {
      setImportError(err.message || 'Failed to parse and import PGN.');
    }
  };

  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      if (timeFilter !== 'all' && g.time_class !== timeFilter) return false;
      if (resultFilter !== 'all' && g.result !== resultFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchW = (g.white_username || '').toLowerCase().includes(q);
        const matchB = (g.black_username || '').toLowerCase().includes(q);
        const matchOpening = (g.opening || '').toLowerCase().includes(q);
        const matchVariation = (g.variation || '').toLowerCase().includes(q);
        const matchEco = (g.eco || '').toLowerCase().includes(q);
        if (!matchW && !matchB && !matchOpening && !matchVariation && !matchEco) return false;
      }
      return true;
    });
  }, [games, timeFilter, resultFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / GAMES_PER_PAGE));
  const safePage = Math.min(page, totalPages);

  const pagedGames = useMemo(() => {
    const start = (safePage - 1) * GAMES_PER_PAGE;
    const slice = filteredGames.slice(start, start + GAMES_PER_PAGE);
    // Enrich openings only for the visible page (avoids lag on huge libraries)
    return slice.map((game) => {
      if (game.opening || game.eco || !game.pgn) return game;
      return { ...game, ...openingFieldsFromDetection(detectOpening(game.pgn)) };
    });
  }, [filteredGames, safePage]);

  const rangeStart = filteredGames.length === 0 ? 0 : (safePage - 1) * GAMES_PER_PAGE + 1;
  const rangeEnd = Math.min(safePage * GAMES_PER_PAGE, filteredGames.length);

  const getTimeClassIcon = (timeClass) => {
    switch (timeClass) {
      case 'bullet':
        return <Flame className="w-3.5 h-3.5 text-rose-400" />;
      case 'blitz':
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'rapid':
      case 'daily':
      default:
        return <Clock className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Database className="w-8 h-8 text-emerald-500" />
            <span>Game Database</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Sync your full Chess.com history and review games with Stockfish 18 NNUE.
            {games.length > 0 && (
              <span className="text-slate-500"> · {games.length.toLocaleString()} games stored</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Import PGN</span>
          </button>

          <button
            onClick={handleSyncGames}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing All Games…' : 'Sync Chess.com'}</span>
          </button>
        </div>
      </div>

      {/* Sync progress */}
      {syncing && syncProgress && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Fetching archives{syncProgress.total > 0 ? ` ${syncProgress.completed}/${syncProgress.total}` : '…'}
            </span>
            <span className="font-mono text-emerald-400">
              {syncProgress.gameCount.toLocaleString()} games
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
              style={{
                width: `${
                  syncProgress.total > 0
                    ? Math.round((syncProgress.completed / syncProgress.total) * 100)
                    : 8
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div
          className={`p-3.5 rounded-xl text-sm flex items-center gap-2.5 ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : syncFeedback.type === 'error'
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
          }`}
        >
          {syncFeedback.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 shrink-0" />
          )}
          <span>{syncFeedback.text}</span>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search opponent, opening, or ECO..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Time Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {['all', 'bullet', 'blitz', 'rapid', 'daily'].map((tc) => (
              <button
                key={tc}
                onClick={() => setTimeFilter(tc)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors ${
                  timeFilter === tc
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tc}
              </button>
            ))}
          </div>

          {/* Result Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {['all', 'win', 'loss', 'draw'].map((res) => (
              <button
                key={res}
                onClick={() => setResultFilter(res)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors ${
                  resultFilter === res
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {res}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Games List */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-sm">Loading game database...</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <Database className="w-12 h-12 text-slate-600 mx-auto" />
          <div>
            <h3 className="text-base font-semibold text-white">No games found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {!profile?.chesscom_username
                ? 'Link your Chess.com username in Profile to sync your games.'
                : games.length === 0
                ? `No games for @${profile.chesscom_username}. Sync to pull your full Chess.com history, or this account has no games.`
                : 'No games match your current filters. Clear search/filters or sync again.'}
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            {profile?.chesscom_username ? (
              <button
                onClick={handleSyncGames}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Sync Now
              </button>
            ) : (
              <button
                onClick={() => navigate('/profile')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Go to Profile
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-800">
            {pagedGames.map((game) => {
              const isUserWhite =
                (game.white_username || '').toLowerCase() ===
                (profile?.chesscom_username || '').toLowerCase();
              const opponentName = isUserWhite ? game.black_username : game.white_username;
              const opponentRating = isUserWhite ? game.black_rating : game.white_rating;
              const userRating = isUserWhite ? game.white_rating : game.black_rating;

              return (
                <div
                  key={game.id || game.chesscom_game_id}
                  className="p-4 sm:p-5 hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                        game.result === 'win'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : game.result === 'loss'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-slate-700/30 text-slate-300 border-slate-700'
                      }`}
                    >
                      {game.result === 'win' ? 'W' : game.result === 'loss' ? 'L' : 'D'}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-base">
                          vs. {opponentName || 'Unknown Opponent'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">({opponentRating || '?'})</span>

                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-medium text-slate-300 capitalize">
                          {getTimeClassIcon(game.time_class)}
                          <span>{game.time_class}</span>
                        </div>

                        {game.review && (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[11px] font-mono font-semibold">
                            Acc: {isUserWhite ? game.review.accuracy_white : game.review.accuracy_black}%
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <span
                            className={`w-2.5 h-2.5 rounded-full border ${
                              isUserWhite ? 'bg-white border-slate-400' : 'bg-slate-900 border-slate-600'
                            }`}
                          />
                          <span>Playing {isUserWhite ? 'White' : 'Black'} ({userRating || '?'})</span>
                        </span>

                        <span>•</span>

                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(game.played_at).toLocaleDateString()}</span>
                        </span>

                        {(game.opening || game.eco) && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <OpeningBadge
                              eco={game.eco}
                              opening={game.opening}
                              variation={game.variation}
                              size="sm"
                              className="max-w-[16rem]"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:self-center self-end">
                    {game.url && (
                      <a
                        href={game.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                        title="View on Chess.com"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    <button
                      onClick={() => navigate(`/analysis?gameId=${game.id}`)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-white text-xs font-semibold border border-slate-700 hover:border-emerald-500 transition-all group"
                    >
                      <span>{game.review ? 'View Analysis' : 'Review Game'}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination — 50 games per page */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3">
            <p className="text-xs text-slate-400">
              Showing{' '}
              <span className="text-slate-200 font-mono font-semibold">
                {rangeStart}–{rangeEnd}
              </span>{' '}
              of{' '}
              <span className="text-slate-200 font-mono font-semibold">
                {filteredGames.length.toLocaleString()}
              </span>{' '}
              games · {GAMES_PER_PAGE} per page
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              <span className="text-xs font-mono text-slate-400 px-2">
                Page {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Custom PGN Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                <span>Import Game PGN</span>
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste a PGN to save and open it in analysis. ChessLogs will detect the opening and variation automatically.
            </p>

            <form onSubmit={handleImportCustomPgn} className="space-y-4">
              <textarea
                rows={7}
                value={pastedPgn}
                onChange={(e) => setPastedPgn(e.target.value)}
                placeholder={'1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5...'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                required
              />

              {importError && (
                <div className="p-3 rounded-lg bg-rose-500/10 text-rose-400 text-xs border border-rose-500/20">
                  {importError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Save & Analyze
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
