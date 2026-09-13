'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { Chess } from 'chess.js';
import ChessboardView from '@/components/ChessboardView';
import EngineEvalBar from '@/components/EngineEvalBar';
import MoveHistoryTree from '@/components/MoveHistoryTree';
import { analyzePosition, formatEvalScore } from '@/lib/engine';
import { getStoredUser, updateGameCoachNotes } from '@/lib/store';
import { COACH_ADMIN } from '@/lib/initialData';
import { User, EngineAnalysisResult } from '@/lib/types';
import {
  Cpu,
  RotateCcw,
  Upload,
  Save,
  MessageSquare,
  Sparkles,
  Sliders,
  Check,
  Award,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Info,
} from 'lucide-react';

export default function AnalysisPage() {
  const searchParams = useSearchParams();
  const gameIdParam = searchParams.get('gameId');
  const pgnParam = searchParams.get('pgn');

  const [currentUser, setCurrentUser] = useState<User>(COACH_ADMIN);
  const [game, setGame] = useState<Chess>(new Chess());
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);

  // Engine state
  const [engineDepth, setEngineDepth] = useState<number>(3);
  const [analysisResult, setAnalysisResult] = useState<EngineAnalysisResult>({
    score: 0,
    depth: 3,
    bestMove: '',
    pv: [],
    isEvaluating: false,
  });
  const [isPending, startTransition] = useTransition();

  // PGN / FEN Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [importError, setImportError] = useState('');

  // Coach Annotation
  const [coachNote, setCoachNote] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setCurrentUser(getStoredUser());

    // Check if initial PGN passed via query string
    if (pgnParam) {
      try {
        const decodedPgn = decodeURIComponent(pgnParam);
        loadNewPgn(decodedPgn);
      } catch (e) {
        console.error(e);
      }
    }
  }, [pgnParam]);

  // Run engine analysis whenever the current position changes
  const runEvaluation = useCallback((currentFen: string, depth: number) => {
    startTransition(() => {
      try {
        const result = analyzePosition(currentFen, depth);
        setAnalysisResult(result);
      } catch (e) {
        console.error('Engine error:', e);
      }
    });
  }, []);

  useEffect(() => {
    runEvaluation(game.fen(), engineDepth);
  }, [game, engineDepth, runEvaluation]);

  const loadNewPgn = (pgnString: string) => {
    try {
      const newGame = new Chess();
      newGame.loadPgn(pgnString);
      const moves = newGame.history();
      setMoveHistory(moves);
      setGame(newGame);
      setCurrentMoveIndex(moves.length);
      setShowImportModal(false);
      setImportInput('');
      setImportError('');
    } catch (e: any) {
      setImportError('Invalid PGN format. Please check the text.');
    }
  };

  const loadNewFen = (fenString: string) => {
    try {
      const newGame = new Chess(fenString);
      setGame(newGame);
      setMoveHistory([]);
      setCurrentMoveIndex(0);
      setShowImportModal(false);
      setImportInput('');
      setImportError('');
    } catch (e: any) {
      setImportError('Invalid FEN position string.');
    }
  };

  const handleBoardMove = (move: { from: string; to: string; promotion?: string; san: string }) => {
    const updatedHistory = [...moveHistory.slice(0, currentMoveIndex), move.san];
    setMoveHistory(updatedHistory);
    setCurrentMoveIndex(updatedHistory.length);
    // Force rerender
    const nextGame = new Chess(game.fen());
    setGame(nextGame);
  };

  const handleNavigateMove = (targetIndex: number) => {
    const newGame = new Chess();
    for (let i = 0; i < targetIndex; i++) {
      if (moveHistory[i]) {
        newGame.move(moveHistory[i]);
      }
    }
    setGame(newGame);
    setCurrentMoveIndex(targetIndex);
  };

  const handleResetBoard = () => {
    const newGame = new Chess();
    setGame(newGame);
    setMoveHistory([]);
    setCurrentMoveIndex(0);
  };

  const handleSaveCoachNote = () => {
    if (gameIdParam && coachNote.trim()) {
      updateGameCoachNotes(gameIdParam, coachNote.trim());
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const isCoach = currentUser.role === 'coach';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-sjsfi-100 text-sjsfi-900 border border-sjsfi-200 flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-sjsfi-800" />
              SJSFI Engine Analyzer
            </span>
            <span className="text-xs text-gray-500 font-medium">
              Depth: {engineDepth} • Score: {formatEvalScore(analysisResult.score, analysisResult.mate)}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">
            Interactive Analysis & Evaluation Board
          </h1>
        </div>

        {/* Top Control Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 hover:border-sjsfi-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-sjsfi-900" />
            <span>Load PGN / FEN</span>
          </button>

          <button
            onClick={handleResetBoard}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors shadow-xs"
            title="Reset to starting position"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Board</span>
          </button>
        </div>
      </div>

      {/* Main Analysis Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Evaluation Bar (1 col on lg) */}
        <div className="hidden lg:flex lg:col-span-1 justify-center h-[560px]">
          <EngineEvalBar
            score={analysisResult.score}
            mate={analysisResult.mate}
            isEvaluating={isPending}
            orientation={orientation}
          />
        </div>

        {/* Center: Chessboard (7 cols on lg) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-xs space-y-4">
          <ChessboardView
            game={game}
            onMove={handleBoardMove}
            orientation={orientation}
            onFlip={() => setOrientation(orientation === 'white' ? 'black' : 'white')}
            bestMove={analysisResult.bestMove}
            allowMoves={true}
            onNavigateMove={handleNavigateMove}
            currentMoveIndex={currentMoveIndex}
            totalMoves={moveHistory.length}
          />

          {/* Engine Real-time Recommendation Strip */}
          <div className="bg-sjsfi-50/70 border border-sjsfi-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-sjsfi-900 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-sjsfi-gold" />
              </div>
              <div>
                <span className="font-bold text-sjsfi-950 mr-1.5">Best Move Suggestion:</span>
                <span className="font-mono font-bold text-sjsfi-900 px-2 py-0.5 bg-white rounded border border-sjsfi-200 text-sm">
                  {analysisResult.bestMove || 'Analyzing...'}
                </span>
              </div>
            </div>

            {/* Depth selector */}
            <div className="flex items-center gap-2 text-gray-600">
              <span className="font-medium text-[11px]">Engine Depth:</span>
              <select
                value={engineDepth}
                onChange={(e) => setEngineDepth(parseInt(e.target.value, 10))}
                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-sjsfi-600"
              >
                <option value={3}>Depth 3 (Fast)</option>
                <option value={4}>Depth 4 (Standard)</option>
                <option value={5}>Depth 5 (Deep)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right: Notation & Coaching Notes (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Notation Tree */}
          <div className="h-[360px]">
            <MoveHistoryTree
              moves={moveHistory}
              currentMoveIndex={currentMoveIndex}
              onSelectMove={handleNavigateMove}
              pgn={game.pgn()}
              fen={game.fen()}
            />
          </div>

          {/* Coach Annotation & Feedback Panel */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sjsfi-900" />
                <span className="text-xs font-bold text-gray-900">
                  {isCoach ? 'Coach Feedback & Lesson Notes' : "Coach's Notes & Advice"}
                </span>
              </div>
              {isCoach && (
                <span className="text-[10px] font-bold text-sjsfi-900 bg-sjsfi-100 px-2 py-0.5 rounded">
                  Admin Editing
                </span>
              )}
            </div>

            {isCoach ? (
              <div className="space-y-2">
                <textarea
                  value={coachNote}
                  onChange={(e) => setCoachNote(e.target.value)}
                  placeholder="Add your coaching observations, key mistakes, tactical weaknesses, or opening advice for the student..."
                  className="w-full h-24 p-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sjsfi-600 text-gray-800 bg-gray-50/50 resize-none"
                />
                <button
                  onClick={handleSaveCoachNote}
                  className="w-full py-2 bg-sjsfi-900 hover:bg-sjsfi-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Saved Successfully!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 text-sjsfi-gold" />
                      <span>Save Review Note</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-3 bg-sjsfi-50 rounded-xl border border-sjsfi-100 text-xs text-sjsfi-950 space-y-1">
                <p className="font-semibold text-sjsfi-900">Coach's Guidance for this Position:</p>
                <p className="italic text-gray-700">
                  {coachNote ||
                    'Review tactical imbalances and piece coordination. Pay close attention to open files and uncastled king vulnerability.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Load PGN / FEN Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Load Game PGN or Board FEN</h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportError('');
                }}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Paste standard PGN notation from Chess.com / Lichess, or an exact FEN string to populate the board and run engine evaluation.
            </p>

            <textarea
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              placeholder="Paste PGN (e.g. 1. e4 e5 2. Nf3...) or FEN (e.g. rnbqkbnr/pppppppp/8/...)"
              className="w-full h-36 p-3 text-xs font-mono border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sjsfi-600 bg-gray-50"
            />

            {importError && (
              <div className="text-xs text-red-600 font-medium">{importError}</div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportError('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 hover:bg-gray-50 text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const trimmed = importInput.trim();
                  if (trimmed.includes('/') && trimmed.split(' ').length <= 6) {
                    loadNewFen(trimmed);
                  } else {
                    loadNewPgn(trimmed);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-sjsfi-900 text-white hover:bg-sjsfi-800 shadow-sm"
              >
                Load into Board
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
