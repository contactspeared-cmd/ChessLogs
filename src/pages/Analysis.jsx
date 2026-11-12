import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { useAuth } from '../context/AuthContext';
import ChessboardView from '../components/ChessboardView';
import EvalBar from '../components/EvalBar';
import MoveClassificationBadge from '../components/MoveClassificationBadge';
import {
  getEngineInstance,
  runFastReview,
} from '../lib/engine';
import { ENGINE_CONFIG } from '../config/engine';
import { getGameById, saveGameReview } from '../lib/db';
import { detectOpening, openingFieldsFromDetection } from '../lib/openings';
import OpeningBadge from '../components/OpeningBadge';
import {
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  RefreshCw,
  Cpu,
  Award,
  ClipboardPaste,
  Trash2,
  X,
  BookOpen,
} from 'lucide-react';

function uciToSan(fen, uciMove) {
  if (!fen || !uciMove) return uciMove ?? '';
  try {
    const tmp = new Chess(fen);
    const from = uciMove.slice(0, 2);
    const to = uciMove.slice(2, 4);
    const promotion = uciMove.length === 5 ? uciMove[4] : undefined;
    const result = tmp.move({ from, to, ...(promotion && { promotion }) });
    return result?.san ?? uciMove;
  } catch {
    return uciMove;
  }
}

function pvToSan(fen, pvMoves, maxMoves = 6) {
  if (!fen || !pvMoves?.length) return '';
  try {
    const tmp = new Chess(fen);
    let moveNumber = typeof tmp.moveNumber === 'function' ? tmp.moveNumber() : 1;
    let isWhiteTurn = tmp.turn() === 'w';

    const parts = [];
    let pairBuf = [];

    for (const uci of pvMoves.slice(0, maxMoves)) {
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length === 5 ? uci[4] : undefined;
      const result = tmp.move({ from, to, ...(promotion && { promotion }) });
      if (!result) break;

      if (isWhiteTurn) {
        pairBuf = [`${moveNumber}. ${result.san}`];
      } else {
        if (pairBuf.length) {
          pairBuf.push(result.san);
          parts.push(pairBuf.join(' '));
          pairBuf = [];
          moveNumber++;
        } else {
          parts.push(`${moveNumber}... ${result.san}`);
          moveNumber++;
        }
      }
      isWhiteTurn = !isWhiteTurn;
    }

    if (pairBuf.length) parts.push(pairBuf.join(' '));

    return parts.join(' ');
  } catch {
    return '';
  }
}

