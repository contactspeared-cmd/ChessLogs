import { Chess } from 'chess.js';
import {
  ENGINE_CONFIG,
  CLASSIFICATIONS,
  CLASSIFICATION_THRESHOLDS as T,
} from '../config/engine';

/**
 * Converts a centipawn evaluation score to winning probability (0% - 100%)
 * based on standard CAPS / Lichess win probability model.
 */
export function cpToWinPercent(cp, isMate = false, mateIn = null) {
  if (isMate && mateIn !== null && mateIn !== undefined) {
    return mateIn > 0 ? 100 : 0;
  }
  if (typeof cp !== 'number') return 50;
  // Clip extreme centipawn values per A.1
  const clipped = Math.max(-1000, Math.min(1000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clipped)) - 1);
}

/**
 * Calculates CAPS-like single move accuracy percentage
 */
export function calculateMoveAccuracy(winProbBefore, winProbAfter) {
  const loss = Math.max(0, winProbBefore - winProbAfter);
  // CAPS exponential decay function
  const raw = 103.1668 * Math.exp(-0.04354 * loss) - 3.1669;
  return Math.max(0, Math.min(100, Math.round(raw * 10) / 10));
}

/**
 * Stockfish UCI Engine Wrapper using Web Worker
 */
export class StockfishEngine {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.readyCallbacks = [];
    this.currentSearchResolve = null;
    this.searchProgressCallback = null;
    this.initPromise = this.initWorker();
  }

  async initWorker() {
    if (typeof window === 'undefined') return;

    try {
      // Initialize Stockfish worker
      this.worker = new Worker(ENGINE_CONFIG.workerUrl);

      this.worker.onmessage = (event) => {
        const line = typeof event.data === 'string' ? event.data : '';
        this.handleMessage(line);
      };

      this.worker.onerror = (err) => {
        console.warn('Stockfish Worker encountered error, running with fallback evaluator:', err);
      };

      // Send initial UCI handshake
      this.send('uci');
      await this.waitForReady();
      this.isReady = true;
    } catch (e) {
      console.warn('Failed to start Stockfish Web Worker. Fallback evaluator will be used.', e);
      this.isReady = false;
    }
  }

  send(cmd) {
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  handleMessage(line) {
    // UCI handshake
    if (line === 'uciok') {
      this.send('setoption name Threads value 1');
      this.send('setoption name Hash value 32');
      this.send('isready');
    }

    if (line === 'readyok') {
      this.isReady = true;
      while (this.readyCallbacks.length > 0) {
        const cb = this.readyCallbacks.shift();
        cb();
      }
    }

    // Parse info line: "info depth 12 seldepth 16 multipv 1 score cp 45 nodes 12344 nps 450000 pv e2e4 e7e5 ..."
    if (line.startsWith('info ') && line.includes(' score ')) {
      const parsedInfo = this.parseInfoLine(line);
      if (parsedInfo && this.searchProgressCallback) {
        this.searchProgressCallback(parsedInfo);
      }
    }

    // Parse bestmove line: "bestmove e2e4 ponder e7e5"
    if (line.startsWith('bestmove ')) {
      const parts = line.split(' ');
      const bestMove = parts[1];
      if (this.currentSearchResolve) {
        const resolve = this.currentSearchResolve;
        this.currentSearchResolve = null;
        resolve(bestMove);
      }
    }
  }

  parseInfoLine(line) {
    const depthMatch = line.match(/\bdepth (\d+)/);
    const scoreCpMatch = line.match(/\bscore cp (-?\d+)/);
    const scoreMateMatch = line.match(/\bscore mate (-?\d+)/);
    const pvMatch = line.match(/\bpv (.+)$/);
    const multiPvMatch = line.match(/\bmultipv (\d+)/);

    let score = 0;
    let isMate = false;
    let mateIn = null;

    if (scoreMateMatch) {
      isMate = true;
      mateIn = parseInt(scoreMateMatch[1], 10);
      score = mateIn > 0 ? 10000 - mateIn * 100 : -10000 - mateIn * 100;
    } else if (scoreCpMatch) {
      score = parseInt(scoreCpMatch[1], 10);
    }

    const pv = pvMatch ? pvMatch[1].split(' ') : [];
    const bestMove = pv[0] || null;

    return {
      depth: depthMatch ? parseInt(depthMatch[1], 10) : 0,
      scoreCp: score,
      isMate,
      mateIn,
      pv,
      bestMove,
      multiPv: multiPvMatch ? parseInt(multiPvMatch[1], 10) : 1,
      raw: line,
    };
  }

  waitForReady() {
    if (this.isReady) return Promise.resolve();
    return new Promise((resolve) => {
      this.readyCallbacks.push(resolve);
      this.send('isready');
    });
  }

  stop() {
    this.send('stop');
  }

  /**
   * Evaluates a single position (FEN)
   * @param {string} fen
   * @param {Object} options { depth, movetime, multiPv }
   * @param {Function} [onProgress]
   */
  async evaluatePosition(fen, options = {}, onProgress = null) {
    await this.initPromise;

    const depth = options.depth || ENGINE_CONFIG.fastReview.depth;
    const movetime = options.movetime || ENGINE_CONFIG.fastReview.movetime;
    const multiPv = options.multiPv || 1;

    let latestInfo = {
      depth: 0,
      scoreCp: 0,
      isMate: false,
      mateIn: null,
      bestMove: null,
      pv: [],
      lines: [],
    };

    const multiPvLines = {};

    this.searchProgressCallback = (info) => {
      const lineIndex = info.multiPv || 1;
      multiPvLines[lineIndex] = info;
      const primary = multiPvLines[1] || info;
      latestInfo = {
        ...latestInfo,
        ...primary,
        lines: Object.keys(multiPvLines)
          .sort((a, b) => Number(a) - Number(b))
          .map((k) => multiPvLines[k]),
      };
      if (onProgress) onProgress(latestInfo);
    };

    // If worker is running, use it
    if (this.worker && this.isReady) {
      await this.waitForReady();

      this.send(`setoption name MultiPV value ${multiPv}`);
      this.send(`position fen ${fen}`);

      const searchPromise = new Promise((resolve) => {
        this.currentSearchResolve = resolve;
      });

      if (movetime) {
        this.send(`go depth ${depth} movetime ${movetime}`);
      } else {
        this.send(`go depth ${depth}`);
      }

      const bestMove = await searchPromise;
      return {
        ...latestInfo,
        bestMove: bestMove !== '(none)' ? bestMove : latestInfo.bestMove,
        fen,
      };
    }

    // Fallback: fast in-process heuristic evaluation
    return this.fallbackEvaluate(fen);
  }

  /**
   * Resilient fallback evaluator when WASM worker is not available
   */
  fallbackEvaluate(fen) {
    try {
      const chess = new Chess(fen);
      const moves = chess.moves({ verbose: true });
      if (moves.length === 0) {
        if (chess.isCheck()) {
          return { scoreCp: -9999, isMate: true, mateIn: 0, bestMove: null, depth: 1, pv: [] };
        }
        return { scoreCp: 0, isMate: false, mateIn: null, bestMove: null, depth: 1, pv: [] };
      }

      // Material values
      const PIECE_VALS = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
      let whiteScore = 0;
      let blackScore = 0;

      const board = chess.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece) {
            const val = PIECE_VALS[piece.type] || 0;
            // Center control bonus
            const centerBonus = (3.5 - Math.abs(3.5 - r)) + (3.5 - Math.abs(3.5 - c));
            if (piece.color === 'w') {
              whiteScore += val + centerBonus * 3;
            } else {
              blackScore += val + centerBonus * 3;
            }
          }
        }
      }

      const turn = chess.turn();
      const evalFromWhite = whiteScore - blackScore;
      // Score in Stockfish UCI is from the perspective of the side to move
      const scoreCp = turn === 'w' ? evalFromWhite : -evalFromWhite;

      const topMove = moves[0] ? `${moves[0].from}${moves[0].to}${moves[0].promotion || ''}` : null;
      return {
        depth: 4,
        scoreCp: Math.round(scoreCp),
        isMate: false,
        mateIn: null,
        bestMove: topMove,
        pv: topMove ? [topMove] : [],
      };
    } catch {
      return { depth: 1, scoreCp: 0, isMate: false, mateIn: null, bestMove: null, pv: [] };
    }
  }

  terminate() {
    if (this.worker) {
      this.send('quit');
      this.worker.terminate();
      this.worker = null;
    }
  }
}

