import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import ChessboardView from '../components/ChessboardView';
import {
  getCourseById,
  getTrainerProgress,
  saveTrainerProgress,
} from '../lib/db';
import {
  buildCourseCards,
  buildSessionQueue,
  getTrainerStats,
  applyTrainerGrade,
  createInitialSrsState,
  sansEqual,
  TRAINER_GRADES,
  resolveTrainColor,
} from '../lib/moveTrainer';
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Lightbulb,
  Eye,
  ChevronRight,
  Sparkles,
  Target,
  Layers,
  Trophy,
} from 'lucide-react';

const SESSION_LIMIT = 20;
const AUTO_ADVANCE_KEY = 'chesslogs_srs_auto_advance';

export default function MoveTrainer() {
  const { id: courseId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deckMode, setDeckMode] = useState('auto'); // auto | annotations | line
  const [srsMap, setSrsMap] = useState({});

  // B.3.3: default ON preserves legacy SRS timer auto-grade behavior
  const [autoAdvance, setAutoAdvance] = useState(() => {
    try {
      const stored = localStorage.getItem(AUTO_ADVANCE_KEY);
      return stored === null ? true : stored === '1';
    } catch {
      return true;
    }
  });

  // Session state
  const [phase, setPhase] = useState('lobby'); // lobby | training | summary
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [lastMove, setLastMove] = useState(null);
  const [arrows, setArrows] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [awaitingGrade, setAwaitingGrade] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [pendingGrade, setPendingGrade] = useState(null);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    wrong: 0,
    reviewed: 0,
  });

  const trainedSide = course?.trained_side || course?.chapters?.[0]?.trained_side || null;

  const cards = useMemo(() => {
    if (!course?.chapters) return [];
    return buildCourseCards(course.chapters, {
      mode: deckMode,
      trainedSide,
    });
  }, [course, deckMode, trainedSide]);

  const deckStats = useMemo(
    () => getTrainerStats(cards, srsMap),
    [cards, srsMap]
  );

  const currentCard = phase === 'training' ? queue[queueIndex] : null;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getCourseById(courseId);
        setCourse(data);
        if (profile?.id) {
          const trainer = await getTrainerProgress(courseId, profile.id);
          setSrsMap(trainer?.cards || {});
        }
      } catch (err) {
        console.error('Failed to load move trainer:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId, profile?.id]);

  const persistSrs = useCallback(
    async (nextMap) => {
      setSrsMap(nextMap);
      if (!profile?.id || !courseId) return;
      try {
        await saveTrainerProgress(courseId, profile.id, {
          cards: nextMap,
          lastSessionAt: new Date().toISOString(),
          mode: deckMode,
        });
      } catch (err) {
        console.warn('Failed to save trainer progress:', err);
      }
    },
    [courseId, profile?.id, deckMode]
  );

  const loadCardOntoBoard = useCallback(
    (card) => {
      if (!card) return;
      try {
        chess.load(card.fenBefore);
        setFen(card.fenBefore);
        setLastMove(null);
        setArrows([]);
        setFeedback(null);
        setFailedAttempts(0);
        setRevealed(false);
        setAwaitingGrade(false);
        setAwaitingConfirm(false);
        setPendingGrade(null);
      } catch (err) {
        console.error('Failed to load card position:', err);
      }
    },
    [chess]
  );

  const startSession = () => {
    if (cards.length === 0) return;
    const nextQueue = buildSessionQueue(cards, srsMap, { limit: SESSION_LIMIT });
    if (nextQueue.length === 0) {
      // Everything scheduled for later — still allow practice of learned cards
      const practice = [...cards].sort(() => Math.random() - 0.5).slice(0, SESSION_LIMIT);
      setQueue(practice);
    } else {
      setQueue(nextQueue);
    }
    setQueueIndex(0);
    setSessionStats({ correct: 0, wrong: 0, reviewed: 0 });
    setPhase('training');
  };

  useEffect(() => {
    if (phase === 'training' && queue[queueIndex]) {
      loadCardOntoBoard(queue[queueIndex]);
    }
  }, [phase, queue, queueIndex, loadCardOntoBoard]);

  const finishOrAdvance = useCallback(
    (nextMap, didFailFirst) => {
      setSessionStats((prev) => ({
        correct: prev.correct + (didFailFirst ? 0 : 1),
        wrong: prev.wrong + (didFailFirst ? 1 : 0),
        reviewed: prev.reviewed + 1,
      }));
      persistSrs(nextMap);

      const isLast = queueIndex + 1 >= queue.length;
      setTimeout(() => {
        if (isLast) {
          setPhase('summary');
          confetti({
            particleCount: 70,
            spread: 65,
            origin: { y: 0.7 },
            colors: ['#22c55e', '#1ba8c2', '#f0c15c'],
          });
        } else {
          setQueueIndex((i) => i + 1);
        }
      }, 400);
    },
    [queue.length, queueIndex, persistSrs]
  );

  const gradeCurrentCard = useCallback(
    (grade, didFailFirst = false) => {
      if (!currentCard) return;
      const prev = srsMap[currentCard.id] || createInitialSrsState();
      const nextState = applyTrainerGrade(prev, grade);
      const nextMap = { ...srsMap, [currentCard.id]: nextState };
      finishOrAdvance(nextMap, didFailFirst);
    },
    [currentCard, srsMap, finishOrAdvance]
  );

  const playOpponentReply = useCallback(() => {
    if (!currentCard?.replySan) return;
    try {
      const reply = chess.move(currentCard.replySan);
      if (reply) {
        setFen(chess.fen());
        setLastMove({ from: reply.from, to: reply.to });
      }
    } catch {
      // ignore
    }
  }, [chess, currentCard]);

  const handlePieceDrop = (sourceSquare, targetSquare) => {
    if (!currentCard || awaitingGrade || revealed || phase !== 'training') {
      return false;
    }

    try {
      const moveAttempt = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });
      if (!moveAttempt) return false;

      const correct = sansEqual(moveAttempt.san, currentCard.keyMove);

      if (correct) {
        setFen(chess.fen());
        setLastMove({ from: sourceSquare, to: targetSquare });
        setArrows([]);
        setFeedback({
          type: 'success',
          message:
            currentCard.comment ||
            `Correct! ${moveAttempt.san} is the booked move.`,
        });
        confetti({
          particleCount: 28,
          spread: 40,
          origin: { y: 0.75 },
          colors: ['#22c55e', '#86efac'],
        });

        setAwaitingGrade(true);
        setTimeout(() => playOpponentReply(), 500);

        const grade =
          failedAttempts === 0 ? TRAINER_GRADES.GOOD : TRAINER_GRADES.HARD;

        if (autoAdvance) {
          // Legacy auto-grade path (B.3.3 opt-out of confirmation)
          setTimeout(() => {
            gradeCurrentCard(grade, failedAttempts > 0);
          }, 1100);
        } else {
          // B.3.2: wait for explicit confirmation before advancing
          setPendingGrade({ grade, didFailFirst: failedAttempts > 0 });
          setAwaitingConfirm(true);
        }
        return true;
      }

      chess.undo();
      setFen(chess.fen());
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      setFeedback({
        type: 'error',
        message:
          attempts >= 2
            ? `Still not it. Hint available — or reveal the solution.`
            : `${moveAttempt.san} isn't the move to remember here. Try again.`,
      });
      return false;
    } catch {
      return false;
    }
  };

  const showHint = () => {
    if (!currentCard) return;
    setArrows([[currentCard.from, currentCard.to, '#f0c15c']]);
    setFeedback({
      type: 'hint',
      message: `Hint: look at the ${currentCard.from} → ${currentCard.to} idea.`,
    });
  };

  const revealSolution = () => {
    if (!currentCard || revealed) return;
    try {
      const move = chess.move(currentCard.keyMove);
      if (!move) {
        // Fallback to UCI squares
        chess.move({
          from: currentCard.from,
          to: currentCard.to,
          promotion: 'q',
        });
      }
      setFen(chess.fen());
      setLastMove({ from: currentCard.from, to: currentCard.to });
      setArrows([[currentCard.from, currentCard.to, '#ca3431']]);
      setRevealed(true);
      setAwaitingGrade(true);
      setFeedback({
        type: 'reveal',
        message: `Solution: ${currentCard.keyMove}. ${currentCard.comment || 'Commit this to memory for next review.'}`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const continueAfterReveal = () => {
    gradeCurrentCard(TRAINER_GRADES.AGAIN, true);
  };

  const confirmAndAdvance = () => {
    if (!pendingGrade) return;
    const { grade, didFailFirst } = pendingGrade;
    setAwaitingConfirm(false);
    setPendingGrade(null);
    gradeCurrentCard(grade, didFailFirst);
  };

  const toggleAutoAdvance = (checked) => {
    setAutoAdvance(checked);
    try {
      localStorage.setItem(AUTO_ADVANCE_KEY, checked ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="py-32 text-center text-slate-400 text-sm">
        Loading Move Trainer…
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Course not found</h2>
        <button
          onClick={() => navigate('/courses')}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
        >
          Return to Courses
        </button>
      </div>
    );
  }

  const trainColor = resolveTrainColor(course.chapters || [], trainedSide);
  const trainColorLabel =
    trainColor === 'both' ? 'Both sides' : trainColor === 'w' ? 'White' : 'Black';
  const progressPct =
    queue.length > 0
      ? Math.round((queueIndex / queue.length) * 100)
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate(`/courses/${courseId}`)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Course</span>
        </button>

        <span className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
          <Brain className="w-3.5 h-3.5" />
          Move Trainer
        </span>
      </div>

      {/* Lobby */}
      {phase === 'lobby' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div>
              <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-cyan-400" />
                {course.title}
              </h1>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Chessable-style spaced repetition: you&apos;re shown a position from this course,
                play the correct move from memory, then review again on a schedule so the line sticks.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatPill icon={Layers} label="Cards" value={deckStats.total} />
              <StatPill icon={Target} label="Due" value={deckStats.due} accent="amber" />
              <StatPill icon={Sparkles} label="New" value={deckStats.new} accent="cyan" />
              <StatPill icon={Trophy} label="Learned" value={deckStats.learned} accent="emerald" />
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Deck source
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'auto', label: 'Auto (key moves → full line)' },
                  { id: 'annotations', label: 'Coach key moves only' },
                  { id: 'line', label: `Full variation (${trainColorLabel})` },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDeckMode(opt.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      deckMode === opt.id
                        ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Session pacing
              </p>
              <label className="inline-flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(e) => toggleAutoAdvance(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40"
                />
                Auto-advance after correct moves (skip confirmation)
              </label>
              <p className="text-[11px] text-slate-500">
                Training side: <span className="text-slate-300 font-semibold">{trainColorLabel}</span>
                {trainedSide ? ' (from course settings)' : ' (inferred from annotations)'}
              </p>
            </div>

            {cards.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                This course has no PGN walkthrough moves to train yet. Ask your coach to add
                annotated walkthrough chapters, or open a walkthrough course.
              </div>
            ) : (
              <button
                type="button"
                onClick={startSession}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-sm font-bold shadow-lg shadow-cyan-900/30 transition-all"
              >
                <Brain className="w-4 h-4" />
                <span>
                  Start Session
                  {deckStats.due + deckStats.new > 0
                    ? ` (${Math.min(SESSION_LIMIT, deckStats.due + deckStats.new)} cards)`
                    : ' (practice)'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">How it works</h3>
            <ol className="space-y-3 text-xs text-slate-400 list-decimal list-inside leading-relaxed">
              <li>A position from your course appears on the board.</li>
              <li>Play the move you studied — no engine help.</li>
              <li>Correct answers schedule the card further out (spaced repetition).</li>
              <li>Misses come back sooner until the line is solid.</li>
            </ol>
            <button
              type="button"
              onClick={() => navigate(`/courses/${courseId}`)}
              className="w-full mt-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
            >
              Study chapter walkthrough first
            </button>
          </div>
        </div>
      )}

      {/* Training */}
      {phase === 'training' && currentCard && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-mono uppercase text-slate-500">
                  Card {queueIndex + 1} / {queue.length} · {currentCard.chapterTitle}
                </p>
                <h2 className="text-lg font-bold text-white mt-0.5">Find the move</h2>
              </div>
              <div className="w-40">
                <div className="h-1.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="w-full max-w-full overflow-hidden flex flex-col items-center">
              <ChessboardView
                position={fen}
                onPieceDrop={handlePieceDrop}
                boardOrientation={currentCard.orientation}
                lastMove={lastMove}
                customArrows={arrows}
                isDraggable={!awaitingGrade && !revealed}
              />
            </div>

            {feedback && (
              <div
                className={`p-4 rounded-xl text-xs flex items-start gap-3 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : feedback.type === 'hint'
                    ? 'bg-amber-500/10 text-amber-200 border border-amber-500/30'
                    : feedback.type === 'reveal'
                    ? 'bg-rose-500/10 text-rose-200 border border-rose-500/30'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : feedback.type === 'hint' ? (
                  <Lightbulb className="w-5 h-5 text-amber-400 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <p className="leading-relaxed">{feedback.message}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={showHint}
                disabled={revealed || awaitingGrade}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-40"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                Hint
              </button>
              <button
                type="button"
                onClick={revealSolution}
                disabled={revealed || awaitingGrade}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-40"
              >
                <Eye className="w-3.5 h-3.5 text-rose-400" />
                Reveal
              </button>
              <button
                type="button"
                onClick={() => loadCardOntoBoard(currentCard)}
                disabled={awaitingGrade}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>

              {awaitingConfirm && (
                <button
                  type="button"
                  onClick={confirmAndAdvance}
                  className="ml-auto inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  Correct — continue
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              {revealed && (
                <button
                  type="button"
                  onClick={continueAfterReveal}
                  className="ml-auto inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
                >
                  Continue
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-white">This session</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <MiniStat label="Done" value={sessionStats.reviewed} />
                <MiniStat label="Hit" value={sessionStats.correct} tone="emerald" />
                <MiniStat label="Miss" value={sessionStats.wrong} tone="rose" />
              </div>
              <button
                type="button"
                onClick={() => setPhase('lobby')}
                className="w-full py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white border border-slate-800 hover:border-slate-600"
              >
                End session early
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {phase === 'summary' && (
        <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Session complete</h2>
            <p className="text-sm text-slate-400 mt-1">
              Spaced repetition updated — due cards will return when you&apos;re ready.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Reviewed" value={sessionStats.reviewed} />
            <MiniStat label="Correct" value={sessionStats.correct} tone="emerald" />
            <MiniStat label="Missed" value={sessionStats.wrong} tone="rose" />
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setPhase('lobby');
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700"
            >
              Back to lobby
            </button>
            <button
              type="button"
              onClick={startSession}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              Train again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({ icon: Icon, label, value, accent = 'slate' }) {
  const tones = {
    slate: 'text-slate-200',
    amber: 'text-amber-300',
    cyan: 'text-cyan-300',
    emerald: 'text-emerald-300',
  };
  return (
    <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-center">
      <Icon className={`w-4 h-4 mx-auto mb-1 ${tones[accent]}`} />
      <div className={`text-lg font-extrabold font-mono ${tones[accent]}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
        {label}
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'text-white',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
  };
  return (
    <div className="rounded-xl bg-slate-950 border border-slate-800 p-3">
      <div className={`text-lg font-extrabold font-mono ${tones[tone]}`}>{value}</div>
      <div className="text-[10px] uppercase text-slate-500 font-semibold">{label}</div>
    </div>
  );
}
