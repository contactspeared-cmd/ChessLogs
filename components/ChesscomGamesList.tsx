'use client';

import React from 'react';
import Link from 'next/link';
import { ChessGame } from '@/lib/types';
import { formatDate, getResultBadge } from '@/lib/utils';
import { ExternalLink, Cpu, Clock, ShieldCheck, Zap, Flame, Award } from 'lucide-react';

interface ChesscomGamesListProps {
  games: ChessGame[];
  targetUsername?: string;
  loading?: boolean;
  onSelectGameForAnalysis?: (game: ChessGame) => void;
}

export default function ChesscomGamesList({
  games,
  targetUsername,
  loading = false,
  onSelectGameForAnalysis,
}: ChesscomGamesListProps) {
  if (loading) {
    return (
      <div className="space-y-3 py-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 bg-white rounded-xl border border-gray-100 shadow-xs animate-pulse flex items-center justify-between"
          >
            <div className="space-y-2">
              <div className="h-4 w-40 bg-gray-200 rounded"></div>
              <div className="h-3 w-28 bg-gray-100 rounded"></div>
            </div>
            <div className="h-8 w-24 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 p-8">
        <p className="text-gray-500 text-sm">No recent games found for this student.</p>
        <p className="text-xs text-gray-400 mt-1">Make sure the Chess.com username is active and public.</p>
      </div>
    );
  }

  const getTimeClassIcon = (timeClass: string) => {
    switch (timeClass) {
      case 'bullet':
        return <Flame className="w-3.5 h-3.5 text-red-500" />;
      case 'blitz':
        return <Zap className="w-3.5 h-3.5 text-amber-500" />;
      case 'rapid':
        return <Clock className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-3">
      {games.map((game) => {
        const isStudentWhite =
          targetUsername && game.white.username.toLowerCase() === targetUsername.toLowerCase();
        const student = isStudentWhite ? game.white : game.black;
        const opponent = isStudentWhite ? game.black : game.white;
        const resultInfo = getResultBadge(student.result, !!isStudentWhite);

        return (
          <div
            key={game.id}
            className="p-4 bg-white rounded-xl border border-gray-200/80 hover:border-sjsfi-300 hover:shadow-card transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
          >
            {/* Game Info & Players */}
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {/* Time Class Badge */}
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">
                  {getTimeClassIcon(game.time_class)}
                  {game.time_class} ({game.time_control})
                </span>

                {/* Outcome Badge */}
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${resultInfo.color}`}
                >
                  {resultInfo.text}
                </span>

                {/* Coach Reviewed Tag */}
                {game.coachReviewed && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sjsfi-100 text-sjsfi-900 border border-sjsfi-200">
                    <ShieldCheck className="w-3 h-3 text-sjsfi-800" />
                    Coach Reviewed
                  </span>
                )}

                <span className="text-xs text-gray-400 font-medium">
                  {formatDate(game.end_time)}
                </span>
              </div>

              {/* Matchup row */}
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-white border border-gray-400 inline-block shadow-xs" />
                  <span
                    className={`font-semibold ${
                      isStudentWhite ? 'text-sjsfi-900 underline decoration-sjsfi-300' : 'text-gray-800'
                    }`}
                  >
                    {game.white.username}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">({game.white.rating})</span>
                </div>

                <span className="text-xs font-bold text-gray-400 uppercase">vs</span>

                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-gray-900 inline-block shadow-xs" />
                  <span
                    className={`font-semibold ${
                      !isStudentWhite ? 'text-sjsfi-900 underline decoration-sjsfi-300' : 'text-gray-800'
                    }`}
                  >
                    {game.black.username}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">({game.black.rating})</span>
                </div>
              </div>

              {/* Opening and Accuracy */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                {game.opening && (
                  <span className="font-medium text-gray-600 truncate max-w-sm">
                    {game.opening}
                  </span>
                )}

                {game.accuracies && (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    <Award className="w-3 h-3 text-emerald-600" />
                    Accuracy: {isStudentWhite ? game.accuracies.white : game.accuracies.black}%
                  </span>
                )}
              </div>

              {/* Coach note snippet */}
              {game.coachNotes && (
                <div className="text-xs bg-sjsfi-50 text-sjsfi-950 p-2 rounded-lg border-l-2 border-sjsfi-700 italic">
                  "{game.coachNotes}"
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Analyze button */}
              {onSelectGameForAnalysis ? (
                <button
                  onClick={() => onSelectGameForAnalysis(game)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-sjsfi-900 hover:bg-sjsfi-800 text-white transition-all shadow-xs"
                >
                  <Cpu className="w-3.5 h-3.5 text-sjsfi-gold" />
                  <span>Analyze Game</span>
                </button>
              ) : (
                <Link
                  href={`/analysis?gameId=${game.id}&pgn=${encodeURIComponent(game.pgn)}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-sjsfi-900 hover:bg-sjsfi-800 text-white transition-all shadow-xs"
                >
                  <Cpu className="w-3.5 h-3.5 text-sjsfi-gold" />
                  <span>Analyze Game</span>
                </Link>
              )}

              {/* External Chess.com Link */}
              {game.url && game.url !== '#' && (
                <a
                  href={game.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-800 transition-colors"
                  title="View on Chess.com"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
