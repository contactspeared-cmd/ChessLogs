import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import ChessboardView from '../components/ChessboardView';
import { getCourseById, markChapterComplete } from '../lib/db';
import { getYouTubeEmbedUrl, isYouTubeUrl } from '../lib/youtube';
import {
  ArrowLeft,
  CheckCircle2,
  Video,
  ChevronRight,
  RotateCcw,
  HelpCircle,
  Award,
  BookOpen,
  Brain,
  CircleCheck,
  Circle,
} from 'lucide-react';

export default function CoursePlayer() {
  const { id: courseId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);

  // Track which chapters the user has marked complete in this session
  const [completedChapterIds, setCompletedChapterIds] = useState(new Set());

  // Walkthrough Chess engine state
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [history, setHistory] = useState([]);
  const [lastMove, setLastMove] = useState(null);

  // Interactive challenge state for current chapter
  const [currentAnnotationIndex, setCurrentAnnotationIndex] = useState(0);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  // Load course
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getCourseById(courseId);
        setCourse(data);
        // Seed completed chapters from stored progress
        if (data?.progress?.completed_chapter_ids?.length) {
          setCompletedChapterIds(new Set(data.progress.completed_chapter_ids));
        }
      } catch (e) {
        console.error('Failed to load course:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId]);

  const activeChapter = course?.chapters?.[activeChapterIndex] || null;

  // Derived progress
  const totalChapters = course?.chapters?.length || 1;
  const completedCount = completedChapterIds.size;
  const progressPercent = Math.min(100, Math.round((completedCount / totalChapters) * 100));

  // Initialize chapter when active chapter changes
  const initChapter = useCallback((chapter) => {
    if (!chapter) return;
    setFeedback(null);
    setChallengeCompleted(false);
    setCurrentAnnotationIndex(0);

    if (chapter.pgn) {
      try {
        chess.loadPgn(chapter.pgn);
        const fullHistory = chess.history({ verbose: true });
        setHistory(fullHistory);

        // Find first annotated key move ply or start at move 0
        const annotations = chapter.annotations || [];
        const firstKeyPly = annotations.length > 0 ? annotations[0].ply : fullHistory.length;

        // Reset to position right before the first key move
        chess.reset();
        let targetPly = Math.max(0, firstKeyPly - 1);
        let moveObj = null;
        for (let i = 0; i < targetPly; i++) {
          moveObj = chess.move(fullHistory[i]);
        }

        setFen(chess.fen());
        setLastMove(moveObj ? { from: moveObj.from, to: moveObj.to } : null);
      } catch (err) {
        console.error('Failed to parse chapter PGN:', err);
      }
    }
  }, [chess]);

  useEffect(() => {
    if (activeChapter) {
      initChapter(activeChapter);
      // If this chapter is already completed, show it as such immediately
      if (activeChapter.id && completedChapterIds.has(activeChapter.id)) {
        setChallengeCompleted(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChapter, initChapter]);

  // Mark a chapter complete (both local state + DB)
  const doMarkComplete = useCallback(
    (chapter) => {
      if (!chapter?.id) return;
      setCompletedChapterIds((prev) => {
        if (prev.has(chapter.id)) return prev;
        const next = new Set(prev);
        next.add(chapter.id);
        return next;
      });
      if (profile?.id) {
        markChapterComplete(courseId, profile.id, chapter.id);
      }
    },
    [courseId, profile?.id]
  );

  // Handle student move on board in walkthrough
  const handlePieceDrop = (sourceSquare, targetSquare) => {
    if (challengeCompleted || !activeChapter) return false;

    const annotations = activeChapter.annotations || [];
    const currentAnnotation = annotations[currentAnnotationIndex];

    try {
      // Test if move is legal
      const moveAttempt = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (!moveAttempt) return false;

      const playedSan = moveAttempt.san;
      const expectedSan = currentAnnotation?.keyMove;

      // Check if move matches key expected move (or matches next move in game history)
      const isCorrect = expectedSan
        ? playedSan.replace(/[+#]/g, '') === expectedSan.replace(/[+#]/g, '')
        : true;

      if (isCorrect) {
        setFen(chess.fen());
        setLastMove({ from: sourceSquare, to: targetSquare });

        setFeedback({
          type: 'success',
          message: currentAnnotation?.comment || `Excellent move! ${playedSan} played correctly.`,
        });

        // Trigger confetti celebration
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#22c55e', '#1ba8c2', '#f0c15c'],
        });

        // Advance to next annotation or complete chapter
        if (currentAnnotationIndex + 1 < annotations.length) {
          setCurrentAnnotationIndex((idx) => idx + 1);
          // Play opponent response automatically if exists
          setTimeout(() => {
            const nextKeyPly = annotations[currentAnnotationIndex + 1].ply;
            // Catch up moves in between
            while (chess.history().length < nextKeyPly - 1 && chess.history().length < history.length) {
              const nextMove = history[chess.history().length];
              if (nextMove) chess.move(nextMove);
            }
            setFen(chess.fen());
          }, 800);
        } else {
          // Chapter finished!
          setChallengeCompleted(true);
          doMarkComplete(activeChapter);
        }
        return true;
      } else {
        // Incorrect move - revert
        chess.undo();
        setFen(chess.fen());
        setFeedback({
          type: 'error',
          message: `Not quite! ${playedSan} is not the coach's intended move here. Try again or check the hint.`,
        });
        return false;
      }
    } catch {
      return false;
    }
  };

  const handleNextChapter = () => {
    if (activeChapterIndex + 1 < (course?.chapters?.length || 0)) {
      setActiveChapterIndex((idx) => idx + 1);
    }
  };

  // Mark video chapter as watched and advance
  const handleMarkVideoComplete = () => {
    setChallengeCompleted(true);
    doMarkComplete(activeChapter);
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.75 },
      colors: ['#22c55e', '#1ba8c2', '#f0c15c'],
    });
  };

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

  const isLastChapter = activeChapterIndex + 1 >= (course.chapters?.length || 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate('/courses')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Courses</span>
        </button>

        <div className="flex items-center gap-2">
          {course.type === 'walkthrough' && (
            <button
              onClick={() => navigate(`/courses/${courseId}/train`)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded-full border border-cyan-500/25 transition-colors"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Move Trainer</span>
            </button>
          )}
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Chapter {activeChapterIndex + 1} of {course.chapters?.length || 1}
          </span>
        </div>
      </div>

      {/* Course Progress Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 shadow-xl space-y-2.5">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-slate-300 font-semibold">{course.title}</span>
          <span
            className={`font-mono font-bold ${
              progressPercent === 100 ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            {completedCount}/{totalChapters} chapters &mdash; {progressPercent}%
          </span>
        </div>

        {/* Segmented chapter progress bar */}
        <div className="flex items-center gap-1">
          {(course.chapters || []).map((ch, idx) => {
            const isDone = completedChapterIds.has(ch.id);
            const isCurrent = idx === activeChapterIndex;
            return (
              <button
                key={ch.id || idx}
                title={ch.title}
                onClick={() => setActiveChapterIndex(idx)}
                className={`h-2.5 flex-1 rounded-full transition-all duration-300 ${
                  isDone
                    ? 'bg-emerald-500'
                    : isCurrent
                    ? 'bg-emerald-500/40 ring-1 ring-emerald-400/60'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              />
            );
          })}
        </div>

        {/* Chapter checkpoint dots row */}
        <div className="flex items-start gap-1">
          {(course.chapters || []).map((ch, idx) => {
            const isDone = completedChapterIds.has(ch.id);
            const isCurrent = idx === activeChapterIndex;
            return (
              <div key={ch.id || idx} className="flex-1 flex justify-center">
                {isDone ? (
                  <CircleCheck
                    className={`w-3 h-3 text-emerald-500 transition-all ${isCurrent ? 'scale-125' : ''}`}
                  />
                ) : (
                  <Circle
                    className={`w-3 h-3 transition-all ${
                      isCurrent ? 'text-emerald-400 scale-125' : 'text-slate-600'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Board / Video Player */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div>
              <h1 className="text-xl font-extrabold text-white">
                {activeChapter?.title || course.title}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {course.type === 'walkthrough'
                  ? 'Chessable-style active training: execute the annotated tactical and strategic moves on the board.'
                  : 'Watch the lecture carefully, taking note of critical pawn structures and tactical motifs.'}
              </p>
            </div>

            {/* Video Player or Chessboard */}
            {course.type === 'video' ? (
              <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative flex items-center justify-center">
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
                    <video
                      controls
                      className="w-full h-full object-contain"
                      src={activeChapter.video_url}
                    >
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
              <div className="flex flex-col items-center justify-center py-2">
                <ChessboardView
                  position={fen}
                  onPieceDrop={handlePieceDrop}
                  lastMove={lastMove}
                  isDraggable={!challengeCompleted}
                />

                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={() => initChapter(activeChapter)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Chapter</span>
                  </button>
                </div>
              </div>
            )}

            {/* Interactive Feedback Box */}
            {feedback && (
              <div
                className={`p-4 rounded-xl text-xs flex items-start gap-3 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <HelpCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <strong className="block font-bold">
                    {feedback.type === 'success' ? 'Coach Commentary' : 'Correction Needed'}
                  </strong>
                  <p className="mt-0.5 leading-relaxed">{feedback.message}</p>
                </div>
              </div>
            )}

            {/* Video chapter: "Mark as Watched" checkpoint button */}
            {course.type === 'video' && !challengeCompleted && (
              <button
                onClick={handleMarkVideoComplete}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-bold border border-emerald-500/40 hover:border-emerald-500 transition-all shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Chapter as Watched &amp; Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Chapter Finished Banner */}
            {challengeCompleted && (
              <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Chapter Complete!</h4>
                    <p className="text-xs text-slate-400">
                      {course.type === 'video'
                        ? 'Chapter marked as watched. Keep it up!'
                        : 'You have executed all required tactical steps for this chapter.'}
                    </p>
                  </div>
                </div>

                {!isLastChapter ? (
                  <button
                    onClick={handleNextChapter}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                  >
                    <span>Next Chapter</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Full Course Completed! 🎉
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Chapter Directory Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>Course Chapters</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                {completedCount}/{totalChapters}
              </span>
            </div>

            <div className="space-y-2">
              {(course.chapters || []).map((ch, idx) => {
                const isCurrent = idx === activeChapterIndex;
                const isDone = completedChapterIds.has(ch.id);
                return (
                  <button
                    key={ch.id || idx}
                    onClick={() => setActiveChapterIndex(idx)}
                    className={`w-full p-3 rounded-xl text-left transition-all flex items-center justify-between gap-2 ${
                      isCurrent
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                        : isDone
                        ? 'bg-emerald-950/40 text-slate-300 border border-emerald-900/60 hover:bg-emerald-950/60'
                        : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border border-slate-800/80'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[11px] font-mono text-slate-400 uppercase block">
                        Chapter {idx + 1}
                      </span>
                      <span className="text-xs font-medium line-clamp-1">{ch.title}</span>
                    </div>
                    <div className="shrink-0">
                      {isDone ? (
                        <CircleCheck className="w-4 h-4 text-emerald-500" />
                      ) : isCurrent ? (
                        <ChevronRight className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-700" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
