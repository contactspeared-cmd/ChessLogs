import { Chess } from 'chess.js';
import { EngineAnalysisResult } from './types';

// Piece-square tables for positional evaluation
const PAWN_PST = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_PST = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_PST = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_PST = [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_PST = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_MID_PST = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20
];

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

function getPSTValue(type: string, color: 'w' | 'b', r: number, c: number): number {
  const index = color === 'w' ? r * 8 + c : (7 - r) * 8 + c;
  switch (type) {
    case 'p': return PAWN_PST[index];
    case 'n': return KNIGHT_PST[index];
    case 'b': return BISHOP_PST[index];
    case 'r': return ROOK_PST[index];
    case 'q': return QUEEN_PST[index];
    case 'k': return KING_MID_PST[index];
    default: return 0;
  }
}

/**
 * Static position evaluation in centipawns from White's perspective (+ = White better, - = Black better)
 */
export function evaluatePositionStatic(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -10000 : 10000;
  }
  if (chess.isDraw()) {
    return 0;
  }

  let evalScore = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const baseVal = PIECE_VALUES[piece.type] || 0;
      const pstVal = getPSTValue(piece.type, piece.color, r, c);
      const total = baseVal + pstVal;

      if (piece.color === 'w') {
        evalScore += total;
      } else {
        evalScore -= total;
      }
    }
  }

  // Small bonus for bishop pair
  // Small bonus for mobility
  const moves = chess.moves();
  const mobility = (chess.turn() === 'w' ? 1 : -1) * moves.length * 4;
  evalScore += mobility;

  return evalScore;
}

/**
 * Minimax with Alpha-Beta Pruning for chess analysis
 */
export function analyzePosition(
  fen: string,
  depth: number = 3
): EngineAnalysisResult {
  const chess = new Chess(fen);

  if (chess.isCheckmate()) {
    return {
      score: chess.turn() === 'w' ? -10000 : 10000,
      depth,
      bestMove: '',
      pv: [],
      isEvaluating: false,
    };
  }

  if (chess.isDraw()) {
    return {
      score: 0,
      depth,
      bestMove: '',
      pv: [],
      isEvaluating: false,
    };
  }

  const isWhite = chess.turn() === 'w';
  const legalMoves = chess.moves({ verbose: true });
  
  if (legalMoves.length === 0) {
    return {
      score: 0,
      depth,
      bestMove: '',
      pv: [],
      isEvaluating: false,
    };
  }

  let bestMove = legalMoves[0].san;
  let bestScore = isWhite ? -Infinity : Infinity;
  let bestPv: string[] = [bestMove];

  // Alpha-beta search
  let alpha = -Infinity;
  let beta = Infinity;

  // Move ordering: captures first
  const sortedMoves = [...legalMoves].sort((a, b) => {
    const aCap = a.captured ? 10 : 0;
    const bCap = b.captured ? 10 : 0;
    return bCap - aCap;
  });

  for (const move of sortedMoves) {
    chess.move(move);
    const score = minimax(chess, depth - 1, alpha, beta, !isWhite);
    chess.undo();

    if (isWhite) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = move.san;
        bestPv = [move.san];
      }
      alpha = Math.max(alpha, bestScore);
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = move.san;
        bestPv = [move.san];
      }
      beta = Math.min(beta, bestScore);
    }

    if (beta <= alpha) break;
  }

  return {
    score: Math.round(bestScore),
    depth,
    bestMove,
    pv: bestPv,
    isEvaluating: false,
  };
}

function minimax(chess: Chess, depth: number, alpha: number, beta: number, isMaximizing: boolean): number {
  if (depth === 0 || chess.isGameOver()) {
    return evaluatePositionStatic(chess);
  }

  const moves = chess.moves({ verbose: true });

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const evaluation = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const evaluation = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

/**
 * Classify a move given the score before and after
 */
export function classifyMove(
  evalBefore: number,
  evalAfter: number,
  turn: 'w' | 'b'
): { classification: 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'; diff: number } {
  // eval is from white's perspective
  const diff = turn === 'w' ? evalBefore - evalAfter : evalAfter - evalBefore;

  if (diff <= 15) return { classification: 'best', diff };
  if (diff <= 40) return { classification: 'excellent', diff };
  if (diff <= 90) return { classification: 'good', diff };
  if (diff <= 180) return { classification: 'inaccuracy', diff };
  if (diff <= 300) return { classification: 'mistake', diff };
  return { classification: 'blunder', diff };
}

/**
 * Format evaluation number into display string like "+1.2", "-0.8", "M3"
 */
export function formatEvalScore(score: number, mate?: number): string {
  if (mate !== undefined && mate !== 0) {
    return `M${Math.abs(mate)}`;
  }
  if (score >= 9000) return '+M';
  if (score <= -9000) return '-M';
  const val = (score / 100).toFixed(1);
  return score > 0 ? `+${val}` : val;
}
