import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCourses } from '../lib/db';
import {
  BookOpen,
  Video,
  PlaySquare,
  ArrowRight,
  Layers,
  GraduationCap,
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
        console.error('Failed to load courses:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <BookOpen className="w-8 h-8 text-emerald-500" />
            <span>Assigned Courses</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Structured chess curriculum assigned by your coach, featuring video masterclasses and interactive chapter walkthroughs.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <span>Open Coach Course Builder</span>
          </button>
        )}
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 text-sm">
          Loading assigned courses...
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-white">No courses assigned yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Your coach has not assigned any training modules to your account. Check back soon or request a training plan!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const completedChapters = course.progress?.completed_chapter_ids?.length || 0;
            const totalChapters = course.chapters?.length || 1;
            const progressPercent = Math.min(100, Math.round((completedChapters / totalChapters) * 100));

            return (
              <div
                key={course.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Badge: Video vs Walkthrough */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                        course.type === 'walkthrough'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}
                    >
                      {course.type === 'walkthrough' ? (
                        <>
                          <PlaySquare className="w-3.5 h-3.5" />
                          <span>Walkthrough (Chessable-style)</span>
                        </>
                      ) : (
                        <>
                          <Video className="w-3.5 h-3.5" />
                          <span>Video Masterclass</span>
                        </>
                      )}
                    </span>

                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Layers className="w-3.5 h-3.5" />
                      {course.chapters?.length || 0} Ch.
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {course.title}
                    </h2>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                      {course.description || 'Comprehensive training module.'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-400">Progress</span>
                      <span className="text-emerald-400 font-mono font-semibold">
                        {progressPercent}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-green-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/courses/${course.id}`)}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-emerald-600 text-white text-xs font-bold border border-slate-700 hover:border-emerald-500 transition-all shadow-md group-hover:shadow-emerald-600/20"
                  >
                    <span>{progressPercent === 100 ? 'Review Course' : 'Continue Course'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
