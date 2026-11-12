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
  GraduationCap,
} from 'lucide-react';

const MODE_STORAGE_PREFIX = 'chesslogs_study_mode_';
const AUTO_ADVANCE_KEY = 'chesslogs_trainer_auto_advance';

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

function resolveChapterTrainedSide(chapter, course) {
  return chapter?.trained_side || course?.trained_side || 'both';
}

function isTrainedPly(move, trainedSide) {
  if (!move) return false;
  const side = String(trainedSide || 'both').toLowerCase();
  if (side === 'both') return true;
  if (side === 'white') return move.color === 'w';
  if (side === 'black') return move.color === 'b';
  return true;
}

function applyHistoryTo(chess, history, plyCount, startFen = null) {
  if (startFen) {
    chess.load(startFen);
  } else {
    chess.reset();
  }
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
  const [studyMode, setStudyMode] = useState('trainer');

  const [readChapterIds, setReadChapterIds] = useState(() => new Set());
  const [trainedChapterIds, setTrainedChapterIds] = useState(() => new Set());
  const [completedChapterIds, setCompletedChapterIds] = useState(() => new Set());

  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [history, setHistory] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [chapterStartFen, setChapterStartFen] = useState(null);
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [plyCursor, setPlyCursor] = useState(0);

  const [trainerPhase, setTrainerPhase] = useState('demo');
  const [chapterComplete, setChapterComplete] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const [autoAdvance, setAutoAdvance] = useState(() => {
    try {
      return localStorage.getItem(AUTO_ADVANCE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const demoTimerRef = useRef(null);
  const trainedSideRef = useRef('both');
  const autoAdvanceRef = useRef(autoAdvance);
  const chapterMetaRef = useRef({ chapter: null, isLast: false, mark: null });

  const clearDemoTimer = () => {
    if (demoTimerRef.current) {
      clearTimeout(demoTimerRef.current);
      demoTimerRef.current = null;
    }
  };

  useEffect(() => () => clearDemoTimer(), []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getCourseById(courseId, profile?.id || null);
        setCourse(data);

        const progress = data?.progress || {};
        const completedIds = new Set(progress.completed_chapter_ids || []);
        const trainedIds = new Set(progress.trained_chapter_ids || []);
        const readIds = new Set(progress.read_chapter_ids || []);
        setReadChapterIds(readIds);
        setTrainedChapterIds(trainedIds);
        setCompletedChapterIds(completedIds);

        const storedMode =
          progress.preferred_study_mode ||
          (typeof localStorage !== 'undefined'
            ? localStorage.getItem(`${MODE_STORAGE_PREFIX}${courseId}`)
            : null);
        if (storedMode === 'read' || storedMode === 'trainer') {
          setStudyMode(storedMode);
        }

        const chapters = data?.chapters || [];
        const doneIds = new Set([...completedIds, ...trainedIds]);
        if (doneIds.size > 0 && chapters.length > 1) {
          let furthest = 0;
          chapters.forEach((ch, idx) => {
            if (doneIds.has(ch.id)) furthest = idx;
          });
          const resumeIdx = Math.min(furthest + 1, chapters.length - 1);
          setActiveChapterIndex(resumeIdx);
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
      const moveObj = applyHistoryTo(chess, history, plyCount, chapterStartFen);
      setFen(chess.fen());
      setLastMove(
        highlightMove && moveObj ? { from: moveObj.from, to: moveObj.to } : null
      );
    },
    [chess, history, chapterStartFen]
  );

  useEffect(() => {
    trainedSideRef.current = resolveChapterTrainedSide(activeChapter, course);
  }, [activeChapter, course]);

  useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
    try {
      localStorage.setItem(AUTO_ADVANCE_KEY, autoAdvance ? '1' : '0');
    } catch {}
  }, [autoAdvance]);

  const enterRecallForPly = useCallback(
    (moves, ply, startFen) => {
      applyHistoryTo(chess, moves, ply, startFen);
      setFen(chess.fen());
      setLastMove(null);
      setPlyCursor(ply);
      setTrainerPhase('recall');
      const expected = moves[ply];
      setFeedback({
        type: 'prompt',
        message: expected
          ? `Your turn — play ${expected.san} on the board.`
          : 'Your turn.',
      });
    },
    [chess]
  );

  const startTrainerDemo = useCallback(
    (moves, startPly = 0, startFen = null) => {
      clearDemoTimer();
      setFeedback(null);
      setChapterComplete(false);

      if (!moves.length) {
        setPlyCursor(0);
        if (startFen) {
          chess.load(startFen);
        } else {
          chess.reset();
        }
        setFen(chess.fen());
        setLastMove(null);
        setTrainerPhase('complete');
        setChapterComplete(true);
        return;
      }

      const trainedSide = trainedSideRef.current;
      let ply = startPly;

      const finishChapter = () => {
        setPlyCursor(moves.length);
        setTrainerPhase('complete');
        setChapterComplete(true);
        const { chapter, isLast, mark } = chapterMetaRef.current;
        if (chapter && mark) mark(chapter, 'trained');
        if (isLast) setShowCompletionModal(true);
      };

      const demoTrainedMove = (trainedPly) => {
        applyHistoryTo(chess, moves, trainedPly, startFen);
        setFen(chess.fen());
        setLastMove(null);
        setPlyCursor(trainedPly);
        setTrainerPhase('demo');

        demoTimerRef.current = setTimeout(() => {
          const moveObj = chess.move(moves[trainedPly]);
          setFen(chess.fen());
          setLastMove(moveObj ? { from: moveObj.from, to: moveObj.to } : null);

          if (autoAdvanceRef.current) {
            enterRecallForPly(moves, trainedPly, startFen);
          } else {
            setTrainerPhase('awaiting_confirm');
          }
        }, 280);
      };

      const autoPlayUntrainedThenDemo = () => {
        applyHistoryTo(chess, moves, ply, startFen);
        setFen(chess.fen());
        setLastMove(null);
        setPlyCursor(ply);

        if (ply >= moves.length) {
          finishChapter();
          return;
        }

        if (!isTrainedPly(moves[ply], trainedSide)) {
          setTrainerPhase('demo');
          demoTimerRef.current = setTimeout(() => {
            const moveObj = chess.move(moves[ply]);
            setFen(chess.fen());
            setLastMove(moveObj ? { from: moveObj.from, to: moveObj.to } : null);
            ply += 1;
            setPlyCursor(ply);
            demoTimerRef.current = setTimeout(autoPlayUntrainedThenDemo, 420);
          }, 280);
          return;
        }

        demoTrainedMove(ply);
      };

      autoPlayUntrainedThenDemo();
    },
    [chess, enterRecallForPly]
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
        setChapterStartFen(null);
        setHistory([]);
        setFen(chess.fen());
        setLastMove(null);
        return;
      }

      try {
        const parser = new Chess();
        parser.loadPgn(chapter.pgn);
        const fullHistory = parser.history({ verbose: true });

        const headers = typeof parser.header === 'function' ? parser.header() : {};
        const fenHeader = headers?.FEN || null;
        setChapterStartFen(fenHeader);
        setHistory(fullHistory);

        if (mode === 'read') {
          if (fenHeader) {
            chess.load(fenHeader);
          } else {
            chess.reset();
          }
          setFen(chess.fen());
          setLastMove(null);
          setPlyCursor(0);
        } else {
          startTrainerDemo(fullHistory, 0, fenHeader);
        }
      } catch (err) {
        console.error('Failed to parse chapter PGN:', err);
        setChapterStartFen(null);
        setHistory([]);
      }
    },
    [chess, startTrainerDemo]
  );

  useEffect(() => {
    if (!activeChapter) return;
    setBoardOrientation(activeChapter.orientation || course?.orientation || 'white');
    initChapter(activeChapter, studyMode);
  }, [activeChapter?.id, studyMode]);

  const persistMode = useCallback(
    (mode) => {
      try {
        localStorage.setItem(`${MODE_STORAGE_PREFIX}${courseId}`, mode);
      } catch {}
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

  useEffect(() => {
    chapterMetaRef.current = {
      chapter: activeChapter,
      isLast: isLastChapter,
      mark: doMarkComplete,
    };
  }, [activeChapter, isLastChapter, doMarkComplete]);

  const handleGotIt = () => {
    if (trainerPhase !== 'awaiting_confirm' || !history[plyCursor]) return;
    enterRecallForPly(history, plyCursor, chapterStartFen);
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
        if (isLastChapter) {
          setShowCompletionModal(true);
        }
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.75 },
          colors: ['#22c55e', '#1ba8c2', '#f0c15c'],
        });
      } else {
        demoTimerRef.current = setTimeout(() => {
          startTrainerDemo(history, nextPly, chapterStartFen);
        }, 650);
      }
      return true;
    } catch {
      return false;
    }
  };

  const goReadPly = useCallback(
    (nextPly) => {
      if (!history.length) return;
      const count = Math.max(0, Math.min(history.length, nextPly));
      syncBoard(count);
      setPlyCursor(count);

      if (count >= history.length && activeChapter?.id && !readChapterIds.has(activeChapter.id)) {
        setChapterComplete(true);
        doMarkComplete(activeChapter, 'read');
        if (isLastChapter) {
          setShowCompletionModal(true);
        }
      }
    },
    [history, syncBoard, activeChapter, readChapterIds, doMarkComplete, isLastChapter]
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
    if (isLastChapter) {
      setShowCompletionModal(true);
    }
  };

  const handleResetChapter = () => {
    initChapter(activeChapter, studyMode);
  };

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
      <div className="py-32 text-center text-slate-500 text-sm font-medium">
        Loading interactive training chapter...
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Course not found</h2>
        <button
          onClick={() => navigate('/courses')}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
        >
          Return to Courses
        </button>
      </div>
    );
  }

  const isWalkthrough = course.type === 'walkthrough';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate('/courses')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Courses</span>
        </button>

        <div className="flex items-center gap-2">
          {isWalkthrough && (
            <button
              onClick={() => navigate(`/courses/${courseId}/train`)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 rounded-full border border-cyan-200 transition-colors"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>SRS Deck</span>
            </button>
          )}
          <span className="text-xs font-mono font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Chapter {activeChapterIndex + 1} of {course.chapters?.length || 1}
          </span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-slate-900">{course.title}</h1>
              {course.coach_name && (
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <GraduationCap className="w-3 h-3 text-amber-600" />
                  <span>Curriculum by Coach {course.coach_name}</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {overallDoneCount}/{totalChapters} trained · {readCount} read · {progressPercent}%
            </p>
          </div>

          {isWalkthrough && (
            <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => handleModeChange('trainer')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  studyMode === 'trainer'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
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
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
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
                      ? 'bg-sky-500'
                      : isCurrent
                        ? 'bg-emerald-200 ring-2 ring-emerald-500'
                        : 'bg-slate-200 hover:bg-slate-300'
                }`}
              />
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <aside className="lg:col-span-3 space-y-3 order-2 lg:order-1">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                Chapters
              </h3>
              <span className="text-[10px] font-mono text-slate-500 font-medium">
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
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-semibold shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <span className="text-[10px] font-mono text-slate-500 uppercase block font-medium">
                          Ch. {idx + 1}
                        </span>
                        <span className="text-xs font-medium line-clamp-2 leading-snug">
                          {ch.title}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                        {trained ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600">
                            <CircleCheck className="w-3 h-3" /> T
                          </span>
                        ) : (
                          <Circle className="w-3 h-3 text-slate-300" />
                        )}
                        {read && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-600">
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

        <div className="lg:col-span-5 space-y-4 order-1 lg:order-2 min-w-0">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 overflow-hidden">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 leading-snug">
                {activeChapter?.title || course.title}
              </h2>
              {isWalkthrough && (
                <p className="text-[11px] text-slate-600 mt-1">
                  {studyMode === 'trainer'
                    ? 'Watch trained-side moves, confirm, then play them yourself. Opposite-side moves auto-play.'
                    : 'Flip through the line at your own pace — no quizzes.'}
                </p>
              )}
              {isWalkthrough && studyMode === 'trainer' && (
                <label className="mt-2 inline-flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoAdvance}
                    onChange={(e) => setAutoAdvance(e.target.checked)}
                    className="rounded border-slate-300 bg-white text-emerald-600 focus:ring-emerald-500/40"
                  />
                  Auto-advance (skip “Got it” confirmation)
                </label>
              )}
            </div>

            {!isWalkthrough ? (
              <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-200 relative flex items-center justify-center">
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
                  <div className="text-center text-slate-400 text-xs">
                    <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No video URL attached to this chapter.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full max-w-full overflow-hidden flex flex-col items-center">
                <ChessboardView
                  position={fen}
                  boardOrientation={boardOrientation}
                  onPieceDrop={handlePieceDrop}
                  lastMove={lastMove}
                  customSquareStyles={boardKeyStyles}
                  isDraggable={studyMode === 'trainer' && trainerPhase === 'recall' && !chapterComplete}
                />

                <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                  <button
                    onClick={() => setBoardOrientation((prev) => (prev === 'white' ? 'black' : 'white'))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors border border-slate-200"
                    title="Flip Board Perspective"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Flip
                  </button>

                  <button
                    onClick={handleResetChapter}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors border border-slate-200"
                  >
                    Reset
                  </button>

                  {studyMode === 'read' && (
                    <>
                      <button
                        onClick={handleReadPrev}
                        disabled={plyCursor <= 0}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-semibold border border-slate-200"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Prev
                      </button>
                      <span className="text-[11px] font-mono text-slate-600 px-2 font-medium">
                        {readProgressLabel}
                      </span>
                      <button
                        onClick={handleReadNext}
                        disabled={plyCursor >= history.length}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white text-xs font-semibold shadow-sm"
                      >
                        Next
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {!isWalkthrough && !chapterComplete && (
              <button
                onClick={handleMarkVideoComplete}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white text-xs font-bold border border-emerald-300 transition-all shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark Chapter as Watched &amp; Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {isWalkthrough &&
              studyMode === 'trainer' &&
              trainerPhase === 'awaiting_confirm' &&
              !chapterComplete && (
                <button
                  onClick={handleGotIt}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  Got it — let me try
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

            {feedback && isWalkthrough && studyMode === 'trainer' && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-medium'
                    : feedback.type === 'error'
                      ? 'bg-rose-50 text-rose-900 border border-rose-200 font-medium'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : feedback.type === 'error' ? (
                  <HelpCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <Brain className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                )}
                <p className="leading-relaxed">{feedback.message}</p>
              </div>
            )}

            {chapterComplete && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">Chapter Complete</h4>
                    <p className="text-[11px] text-emerald-700 font-medium">
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
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                  >
                    Next Chapter
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setActiveChapterIndex(0);
                        setShowCompletionModal(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Review Course
                    </button>
                    <button
                      onClick={() => navigate('/courses')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 transition-all shadow-sm"
                    >
                      Back to Courses
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-3 order-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 min-h-[280px]">
            <div className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Chapter overview
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {activeChapter?.description?.trim() ||
                  'No chapter description yet. Coaches can add one in the course builder.'}
              </p>
            </div>

            {isWalkthrough && (
              <>
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {studyMode === 'trainer' ? 'This move' : 'Position note'}
                    </h3>
                    {moveDescription?.isKey && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase tracking-wide">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        Key Moment
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm leading-relaxed ${
                      moveDescription?.isKey ? 'text-amber-900 font-medium' : 'text-slate-700'
                    }`}
                  >
                    {moveDescription?.text || 'Follow the line on the board.'}
                  </p>
                  {studyMode === 'read' && (
                    <p className="text-[11px] font-mono text-slate-500 pt-1 font-medium">
                      {readProgressLabel}
                      <span className="text-slate-400"> · arrow keys supported</span>
                    </p>
                  )}
                  {studyMode === 'trainer' && history.length > 0 && (
                    <p className="text-[11px] font-mono text-slate-500 pt-1 font-medium">
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
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-900 font-medium">
                      Key move:{' '}
                      <span className="font-mono font-bold">{currentAnnotation.keyMove}</span>
                    </div>
                  )}
              </>
            )}
          </div>
        </aside>
      </div>

      {showCompletionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center justify-center gap-1.5">
                <span>Course Completed!</span>
                <Sparkles className="w-5 h-5 text-emerald-600" />
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                You&apos;ve completed all chapters of <strong className="text-slate-900">{course.title}</strong>. Would you like to review the course again or return to your courses?
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveChapterIndex(0);
                  setShowCompletionModal(false);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Review Course (From Ch. 1)
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCompletionModal(false);
                  navigate('/courses');
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-all"
              >
                Back to Courses
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
