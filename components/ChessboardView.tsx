'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess, Square, Move } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Play, RotateCcw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Volume2, VolumeX } from 'lucide-react';

interface ChessboardViewProps {
  game: Chess;
  onMove?: (move: { from: string; to: string; promotion?: string; san: string }) => void;
  orientation?: 'white' | 'black';
  onFlip?: () => void;
  bestMove?: string;
  allowMoves?: boolean;
  onReset?: () => void;
  onNavigateMove?: (index: number) => void;
  currentMoveIndex?: number;
  totalMoves?: number;
}

// Synthesized Chess Sound Effects using Web Audio API
class ChessSoundPlayer {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playMove() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {}
  }

  playCapture() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {}
  }

  playCheck() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch (e) {}
  }
}

const sounds = new ChessSoundPlayer();

export default function ChessboardView({
  game,
  onMove,
  orientation = 'white',
  onFlip,
  bestMove,
  allowMoves = true,
  onReset,
  onNavigateMove,
  currentMoveIndex = 0,
  totalMoves = 0,
}: ChessboardViewProps) {
  const [soundMuted, setSoundMuted] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [customArrows, setCustomArrows] = useState<[Square, Square][]>([]);

  // Update best move arrow whenever bestMove changes
  useEffect(() => {
    if (bestMove && bestMove.length >= 4) {
      const from = bestMove.slice(0, 2) as Square;
      const to = bestMove.slice(2, 4) as Square;
      setCustomArrows([[from, to]]);
    } else {
      setCustomArrows([]);
    }
  }, [bestMove]);

  // Handle piece click to show possible moves
  const onSquareClick = (square: Square) => {
    if (!allowMoves) return;

    // If square already selected and we click a target
    if (selectedSquare) {
      const move = game.moves({ verbose: true }).find(
        (m) => m.from === selectedSquare && m.to === square
      );

      if (move) {
        makeMove(selectedSquare, square);
        setSelectedSquare(null);
        setPossibleMoves([]);
        return;
      }
    }

    // Otherwise select square
    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true }).map((m) => m.to as Square);
      setPossibleMoves(moves);
    } else {
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  };

  const makeMove = (sourceSquare: Square, targetSquare: Square, piece?: string) => {
    try {
      const isPromotion =
        (sourceSquare[1] === '7' && targetSquare[1] === '8') ||
        (sourceSquare[1] === '2' && targetSquare[1] === '1');

      const moveObj: any = {
        from: sourceSquare,
        to: targetSquare,
      };

      if (isPromotion) {
        moveObj.promotion = 'q';
      }

      const moveResult = game.move(moveObj);
      if (moveResult) {
        // Play sound
        if (game.isCheck()) {
          sounds.playCheck();
        } else if (moveResult.captured) {
          sounds.playCapture();
        } else {
          sounds.playMove();
        }

        if (onMove) {
          onMove({
            from: sourceSquare,
            to: targetSquare,
            promotion: moveObj.promotion,
            san: moveResult.san,
          });
        }
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  };

  const onPieceDrop = (sourceSquare: Square, targetSquare: Square, piece: string) => {
    if (!allowMoves) return false;
    const success = makeMove(sourceSquare, targetSquare, piece);
    setSelectedSquare(null);
    setPossibleMoves([]);
    return success;
  };

  // Custom square styles for highlights & dots
  const customSquareStyles: Record<string, React.CSSProperties> = {};
  if (selectedSquare) {
    customSquareStyles[selectedSquare] = {
      backgroundColor: 'rgba(212, 175, 55, 0.45)', // SJSFI Gold accent
    };
  }
  possibleMoves.forEach((sq) => {
    const isOccupied = !!game.get(sq);
    customSquareStyles[sq] = {
      background: isOccupied
        ? 'radial-gradient(circle, transparent 65%, rgba(11, 83, 46, 0.5) 70%)'
        : 'radial-gradient(circle, rgba(11, 83, 46, 0.4) 25%, transparent 30%)',
      borderRadius: '50%',
    };
  });

  return (
    <div className="flex flex-col items-center w-full max-w-[560px] mx-auto select-none">
      {/* Top Controls Bar */}
      <div className="w-full flex items-center justify-between pb-2 text-xs font-semibold text-gray-500">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 text-gray-700">
            <span
              className={`w-2.5 h-2.5 rounded-full border border-gray-400 ${
                game.turn() === 'w' ? 'bg-white' : 'bg-gray-900'
              }`}
            />
            {game.turn() === 'w' ? "White's turn" : "Black's turn"}
          </span>
          {game.isCheck() && (
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold animate-pulse">
              CHECK
            </span>
          )}
          {game.isCheckmate() && (
            <span className="px-2 py-0.5 rounded bg-red-600 text-white font-bold">
              CHECKMATE
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const nextState = !soundMuted;
              setSoundMuted(nextState);
              sounds.enabled = !nextState;
            }}
            title={soundMuted ? 'Unmute chess sounds' : 'Mute chess sounds'}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          {onFlip && (
            <button
              onClick={onFlip}
              title="Flip Board"
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Flip</span>
            </button>
          )}
        </div>
      </div>

      {/* Chessboard Container styled with SJSFI green border */}
      <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-card border-4 border-sjsfi-900/90 bg-white relative">
        <Chessboard
          position={game.fen()}
          onPieceDrop={onPieceDrop}
          onSquareClick={onSquareClick}
          boardOrientation={orientation}
          customBoardStyle={{
            borderRadius: '12px',
          }}
          customDarkSquareStyle={{
            backgroundColor: '#0B532E', // Official SJSFI Forest Green
          }}
          customLightSquareStyle={{
            backgroundColor: '#f1f8f3', // Crisp clean mint-white
          }}
          customSquareStyles={customSquareStyles}
          customArrows={customArrows}
          customArrowColor="#D4AF37" // SJSFI Gold
          animationDuration={200}
        />
      </div>

      {/* Navigation Controls */}
      {onNavigateMove && (
        <div className="w-full flex items-center justify-between mt-3 bg-white p-2 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onNavigateMove(0)}
              disabled={currentMoveIndex === 0}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
              title="First move"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigateMove(Math.max(0, currentMoveIndex - 1))}
              disabled={currentMoveIndex === 0}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
              title="Previous move"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs font-semibold text-gray-700">
            Move {currentMoveIndex} of {totalMoves}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onNavigateMove(Math.min(totalMoves, currentMoveIndex + 1))}
              disabled={currentMoveIndex >= totalMoves}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
              title="Next move"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigateMove(totalMoves)}
              disabled={currentMoveIndex >= totalMoves}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
              title="Last move"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
