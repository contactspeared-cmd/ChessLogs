import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import ChessboardView from '../components/ChessboardView';
import {
  getCourseById,
  markChapterComplete,
  savePreferredStudyMode,
} from '../lib/db';
import { getYouTubeEmbedUrl, isYouTubeUrl } from '../lib/youtube';
import {
  ArrowLeft,
  CheckCircle2,
  Video,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  HelpCircle,
  Award,
  BookOpen,
  Brain,
  CircleCheck,
  Circle,
  Sparkles,
  Eye,
} from 'lucide-react';

const MODE_STORAGE_PREFIX = 'chesslogs_study_mode_';

function normalizeSan(san) {
  return String(san || '').replace(/[+#]/g, '');
}

function annotationAtPly(annotations, plyIndex0) {
  const ply = plyIndex0 + 1;
  return (annotations || []).find((a) => Number(a.ply) === ply) || null;
}

function autoMoveLabel(move, plyIndex0) {
  if (!move) return '';
  const color = move.color === 'w' ? 'White' : 'Black';
  return `${color} plays ${move.san}`;
}

function keySquareStyles(move) {
  if (!move?.from || !move?.to) return {};
  return {
    [move.from]: {
      backgroundColor: 'rgba(245, 158, 11, 0.45)',
      boxShadow: 'inset 0 0 0 3px rgba(245, 158, 11, 0.95)',
    },
    [move.to]: {
      backgroundColor: 'rgba(245, 158, 11, 0.6)',
      boxShadow: 'inset 0 0 0 3px rgba(217, 119, 6, 1)',
    },
  };
}

function applyHistoryTo(chess, history, plyCount) {
  chess.reset();
  let last = null;
  for (let i = 0; i < plyCount; i++) {
    last = chess.move(history[i]);
  }
  return last;
}

export default function CoursePlayer() {
  const { id: courseId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [studyMode, setStudyMode] = useState('trainer'); // trainer | read

  const [readChapterIds, setReadChapterIds] = useState(() => new Set());
  const [trainedChapterIds, setTrainedChapterIds] = useState(() => new Set());
  const [completedChapterIds, setCompletedChapterIds] = useState(() => new Set());

  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [history, setHistory] = useState([]);
  const [lastMove, setLastMove] = useState(null);

  // Shared ply cursor (0 = start position, N = after N moves)
  const [plyCursor, setPlyCursor] = useState(0);

  // Trainer phases: demo → awaiting_confirm → recall → (next) | complete
  const [trainerPhase, setTrainerPhase] = useState('demo');
  const [chapterComplete, setChapterComplete] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const demoTimerRef = useRef(null);

  const clearDemoTimer = () => {
    if (demoTimerRef.current) {
      clearTimeout(demoTimerRef.current);
      demoTimerRef.current = null;
    }
  };

  useEffect(() => () => clearDemoTimer(), []);

  // Load course + progress
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getCourseById(courseId, profile?.id || null);
        setCourse(data);

        const progress = data?.progress || {};
        setReadChapterIds(new Set(progress.read_chapter_ids || []));
        setTrainedChapterIds(new Set(progress.trained_chapter_ids || []));
        setCompletedChapterIds(new Set(progress.completed_chapter_ids || []));

        const storedMode =
          progress.preferred_study_mode ||
          (typeof localStorage !== 'undefined'
            ? localStorage.getItem(`${MODE_STORAGE_PREFIX}${courseId}`)
            : null);
        if (storedMode === 'read' || storedMode === 'trainer') {
          setStudyMode(storedMode);
        }
      } catch (e) {
        console.error('Failed to load course:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId, profile?.id]);

  const activeChapter = course?.chapters?.[activeChapterIndex] || null;
  const totalChapters = course?.chapters?.length || 1;
  const annotations = activeChapter?.annotations || [];

  const currentAnnotation =
    studyMode === 'trainer' && history[plyCursor]
      ? annotationAtPly(annotations, plyCursor)
      : null;
  const isKeyMoment = Boolean(currentAnnotation);
  const isLastChapter = activeChapterIndex + 1 >= (course?.chapters?.length || 0);

  const trainedCount = trainedChapterIds.size;
  const readCount = readChapterIds.size;
  const overallDoneCount = useMemo(() => {
    const ids = new Set([
      ...completedChapterIds,
      ...trainedChapterIds,
    ]);
    return ids.size;
  }, [completedChapterIds, trainedChapterIds]);
  const progressPercent = Math.min(100, Math.round((overallDoneCount / totalChapters) * 100));

  const syncBoard = useCallback(
    (plyCount, { highlightMove = true } = {}) => {
      const moveObj = applyHistoryTo(chess, history, plyCount);
      setFen(chess.fen());
      setLastMove(
        highlightMove && moveObj ? { from: moveObj.from, to: moveObj.to } : null
      );
    },
    [chess, history]
  );

  const startTrainerDemo = useCallback(
    (moves, startPly = 0) => {
      clearDemoTimer();
      setFeedback(null);
      setChapterComplete(false);

      if (!moves.length) {
        setPlyCursor(0);
        chess.reset();
        setFen(chess.fen());
        setLastMove(null);
        setTrainerPhase('complete');
        setChapterComplete(true);
        return;
      }

      // Position before the move, then animate the move
      applyHistoryTo(chess, moves, startPly);
      setFen(chess.fen());
      setLastMove(null);
      setPlyCursor(startPly);
      setTrainerPhase('demo');

      demoTimerRef.current = setTimeout(() => {
        const moveObj = chess.move(moves[startPly]);
        setFen(chess.fen());
        setLastMove(moveObj ? { from: moveObj.from, to: moveObj.to } : null);
        setTrainerPhase('awaiting_confirm');
      }, 280);
    },
    [chess]
  );

  const initChapter = useCallback(
    (chapter, mode) => {
      clearDemoTimer();
      setFeedback(null);
      setChapterComplete(false);
      setTrainerPhase('demo');
      setPlyCursor(0);

      if (!chapter?.pgn) {
        chess.reset();
        setHistory([]);
        setFen(chess.fen());
        setLastMove(null);
        return;
      }

      try {
        const parser = new Chess();
        parser.loadPgn(chapter.pgn);
        const fullHistory = parser.history({ verbose: true });
        setHistory(fullHistory);

        if (mode === 'read') {
          chess.reset();
          setFen(chess.fen());
          setLastMove(null);
          setPlyCursor(0);
        } else {
          // Defer demo start until history state settles via effect below
          startTrainerDemo(fullHistory, 0);
        }
      } catch (err) {
        console.error('Failed to parse chapter PGN:', err);
        setHistory([]);
      }
    },
    [chess, startTrainerDemo]
  );

  useEffect(() => {
    if (!activeChapter) return;
    initChapter(activeChapter, studyMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChapter?.id, studyMode]);

  const persistMode = useCallback(
    (mode) => {
      try {
        localStorage.setItem(`${MODE_STORAGE_PREFIX}${courseId}`, mode);
      } catch {
        /* ignore */
      }
      if (profile?.id) {
        savePreferredStudyMode(courseId, profile.id, mode);
      }
    },
    [courseId, profile?.id]
  );

  const handleModeChange = (mode) => {
    if (mode === studyMode) return;
    setStudyMode(mode);
    persistMode(mode);
  };

  const doMarkComplete = useCallback(
    (chapter, mode) => {
      if (!chapter?.id) return;
      if (mode === 'read') {
        setReadChapterIds((prev) => new Set(prev).add(chapter.id));
      } else if (mode === 'trained') {
        setTrainedChapterIds((prev) => new Set(prev).add(chapter.id));
        setCompletedChapterIds((prev) => new Set(prev).add(chapter.id));
      } else {
        setCompletedChapterIds((prev) => new Set(prev).add(chapter.id));
      }
      if (profile?.id) {
        markChapterComplete(courseId, profile.id, chapter.id, mode);
      }
    },
    [courseId, profile?.id]
  );

  // ---- Trainer: Got it → revert → recall ----
  const handleGotIt = () => {
    if (trainerPhase !== 'awaiting_confirm' || !history[plyCursor]) return;
    // Revert to position before the demonstrated move
    applyHistoryTo(chess, history, plyCursor);
    setFen(chess.fen());
    setLastMove(null);
    setTrainerPhase('recall');
    setFeedback({
      type: 'prompt',
      message: `Your turn — play ${history[plyCursor].san} on the board.`,
    });
  };

  const handlePieceDrop = (sourceSquare, targetSquare) => {
    if (studyMode !== 'trainer' || trainerPhase !== 'recall' || chapterComplete) {
      return false;
    }

    const expected = history[plyCursor];
    if (!expected) return false;

    try {
      const attempt = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });
      if (!attempt) return false;

      const correct = normalizeSan(attempt.san) === normalizeSan(expected.san);

      if (!correct) {
        chess.undo();
        setFen(chess.fen());
        setFeedback({
          type: 'error',
          message: `Not quite — try again. Look for ${expected.san}.`,
        });
        return false;
      }

      setFen(chess.fen());
      setLastMove({ from: attempt.from, to: attempt.to });

      const anno = annotationAtPly(annotations, plyCursor);
      setFeedback({
        type: 'success',
        message: anno?.comment || `Nice — ${attempt.san} is correct.`,
      });

      if (anno) {
        confetti({
          particleCount: 36,
          spread: 48,
          origin: { y: 0.8 },
          colors: ['#f59e0b', '#22c55e', '#1ba8c2'],
        });
      }

      const nextPly = plyCursor + 1;
      if (nextPly >= history.length) {
        setChapterComplete(true);
        setTrainerPhase('complete');
        doMarkComplete(activeChapter, 'trained');
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.75 },
          colors: ['#22c55e', '#1ba8c2', '#f0c15c'],
        });
      } else {
        demoTimerRef.current = setTimeout(() => {
          startTrainerDemo(history, nextPly);
        }, 650);
      }
      return true;
    } catch {
      return false;
    }
  };

  // ---- Read mode navigation ----
  const goReadPly = useCallback(
    (nextPly) => {
      if (!history.length) return;
      const count = Math.max(0, Math.min(history.length, nextPly));
      syncBoard(count);
      setPlyCursor(count);

      if (count >= history.length && activeChapter?.id && !readChapterIds.has(activeChapter.id)) {
        setChapterComplete(true);
        doMarkComplete(activeChapter, 'read');
      }
    },
    [history, syncBoard, activeChapter, readChapterIds, doMarkComplete]
  );

  const handleReadNext = () => goReadPly(plyCursor + 1);
  const handleReadPrev = () => goReadPly(Math.max(0, plyCursor - 1));

  useEffect(() => {
    if (studyMode !== 'read' || course?.type !== 'walkthrough') return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goReadPly(plyCursor + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goReadPly(Math.max(0, plyCursor - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [studyMode, course?.type, goReadPly, plyCursor]);

  const handleNextChapter = () => {
    if (!isLastChapter) setActiveChapterIndex((idx) => idx + 1);
  };

  const handleMarkVideoComplete = () => {
    setChapterComplete(true);
    doMarkComplete(activeChapter, 'video');
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.75 },
      colors: ['#22c55e', '#1ba8c2', '#f0c15c'],
    });
  };

  const handleResetChapter = () => {
    initChapter(activeChapter, studyMode);
  };

  // Info panel text
  const moveDescription = useMemo(() => {
    if (course?.type !== 'walkthrough' || !history.length) return null;

    if (studyMode === 'read') {
      if (plyCursor === 0) {
        return {
          text: 'Starting position — use Next to walk through the line.',
          isKey: false,
        };
      }
      const move = history[plyCursor - 1];
      const anno = annotationAtPly(annotations, plyCursor - 1);
      return {
        text: anno?.comment || autoMoveLabel(move, plyCursor - 1),
        isKey: Boolean(anno),
        move,
      };
    }

    // Trainer
    const move = history[plyCursor];
    if (!move) return null;
    const anno = annotationAtPly(annotations, plyCursor);
    if (trainerPhase === 'recall') {
      return {
        text: `Play ${move.san} yourself.`,
        isKey: Boolean(anno),
        move,
      };
    }
    return {
      text: anno?.comment || autoMoveLabel(move, plyCursor),
      isKey: Boolean(anno),
      move,
    };
  }, [course?.type, history, studyMode, plyCursor, annotations, trainerPhase]);

  const boardKeyStyles = useMemo(() => {
    if (!moveDescription?.isKey || !moveDescription.move) return {};
    // In read mode after move; in trainer during demo/confirm the move is on board
    if (studyMode === 'read' && plyCursor > 0) {
      return keySquareStyles(history[plyCursor - 1]);
    }
    if (studyMode === 'trainer' && (trainerPhase === 'awaiting_confirm' || trainerPhase === 'demo')) {
      return keySquareStyles(history[plyCursor]);
    }
    if (studyMode === 'trainer' && trainerPhase === 'recall' && lastMove) {
      return keySquareStyles(lastMove);
    }
    return {};
  }, [moveDescription, studyMode, plyCursor, history, trainerPhase, lastMove]);

  const readProgressLabel =
    history.length === 0
      ? 'No moves'
      : plyCursor === 0
        ? `Start · 0 of ${history.length}`
        : `Move ${plyCursor} of ${history.length}`;

  if (loading) {
    return (
      <div className="py-32 text-center text-slate-400 text-sm">
        Loading interactive training chapter...
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

  const isWalkthrough = course.type === 'walkthrough';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate('/courses')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Courses</span>
        </button>

        <div className="flex items-center gap-2">
          {isWalkthrough && (
            <button
              onClick={() => navigate(`/courses/${courseId}/train`)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded-full border border-cyan-500/25 transition-colors"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>SRS Deck</span>
            </button>
          )}
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Chapter {activeChapterIndex + 1} of {course.chapters?.length || 1}
          </span>
        </div>
      </div>

      {/* Course title + mode toggle */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-base font-bold text-white">{course.title}</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {overallDoneCount}/{totalChapters} trained · {readCount} read · {progressPercent}%
            </p>
          </div>

          {isWalkthrough && (
            <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => handleModeChange('trainer')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  studyMode === 'trainer'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                Trainer
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('read')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  studyMode === 'read'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Read
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {(course.chapters || []).map((ch, idx) => {
            const trained = trainedChapterIds.has(ch.id) || completedChapterIds.has(ch.id);
            const read = readChapterIds.has(ch.id);
            const isCurrent = idx === activeChapterIndex;
            return (
              <button
                key={ch.id || idx}
                title={ch.title}
                onClick={() => setActiveChapterIndex(idx)}
                className={`h-2.5 flex-1 rounded-full transition-all duration-300 ${
                  trained
                    ? 'bg-emerald-500'
                    : read
                      ? 'bg-sky-500/70'
                      : isCurrent
                        ? 'bg-emerald-500/35 ring-1 ring-emerald-400/50'
                        : 'bg-slate-700 hover:bg-slate-600'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* 3-column study layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: chapter list */}
        <aside className="lg:col-span-3 space-y-3 order-2 lg:order-1">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                Chapters
              </h3>
              <span className="text-[10px] font-mono text-slate-500">
                T {trainedCount} · R {readCount}
              </span>
            </div>

            <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-0.5">
              {(course.chapters || []).map((ch, idx) => {
                const isCurrent = idx === activeChapterIndex;
                const trained = trainedChapterIds.has(ch.id) || completedChapterIds.has(ch.id);
                const read = readChapterIds.has(ch.id);
                return (
                  <button
                    key={ch.id || idx}
                    onClick={() => setActiveChapterIndex(idx)}
                    className={`w-full p-2.5 rounded-xl text-left transition-all ${
                      isCurrent
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <span className="text-[10px] font-mono text-slate-500 uppercase block">
                          Ch. {idx + 1}
                        </span>
                        <span className="text-xs font-medium line-clamp-2 leading-snug">
                          {ch.title}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                        {trained ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-400">
                            <CircleCheck className="w-3 h-3" /> T
                          </span>
                        ) : (
                          <Circle className="w-3 h-3 text-slate-700" />
                        )}
                        {read && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-400">
                            <Eye className="w-3 h-3" /> R
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Center: board / video */}
        <div className="lg:col-span-5 space-y-4 order-1 lg:order-2">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div>
              <h2 className="text-lg font-extrabold text-white leading-snug">
                {activeChapter?.title || course.title}
              </h2>
              {isWalkthrough && (
                <p className="text-[11px] text-slate-500 mt-1">
                  {studyMode === 'trainer'
                    ? 'Watch each move, confirm, then play it yourself.'
                    : 'Flip through the line at your own pace — no quizzes.'}
                </p>
              )}
            </div>

            {!isWalkthrough ? (
              <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 relative flex items-center justify-center">
                {activeChapter?.video_url ? (
                  isYouTubeUrl(activeChapter.video_url) ? (
                    <iframe
                      title={activeChapter.title || 'Course video'}
                      src={getYouTubeEmbedUrl(activeChapter.video_url)}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : (
                    <video controls className="w-full h-full object-contain" src={activeChapter.video_url}>
                      Your browser does not support the video tag.
                    </video>
                  )
                ) : (
                  <div className="text-center text-slate-500 text-xs">
                    <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No video URL attached to this chapter.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ChessboardView
                  position={fen}
                  onPieceDrop={handlePieceDrop}
                  lastMove={lastMove}
                  customSquareStyles={boardKeyStyles}
                  isDraggable={studyMode === 'trainer' && trainerPhase === 'recall' && !chapterComplete}
                />

                <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                  <button
                    onClick={handleResetChapter}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>

                  {studyMode === 'read' && (
                    <>
                      <button
                        onClick={handleReadPrev}
                        disabled={plyCursor <= 0}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Prev
                      </button>
                      <span className="text-[11px] font-mono text-slate-400 px-2">
                        {readProgressLabel}
                      </span>
                      <button
                        onClick={handleReadNext}
                        disabled={plyCursor >= history.length}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600/80 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-semibold"
                      >
                        Next
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Video checkpoint */}
            {!isWalkthrough && !chapterComplete && (
              <button
                onClick={handleMarkVideoComplete}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-bold border border-emerald-500/40 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark Chapter as Watched &amp; Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Trainer gate */}
            {isWalkthrough &&
              studyMode === 'trainer' &&
              trainerPhase === 'awaiting_confirm' &&
              !chapterComplete && (
                <button
                  onClick={handleGotIt}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
                >
                  Got it — let me try
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

            {feedback && isWalkthrough && studyMode === 'trainer' && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : feedback.type === 'error'
                      ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                      : 'bg-slate-800/80 text-slate-300 border border-slate-700'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : feedback.type === 'error' ? (
                  <HelpCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <Brain className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                )}
                <p className="leading-relaxed">{feedback.message}</p>
              </div>
            )}

            {chapterComplete && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Chapter Complete</h4>
                    <p className="text-[11px] text-slate-400">
                      {!isWalkthrough
                        ? 'Marked as watched.'
                        : studyMode === 'trainer'
                          ? 'All moves trained for this chapter.'
                          : 'You finished reading this chapter.'}
                    </p>
                  </div>
                </div>
                {!isLastChapter ? (
                  <button
                    onClick={handleNextChapter}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                  >
                    Next Chapter
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/courses')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700"
                  >
                    Back to Courses
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: description panel */}
        <aside className="lg:col-span-4 space-y-3 order-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 min-h-[280px]">
            <div className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Chapter overview
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed">
                {activeChapter?.description?.trim() ||
                  'No chapter description yet. Coaches can add one in the course builder.'}
              </p>
            </div>

            {isWalkthrough && (
              <>
                <div className="border-t border-slate-800 pt-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {studyMode === 'trainer' ? 'This move' : 'Position note'}
                    </h3>
                    {moveDescription?.isKey && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/35 text-[10px] font-bold uppercase tracking-wide">
                        <Sparkles className="w-3 h-3" />
                        Key Moment
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm leading-relaxed ${
                      moveDescription?.isKey ? 'text-amber-100' : 'text-slate-300'
                    }`}
                  >
                    {moveDescription?.text || 'Follow the line on the board.'}
                  </p>
                  {studyMode === 'read' && (
                    <p className="text-[11px] font-mono text-slate-500 pt-1">
                      {readProgressLabel}
                      <span className="text-slate-600"> · arrow keys supported</span>
                    </p>
                  )}
                  {studyMode === 'trainer' && history.length > 0 && (
                    <p className="text-[11px] font-mono text-slate-500 pt-1">
                      Ply {Math.min(plyCursor + 1, history.length)} of {history.length}
                      {trainerPhase === 'recall' ? ' · your move' : ''}
                      {trainerPhase === 'awaiting_confirm' ? ' · confirm to continue' : ''}
                    </p>
                  )}
                </div>

                {studyMode === 'trainer' &&
                  trainerPhase === 'awaiting_confirm' &&
                  isKeyMoment &&
                  currentAnnotation?.keyMove && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-[11px] text-amber-200/90">
                      Key move:{' '}
                      <span className="font-mono font-bold">{currentAnnotation.keyMove}</span>
                    </div>
                  )}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
