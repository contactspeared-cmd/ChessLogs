'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Plus,
  Trash2,
  Save,
  Video,
  Layout,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { getStoredUser, getStoredCourses, saveCourses } from '@/lib/store';
import { COACH_ADMIN } from '@/lib/initialData';
import { Course, CourseChapter, LessonType } from '@/lib/types';

export default function NewCoursePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(COACH_ADMIN);

  useEffect(() => {
    const user = getStoredUser();
    setCurrentUser(user);
    if (user.role !== 'coach') {
      alert('Only the Head Coach Admin can create courses.');
      router.push('/courses');
    }
  }, [router]);

  // Course metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [category, setCategory] = useState<'Openings' | 'Middlegame' | 'Endgames' | 'Tactics' | 'Game Analysis'>('Openings');

  // Chapters list
  const [chapters, setChapters] = useState<
    {
      id: string;
      title: string;
      description: string;
      type: LessonType;
      videoUrl: string;
      pgn: string;
      initialFen: string;
      moveNotesText: string;
      takeawaysText: string;
    }[]
  >([
    {
      id: 'ch-new-1',
      title: 'Chapter 1: Opening Preparation',
      description: 'Understanding the pawn structures and key tactical ideas.',
      type: 'both',
      videoUrl: 'https://www.youtube.com/watch?v=OCSbzArwB10',
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 *',
      initialFen: '',
      moveNotesText: '1: Stake early claim in center\n3: Target f7 weakness\n4: Prepare d4 steamroller',
      takeawaysText: 'Fight for d4 and e4\nDevelop minor pieces quickly\nProtect king safety',
    },
  ]);

  const addChapter = () => {
    setChapters([
      ...chapters,
      {
        id: `ch-new-${Date.now()}`,
        title: `Chapter ${chapters.length + 1}: Tactical Themes`,
        description: 'Key maneuver and master technique.',
        type: 'board',
        videoUrl: '',
        pgn: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 *',
        initialFen: '',
        moveNotesText: '',
        takeawaysText: '',
      },
    ]);
  };

  const removeChapter = (index: number) => {
    if (chapters.length === 1) return;
    setChapters(chapters.filter((_, idx) => idx !== index));
  };

  const updateChapter = (index: number, field: string, val: any) => {
    const updated = [...chapters];
    updated[index] = { ...updated[index], [field]: val };
    setChapters(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Parse chapters
    const formattedChapters: CourseChapter[] = chapters.map((ch, idx) => {
      // Parse move commentary
      const moveExplanations: Record<number, string> = {};
      ch.moveNotesText.split('\n').forEach((line) => {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const moveNum = parseInt(parts[0].trim(), 10);
          if (!isNaN(moveNum)) {
            moveExplanations[moveNum] = parts.slice(1).join(':').trim();
          }
        }
      });

      // Parse takeaways
      const keyTakeaways = ch.takeawaysText
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean);

      return {
        id: ch.id || `ch-${Date.now()}-${idx}`,
        title: ch.title,
        description: ch.description,
        type: ch.type,
        videoUrl: ch.videoUrl || undefined,
        pgn: ch.pgn || undefined,
        initialFen: ch.initialFen || undefined,
        moveExplanations,
        keyTakeaways,
        order: idx + 1,
      };
    });

    const newCourse: Course = {
      id: `course-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      level,
      category,
      instructor: 'Coach Admin (Head Coach)',
      institution: 'Saint Joseph School Foundation Inc.',
      chapters: formattedChapters,
      totalDuration: `${formattedChapters.length} Chapters`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    const existing = getStoredCourses();
    const updatedCourses = [newCourse, ...existing];
    saveCourses(updatedCourses);

    router.push(`/courses/${newCourse.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Back link */}
      <Link
        href="/courses"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-sjsfi-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Courses</span>
      </Link>

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-sjsfi-100 text-sjsfi-900 border border-sjsfi-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-sjsfi-800" />
              Coach Studio (Admin)
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Create New Chess Course</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure chapters with interactive digital board moves, pure videos, or synchronized dual mode.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Course General Info Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900 pb-2 border-b border-gray-100">
            1. Course Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Course Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. King's Indian Defense: Classical Pawn Storms"
                required
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sjsfi-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sjsfi-600 bg-white"
              >
                <option value="Openings">Openings</option>
                <option value="Middlegame">Middlegame</option>
                <option value="Endgames">Endgames</option>
                <option value="Tactics">Tactics</option>
                <option value="Game Analysis">Game Analysis</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Difficulty Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sjsfi-600 bg-white"
              >
                <option value="Beginner">Beginner (SJSFI Club)</option>
                <option value="Intermediate">Intermediate (Junior Varsity)</option>
                <option value="Advanced">Advanced (Senior Varsity)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Course Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the objectives, theoretical concepts, and key principles students will learn..."
                rows={3}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sjsfi-600 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Chapters Builder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">
              2. Curriculum Chapters ({chapters.length})
            </h2>
            <button
              type="button"
              onClick={addChapter}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sjsfi-50 hover:bg-sjsfi-100 text-sjsfi-900 border border-sjsfi-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Chapter</span>
            </button>
          </div>

          {chapters.map((ch, idx) => (
            <div
              key={ch.id || idx}
              className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4 relative group"
            >
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sjsfi-900 text-white flex items-center justify-center font-bold text-xs">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-gray-800">Chapter {idx + 1}</span>
                </div>

                {chapters.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeChapter(idx)}
                    className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              {/* Title & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Chapter Title</label>
                  <input
                    type="text"
                    value={ch.title}
                    onChange={(e) => updateChapter(idx, 'title', e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sjsfi-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Short Summary</label>
                  <input
                    type="text"
                    value={ch.description}
                    onChange={(e) => updateChapter(idx, 'description', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sjsfi-600"
                  />
                </div>
              </div>

              {/* Format Choice: Move by move, Pure video, or Both */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Lesson Delivery Format (Coach Choice)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Purely move by move */}
                  <div
                    onClick={() => updateChapter(idx, 'type', 'board')}
                    className={`cursor-pointer p-3 rounded-xl border flex flex-col justify-between transition-all ${
                      ch.type === 'board'
                        ? 'border-sjsfi-900 bg-sjsfi-50/80 ring-1 ring-sjsfi-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Layout className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-gray-900">Purely Move by Move</span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Interactive digital chessboard with PGN move-by-move navigation.
                    </p>
                  </div>

                  {/* Pure video */}
                  <div
                    onClick={() => updateChapter(idx, 'type', 'video')}
                    className={`cursor-pointer p-3 rounded-xl border flex flex-col justify-between transition-all ${
                      ch.type === 'video'
                        ? 'border-sjsfi-900 bg-sjsfi-50/80 ring-1 ring-sjsfi-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Video className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-bold text-gray-900">Pure Video</span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Video masterclass lecture with key takeaways and summary.
                    </p>
                  </div>

                  {/* Both */}
                  <div
                    onClick={() => updateChapter(idx, 'type', 'both')}
                    className={`cursor-pointer p-3 rounded-xl border flex flex-col justify-between transition-all ${
                      ch.type === 'both'
                        ? 'border-sjsfi-900 bg-sjsfi-50/80 ring-1 ring-sjsfi-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-sjsfi-gold" />
                      <span className="text-xs font-bold text-gray-900">Both (Board + Video)</span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Synchronized dual layout with video alongside the interactive digital board.
                    </p>
                  </div>
                </div>
              </div>

              {/* Conditional inputs based on type */}
              {(ch.type === 'video' || ch.type === 'both') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Video URL (YouTube, Vimeo, Loom, MP4)
                  </label>
                  <input
                    type="url"
                    value={ch.videoUrl}
                    onChange={(e) => updateChapter(idx, 'videoUrl', e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sjsfi-600"
                  />
                </div>
              )}

              {(ch.type === 'board' || ch.type === 'both') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      PGN Moves Notation
                    </label>
                    <textarea
                      value={ch.pgn}
                      onChange={(e) => updateChapter(idx, 'pgn', e.target.value)}
                      placeholder="1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5..."
                      rows={3}
                      className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sjsfi-600 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Move Explanations (Format: [ply]: [explanation])
                    </label>
                    <textarea
                      value={ch.moveNotesText}
                      onChange={(e) => updateChapter(idx, 'moveNotesText', e.target.value)}
                      placeholder="1: Central strike with e4&#10;4: Prepares d4 center steamroller"
                      rows={3}
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sjsfi-600 resize-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Key Takeaways (one per line)
                </label>
                <textarea
                  value={ch.takeawaysText}
                  onChange={(e) => updateChapter(idx, 'takeawaysText', e.target.value)}
                  placeholder="Seize central squares early&#10;Coordinate light-squared bishop with queen&#10;Prioritize king safety"
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sjsfi-600 resize-none"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Submit Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-end gap-3">
          <Link
            href="/courses"
            className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-sjsfi-900 hover:bg-sjsfi-800 text-white transition-all shadow-md"
          >
            <Save className="w-4 h-4 text-sjsfi-gold" />
            <span>Publish Course & Curriculum</span>
          </button>
        </div>
      </form>
    </div>
  );
}
