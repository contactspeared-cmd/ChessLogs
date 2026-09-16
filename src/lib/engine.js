import { Chess } from 'chess.js';
import { ENGINE_CONFIG, CLASSIFICATIONS } from '../config/engine';

/**
 * Converts a centipawn evaluation score to winning probability (0% - 100%)
 * based on standard CAPS / Lichess win probability model.
 */
export function cpToWinPercent(cp) {
  if (typeof cp !== 'number') return 50;
  // Clip extreme centipawn values
  const clipped = Math.max(-1500, Math.min(1500, cp));
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
 * Classifies a move by comparing evaluation before & after the move
 */
export function classifyMove({
  evalBefore, // cp from mover's perspective before move
  evalAfter,  // cp from mover's perspective after move
  playedMoveUci,
  bestMoveUci,
  isSacrifice,
  isOnlyGoodMove,
  moveIndex,
}) {
  // Opening book moves
  if (moveIndex < 6) {
    return CLASSIFICATIONS.BOOK;
  }

  const cpLoss = Math.max(0, evalBefore - evalAfter);

  // 1. Brilliant: Sacrificed material while maintaining advantage (eval >= +100 cp) and delta <= 15 cp
  if (isSacrifice && evalAfter >= 80 && cpLoss <= 15) {
    return CLASSIFICATIONS.BRILLIANT;
  }

  // 2. Great: The only good move when alternatives drop advantage by >120 cp
  if (isOnlyGoodMove && cpLoss <= 15) {
    return CLASSIFICATIONS.GREAT;
  }

  // 3. Best: Played top engine move or near zero loss
  if (playedMoveUci === bestMoveUci || cpLoss <= 10) {
    return CLASSIFICATIONS.BEST;
  }

  // 4. Good: Minor loss
  if (cpLoss <= 35) {
    return CLASSIFICATIONS.GOOD;
  }

  // 5. Inaccuracy: 35 - 90 cp loss
  if (cpLoss <= 90) {
    return CLASSIFICATIONS.INACCURACY;
  }

  // 6. Mistake: 90 - 200 cp loss
  if (cpLoss <= 200) {
    return CLASSIFICATIONS.MISTAKE;
  }

  // 7. Blunder: > 200 cp loss or dropping mate
  return CLASSIFICATIONS.BLUNDER;
}

/**
 * Detects if a move sacrificed material (e.g. piece captured of lower value or hanging piece)
 */
function checkMaterialSacrifice(chessBefore, move) {
  const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  // Check piece value sacrificed
  const movingPieceVal = PIECE_VALUES[move.piece] || 0;
  const capturedVal = move.captured ? PIECE_VALUES[move.captured] : 0;

  // If a piece (Knight, Bishop, Rook, Queen) is given up with less or no material taken back
  if (movingPieceVal >= 3 && movingPieceVal > capturedVal) {
    // Check if destination square is attacked by opponent
    const clone = new Chess(chessBefore.fen());
    clone.move(move);
    // If the opponent can capture the piece on the next turn
    const opponentResponses = clone.moves({ verbose: true });
    const canRecapture = opponentResponses.some((m) => m.to === move.to);
    if (canRecapture) {
      return true;
    }
  }

  return false;
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
    white: { brilliant: 0, great: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, book: 0 },
    black: { brilliant: 0, great: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, book: 0 },
  };

  // 1. Initial starting position eval
  let currentEval = await engine.evaluatePosition(
    reviewBoard.fen(),
    ENGINE_CONFIG.fastReview
  );

  for (let i = 0; i < totalMoves; i++) {
    const move = history[i];
    const fenBefore = reviewBoard.fen();
    const isWhite = move.color === 'w';
    const playedMoveUci = `${move.from}${move.to}${move.promotion || ''}`;

    // Normalised eval before move from current player's perspective
    // Note: Stockfish reports score from perspective of side to move in current fen
    const evalBeforePlayer = currentEval.scoreCp;
    const winProbBefore = cpToWinPercent(evalBeforePlayer);
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
    const winProbAfter = cpToWinPercent(evalAfterPlayer);

    // Calculate move accuracy
    const moveAccuracy = calculateMoveAccuracy(winProbBefore, winProbAfter);
    if (isWhite) {
      whiteAccuracySum += moveAccuracy;
      whiteMoveCount++;
    } else {
      blackAccuracySum += moveAccuracy;
      blackMoveCount++;
    }

    // Great-move heuristic: MultiPV #2 drops eval by >120 cp vs best line
    const secondLine = currentEval.lines?.[1];
    const isOnlyGoodMove =
      Boolean(secondLine) &&
      Math.max(0, (currentEval.scoreCp || 0) - (secondLine.scoreCp || 0)) > 120;

    // Determine classification
    const classification = classifyMove({
      evalBefore: evalBeforePlayer,
      evalAfter: evalAfterPlayer,
      playedMoveUci,
      bestMoveUci: currentEval.bestMove,
      isSacrifice,
      isOnlyGoodMove,
      moveIndex: i,
    });

    const playerKey = isWhite ? 'white' : 'black';
    if (classificationCounts[playerKey][classification.id] !== undefined) {
      classificationCounts[playerKey][classification.id]++;
    }

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
      // Evaluation from White's perspective for global eval graph/bar
      evalWhiteView: isWhite ? evalAfterPlayer : -evalAfterPlayer,
      bestMoveUci: currentEval.bestMove,
      classification: classification.id,
      classificationLabel: classification.label,
      classificationSymbol: classification.symbol,
      classificationColor: classification.color,
      accuracy: moveAccuracy,
    });

    // Update currentEval for next iteration
    currentEval = evalAfterObj;

    if (onProgress) {
      onProgress({
        currentMove: i + 1,
        totalMoves,
        percent: Math.round(((i + 1) / totalMoves) * 100),
        currentClassification: classification,
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