/**
 * Singleton engine manager instance
 */
let globalEngine = null;

export function getEngineInstance() {
  if (!globalEngine) {
    globalEngine = new StockfishEngine();
  }
  return globalEngine;
}

/**
 * Expected points lost for a move (0–1), from CAPS/Lichess win probabilities.
 */
export function expectedPointsLost(winProbBefore, winProbAfter) {
  return Math.max(0, (winProbBefore - winProbAfter) / 100);
}

/**
 * Critical evaluation swing: losing→equal/better, or equal→winning.
 */
export function isCriticalEvalSwing(evalBefore, evalAfter) {
  const rescued =
    evalBefore <= T.greatLosingCp && evalAfter >= T.greatEqualizedCp;
  const converted =
    Math.abs(evalBefore) <= T.greatEqualAbsCp && evalAfter >= T.greatWinningCp;
  return rescued || converted;
}

/**
 * Classifies a move per Section A specifications:
 * - A.3: Core six-tier win%-loss thresholds
 * - A.3a: Decided-position dampening (caps severity at Mistake if position is already winning/lost)
 * - A.4: Special classifications overlay (Book -> Brilliant -> Great -> Miss -> SixTier)
 */
export function classifyMove({
  evalBefore, // cp from mover's perspective before move
  evalAfter, // cp from mover's perspective after move
  playedMoveUci,
  bestMoveUci,
  isSacrifice,
  isOnlyGoodMove,
  isCriticalSwing,
  isBookCandidate,
  winProbBefore,
  winProbAfter,
  opponentPreviousClassification,
  bestMoveIsMate = false,
  playedMoveIsMate = false,
}) {
  // Step 2: Compute Win% loss
  const winpctLoss = Math.max(0, winProbBefore - winProbAfter);
  const isTopMove = playedMoveUci === bestMoveUci;

  // Step 3: Core Six-Tier Classification (A.3)
  let sixTier = CLASSIFICATIONS.BLUNDER;
  if (isTopMove || winpctLoss <= 0.5) {
    sixTier = CLASSIFICATIONS.BEST;
  } else if (winpctLoss <= 2) {
    sixTier = CLASSIFICATIONS.EXCELLENT;
  } else if (winpctLoss <= 5) {
    sixTier = CLASSIFICATIONS.GOOD;
  } else if (winpctLoss <= 10) {
    sixTier = CLASSIFICATIONS.INACCURACY;
  } else if (winpctLoss <= 20) {
    sixTier = CLASSIFICATIONS.MISTAKE;
  } else {
    sixTier = CLASSIFICATIONS.BLUNDER;
  }

  // A.3a Decided-position dampening (required):
  // If the position is already lopsided before the move, cap severity at Mistake
  if (
    (winProbBefore >= 95 && winProbAfter >= 85) ||
    (winProbBefore <= 5 && winProbAfter <= 15)
  ) {
    if (sixTier === CLASSIFICATIONS.BLUNDER) {
      sixTier = CLASSIFICATIONS.MISTAKE;
    }
  }

  // Step 4: Special Classifications Overlay (A.4)

  // A.4a Book: engine-approved opening moves
  if (isBookCandidate) {
    return {
      display: CLASSIFICATIONS.BOOK,
      sixTier,
      winpctLoss,
    };
  }

  // A.4b Brilliant (!!): piece sacrifice, sound, not forced, not already trivially winning
  // not_forced: a safe non-sacrificial alternative existed (i.e. this wasn't the only good move)
  const soundnessHolds =
    winpctLoss <= 1 || (evalAfter >= T.brilliantMinEvalAfter && winpctLoss <= 2);
  const notForced = !isOnlyGoodMove;
  if (
    isSacrifice &&
    soundnessHolds &&
    notForced &&
    winProbBefore < 95 &&
    (sixTier === CLASSIFICATIONS.BEST || sixTier === CLASSIFICATIONS.EXCELLENT)
  ) {
    return {
      display: CLASSIFICATIONS.BRILLIANT,
      sixTier,
      winpctLoss,
    };
  }

  // A.4c Great (!): Best move that is the only good move (>=10 win% gap) or critical eval swing
  if (sixTier === CLASSIFICATIONS.BEST && (isOnlyGoodMove || isCriticalSwing)) {
    return {
      display: CLASSIFICATIONS.GREAT,
      sixTier,
      winpctLoss,
    };
  }

  // A.4d Miss: Failed to capitalize on opponent mistake or missed forced tactic/mate
  const opponentMadeError =
    opponentPreviousClassification === 'mistake' ||
    opponentPreviousClassification === 'blunder';
  const missedMate = bestMoveIsMate && !playedMoveIsMate;
  const isMiss =
    (opponentMadeError && winProbBefore >= 55 && winpctLoss > 10) ||
    (missedMate && winProbBefore >= 55 && winpctLoss > 5);

  if (isMiss) {
    return {
      display: CLASSIFICATIONS.MISS,
      sixTier,
      winpctLoss,
    };
  }

  return {
    display: sixTier,
    sixTier,
    winpctLoss,
  };
}

