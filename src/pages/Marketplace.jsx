import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllMarketplaceCourses, enrollInCourse, isStudentEnrolled } from '../lib/db';
import {
  Search,
  Filter,
  BookOpen,
  Award,
  Star,
  CheckCircle2,
  Users,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';

const ITEMS_PER_PAGE = 6;

export default function Marketplace() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSide, setSelectedSide] = useState('all');
  const [selectedElo, setSelectedElo] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [enrollingId, setEnrollingId] = useState(null);
  const [enrolledNotice, setEnrolledNotice] = useState('');

  const courses = useMemo(() => {
    return getAllMarketplaceCourses();
  }, []);

  const categories = [
    { key: 'all', label: 'All Courses' },
    { key: 'openings', label: 'Openings' },
    { key: 'endgames', label: 'Endgames' },
    { key: 'tactics', label: 'Tactics & Calculation' },
    { key: 'strategy', label: 'Positional Strategy' },
  ];

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.coach_name?.toLowerCase().includes(q);

      const matchCategory =
        selectedCategory === 'all' ||
        (selectedCategory === 'openings' && (c.category === 'openings' || c.title.toLowerCase().includes('defense') || c.title.toLowerCase().includes('gambit') || c.title.toLowerCase().includes('game'))) ||
        (selectedCategory === 'endgames' && (c.category === 'endgames' || c.title.toLowerCase().includes('endgame'))) ||
        (selectedCategory === 'tactics' && (c.category === 'tactics' || c.title.toLowerCase().includes('tactical'))) ||
        (selectedCategory === 'strategy' && (c.category === 'strategy' || c.title.toLowerCase().includes('strategy')));

      const matchSide =
        selectedSide === 'all' || c.trained_side === selectedSide || c.orientation === selectedSide;

      const min = c.min_elo || 0;
      const matchElo =
        selectedElo === 'all' ||
        (selectedElo === 'beginner' && min <= 1200) ||
        (selectedElo === 'intermediate' && min >= 1100 && min <= 1800) ||
        (selectedElo === 'advanced' && min >= 1600);

      return matchSearch && matchCategory && matchSide && matchElo;
    });
  }, [courses, search, selectedCategory, selectedSide, selectedElo]);

  const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE) || 1;
  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCourses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCourses, currentPage]);

  const handleEnroll = async (courseId) => {
    if (!profile?.id) {
      navigate('/login');
      return;
    }
    setEnrollingId(courseId);
    enrollInCourse(courseId, profile.id);
    setTimeout(() => {
      setEnrollingId(null);
      setEnrolledNotice('Course successfully added to your active study dashboard!');
      setTimeout(() => setEnrolledNotice(''), 3500);
    }, 400);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="max-w-2xl space-y-3 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-wider text-emerald-200">
            <Sparkles className="w-3.5 h-3.5" />
            Curriculum Marketplace
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Master Every Move with Spaced Repetition
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed">
            Enroll in grandmaster masterclasses, tactical courses, and opening repertoires. Anyone can study these courses freely without being an official private student.
          </p>
        </div>
      </div>

      {enrolledNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{enrolledNotice}</span>
          </div>
          <Link
            to="/courses"
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
          >
            Go to My Study
          </Link>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by course title, author, or opening..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500 px-2 uppercase">Color:</span>
              {['all', 'white', 'black'].map((side) => (
                <button
                  key={side}
                  onClick={() => {
                    setSelectedSide(side);
                    setCurrentPage(1);
                  }}
                  className={`capitalize px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedSide === side
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {side}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500 px-2 uppercase">Elo:</span>
              {[
                { key: 'all', label: 'All' },
                { key: 'beginner', label: '0-1200' },
                { key: 'intermediate', label: '1200-1800' },
                { key: 'advanced', label: '1800+' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    setSelectedElo(item.key);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedElo === item.key
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => {
                setSelectedCategory(cat.key);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat.key
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>
            Showing {paginatedCourses.length} of {filteredCourses.length} courses
          </span>
          <span>Page {currentPage} of {totalPages}</span>
        </div>

        {paginatedCourses.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No courses match your filter</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try resetting your search query or selecting a broader category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCourses.map((course) => {
              const enrolled = profile?.id && isStudentEnrolled(course.id, profile.id);
              return (
                <div
                  key={course.id}
                  className="bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-lg rounded-2xl overflow-hidden transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="h-32 bg-gradient-to-br from-slate-800 via-slate-900 to-emerald-950 p-4 flex flex-col justify-between relative overflow-hidden">
                      <div className="flex items-center justify-between relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/20 text-white backdrop-blur-md">
                          {course.trained_side === 'white' ? 'White Repertoire' : 'Black Repertoire'}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-black/40 px-2 py-0.5 rounded-full">
                          <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                          <span>{course.rating || 4.9}</span>
                        </div>
                      </div>

                      <div className="relative z-10 flex items-center justify-between text-white/90 text-xs">
                        <span className="font-semibold">{course.chapters?.length || 0} Interactive Chapters</span>
                        <span className="font-mono text-[11px]">Elo {course.min_elo || 0}–{course.max_elo || 2400}</span>
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-600 transition-colors line-clamp-1">
                        {course.title}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <Link
                          to={`/coaches/${course.created_by || 'coach-magnus-uuid'}`}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                          title="View Coach Profile & Mentorship"
                        >
                          <img
                            src={
                              course.coach_avatar ||
                              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'
                            }
                            alt={course.coach_name}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                              <span>{course.coach_name || 'Coach Magnus'}</span>
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            </div>
                            <span className="text-[10px] text-slate-400">View Coach Profile</span>
                          </div>
                        </Link>

                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Free LMS
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0 border-t border-slate-100 flex items-center gap-2 mt-2">
                    {enrolled ? (
                      <Link
                        to={`/courses/${course.id}`}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold text-center transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Continue Studying</span>
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleEnroll(course.id)}
                        disabled={enrollingId === course.id}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{enrollingId === course.id ? 'Enrolling...' : 'Enroll Course'}</span>
                      </button>
                    )}

                    <Link
                      to={`/courses/${course.id}`}
                      className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                      title="Preview course chapters"
                    >
                      Preview
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                onClick={() => setCurrentPage(num)}
                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                  currentPage === num
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {num}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
