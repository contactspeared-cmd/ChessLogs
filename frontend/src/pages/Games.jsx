import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { useAuth } from '../context/AuthContext';
import {
  fetchChesscomAllGames,
  formatChesscomGame,
} from '../lib/chesscom';
import {
  getGamesForStudent,
  upsertGames,
  replaceSyncedChesscomGames,
  archiveGame,
  unarchiveGame,
} from '../lib/db';
import { detectOpening, openingFieldsFromDetection } from '../lib/openings';
import OpeningBadge from '../components/OpeningBadge';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
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
  X,
  Archive,
  RotateCcw,
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

  const [gameFilterMode, setGameFilterMode] = useState('active');
  const [archiveModalGame, setArchiveModalGame] = useState(null);

  const [timeFilter, setTimeFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

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
    } finally {
      setLoading(false);
    }
  }, [profile?.id, profile?.chesscom_username]);

  const lastSyncedUserRef = useRef(null);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  useEffect(() => {
    if (!loading && profile?.chesscom_username && lastSyncedUserRef.current !== profile.chesscom_username) {
      lastSyncedUserRef.current = profile.chesscom_username;
      handleSyncGames();
    }
  }, [loading, profile?.chesscom_username]);

  useEffect(() => {
    setPage(1);
  }, [gameFilterMode, timeFilter, resultFilter, searchQuery, games.length]);

  const activeCount = useMemo(() => games.filter((g) => !g.archived).length, [games]);
  const archivedCount = useMemo(() => games.filter((g) => g.archived).length, [games]);

  const handleUnarchiveGame = async (gameId) => {
    try {
      await unarchiveGame(gameId);
      await loadGames();
    } catch (err) {
    }
  };

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
      const rawGames = await fetchChesscomAllGames(username, {
        onProgress: (p) => setSyncProgress(p),
      });

      if (!rawGames || rawGames.length === 0) {
        setSyncFeedback({
          type: 'info',
          text: `No archives found for Chess.com user "${username}".`,
        });
        setSyncing(false);
        setSyncProgress(null);
        return;
      }

      const formatted = rawGames
        .map((g) => formatChesscomGame(g, profile.chesscom_username, profile.id))
        .filter(Boolean);

      setGames(formatted);
      await replaceSyncedChesscomGames(profile.id, formatted);

      setSyncFeedback({
        type: 'success',
        text: `Successfully synced ${formatted.length.toLocaleString()} games from Chess.com!`,
      });
    } catch (err) {
      setSyncFeedback({
        type: 'error',
        text: 'Failed to sync games from Chess.com. Please try again.',
      });
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  const handleImportCustomPgn = async (e) => {
    e.preventDefault();
    setImportError('');

    if (!pastedPgn.trim()) {
      setImportError('Please paste a valid PGN.');
      return;
    }

    try {
      const chess = new Chess();
      chess.loadPgn(pastedPgn);

      const header = chess.header();
      const white = header.White || 'White';
      const black = header.Black || 'Black';
      const userIsWhite =
        white.toLowerCase() === (profile?.chesscom_username || '').toLowerCase();

      let result = 'draw';
      if (header.Result === '1-0') result = userIsWhite ? 'win' : 'loss';
      else if (header.Result === '0-1') result = userIsWhite ? 'loss' : 'win';

      const detected = detectOpening(pastedPgn);
      const openingFields = openingFieldsFromDetection(detected);

      const newGame = {
        id: `custom-${Date.now()}`,
        student_id: profile.id,
        chesscom_game_id: `custom-${Date.now()}`,
        url: null,
        pgn: pastedPgn,
        time_control: header.TimeControl || 'Unknown',
        time_class: 'rapid',
        rated: false,
        white_username: white,
        white_rating: parseInt(header.WhiteElo, 10) || 1500,
        black_username: black,
        black_rating: parseInt(header.BlackElo, 10) || 1500,
        result,
        played_at: header.Date
          ? new Date(header.Date.replace(/\./g, '-')).toISOString()
          : new Date().toISOString(),
        ...openingFields,
      };

      await upsertGames([newGame]);
      setGames((prev) => [newGame, ...prev]);
      setIsImportModalOpen(false);
      setPastedPgn('');
      navigate(`/analysis?gameId=${newGame.id}`);
    } catch (err) {
      setImportError('Invalid PGN format. Please verify the game notation.');
    }
  };

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      if (gameFilterMode === 'archived') {
        if (!game.archived) return false;
      } else {
        if (game.archived) return false;
      }
      if (timeFilter !== 'all' && game.time_class !== timeFilter) return false;
      if (resultFilter !== 'all' && game.result !== resultFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const opponent =
          (game.white_username || '').toLowerCase() ===
          (profile?.chesscom_username || '').toLowerCase()
            ? (game.black_username || '').toLowerCase()
            : (game.white_username || '').toLowerCase();

        const opening = (game.opening || '').toLowerCase();
        const eco = (game.eco || '').toLowerCase();
        const variation = (game.variation || '').toLowerCase();

        return (
          opponent.includes(q) ||
          opening.includes(q) ||
          eco.includes(q) ||
          variation.includes(q)
        );
      }
      return true;
    });
  }, [games, gameFilterMode, timeFilter, resultFilter, searchQuery, profile?.chesscom_username]);

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / GAMES_PER_PAGE));
  const safePage = Math.min(page, totalPages);

  const pagedGames = useMemo(() => {
    const start = (safePage - 1) * GAMES_PER_PAGE;
    const slice = filteredGames.slice(start, start + GAMES_PER_PAGE);
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
        return <Flame className="w-3.5 h-3.5 text-rose-500" />;
      case 'blitz':
        return <Zap className="w-3.5 h-3.5 text-amber-500" />;
      case 'rapid':
      case 'daily':
      default:
        return <Clock className="w-3.5 h-3.5 text-emerald-600" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Database className="w-8 h-8 text-emerald-600" />
            <span>Game Database</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Sync your full Chess.com history and review games with Stockfish 18 NNUE.
            {games.length > 0 && (
              <span className="text-slate-400"> · {games.length.toLocaleString()} games stored</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-950 text-slate-300 text-sm font-semibold border border-slate-700 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>Import PGN</span>
          </button>

          <button
            onClick={handleSyncGames}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing All Games…' : 'Sync Chess.com'}</span>
          </button>
        </div>
      </div>

      {syncing && syncProgress && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Fetching archives{syncProgress.total > 0 ? ` ${syncProgress.completed}/${syncProgress.total}` : '…'}
            </span>
            <span className="font-mono font-semibold text-emerald-600">
              {syncProgress.gameCount.toLocaleString()} games
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
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

      {syncFeedback && (
        <div
          className={`p-3.5 rounded-xl text-sm flex items-center gap-2.5 ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              : syncFeedback.type === 'error'
              ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          {syncFeedback.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          ) : (
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
          )}
          <span className="font-medium">{syncFeedback.text}</span>
        </div>
      )}

      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setGameFilterMode('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            gameFilterMode === 'active'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Active Games ({activeCount.toLocaleString()})</span>
        </button>

        <button
          onClick={() => setGameFilterMode('archived')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            gameFilterMode === 'archived'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Archived Games ({archivedCount.toLocaleString()})</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search opponent, opening, or ECO..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-slate-900 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-800 text-xs">
            {['all', 'bullet', 'blitz', 'rapid', 'daily'].map((tc) => (
              <button
                key={tc}
                onClick={() => setTimeFilter(tc)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                  timeFilter === tc
                    ? 'bg-slate-900 text-emerald-400 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tc}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-800 text-xs">
            {['all', 'win', 'loss', 'draw'].map((res) => (
              <button
                key={res}
                onClick={() => setResultFilter(res)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                  resultFilter === res
                    ? 'bg-slate-900 text-emerald-400 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {res}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium">Loading game database...</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <Database className="w-12 h-12 text-slate-400 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-white">No games found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
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
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
              >
                Sync Now
              </button>
            ) : (
              <button
                onClick={() => navigate('/profile')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
              >
                Go to Profile
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-800">
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
                  className="p-4 sm:p-5 hover:bg-slate-950/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                        game.result === 'win'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : game.result === 'loss'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      {game.result === 'win' ? 'W' : game.result === 'loss' ? 'L' : 'D'}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-base">
                          vs. {opponentName || 'Unknown Opponent'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono font-medium">({opponentRating || '?'})</span>

                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-800 text-[11px] font-medium text-slate-300 capitalize">
                          {getTimeClassIcon(game.time_class)}
                          <span>{game.time_class}</span>
                        </div>

                        {game.archived && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-semibold flex items-center gap-1">
                            <Archive className="w-3 h-3" />
                            <span>Archived</span>
                          </span>
                        )}

                        {game.review && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-mono font-semibold">
                            Acc: {isUserWhite ? game.review.accuracy_white : game.review.accuracy_black}%
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full border ${
                              isUserWhite ? 'bg-slate-900 border-slate-400' : 'bg-slate-900 border-slate-900'
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

                      {game.archived && game.archived_reason && (
                        <div className="text-[11px] text-amber-300/80 italic">
                          Archive reason: &quot;{game.archived_reason}&quot;
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:self-center self-end">
                    {game.archived ? (
                      <button
                        onClick={() => handleUnarchiveGame(game.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold border border-amber-500/20 transition-colors"
                        title="Unarchive game"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Unarchive</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setArchiveModalGame(game)}
                        className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                        title="Archive game"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}

                    {game.url && (
                      <a
                        href={game.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                        title="View on Chess.com"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    {game.review && (
                      <div className="flex items-center gap-1 text-[11px] font-mono font-bold">
                        <span className="px-2 py-1 rounded-lg bg-slate-800 text-white border border-slate-700">
                          W {game.review.accuracy_white ?? '—'}%
                        </span>
                        <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
                          B {game.review.accuracy_black ?? '—'}%
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => navigate(`/analysis?gameId=${game.id}`)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-xs font-semibold border border-slate-800 hover:border-emerald-600 transition-all group"
                    >
                      <span>{game.review ? 'View Analysis' : 'Review Game'}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 shadow-sm">
            <p className="text-xs text-slate-400">
              Showing{' '}
              <span className="text-white font-mono font-semibold">
                {rangeStart}–{rangeEnd}
              </span>{' '}
              of{' '}
              <span className="text-white font-mono font-semibold">
                {filteredGames.length.toLocaleString()}
              </span>{' '}
              games · {GAMES_PER_PAGE} per page
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              <span className="text-xs font-mono text-slate-400 px-2 font-medium">
                Page {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-600" />
                <span>Import Game PGN</span>
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-300 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Paste a PGN to save and open it in analysis. ChessLogs will detect the opening and variation automatically.
            </p>

            <form onSubmit={handleImportCustomPgn} className="space-y-4">
              <textarea
                rows={7}
                value={pastedPgn}
                onChange={(e) => setPastedPgn(e.target.value)}
                placeholder={'1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5...'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 focus:bg-slate-900 transition-all"
                required
              />

              {importError && (
                <div className="p-3 rounded-lg bg-rose-500/10 text-rose-400 text-xs border border-rose-500/20 font-medium">
                  {importError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                >
                  Save &amp; Analyze
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={!!archiveModalGame}
        onClose={() => setArchiveModalGame(null)}
        title="Archive Saved Game"
        itemType="Saved Game"
        itemName={
          archiveModalGame
            ? `vs. ${(archiveModalGame.white_username || '').toLowerCase() === (profile?.chesscom_username || '').toLowerCase() ? archiveModalGame.black_username : archiveModalGame.white_username} (${archiveModalGame.time_class || 'game'})`
            : ''
        }
        warningDetails="Archiving this game removes it from your active game catalog. It is retained in your archive and can be unarchived at any time, and an audit snapshot is recorded in the platform audit trail."
        onConfirm={async (reason) => {
          if (!archiveModalGame) return;
          await archiveGame(archiveModalGame.id, { reason, user: profile });
          setArchiveModalGame(null);
          await loadGames();
        }}
      />
    </div>
  );
}