/**
 * True piece sacrifice: N/B/R/Q offered with meaningful net material loss,
 * and the destination can be recaptured by the opponent.
 */
function checkMaterialSacrifice(chessBefore, move) {
  const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  const movingPieceVal = PIECE_VALUES[move.piece] || 0;
  const capturedVal = move.captured ? PIECE_VALUES[move.captured] : 0;
  const netOffered = movingPieceVal - capturedVal;

  // Pawns don't count; require a real material offer (≈2+ pawns)
  if (movingPieceVal < 3 || netOffered < T.brilliantMinNetSacrifice) {
    return false;
  }

  const clone = new Chess(chessBefore.fen());
  clone.move(move);

  const canRecapture = clone
    .moves({ verbose: true })
    .some((m) => m.to === move.to);

  return canRecapture;
}

/**
 * Opening moves that count as "book" for this ply (engine best, optionally near-equal #2).
 */
function getBookCandidateUcis(evalInfo) {
  const candidates = new Set();
  if (evalInfo?.bestMove) {
    candidates.add(evalInfo.bestMove);
  }

  const second = evalInfo?.lines?.[1];
  if (second?.bestMove) {
    const gap = Math.max(0, (evalInfo.scoreCp || 0) - (second.scoreCp || 0));
    if (gap <= T.bookAltMoveMaxGapCp) {
      candidates.add(second.bestMove);
    }
  }

  return candidates;
}

