/**
 * Engine configuration constants
 *
 * Configures the two review modes mirroring Chess.com's split:
 * - fastReview: lower depth/time budget for full-game classification pass
 * - deepAnalysis: higher depth/time budget for deep exploration on a single position
 *
 * NOTE: Evaluations closely approximate Chess.com review metrics but will not be
 * byte-for-byte identical due to proprietary Chess.com cloud cluster tuning, private
 * NNUE evaluations, and book lookups.
 */

export const ENGINE_CONFIG = {
  version: 'Stockfish 18 NNUE (lite-wasm)',
  workerUrl: '/stockfish/stockfish.js',

  fastReview: {
    name: 'Fast Review',
    description: 'Quick game-wide scan for classifications & accuracy calculation',
    depth: 12,
    movetime: 250, // ms limit per move
    multiPv: 2, // allows checking if a move is the "only good move"
    hash: 32, // MB
  },

  deepAnalysis: {
    name: 'Deep Analysis',
    description: 'Deep engine exploration on current board position',
    depth: 20,
    movetime: 2500, // ms limit
    multiPv: 3,
    hash: 64, // MB
  },
};

export const CLASSIFICATIONS = {
  BRILLIANT: {
    id: 'brilliant',
    label: 'Brilliant',
    symbol: '!!',
    color: '#1ba8c2',
    bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    description: 'Sacrificed material to gain or maintain a decisive tactical edge',
  },
  GREAT: {
    id: 'great',
    label: 'Great',
    symbol: '!',
    color: '#5c8bb0',
    bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    description: 'The only good move in a sharp or difficult position',
  },
  BEST: {
    id: 'best',
    label: 'Best',
    symbol: '★',
    color: '#95bb4a',
    bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'The top engine move',
  },
  GOOD: {
    id: 'good',
    label: 'Good',
    symbol: '✓',
    color: '#81b64c',
    bg: 'bg-lime-500/20 text-lime-300 border-lime-500/40',
    description: 'A solid move that maintains your position',
  },
  INACCURACY: {
    id: 'inaccuracy',
    label: 'Inaccuracy',
    symbol: '?!',
    color: '#f0c15c',
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'Slightly sub-optimal, giving up a minor advantage',
  },
  MISTAKE: {
    id: 'mistake',
    label: 'Mistake',
    symbol: '?',
    color: '#e58f2a',
    bg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    description: 'A bad move that weakens your position noticeably',
  },
  BLUNDER: {
    id: 'blunder',
    label: 'Blunder',
    symbol: '??',
    color: '#ca3431',
    bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    description: 'A severe mistake that throws away an advantage or loses material',
  },
  BOOK: {
    id: 'book',
    label: 'Book',
    symbol: '📖',
    color: '#a87954',
    bg: 'bg-stone-500/20 text-stone-300 border-stone-500/40',
    description: 'Standard opening book move',
  },
};

/**
 * Feature Flags and Integration Settings
 */
export const APP_CONFIG = {
  appName: 'ChessLogs',
  tagline: 'Coach-Student LMS & Chess Improvement Platform',
  // Constraint 1: Chess.com OAuth is partner-gated; set flag to true when partner access is granted
  chesscomOAuthEnabled: import.meta.env.VITE_CHESSCOM_OAUTH_ENABLED === 'true',
  chesscomPublicApiBase: 'https://api.chess.com/pub',
  // Verification method: trusted or bio check
  verificationMethod: 'trusted', // 'trusted' | 'bio_code'
};
