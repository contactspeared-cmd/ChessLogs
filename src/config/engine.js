/**
 * Engine configuration constants
 *
 * Configures the two review modes mirroring Chess.com's split:
 * - fastReview: lower depth/time budget for full-game classification pass
 * - deepAnalysis: higher depth/time budget for deep exploration on a single position
 *
 * Move labels use Chess.com Classification V2–style Expected Points Lost,
 * plus strict gates for Brilliant / Great / Book. Results approximate Chess.com
 * review but will not match byte-for-byte (no rating-adjusted EP model, private
 * NNUE cluster, or opening-book database).
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

/**
 * Strict move-classification thresholds (Chess.com Classification V2–style).
 * Primary buckets use Expected Points Lost (EPL = win% drop / 100).
 * Brilliant / Great / Book use additional hard gates so they stay rare.
 */
export const CLASSIFICATION_THRESHOLDS = {
  // Expected points lost (0–1). Matches Chess.com V2 cutoffs; we fold
  // "Excellent" (0–0.02) into Best since we have no separate Excellent label.
  bestMaxEpl: 0.005,
  excellentMaxEpl: 0.02,
  goodMaxEpl: 0.05,
  inaccuracyMaxEpl: 0.10,
  mistakeMaxEpl: 0.20,
  // Blunder: EPL > 0.20

  // Brilliant: best/near-best piece sacrifice that isn't already a cakewalk
  brilliantMaxEpl: 0.02,
  brilliantMinEvalAfter: -50, // not clearly worse after the sac
  brilliantMaxEvalBefore: 250, // not already decisively winning (~+2.5)
  brilliantMinNetSacrifice: 2, // at least ~2 pawns of material offered

  // Great: only-move or critical evaluation swing
  greatMaxEpl: 0.02,
  onlyMoveGapCp: 200, // 2nd engine line must be clearly worse
  greatLosingCp: -150,
  greatEqualizedCp: -50,
  greatEqualAbsCp: 100,
  greatWinningCp: 200,

  // Book: engine-approved opening sequence only (no blind first-N-plies)
  bookMaxPly: 16, // first 8 full moves
  bookMaxAbsEvalCp: 150, // leave book if position is already lopsided
  bookAltMoveMaxGapCp: 25, // MultiPV #2 counts as book only if nearly equal to #1
};

export const CLASSIFICATIONS = {
  BRILLIANT: {
    id: 'brilliant',
    label: 'Brilliant',
    symbol: '!!',
    color: '#1ba8c2',
    bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    description:
      'Best/near-best piece sacrifice that keeps the position sound without already being winning',
  },
  GREAT: {
    id: 'great',
    label: 'Great',
    symbol: '!',
    color: '#5c8bb0',
    bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    description:
      'Best/near-best critical move: the only good option, or a swing from losing↔equal or equal↔winning',
  },
  BEST: {
    id: 'best',
    label: 'Best',
    symbol: '★',
    color: '#95bb4a',
    bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'The top engine move, or within ~2 expected points of it',
  },
  GOOD: {
    id: 'good',
    label: 'Good',
    symbol: '✓',
    color: '#81b64c',
    bg: 'bg-lime-500/20 text-lime-300 border-lime-500/40',
    description: 'Solid move that loses at most ~5 expected points',
  },
  INACCURACY: {
    id: 'inaccuracy',
    label: 'Inaccuracy',
    symbol: '?!',
    color: '#f0c15c',
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'Sub-optimal: loses about 5–10 expected points',
  },
  MISTAKE: {
    id: 'mistake',
    label: 'Mistake',
    symbol: '?',
    color: '#e58f2a',
    bg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    description: 'Clearly weakens the position: loses about 10–20 expected points',
  },
  BLUNDER: {
    id: 'blunder',
    label: 'Blunder',
    symbol: '??',
    color: '#ca3431',
    bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    description: 'Severe error: loses more than 20 expected points',
  },
  BOOK: {
    id: 'book',
    label: 'Book',
    symbol: '📖',
    color: '#a87954',
    bg: 'bg-stone-500/20 text-stone-300 border-stone-500/40',
    description: 'Engine-approved opening move while both sides remain in book',
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
