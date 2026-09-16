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
import { getGamesForStudent, saveGameReview } from '../lib/db';
import { DEMO_GAMES } from '../data/initialData';
import {
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  RefreshCw,
  Cpu,
  Award,
} from 'lucide-react';

export default function Analysis() {
  const [searchParams] = useSearchParams();
  const gameIdParam = searchParams.get('gameId');
  const { profile } = useAuth();

  // Chess game instance
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [history, setHistory] = useState([]); // array of moves
  const [currentPly, setCurrentPly] = useState(0); // 0 is initial position
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [lastMove, setLastMove] = useState(null);

  // Engine review & live analysis state
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewProgress, setReviewProgress] = useState(0);
  const [reviewData, setReviewData] = useState(null); // { moveClassifications, accuracyWhite, accuracyBlack, summary }

  // Deep Analysis state
  const [deepAnalysisEnabled, setDeepAnalysisEnabled] = useState(false);
  const [deepEngineInfo, setDeepEngineInfo] = useState(null);
  const [isDeepSearching, setIsDeepSearching] = useState(false);

  // Loaded game metadata
  const [currentGame, setCurrentGame] = useState(null);

  // Custom arrows on board: [[from, to, color]]
  const [arrows, setArrows] = useState([]);

  // Load game by ID or sample game
  useEffect(() => {
    async function loadGame() {
      let selectedGame = null;
      if (profile?.id) {
        const studentGames = await getGamesForStudent(profile.id);
        selectedGame = studentGames.find((g) => g.id === gameIdParam);
      }
      if (!selectedGame) {
        selectedGame = DEMO_GAMES.find((g) => g.id === gameIdParam) || DEMO_GAMES[0];
      }

      setCurrentGame(selectedGame);

      if (selectedGame?.pgn) {
        try {
          chess.loadPgn(selectedGame.pgn);
          const fullHistory = chess.history({ verbose: true });
          setHistory(fullHistory);

          // Reset to start of game for review
          chess.reset();
          setFen(chess.fen());
          setCurrentPly(0);
          setLastMove(null);

          // Check if already reviewed
          if (selectedGame.review) {
            setReviewData({
              moveClassifications: selectedGame.review.move_classifications || [],
              accuracyWhite: selectedGame.review.accuracy_white,
              accuracyBlack: selectedGame.review.accuracy_black,
            });
          }
        } catch (e) {
          console.error('Failed to load PGN:', e);
        }
      }
    }

    loadGame();
  }, [gameIdParam, profile?.id, chess]);

  // Navigate to specific ply in game
  const goToPly = useCallback((targetPly) => {
    if (targetPly < 0 || targetPly > history.length) return;

    chess.reset();
    let moveObj = null;
    for (let i = 0; i < targetPly; i++) {
      moveObj = chess.move(history[i]);
    }

    setFen(chess.fen());
    setCurrentPly(targetPly);
    setLastMove(moveObj ? { from: moveObj.from, to: moveObj.to } : null);
  }, [chess, history]);

  // Handle keyboard arrow navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        if (e.key === 'ArrowLeft') goToPly(currentPly - 1);
        if (e.key === 'ArrowRight') goToPly(currentPly + 1);
        if (e.key === 'ArrowUp') goToPly(0);
        if (e.key === 'ArrowDown') goToPly(history.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPly, history.length, goToPly]);

  // Run Fast Review across entire game
  const handleStartFastReview = async () => {
    if (!currentGame?.pgn || isReviewing) return;
    setIsReviewing(true);
    setReviewProgress(0);

    try {
      const result = await runFastReview(currentGame.pgn, (progress) => {
        setReviewProgress(progress.percent);
      });

      setReviewData(result);

      // Persist review to DB
      if (currentGame.id) {
        await saveGameReview(currentGame.id, {
          engine_version: ENGINE_CONFIG.version,
          move_classifications: result.moveClassifications,
          accuracy_white: result.accuracyWhite,
          accuracy_black: result.accuracyBlack,
        });
      }
    } catch (err) {
      console.error('Game review failed:', err);
    } finally {
      setIsReviewing(false);
    }
  };

  // Run Deep Analysis on demand for current position
  useEffect(() => {
    let active = true;
    if (!deepAnalysisEnabled) {
      setDeepEngineInfo(null);
      return;
    }

    async function analyzeCurrentPosition() {
      setIsDeepSearching(true);
      const engine = getEngineInstance();
      try {
        const info = await engine.evaluatePosition(
          fen,
          ENGINE_CONFIG.deepAnalysis,
          (progressInfo) => {
            if (active) setDeepEngineInfo(progressInfo);
          }
        );
        if (active) {
          setDeepEngineInfo(info);
        }
      } catch (err) {
        console.warn('Deep analysis error:', err);
      } finally {
        if (active) setIsDeepSearching(false);
      }
    }

    analyzeCurrentPosition();

    return () => {
      active = false;
    };
  }, [fen, deepAnalysisEnabled]);

  // Update arrows based on current ply classification & best move
  useEffect(() => {
    const newArrows = [];
    const currentClassification = reviewData?.moveClassifications?.find(
      (m) => m.ply === currentPly
    );

    // If fast review has best move recorded
    if (currentClassification?.bestMoveUci) {
      const best = currentClassification.bestMoveUci;
      const from = best.substring(0, 2);
      const to = best.substring(2, 4);
      newArrows.push([from, to, 'rgba(34, 197, 94, 0.8)']); // Emerald green best move arrow
    } else if (deepEngineInfo?.bestMove) {
      const best = deepEngineInfo.bestMove;
      const from = best.substring(0, 2);
      const to = best.substring(2, 4);
      newArrows.push([from, to, 'rgba(56, 189, 248, 0.85)']); // Cyan deep analysis arrow
    }

    setArrows(newArrows);
  }, [currentPly, reviewData, deepEngineInfo]);

  // Current move classification
  const currentClassification = reviewData?.moveClassifications?.find(
    (m) => m.ply === currentPly
  );

  // Score to display in EvalBar
  let activeScoreCp = 0;
  let activeIsMate = false;
  let activeMateIn = null;

  if (deepAnalysisEnabled && deepEngineInfo) {
    activeScoreCp = deepEngineInfo.scoreCp;
    activeIsMate = deepEngineInfo.isMate;
    activeMateIn = deepEngineInfo.mateIn;
  } else if (currentClassification) {
    activeScoreCp = currentClassification.evalWhiteView;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner / Game Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              {currentGame?.time_class?.toUpperCase() || 'GAME'}
            </span>
            <span className="text-xs text-slate-400">
              {currentGame?.played_at ? new Date(currentGame.played_at).toLocaleDateString() : 'Active Analysis'}
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">
            {currentGame?.white_username || 'White'} ({currentGame?.white_rating || '—'}) vs.{' '}
            {currentGame?.black_username || 'Black'} ({currentGame?.black_rating || '—'})
          </h1>
        </div>

        {/* Engine mode triggers */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDeepAnalysisEnabled(!deepAnalysisEnabled)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              deepAnalysisEnabled
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Deep Analysis {deepAnalysisEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={handleStartFastReview}
            disabled={isReviewing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isReviewing ? 'animate-spin' : ''}`} />
            <span>{isReviewing ? `Reviewing (${reviewProgress}%)...` : 'Run Game Review'}</span>
          </button>
        </div>
      </div>

      {/* Review Accuracy Summary Card */}
      {reviewData && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
              White Accuracy
            </span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {reviewData.accuracyWhite}%
            </span>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
              Black Accuracy
            </span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {reviewData.accuracyBlack}%
            </span>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
              Engine Version
            </span>
            <span className="text-sm font-semibold text-slate-200 truncate block mt-1">
              Stockfish 18 NNUE
            </span>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
              Key Moments
            </span>
            <span className="text-sm font-semibold text-slate-200 mt-1 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-cyan-400" />
              <span>
                {reviewData.moveClassifications.filter((m) =>
                  ['brilliant', 'great', 'blunder'].includes(m.classification)
                ).length}{' '}
                Critical Moves
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Main Board & Side Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Board & Eval Bar Container */}
        <div className="lg:col-span-8 flex flex-col sm:flex-row gap-3 items-center justify-center">
          {/* Vertical Stockfish Eval Bar */}
          <div className="hidden sm:block h-[440px] md:h-[500px]">
            <EvalBar
              scoreCp={activeScoreCp}
              isMate={activeIsMate}
              mateIn={activeMateIn}
              orientation={boardOrientation}
            />
          </div>

          {/* Chessboard View */}
          <div className="w-full max-w-[520px]">
            <ChessboardView
              position={fen}
              boardOrientation={boardOrientation}
              customArrows={arrows}
              lastMove={lastMove}
              isDraggable={false}
            />

            {/* Board Controls */}
            <div className="mt-3 flex items-center justify-between bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
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
                <span className="px-3 py-1 font-mono text-xs text-slate-300">
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

              <div className="text-xs text-slate-400 font-mono">
                {currentPly > 0 ? history[currentPly - 1]?.san : 'Start'}
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel: Move History & Telemetry */}
        <div className="lg:col-span-4 space-y-4">
          {/* Current Move Evaluation Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
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

                {currentClassification?.bestMoveUci && (
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="text-emerald-400 font-semibold">Engine Best Move:</span>
                    <span className="font-mono text-white font-bold">
                      {currentClassification.bestMoveUci}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Initial position before move 1.</p>
            )}

            {/* Deep Analysis Realtime Feed */}
            {deepAnalysisEnabled && (
              <div className="pt-2 border-t border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Deep Analysis (Depth 20)</span>
                  </span>
                  {isDeepSearching && <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />}
                </div>
                {deepEngineInfo ? (
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                    <div className="flex justify-between">
                      <span>Depth: {deepEngineInfo.depth}</span>
                      <span>
                        Eval:{' '}
                        {deepEngineInfo.isMate
                          ? `Mate in ${deepEngineInfo.mateIn}`
                          : `${(deepEngineInfo.scoreCp / 100).toFixed(2)}`}
                      </span>
                    </div>
                    {deepEngineInfo.pv?.length > 0 && (
                      <div className="text-slate-400 truncate">
                        Line: {deepEngineInfo.pv.slice(0, 5).join(' ')}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500 text-[11px]">Evaluating position...</p>
                )}
              </div>
            )}
          </div>

          {/* Move History Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>Game Move History</span>
              <span className="font-mono">{history.length} Plies</span>
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
                    className="grid grid-cols-12 gap-1 items-center py-1 px-2 rounded-lg hover:bg-slate-800/60 transition-colors text-slate-300"
                  >
                    {/* Move Number */}
                    <span className="col-span-2 text-slate-500 font-semibold">
                      {moveNumIdx + 1}.
                    </span>

                    {/* White Move */}
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

                    {/* Black Move */}
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
    </div>
  );
}
