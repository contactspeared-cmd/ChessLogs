import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCourses } from '../lib/db';
import {
  BookOpen,
  PlaySquare,
  ArrowRight,
  Layers,
  GraduationCap,
  Brain,
  ShoppingBag,
  Zap,
  CheckCircle2,
} from 'lucide-react';

export default function Courses() {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getCourses(profile);
        setCourses(data || []);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Personal Study Track
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1 flex items-center gap-2.5">
            <BookOpen className="w-8 h-8 text-emerald-600" />
            <span>My Enrolled Masterclasses</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Repertoires, tactical courses, and endgame walkthroughs enrolled in your personal study schedule.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Explore Marketplace</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400 text-sm">
          Loading your curriculum...
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-sm max-w-lg mx-auto">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-white">No courses in your library yet</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Browse the course marketplace to enroll in interactive masterclasses or ask your coach to assign modules.
          </p>
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Browse All Courses</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const trainedIds = new Set([
              ...(course.progress?.trained_chapter_ids || []),
              ...(course.progress?.completed_chapter_ids || []),
            ]);
            const readIds = new Set(course.progress?.read_chapter_ids || []);
            const completedChapters = trainedIds.size;
            const totalChapters = course.chapters?.length || 1;
            const progressPercent = Math.min(100, Math.round((completedChapters / totalChapters) * 100));

            return (
              <div
                key={course.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <PlaySquare className="w-3.5 h-3.5" />
                      <span>{course.trained_side || 'White'}</span>
                    </span>

                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{course.chapters?.length || 0} Ch.</span>
                    </span>
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                      {course.title}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {course.description || 'Comprehensive training module.'}
                    </p>
                  </div>

                  {course.coach_name && (
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <img
                        src={
                          course.coach_avatar ||
                          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'
                        }
                        alt={course.coach_name}
                        className="w-7 h-7 rounded-full object-cover border border-slate-800 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Author
                        </div>
                        <div className="font-bold text-slate-200 text-xs truncate">
                          {course.coach_name}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 space-y-3.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                      <span>Memory Progress</span>
                      <span className="font-mono font-bold text-slate-200">{progressPercent}%</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {(course.chapters || []).map((ch, ci) => {
                        const trained = trainedIds.has(ch.id);
                        const read = readIds.has(ch.id);
                        return (
                          <div
                            key={ch.id || ci}
                            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                              trained
                                ? 'bg-emerald-600'
                                : read
                                ? 'bg-sky-400'
                                : 'bg-slate-200'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/courses/${course.id}/train`)}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>MoveTrainer</span>
                    </button>

                    <button
                      onClick={() => navigate(`/courses/${course.id}`)}
                      className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                    >
                      Walkthrough
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
