'use client';

import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Course, CourseChapter, User } from '@/lib/types';
import ChessboardView from './ChessboardView';
import MoveHistoryTree from './MoveHistoryTree';
import {
  CheckCircle2,
  Circle,
  Video,
  Layout,
  Play,
  ArrowRight,
  BookOpen,
  Award,
  ChevronRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { getCompletedChapters, toggleChapterComplete } from '@/lib/store';

interface CourseViewerProps {
  course: Course;
  currentUser: User;
}

export default function CourseViewer({ course, currentUser }: CourseViewerProps) {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [completedChapters, setCompletedChapters] = useState<string[]>([]);
  const [game, setGame] = useState<Chess>(new Chess());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);

  const activeChapter: CourseChapter | undefined = course.chapters[activeChapterIndex];

  // Load progress
  useEffect(() => {
    setCompletedChapters(getCompletedChapters(course.id));
  }, [course.id]);

  // Load PGN or FEN when active chapter changes
  useEffect(() => {
    if (!activeChapter) return;

    const newGame = new Chess();
    if (activeChapter.initialFen) {
      try {
        newGame.load(activeChapter.initialFen);
      } catch (e) {}
    } else if (activeChapter.pgn) {
      try {
        newGame.loadPgn(activeChapter.pgn);
      } catch (e) {}
    }

    const historyMoves = newGame.history();
    setMoveHistory(historyMoves);

    // Reset game to starting position so student can step through move-by-move
    const stepGame = new Chess(activeChapter.initialFen || undefined);
    setGame(stepGame);
    setCurrentMoveIndex(0);
  }, [activeChapterIndex, activeChapter]);

  const handleToggleComplete = (chapterId: string) => {
    const updated = toggleChapterComplete(course.id, chapterId);
    setCompletedChapters([...updated]);
  };

  const handleNavigateMove = (index: number) => {
    if (!activeChapter) return;
    const newGame = new Chess(activeChapter.initialFen || undefined);
    for (let i = 0; i < index; i++) {
      if (moveHistory[i]) {
        newGame.move(moveHistory[i]);
      }
    }
    setGame(newGame);
    setCurrentMoveIndex(index);
  };

  const progressPercent = course.chapters.length > 0
    ? Math.round((completedChapters.length / course.chapters.length) * 100)
    : 0;

  const getEmbedVideoUrl = (url?: string) => {
    if (!url) return null;
    if (url.includes('youtube.com/watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  };

  if (!activeChapter) {
    return <div className="p-8 text-center text-gray-500">No chapters found for this course.</div>;
  }

  const isCompleted = completedChapters.includes(activeChapter.id);

  return (
    <div className="space-y-6">
      {/* Course Header Banner */}
      <div className="bg-gradient-to-r from-sjsfi-950 via-sjsfi-900 to-sjsfi-850 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-sjsfi-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sjsfi-gold text-gray-950 uppercase tracking-wider">
                {course.level}
              </span>
              <span className="text-xs text-sjsfi-200 font-medium">
                {course.category} • {course.institution}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">{course.title}</h1>
            <p className="text-sm text-sjsfi-100/90 max-w-2xl">{course.description}</p>
          </div>

          {/* Progress Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 min-w-[220px]">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-sjsfi-100">Course Progress</span>
              <span className="text-sjsfi-gold font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-black/30 rounded-full h-2 overflow-hidden mb-2">
              <div
                className="bg-sjsfi-gold h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-[11px] text-sjsfi-200 flex items-center justify-between">
              <span>
                {completedChapters.length} of {course.chapters.length} completed
              </span>
              {progressPercent === 100 && (
                <span className="flex items-center gap-1 text-emerald-300 font-bold">
                  <Award className="w-3.5 h-3.5" /> Complete!
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chapters Navigation Sidebar (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sjsfi-900" />
                <span className="text-sm font-bold text-gray-900">Curriculum Chapters</span>
              </div>
              <span className="text-xs text-gray-500 font-medium">{course.chapters.length} Lessons</span>
            </div>

            <div className="space-y-2">
              {course.chapters.map((ch, idx) => {
                const isActive = idx === activeChapterIndex;
                const isChCompleted = completedChapters.includes(ch.id);

                return (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChapterIndex(idx)}
                    className={`w-full text-left p-3 rounded-xl transition-all border flex items-start gap-3 ${
                      isActive
                        ? 'bg-sjsfi-50/80 border-sjsfi-400 shadow-xs ring-1 ring-sjsfi-300'
                        : 'border-transparent hover:bg-gray-50 hover:border-gray-200 text-gray-700'
                    }`}
                  >
                    {/* Completion indicator */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleComplete(ch.id);
                      }}
                      className="mt-0.5 shrink-0 text-gray-400 hover:text-sjsfi-700 transition-colors"
                      title={isChCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {isChCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                            ch.type === 'board'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : ch.type === 'video'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {ch.type === 'board' ? 'Move-by-Move' : ch.type === 'video' ? 'Video Lesson' : 'Dual Board + Video'}
                        </span>
                      </div>
                      <p className={`text-xs font-semibold truncate ${isActive ? 'text-sjsfi-950 font-bold' : 'text-gray-800'}`}>
                        {ch.title}
                      </p>
                    </div>

                    <ChevronRight className={`w-4 h-4 mt-1 shrink-0 ${isActive ? 'text-sjsfi-900' : 'text-gray-300'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Active Lesson Display Area (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Lesson Header & Mark Complete */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-sjsfi-900 uppercase tracking-wider">
                  Chapter {activeChapter.order || activeChapterIndex + 1}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500 capitalize">{activeChapter.type} format</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">{activeChapter.title}</h2>
              <p className="text-xs text-gray-600 mt-1">{activeChapter.description}</p>
            </div>

            <button
              onClick={() => handleToggleComplete(activeChapter.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 ${
                isCompleted
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                  : 'bg-sjsfi-900 text-white hover:bg-sjsfi-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isCompleted ? 'Completed' : 'Mark as Complete'}</span>
            </button>
          </div>

          {/* Render based on lesson format: 'board', 'video', or 'both' */}
          {activeChapter.type === 'video' && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs p-6 space-y-4">
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner">
                {activeChapter.videoUrl ? (
                  <iframe
                    src={getEmbedVideoUrl(activeChapter.videoUrl) || ''}
                    title={activeChapter.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                    <Video className="w-12 h-12 mb-2 opacity-50" />
                    <p className="text-sm font-semibold">Video Masterclass</p>
                    <p className="text-xs text-gray-500">Video link will be added by Coach Admin.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeChapter.type === 'board' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-7">
                  <ChessboardView
                    game={game}
                    allowMoves={false}
                    currentMoveIndex={currentMoveIndex}
                    totalMoves={moveHistory.length}
                    onNavigateMove={handleNavigateMove}
                  />
                </div>
                <div className="md:col-span-5 h-[460px]">
                  <MoveHistoryTree
                    moves={moveHistory}
                    currentMoveIndex={currentMoveIndex}
                    onSelectMove={handleNavigateMove}
                    moveExplanations={activeChapter.moveExplanations}
                    pgn={activeChapter.pgn}
                    fen={game.fen()}
                  />
                </div>
              </div>
            </div>
          )}

          {activeChapter.type === 'both' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6">
              <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-sjsfi-50 border border-sjsfi-200 text-sjsfi-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sjsfi-gold" />
                <span>Dual Mode: Watch the video lecture and interact with the moves on the digital board simultaneously.</span>
              </div>

              {/* Video Player */}
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner">
                {activeChapter.videoUrl ? (
                  <iframe
                    src={getEmbedVideoUrl(activeChapter.videoUrl) || ''}
                    title={activeChapter.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                    <Video className="w-12 h-12 mb-2 opacity-50" />
                    <p className="text-sm font-semibold">Video Masterclass</p>
                  </div>
                )}
              </div>

              {/* Synchronized Board and Move Tree */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pt-2">
                <div className="md:col-span-7">
                  <ChessboardView
                    game={game}
                    allowMoves={false}
                    currentMoveIndex={currentMoveIndex}
                    totalMoves={moveHistory.length}
                    onNavigateMove={handleNavigateMove}
                  />
                </div>
                <div className="md:col-span-5 h-[460px]">
                  <MoveHistoryTree
                    moves={moveHistory}
                    currentMoveIndex={currentMoveIndex}
                    onSelectMove={handleNavigateMove}
                    moveExplanations={activeChapter.moveExplanations}
                    pgn={activeChapter.pgn}
                    fen={game.fen()}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Key Takeaways Card */}
          {activeChapter.keyTakeaways && activeChapter.keyTakeaways.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <Award className="w-4 h-4 text-sjsfi-gold" />
                Coach's Key Takeaways
              </h3>
              <ul className="space-y-2">
                {activeChapter.keyTakeaways.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-sjsfi-700 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