/**
 * Fast Game Review: Batch-analyzes all moves in a game using fastReview configuration
 * @param {string} pgn
 * @param {Function} [onProgress] callback with { currentMove, totalMoves, percent }
 * @returns {Promise<Object>} { moveClassifications, accuracyWhite, accuracyBlack, summary }
 */
export async function runFastReview(pgn, onProgress = null) {
  const engine = getEngineInstance();
  const chess = new Chess();

  try {
    chess.loadPgn(pgn);
  } catch (e) {
    throw new Error('Invalid PGN format: ' + e.message);
  }

  const history = chess.history({ verbose: true });
  const totalMoves = history.length;

  if (totalMoves === 0) {
    return {
      moveClassifications: [],
      accuracyWhite: 100,
      accuracyBlack: 100,
      summary: {},
    };
  }

  const reviewBoard = new Chess();
  const moveClassifications = [];

  let whiteAccuracySum = 0;
  let whiteMoveCount = 0;
  let blackAccuracySum = 0;
  let blackMoveCount = 0;

  const classificationCounts = {
    white: { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, miss: 0, blunder: 0, book: 0 },
    black: { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, miss: 0, blunder: 0, book: 0 },
  };

  // 1. Initial starting position eval
  let currentEval = await engine.evaluatePosition(
    reviewBoard.fen(),
    ENGINE_CONFIG.fastReview
  );

  // Stay in book only while both sides keep playing engine-approved opening moves
  let stillInBook = true;
  let previousClassificationId = null;

  for (let i = 0; i < totalMoves; i++) {
    const move = history[i];
    const fenBefore = reviewBoard.fen();
    const isWhite = move.color === 'w';
    const playedMoveUci = `${move.from}${move.to}${move.promotion || ''}`;

    // Normalised eval before move from current player's perspective
    // Note: Stockfish reports score from perspective of side to move in current fen
    const evalBeforePlayer = currentEval.scoreCp;
    const winProbBefore = cpToWinPercent(
      evalBeforePlayer,
      currentEval.isMate,
      currentEval.mateIn
    );
    const isSacrifice = checkMaterialSacrifice(reviewBoard, move);

    // Apply move on review board
    reviewBoard.move(move);
    const fenAfter = reviewBoard.fen();

    // Evaluate position after move
    const evalAfterObj = await engine.evaluatePosition(
      fenAfter,
      ENGINE_CONFIG.fastReview
    );

    // After the move, it is opponent's turn, so invert score to get mover's perspective
    const evalAfterPlayer = -evalAfterObj.scoreCp;
    const winProbAfter = cpToWinPercent(
      evalAfterPlayer,
      evalAfterObj.isMate,
      evalAfterObj.mateIn !== null ? -evalAfterObj.mateIn : null
    );

    // Calculate move accuracy
    const moveAccuracy = calculateMoveAccuracy(winProbBefore, winProbAfter);
    if (isWhite) {
      whiteAccuracySum += moveAccuracy;
      whiteMoveCount++;
    } else {
      blackAccuracySum += moveAccuracy;
      blackMoveCount++;
    }

    // Great-move: MultiPV #2 loses 10+ win% vs the actual best move (A.4c)
    const secondLine = currentEval.lines?.[1];
    let isOnlyGoodMove = false;
    if (secondLine) {
      const winProbSecond = cpToWinPercent(
        secondLine.scoreCp,
        secondLine.isMate,
        secondLine.mateIn
      );
      isOnlyGoodMove = (winProbBefore - winProbSecond) >= 10;
    }

    const isCriticalSwing = isCriticalEvalSwing(
      evalBeforePlayer,
      evalAfterPlayer
    );

    // Book: early, roughly equal, still in book sequence, engine-approved move
    const bookUcis = getBookCandidateUcis(currentEval);
    const isBookCandidate =
      stillInBook &&
      i < T.bookMaxPly &&
      Math.abs(evalBeforePlayer) <= T.bookMaxAbsEvalCp &&
      bookUcis.has(playedMoveUci);

    if (!isBookCandidate) {
      stillInBook = false;
    }

    // Determine classification (Section A overlay pipeline)
    const classificationResult = classifyMove({
      evalBefore: evalBeforePlayer,
      evalAfter: evalAfterPlayer,
      playedMoveUci,
      bestMoveUci: currentEval.bestMove,
      isSacrifice,
      isOnlyGoodMove,
      isCriticalSwing,
      isBookCandidate,
      winProbBefore,
      winProbAfter,
      opponentPreviousClassification: previousClassificationId,
      bestMoveIsMate: Boolean(currentEval.isMate && currentEval.mateIn > 0),
      playedMoveIsMate: Boolean(evalAfterObj.isMate && evalAfterObj.mateIn < 0),
    });

    const displayClassification = classificationResult.display || classificationResult;
    const sixTierClassification = classificationResult.sixTier || displayClassification;
    // Miss (A.4d) keys off the opponent's underlying mistake/blunder grade, not overlays
    previousClassificationId = sixTierClassification.id;

    const playerKey = isWhite ? 'white' : 'black';
    if (classificationCounts[playerKey][displayClassification.id] !== undefined) {
      classificationCounts[playerKey][displayClassification.id]++;
    }

    // White's view of mate (positive = White mating, negative = White mated)
    const whiteMateIn = evalAfterObj.isMate
      ? (isWhite ? -evalAfterObj.mateIn : evalAfterObj.mateIn)
      : null;

    moveClassifications.push({
      ply: i + 1,
      moveNumber: Math.floor(i / 2) + 1,
      color: move.color,
      san: move.san,
      uci: playedMoveUci,
      fenBefore,
      fenAfter,
      evalBefore: evalBeforePlayer,
      evalAfter: evalAfterPlayer,
      eval_before_cp: evalBeforePlayer,
      eval_after_played_cp: evalAfterPlayer,
      eval_after_best_cp: evalBeforePlayer,
      winpct_before: Math.round(winProbBefore * 10) / 10,
      winpct_after_played: Math.round(winProbAfter * 10) / 10,
      winpct_after_best: Math.round(winProbBefore * 10) / 10,
      winpct_loss: Math.round(classificationResult.winpctLoss * 10) / 10,
      six_tier_label: sixTierClassification.label,
      display_label: displayClassification.label,
      is_book: displayClassification.id === 'book',
      is_sacrifice: isSacrifice,
      engine_depth: ENGINE_CONFIG.fastReview.depth,
      multipv_used: ENGINE_CONFIG.fastReview.multiPv,
      // Evaluation from White's perspective for global eval graph/bar
      evalWhiteView: isWhite ? evalAfterPlayer : -evalAfterPlayer,
      isMate: Boolean(evalAfterObj.isMate),
      mateIn: whiteMateIn,
      bestMoveUci: currentEval.bestMove,
      classification: displayClassification.id,
      classificationLabel: displayClassification.label,
      classificationSymbol: displayClassification.symbol,
      classificationColor: displayClassification.color,
      accuracy: moveAccuracy,
      expectedPointsLost: Math.round(expectedPointsLost(winProbBefore, winProbAfter) * 1000) / 1000,
    });

    // Update currentEval for next iteration
    currentEval = evalAfterObj;

    if (onProgress) {
      onProgress({
        currentMove: i + 1,
        totalMoves,
        percent: Math.round(((i + 1) / totalMoves) * 100),
        currentClassification: displayClassification,
      });
    }
  }

  const accuracyWhite = whiteMoveCount > 0 ? Math.round((whiteAccuracySum / whiteMoveCount) * 10) / 10 : 100;
  const accuracyBlack = blackMoveCount > 0 ? Math.round((blackAccuracySum / blackMoveCount) * 10) / 10 : 100;

  return {
    moveClassifications,
    accuracyWhite,
    accuracyBlack,
    summary: classificationCounts,
  };
}
