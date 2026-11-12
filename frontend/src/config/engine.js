export const ENGINE_CONFIG = {
  version: 'Stockfish 18 NNUE (lite-wasm)',
  workerUrl: '/stockfish/stockfish.js',
  rating_adjustment_enabled: false,

  fastReview: {
    name: 'Fast Review',
    description: 'Quick game-wide scan for classifications & accuracy calculation',
    depth: 12,
    movetime: 250,
    multiPv: 3,
    hash: 32,
  },

  deepAnalysis: {
    name: 'Deep Analysis',
    description: 'Deep engine exploration on current board position',
    depth: 20,
    movetime: 2500,
    multiPv: 3,
    hash: 64,
  },
};

export const CLASSIFICATION_THRESHOLDS = {
  bestMaxEpl: 0.005,
  excellentMaxEpl: 0.02,
  goodMaxEpl: 0.05,
  inaccuracyMaxEpl: 0.10,
  mistakeMaxEpl: 0.20,

  brilliantMinSacrificeValue: 1.0,
  brilliantMinEpl: 0.015,
  brilliantMaxPreEvalAdvantage: 300,

  greatMinAdvantageSwingCp: 150,
  greatOnlyMoveCpMargin: 80,

  bookMaxPly: 20,
  bookAltMoveMaxGapCp: 25,
};

export const CLASSIFICATIONS = {
  BRILLIANT: {
    id: 'brilliant',
    label: 'Brilliant',
    symbol: '!!',
    color: '#1ba8c2',
    bg: 'bg-cyan-500/20 text-cyan-700 border-cyan-500/40',
    description: 'Best piece sacrifice that keeps the position sound',
  },
  GREAT: {
    id: 'great',
    label: 'Great',
    symbol: '!',
    color: '#5c8bb0',
    bg: 'bg-blue-500/20 text-blue-700 border-blue-500/40',
    description: 'Best critical move finding the only good continuation',
  },
  BEST: {
    id: 'best',
    label: 'Best',
    symbol: '*',
    color: '#95bb4a',
    bg: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/40',
    description: 'The top engine move',
  },
  EXCELLENT: {
    id: 'excellent',
    label: 'Excellent',
    symbol: '*',
    color: '#95bb4a',
    bg: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
    description: 'Nearly as good as the top engine move',
  },
  GOOD: {
    id: 'good',
    label: 'Good',
    symbol: '+',
    color: '#81b64c',
    bg: 'bg-lime-500/20 text-lime-700 border-lime-500/40',
    description: 'Solid move keeping position intact',
  },
  INACCURACY: {
    id: 'inaccuracy',
    label: 'Inaccuracy',
    symbol: '?!',
    color: '#f0c15c',
    bg: 'bg-amber-500/20 text-amber-700 border-amber-500/40',
    description: 'Sub-optimal move losing winning chance',
  },
  MISTAKE: {
    id: 'mistake',
    label: 'Mistake',
    symbol: '?',
    color: '#e58f2a',
    bg: 'bg-orange-500/20 text-orange-700 border-orange-500/40',
    description: 'Clearly weakens the position',
  },
  MISS: {
    id: 'miss',
    label: 'Miss',
    symbol: 'x',
    color: '#ea5252',
    bg: 'bg-red-500/20 text-red-700 border-red-500/40',
    description: 'Missed tactical opportunity or win',
  },
  BLUNDER: {
    id: 'blunder',
    label: 'Blunder',
    symbol: '??',
    color: '#ca3431',
    bg: 'bg-rose-500/20 text-rose-700 border-rose-500/40',
    description: 'Severe error compromising the game',
  },
  BOOK: {
    id: 'book',
    label: 'Book',
    symbol: 'Bk',
    color: '#a87954',
    bg: 'bg-stone-500/20 text-stone-700 border-stone-500/40',
    description: 'Established opening theory move',
  },
};

export const APP_CONFIG = {
  appName: 'ChessLogs',
  tagline: 'Coach-Student LMS & Chess Improvement Platform',
  chesscomOAuthEnabled: import.meta.env.VITE_CHESSCOM_OAUTH_ENABLED === 'true',
  chesscomPublicApiBase: 'https://api.chess.com/pub',
  verificationMethod: 'trusted',
};
