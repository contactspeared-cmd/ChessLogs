import React from 'react';
import { formatEvalScore } from '@/lib/engine';

interface EngineEvalBarProps {
  score: number; // in centipawns
  mate?: number;
  isEvaluating?: boolean;
  orientation?: 'white' | 'black';
}

export default function EngineEvalBar({
  score,
  mate,
  isEvaluating = false,
  orientation = 'white',
}: EngineEvalBarProps) {
  // Clamp score between -1000 and +1000 for display percentage calculation
  let clamped = Math.max(-1000, Math.min(1000, score));
  if (mate !== undefined && mate !== 0) {
    clamped = mate > 0 ? 1000 : -1000;
  }

  // Sigmoid-like transformation so that 0 is 50%, +300 is ~75%, +1000 is 95%
  // Formula: 50 + 50 * (2 / (1 + exp(-0.004 * score)) - 1)
  const whitePercent = Math.max(5, Math.min(95, 50 + (clamped / 20)));
  const displayPercent = orientation === 'white' ? whitePercent : 100 - whitePercent;

  const displayScore = formatEvalScore(score, mate);
  const isWhiteFavored = score >= 0;

  return (
    <div className="flex flex-col items-center select-none w-8 h-full min-h-[360px] bg-gray-900 rounded-lg overflow-hidden border border-gray-300 shadow-sm relative">
      {/* Black evaluation section (top) */}
      <div
        className="w-full bg-[#312e2b] transition-all duration-300 ease-out flex flex-col justify-start items-center pt-2"
        style={{ height: `${100 - displayPercent}%` }}
      >
        {!isWhiteFavored && (
          <span className="text-[11px] font-bold text-gray-200 tracking-tighter">
            {displayScore}
          </span>
        )}
      </div>

      {/* White evaluation section (bottom) */}
      <div
        className="w-full bg-white transition-all duration-300 ease-out flex flex-col justify-end items-center pb-2 border-t border-gray-400"
        style={{ height: `${displayPercent}%` }}
      >
        {isWhiteFavored && (
          <span className="text-[11px] font-bold text-gray-900 tracking-tighter">
            {displayScore}
          </span>
        )}
      </div>

      {/* Centered zero marker */}
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-red-400/50 pointer-events-none" />

      {/* Calculating pulse dot */}
      {isEvaluating && (
        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-sjsfi-400 animate-ping" />
      )}
    </div>
  );
}
