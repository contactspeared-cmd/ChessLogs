import React from 'react';
import { Copy, Check, FileText } from 'lucide-react';

interface MoveHistoryTreeProps {
  moves: string[]; // List of SAN moves, e.g. ["e4", "e5", "Nf3", "Nc6"]
  currentMoveIndex: number;
  onSelectMove: (index: number) => void;
  moveExplanations?: Record<number, string>;
  fen?: string;
  pgn?: string;
}

export default function MoveHistoryTree({
  moves,
  currentMoveIndex,
  onSelectMove,
  moveExplanations = {},
  fen,
  pgn,
}: MoveHistoryTreeProps) {
  const [copiedFen, setCopiedFen] = React.useState(false);
  const [copiedPgn, setCopiedPgn] = React.useState(false);

  // Group moves into pairs (turn number, white move, black move)
  const pairedMoves: { number: number; white: string; black?: string; whiteIndex: number; blackIndex?: number }[] = [];

  for (let i = 0; i < moves.length; i += 2) {
    pairedMoves.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i],
      whiteIndex: i + 1,
      black: moves[i + 1],
      blackIndex: i + 1 < moves.length ? i + 2 : undefined,
    });
  }

  const handleCopy = (text: string, type: 'fen' | 'pgn') => {
    navigator.clipboard.writeText(text);
    if (type === 'fen') {
      setCopiedFen(true);
      setTimeout(() => setCopiedFen(false), 2000);
    } else {
      setCopiedPgn(true);
      setTimeout(() => setCopiedPgn(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
          Notation History
        </span>
        <span className="text-xs text-gray-500 font-medium">
          {moves.length} {moves.length === 1 ? 'ply' : 'plies'}
        </span>
      </div>

      {/* Move list body */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-sm space-y-1 max-h-[320px]">
        {pairedMoves.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-8 font-sans">
            No moves yet. Make a move on the board to begin.
          </div>
        ) : (
          pairedMoves.map((pair) => {
            const isWhiteActive = currentMoveIndex === pair.whiteIndex;
            const isBlackActive = currentMoveIndex === pair.blackIndex;
            const whiteNote = moveExplanations[pair.whiteIndex];
            const blackNote = pair.blackIndex ? moveExplanations[pair.blackIndex] : undefined;

            return (
              <div key={pair.number} className="space-y-1">
                <div className="grid grid-cols-12 items-center text-xs py-1 rounded hover:bg-gray-50 transition-colors">
                  <span className="col-span-2 text-gray-400 font-sans font-semibold text-right pr-2 select-none">
                    {pair.number}.
                  </span>

                  {/* White move */}
                  <div className="col-span-5 pr-1">
                    <button
                      onClick={() => onSelectMove(pair.whiteIndex)}
                      className={`w-full text-left px-2 py-1 rounded font-medium transition-all ${
                        isWhiteActive
                          ? 'bg-sjsfi-900 text-white font-bold shadow-xs'
                          : 'text-gray-800 hover:bg-sjsfi-100 hover:text-sjsfi-900'
                      }`}
                    >
                      {pair.white}
                    </button>
                  </div>

                  {/* Black move */}
                  <div className="col-span-5 pl-1">
                    {pair.black && (
                      <button
                        onClick={() => pair.blackIndex && onSelectMove(pair.blackIndex)}
                        className={`w-full text-left px-2 py-1 rounded font-medium transition-all ${
                          isBlackActive
                            ? 'bg-sjsfi-900 text-white font-bold shadow-xs'
                            : 'text-gray-800 hover:bg-sjsfi-100 hover:text-sjsfi-900'
                        }`}
                      >
                        {pair.black}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Coach Notes if this move has commentary */}
                {(whiteNote || blackNote) && (
                  <div className="font-sans text-xs bg-sjsfi-50 border-l-2 border-sjsfi-700 p-2 rounded-r my-1 text-sjsfi-950">
                    <div className="font-semibold text-sjsfi-900 text-[11px] flex items-center gap-1 mb-0.5">
                      <FileText className="w-3 h-3" />
                      Coach Note:
                    </div>
                    {whiteNote && <p className="mb-0.5">{whiteNote}</p>}
                    {blackNote && <p>{blackNote}</p>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Copy Tools */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs gap-2">
        {fen && (
          <button
            onClick={() => handleCopy(fen, 'fen')}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white border border-gray-200 hover:border-sjsfi-300 text-gray-700 hover:text-sjsfi-900 transition-colors"
          >
            {copiedFen ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedFen ? 'FEN Copied' : 'Copy FEN'}</span>
          </button>
        )}
        {pgn && (
          <button
            onClick={() => handleCopy(pgn, 'pgn')}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white border border-gray-200 hover:border-sjsfi-300 text-gray-700 hover:text-sjsfi-900 transition-colors"
          >
            {copiedPgn ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPgn ? 'PGN Copied' : 'Copy PGN'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