export default function Analysis() {
  const [searchParams] = useSearchParams();
  const gameIdParam = searchParams.get('gameId');
  const { profile } = useAuth();

  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [history, setHistory] = useState([]);
  const [currentPly, setCurrentPly] = useState(0);
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [lastMove, setLastMove] = useState(null);

  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewProgress, setReviewProgress] = useState(0);
  const [reviewData, setReviewData] = useState(null);

  const [deepAnalysisEnabled, setDeepAnalysisEnabled] = useState(false);
  const [deepEngineInfo, setDeepEngineInfo] = useState(null);
  const [isDeepSearching, setIsDeepSearching] = useState(false);

  const [currentGame, setCurrentGame] = useState(null);

  const [liveEval, setLiveEval] = useState({ scoreCp: 0, isMate: false, mateIn: 0 });

  const [arrows, setArrows] = useState([]);

  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [pasteError, setPasteError] = useState('');

  useEffect(() => {
    async function init() {
      if (!gameIdParam) {
        chess.reset();
        setFen(chess.fen());
        setHistory([]);
        setCurrentPly(0);
        setCurrentGame(null);
        setReviewData(null);
        setLastMove(null);
        setBoardOrientation('white');
        return;
      }

      try {
        const game = await getGameById(gameIdParam);
        if (game) {
          let augmented = game;
          if (!game.opening && !game.eco && game.pgn) {
            augmented = { ...game, ...openingFieldsFromDetection(detectOpening(game.pgn)) };
          }
          setCurrentGame(augmented);

          const studentUser = (profile?.chesscom_username || '').toLowerCase();
          const blackUser = (game.black_username || '').toLowerCase();
          if (studentUser && blackUser && studentUser === blackUser) {
            setBoardOrientation('black');
          } else {
            setBoardOrientation('white');
          }

          if (game.pgn) {
            chess.loadPgn(game.pgn);
            const moves = chess.history({ verbose: true });
            setHistory(moves);

            chess.reset();
            setFen(chess.fen());
            setCurrentPly(0);
            setLastMove(null);

            if (game.review) {
              setReviewData({
                accuracyWhite: game.review.accuracy_white,
                accuracyBlack: game.review.accuracy_black,
                moveClassifications: game.review.move_classifications || [],
                summary: game.review.summary || {},
              });
            } else {
              setReviewData(null);
            }
          }
        } else {
          chess.reset();
          setFen(chess.fen());
          setHistory([]);
          setCurrentPly(0);
        }
      } catch (err) {
        console.error('Failed to load game for analysis:', err);
      }
    }

    init();
  }, [gameIdParam, chess, profile?.chesscom_username]);

  const goToPly = useCallback(
    (targetPly) => {
      const boundedPly = Math.max(0, Math.min(targetPly, history.length));
      chess.reset();
      let last = null;
      for (let i = 0; i < boundedPly; i++) {
        last = chess.move(history[i]);
      }
      setFen(chess.fen());
      setCurrentPly(boundedPly);
      setLastMove(last ? { from: last.from, to: last.to } : null);
    },
    [chess, history]
  );

  const handlePieceDrop = (sourceSquare, targetSquare, piece) => {
    try {
      const promotion =
        (piece.startsWith('w') && targetSquare[1] === '8') ||
        (piece.startsWith('b') && targetSquare[1] === '1')
          ? 'q'
          : undefined;

      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion,
      });

      if (!move) return false;

      const newHistory = history.slice(0, currentPly);
      newHistory.push(move);
      setHistory(newHistory);
      setCurrentPly(newHistory.length);
      setFen(chess.fen());
      setLastMove({ from: move.from, to: move.to });

      setReviewData(null);
      return true;
    } catch {
      return false;
    }
  };

  const handleNewAnalysis = () => {
    chess.reset();
    setFen(chess.fen());
    setHistory([]);
    setCurrentPly(0);
    setCurrentGame(null);
    setReviewData(null);
    setLastMove(null);
    setDeepEngineInfo(null);
  };

  const handlePasteSubmit = (e) => {
    e.preventDefault();
    setPasteError('');
    const raw = pasteInput.trim();
    if (!raw) return;

    try {
      const testChess = new Chess();
      testChess.load(raw);

      chess.load(raw);
      setFen(chess.fen());
      setHistory([]);
      setCurrentPly(0);
      setCurrentGame({
        id: `fen-${Date.now()}`,
        time_class: 'sandbox',
        white_username: 'White',
        black_username: 'Black',
      });
      setReviewData(null);
      setLastMove(null);
      setIsPasteModalOpen(false);
      setPasteInput('');
      return;
    } catch {}

    try {
      const testChess = new Chess();
      testChess.loadPgn(raw);

      chess.loadPgn(raw);
      const moves = chess.history({ verbose: true });
      const detected = detectOpening(raw);
      const openingFields = openingFieldsFromDetection(detected);

      setHistory(moves);
      setCurrentGame({
        id: `pgn-${Date.now()}`,
        time_class: 'custom',
        white_username: testChess.header().White || 'White',
        white_rating: testChess.header().WhiteElo || '—',
        black_username: testChess.header().Black || 'Black',
        black_rating: testChess.header().BlackElo || '—',
        pgn: raw,
        ...openingFields,
      });

      chess.reset();
      setFen(chess.fen());
      setCurrentPly(0);
      setReviewData(null);
      setLastMove(null);

      setIsPasteModalOpen(false);
      setPasteInput('');
    } catch {
      setPasteError('Invalid PGN or FEN string. Please check the notation and format.');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        if (['input', 'textarea'].includes(document.activeElement?.tagName?.toLowerCase())) {
          return;
        }
        e.preventDefault();

        if (e.code === 'ArrowLeft') goToPly(currentPly - 1);
        if (e.code === 'ArrowRight') goToPly(currentPly + 1);
        if (e.code === 'ArrowUp') goToPly(0);
        if (e.code === 'ArrowDown') goToPly(history.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPly, history.length, goToPly]);

  const handleStartFastReview = async () => {
    if (isReviewing || history.length === 0) return;
    setIsReviewing(true);
    setReviewProgress(0);

    try {
      const result = await runFastReview(history, {
        onProgress: (p) => setReviewProgress(p),
      });

      setReviewData(result);

      if (currentGame?.id && !currentGame.id.startsWith('pgn-') && !currentGame.id.startsWith('fen-')) {
        await saveGameReview(currentGame.id, {
          accuracy_white: result.accuracyWhite,
          accuracy_black: result.accuracyBlack,
          move_classifications: result.moveClassifications,
          summary: result.summary,
        });
      }
    } catch (err) {
      console.error('Failed to run fast review:', err);
    } finally {
      setIsReviewing(false);
    }
  };

  useEffect(() => {
    if (!deepAnalysisEnabled) {
      setDeepEngineInfo(null);
      return;
    }

    let isMounted = true;
    setIsDeepSearching(true);

    const engine = getEngineInstance();
    if (!engine || typeof engine.subscribe !== 'function') {
      setIsDeepSearching(false);
      return;
    }

    const unsub = engine.subscribe((info) => {
      if (!isMounted) return;
      if (info?.depth) {
        setDeepEngineInfo({
          depth: info.depth,
          scoreCp: info.scoreCp || 0,
          isMate: Boolean(info.isMate),
          mateIn: info.mateIn || 0,
          bestMove: info.bestMove,
          pv: info.pv || [],
        });
      }
    });

    engine
      .evaluatePosition(fen, ENGINE_CONFIG.deepAnalysis?.depth || 20)
      .then(() => {
        if (isMounted) setIsDeepSearching(false);
      })
      .catch(() => {
        if (isMounted) setIsDeepSearching(false);
      });

    return () => {
      isMounted = false;
      unsub();
      if (typeof engine.stop === 'function') engine.stop();
    };
  }, [fen, deepAnalysisEnabled]);

  useEffect(() => {
    if (reviewData?.moveClassifications?.length) return;

    let cancelled = false;
    const engine = getEngineInstance();
    if (!engine || typeof engine.subscribe !== 'function') return;

    const unsub = engine.subscribe((info) => {
      if (cancelled) return;
      if (info && (info.scoreCp !== undefined || info.isMate)) {
        setLiveEval({
          scoreCp: info.scoreCp || 0,
          isMate: Boolean(info.isMate),
          mateIn: info.mateIn || 0,
        });
      }
    });

    engine.evaluatePosition(fen, 10).catch(() => {});

    return () => {
      cancelled = true;
      unsub();
      if (typeof engine.stop === 'function') engine.stop();
    };
  }, [fen, reviewData]);

  useEffect(() => {
    const newArrows = [];

    const activeClassification = reviewData?.moveClassifications?.find(
      (m) => m.ply === currentPly
    );

    if (activeClassification?.bestMoveUci) {
      const from = activeClassification.bestMoveUci.slice(0, 2);
      const to = activeClassification.bestMoveUci.slice(2, 4);
      newArrows.push([from, to, 'rgba(16, 185, 129, 0.85)']);
    }

    if (deepAnalysisEnabled && deepEngineInfo?.bestMove) {
      const from = deepEngineInfo.bestMove.slice(0, 2);
      const to = deepEngineInfo.bestMove.slice(2, 4);
      newArrows.push([from, to, 'rgba(14, 165, 233, 0.85)']);
    }

    setArrows(newArrows);
  }, [currentPly, reviewData, deepAnalysisEnabled, deepEngineInfo]);

  const currentClassification = reviewData?.moveClassifications?.find(
    (m) => m.ply === currentPly
  );

  const activeScoreCp =
    currentClassification?.scoreCp !== undefined
      ? currentClassification.scoreCp
      : liveEval.scoreCp;

  const activeIsMate =
    currentClassification?.isMate !== undefined
      ? currentClassification.isMate
      : liveEval.isMate;

  const activeMateIn =
    currentClassification?.mateIn !== undefined
      ? currentClassification.mateIn
      : liveEval.mateIn;

  const bestMoveSan = currentClassification?.bestMoveUci
    ? uciToSan(currentClassification.fenBefore, currentClassification.bestMoveUci)
    : null;

  const pvSan = deepEngineInfo?.pv?.length > 0
    ? pvToSan(fen, deepEngineInfo.pv, 8)
    : '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              {currentGame?.time_class ? currentGame.time_class.toUpperCase() : 'FRESH BOARD'}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {currentGame?.played_at
                ? new Date(currentGame.played_at).toLocaleDateString()
                : 'Interactive Sandbox'}
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">
            {currentGame ? (
              `${currentGame.white_username || 'White'} (${currentGame.white_rating || '—'}) vs. ${currentGame.black_username || 'Black'} (${currentGame.black_rating || '—'})`
            ) : (
              'Live Analysis Board'
            )}
          </h1>
          {currentGame?.opening || currentGame?.eco ? (
            <div className="mt-2">
              <OpeningBadge
                eco={currentGame.eco}
                opening={currentGame.opening}
                variation={currentGame.variation}
              />
            </div>
          ) : currentGame?.pgn ? (
            <p className="text-xs text-slate-400 mt-1.5 inline-flex items-center gap-1.5 font-medium">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              Opening not identified for this game
            </p>
          ) : null}
          {!currentGame && (
            <p className="text-xs text-slate-400 mt-0.5">
              Make moves on the board or paste a game to start analyzing.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsPasteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-800 transition-all shadow-sm"
            title="Paste Game (PGN or FEN)"
          >
            <ClipboardPaste className="w-4 h-4 text-emerald-600" />
            <span>Paste Game</span>
          </button>

          <button
            onClick={handleNewAnalysis}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-800 transition-all shadow-sm"
            title="Reset to fresh board"
          >
            <Trash2 className="w-4 h-4 text-slate-400" />
            <span>Fresh Board</span>
          </button>

          <button
            onClick={() => setDeepAnalysisEnabled(!deepAnalysisEnabled)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              deepAnalysisEnabled
                ? 'bg-sky-500/10 text-sky-300 border-sky-300 shadow-sm'
                : 'bg-slate-800 text-slate-300 border-slate-800 hover:bg-slate-700'
            }`}
          >
            <Cpu className="w-4 h-4 text-sky-600" />
            <span>Deep {deepAnalysisEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={handleStartFastReview}
            disabled={isReviewing || (history.length === 0 && !currentGame?.pgn)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-40"
          >
            <Sparkles className={`w-4 h-4 ${isReviewing ? 'animate-spin' : ''}`} />
            <span>{isReviewing ? `Reviewing (${reviewProgress}%)...` : 'Run Game Review'}</span>
          </button>
        </div>
      </div>

      {reviewData && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
              White Accuracy
            </span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {reviewData.accuracyWhite}%
            </span>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
              Black Accuracy
            </span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {reviewData.accuracyBlack}%
            </span>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
              Engine Version
            </span>
            <span className="text-sm font-semibold text-slate-200 truncate block mt-1">
              Stockfish 18 NNUE
            </span>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
              Key Moments
            </span>
            <span className="text-sm font-semibold text-slate-200 mt-1 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>
                {reviewData.moveClassifications.filter((m) =>
                  ['brilliant', 'great', 'miss', 'blunder'].includes(m.classification)
                ).length}{' '}
                Critical Moves
              </span>
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 flex flex-col sm:flex-row gap-3 items-center justify-center">
          <div className="hidden sm:block h-[440px] md:h-[500px]">
            <EvalBar
              scoreCp={activeScoreCp}
              isMate={activeIsMate}
              mateIn={activeMateIn}
              orientation={boardOrientation}
            />
          </div>

          <div className="w-full max-w-[520px]">
            <ChessboardView
              position={fen}
              boardOrientation={boardOrientation}
              customArrows={arrows}
              lastMove={lastMove}
              isDraggable={true}
              onPieceDrop={handlePieceDrop}
            />

            <div className="mt-3 flex items-center justify-between bg-slate-900 border border-slate-800 p-2.5 rounded-xl shadow-sm">
              <button
                onClick={() => setBoardOrientation(boardOrientation === 'white' ? 'black' : 'white')}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Flip Board"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPly(0)}
                  disabled={currentPly === 0}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  title="First Move"
                >
                  <ChevronLeft className="w-5 h-5 -mr-2" />
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => goToPly(currentPly - 1)}
                  disabled={currentPly === 0}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  title="Previous Move"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="px-3 py-1 font-mono text-xs font-semibold text-slate-300">
                  {currentPly} / {history.length}
                </span>
                <button
                  onClick={() => goToPly(currentPly + 1)}
                  disabled={currentPly === history.length}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  title="Next Move"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => goToPly(history.length)}
                  disabled={currentPly === history.length}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  title="Last Move"
                >
                  <ChevronRight className="w-5 h-5" />
                  <ChevronRight className="w-5 h-5 -ml-2" />
                </button>
              </div>

              <div className="text-xs text-slate-400 font-mono font-medium">
                {currentPly > 0 ? history[currentPly - 1]?.san : 'Start'}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Move Inspection
              </span>
              {currentClassification && (
                <MoveClassificationBadge
                  classificationId={currentClassification.classification}
                />
              )}
            </div>

            {currentPly > 0 ? (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <div className="font-bold text-lg text-white">
                    {Math.ceil(currentPly / 2)}.{currentPly % 2 === 1 ? '' : '..'}{' '}
                    <span className="text-emerald-400">{history[currentPly - 1]?.san}</span>
                  </div>
                  {currentClassification?.accuracy !== undefined && (
                    <span className="text-xs font-mono text-slate-400">
                      Accuracy: <strong className="text-white">{currentClassification.accuracy}%</strong>
                    </span>
                  )}
                </div>

                {bestMoveSan && (
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-emerald-400 font-semibold">Engine Best Move:</span>
                    <span className="font-mono text-white font-bold">
                      {bestMoveSan}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Initial position before move 1.</p>
            )}

            {deepAnalysisEnabled && (
              <div className="pt-2 border-t border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1 font-medium">
                    <Zap className="w-3.5 h-3.5 text-sky-600" />
                    <span>Deep Analysis (Depth 20)</span>
                  </span>
                  {isDeepSearching && <RefreshCw className="w-3 h-3 animate-spin text-sky-600" />}
                </div>
                {deepEngineInfo ? (
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-200 space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span>Depth: {deepEngineInfo.depth}</span>
                      <span>
                        Eval:{' '}
                        {deepEngineInfo.isMate
                          ? `Mate in ${deepEngineInfo.mateIn}`
                          : `${(deepEngineInfo.scoreCp / 100).toFixed(2)}`}
                      </span>
                    </div>
                    {pvSan && (
                      <div className="text-slate-400 leading-relaxed break-words whitespace-normal">
                        <span className="text-slate-400">Line: </span>{pvSan}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-400 text-[11px]">Evaluating position...</p>
                )}
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>Game Move History</span>
              <span className="font-mono text-slate-400">{history.length} Plies</span>
            </h3>

            <div className="max-h-[360px] overflow-y-auto space-y-1 pr-1 font-mono text-xs">
              {Array.from({ length: Math.ceil(history.length / 2) }).map((_, moveNumIdx) => {
                const whitePly = moveNumIdx * 2 + 1;
                const blackPly = moveNumIdx * 2 + 2;

                const whiteMove = history[whitePly - 1];
                const blackMove = history[blackPly - 1];

                const whiteReview = reviewData?.moveClassifications?.find((m) => m.ply === whitePly);
                const blackReview = reviewData?.moveClassifications?.find((m) => m.ply === blackPly);

                return (
                  <div
                    key={moveNumIdx}
                    className="grid grid-cols-12 gap-1 items-center py-1 px-2 rounded-lg hover:bg-slate-950 transition-colors text-slate-300"
                  >
                    <span className="col-span-2 text-slate-400 font-semibold">
                      {moveNumIdx + 1}.
                    </span>

                    <button
                      onClick={() => goToPly(whitePly)}
                      className={`col-span-5 text-left px-2 py-1 rounded transition-colors flex items-center justify-between ${
                        currentPly === whitePly
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <span>{whiteMove?.san}</span>
                      {whiteReview && (
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: whiteReview.classificationColor }}
                        >
                          {whiteReview.classificationSymbol}
                        </span>
                      )}
                    </button>

                    {blackMove ? (
                      <button
                        onClick={() => goToPly(blackPly)}
                        className={`col-span-5 text-left px-2 py-1 rounded transition-colors flex items-center justify-between ${
                          currentPly === blackPly
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'hover:bg-slate-800 text-slate-200'
                        }`}
                      >
                        <span>{blackMove.san}</span>
                        {blackReview && (
                          <span
                            className="text-[10px] font-bold"
                            style={{ color: blackReview.classificationColor }}
                          >
                            {blackReview.classificationSymbol}
                          </span>
                        )}
                      </button>
                    ) : (
                      <div className="col-span-5" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-emerald-600" />
                <span>Paste Game or FEN Position</span>
              </h3>
              <button
                onClick={() => {
                  setIsPasteModalOpen(false);
                  setPasteError('');
                }}
                className="text-slate-400 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Paste standard PGN notation (from Chess.com, Lichess, etc.) or a FEN string.
              For PGN games, ChessLogs will identify the opening and variation automatically.
            </p>

            {pasteError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl font-medium">
                {pasteError}
              </div>
            )}

            <form onSubmit={handlePasteSubmit} className="space-y-4">
              <textarea
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
                placeholder="Paste PGN (e.g. 1. e4 e5 2. Nf3...) or FEN string here"
                rows={6}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-slate-900 focus:ring-1 focus:ring-emerald-500 transition-all"
                autoFocus
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasteModalOpen(false);
                    setPasteError('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                >
                  Load into Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
