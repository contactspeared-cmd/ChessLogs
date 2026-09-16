import { Chess } from 'chess.js';

/**
 * Chessable-style Move Trainer helpers:
 * - Build flashcards from chapter annotations and/or full PGN lines
 * - SM-2–inspired spaced repetition scheduling
 */

export const TRAINER_GRADES = {
  AGAIN: 'again',
  HARD: 'hard',
  GOOD: 'good',
  EASY: 'easy',
};

const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;

/** Milliseconds helpers */
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

function normalizeSan(san) {
  return String(san || '').replace(/[+#]/g, '');
}

function cardId(chapterId, ply, keyMove) {
  return `${chapterId || 'ch'}:${ply}:${normalizeSan(keyMove)}`;
}

/**
 * Infer which color the student should train (majority of annotated key moves).
 * Falls back to 'b' for opening repertoires when unclear.
 */
export function inferTrainColor(chapters = []) {
  let white = 0;
  let black = 0;

  for (const chapter of chapters) {
    if (!chapter?.pgn) continue;
    try {
      const chess = new Chess();
      chess.loadPgn(chapter.pgn);
      const history = chess.history({ verbose: true });
      for (const anno of chapter.annotations || []) {
        const move = history[(anno.ply || 0) - 1];
        if (!move) continue;
        if (move.color === 'w') white++;
        else black++;
      }
    } catch {
      // ignore bad pgn
    }
  }

  if (white === 0 && black === 0) return 'b';
  return black >= white ? 'b' : 'w';
}

/**
 * Build a single card for a key move at a given ply in a chapter PGN.
 */
function buildCardFromPly(chapter, history, ply, keyMove, comment, source) {
  const idx = ply - 1;
  if (idx < 0 || idx >= history.length) return null;

  const move = history[idx];
  const expected = normalizeSan(keyMove || move.san);
  if (normalizeSan(move.san) !== expected && keyMove) {
    // Prefer explicit annotation keyMove even if it drifts from PGN SAN slightly
  }

  const replay = new Chess();
  for (let i = 0; i < idx; i++) {
    replay.move(history[i]);
  }

  const fenBefore = replay.fen();
  const orientation = move.color === 'w' ? 'white' : 'black';

  // Opponent reply SAN (auto-play after correct answer), if any
  const reply = history[idx + 1] || null;

  return {
    id: cardId(chapter.id, ply, expected),
    chapterId: chapter.id,
    chapterTitle: chapter.title || 'Chapter',
    pgn: chapter.pgn,
    ply,
    keyMove: expected,
    comment: comment || null,
    fenBefore,
    orientation,
    color: move.color,
    uci: `${move.from}${move.to}${move.promotion || ''}`,
    from: move.from,
    to: move.to,
    replySan: reply ? normalizeSan(reply.san) : null,
    replyUci: reply ? `${reply.from}${reply.to}${reply.promotion || ''}` : null,
    source, // 'annotation' | 'line'
  };
}

/**
 * Cards from coach annotations only (key moments).
 */
export function buildAnnotationCards(chapters = []) {
  const cards = [];

  for (const chapter of chapters) {
    if (!chapter?.pgn || !chapter.annotations?.length) continue;
    try {
      const chess = new Chess();
      chess.loadPgn(chapter.pgn);
      const history = chess.history({ verbose: true });

      for (const anno of chapter.annotations) {
        const ply = Number(anno.ply) || 0;
        const card = buildCardFromPly(
          chapter,
          history,
          ply,
          anno.keyMove,
          anno.comment,
          'annotation'
        );
        if (card) cards.push(card);
      }
    } catch (err) {
      console.warn('Skip chapter for trainer (bad PGN):', chapter?.title, err);
    }
  }

  return cards;
}

/**
 * Full-variation cards: every move for the trainee's color across chapters with PGN.
 */
export function buildLineCards(chapters = [], trainColor = 'b') {
  const cards = [];

  for (const chapter of chapters) {
    if (!chapter?.pgn) continue;
    try {
      const chess = new Chess();
      chess.loadPgn(chapter.pgn);
      const history = chess.history({ verbose: true });

      history.forEach((move, idx) => {
        if (move.color !== trainColor) return;
        const ply = idx + 1;
        const anno = (chapter.annotations || []).find((a) => Number(a.ply) === ply);
        const card = buildCardFromPly(
          chapter,
          history,
          ply,
          move.san,
          anno?.comment || null,
          'line'
        );
        if (card) cards.push(card);
      });
    } catch (err) {
      console.warn('Skip chapter for line trainer:', chapter?.title, err);
    }
  }

  return cards;
}

/**
 * Preferred deck: annotations if any exist, otherwise full line for inferred color.
 */
export function buildCourseCards(chapters = [], { mode = 'auto', trainColor } = {}) {
  const color = trainColor || inferTrainColor(chapters);
  const annotations = buildAnnotationCards(chapters);

  if (mode === 'annotations') return annotations;
  if (mode === 'line') return buildLineCards(chapters, color);

  // auto
  if (annotations.length > 0) return annotations;
  return buildLineCards(chapters, color);
}

export function createInitialSrsState(now = Date.now()) {
  return {
    ease: DEFAULT_EASE,
    interval: 0,
    repetitions: 0,
    dueAt: now,
    lapses: 0,
    seen: 0,
    correct: 0,
    streak: 0,
    lastGrade: null,
    lastReviewedAt: null,
  };
}

/**
 * Apply SM-2–inspired grade to a card's SRS state.
 * Returns updated state (does not mutate input).
 */
export function applyTrainerGrade(prevState, grade, now = Date.now()) {
  const state = { ...(prevState || createInitialSrsState(now)) };
  state.seen = (state.seen || 0) + 1;
  state.lastReviewedAt = now;
  state.lastGrade = grade;

  let ease = typeof state.ease === 'number' ? state.ease : DEFAULT_EASE;
  let interval = state.interval || 0;
  let repetitions = state.repetitions || 0;

  if (grade === TRAINER_GRADES.AGAIN) {
    repetitions = 0;
    interval = 0;
    ease = Math.max(MIN_EASE, ease - 0.2);
    state.lapses = (state.lapses || 0) + 1;
    state.streak = 0;
    state.dueAt = now + 1 * MINUTE; // retry soon in session / next minute
  } else if (grade === TRAINER_GRADES.HARD) {
    repetitions += 1;
    interval = repetitions === 1 ? 1 : Math.max(1, Math.round(interval * 1.2));
    ease = Math.max(MIN_EASE, ease - 0.15);
    state.correct = (state.correct || 0) + 1;
    state.streak = (state.streak || 0) + 1;
    state.dueAt = now + interval * DAY;
  } else if (grade === TRAINER_GRADES.EASY) {
    repetitions += 1;
    if (repetitions === 1) interval = 3;
    else if (repetitions === 2) interval = 7;
    else interval = Math.round(interval * ease * 1.3);
    ease += 0.15;
    state.correct = (state.correct || 0) + 1;
    state.streak = (state.streak || 0) + 1;
    state.dueAt = now + interval * DAY;
  } else {
    // GOOD
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 3;
    else interval = Math.round(interval * ease);
    state.correct = (state.correct || 0) + 1;
    state.streak = (state.streak || 0) + 1;
    state.dueAt = now + interval * DAY;
  }

  state.ease = Math.round(ease * 100) / 100;
  state.interval = interval;
  state.repetitions = repetitions;
  return state;
}

/**
 * Build a training queue: due reviews first, then unseen (new) cards.
 */
export function buildSessionQueue(cards, srsMap = {}, { limit = 20, now = Date.now() } = {}) {
  const due = [];
  const neu = [];

  for (const card of cards) {
    const srs = srsMap[card.id];
    if (!srs || !srs.lastReviewedAt) {
      neu.push(card);
    } else if ((srs.dueAt || 0) <= now) {
      due.push(card);
    }
  }

  // Stable-ish shuffle for variety
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const queue = [...shuffle(due), ...shuffle(neu)].slice(0, limit);
  return queue;
}

export function getTrainerStats(cards, srsMap = {}, now = Date.now()) {
  let due = 0;
  let newCount = 0;
  let learned = 0;
  let reviewed = 0;

  for (const card of cards) {
    const srs = srsMap[card.id];
    if (!srs || !srs.lastReviewedAt) {
      newCount++;
    } else {
      reviewed++;
      if ((srs.dueAt || 0) <= now) due++;
      if ((srs.repetitions || 0) >= 2) learned++;
    }
  }

  return {
    total: cards.length,
    due,
    new: newCount,
    learned,
    reviewed,
  };
}

export function sansEqual(a, b) {
  return normalizeSan(a) === normalizeSan(b);
}
