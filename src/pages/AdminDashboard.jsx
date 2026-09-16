import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getAllStudents,
  getCourses,
  saveCourse,
  deleteCourse,
  assignCourseToStudents,
} from '../lib/db';
import {
  ShieldAlert,
  Users,
  BookOpen,
  PlusCircle,
  Trash2,
  Edit,
  ExternalLink,
  CheckSquare,
  Square,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);

  // Active view tab: 'students' | 'courses' | 'courseBuilder'
  const [activeTab, setActiveTab] = useState('students');

  // Drill-down on single student
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Course Builder Form State
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseType, setCourseType] = useState('walkthrough');
  const [chapters, setChapters] = useState([
    {
      title: 'Chapter 1: Critical Novelty',
      video_url: '',
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ *',
      annotations: [
        { ply: 12, keyMove: 'Bb4+', comment: 'Check with bishop to disrupt White’s central tempo.' },
      ],
    },
  ]);

  // Assignment Modal
  const [assigningCourse, setAssigningCourse] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [assignSuccess, setAssignSuccess] = useState(false);

  const loadData = async () => {
    try {
      const [sData, cData] = await Promise.all([
        getAllStudents().catch(() => []),
        getCourses({ role: 'admin' }).catch(() => []),
      ]);
      setStudents(sData || []);
      setCourses(cData || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open Course Builder to create a new course
  const handleOpenNewCourse = () => {
    setEditingCourseId(null);
    setCourseTitle('');
    setCourseDesc('');
    setCourseType('walkthrough');
    setChapters([
      {
        title: 'Chapter 1: Opening Moves',
        video_url: '',
        pgn: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 *',
        annotations: [{ ply: 10, keyMove: 'a6', comment: 'The signature Najdorf move controlling b5.' }],
      },
    ]);
    setActiveTab('courseBuilder');
  };

  // Open Course Builder to edit an existing course
  const handleEditCourse = (c) => {
    setEditingCourseId(c.id);
    setCourseTitle(c.title);
    setCourseDesc(c.description || '');
    setCourseType(c.type || 'walkthrough');
    setChapters(
      (c.chapters || []).length > 0
        ? c.chapters
        : [{ title: 'Chapter 1', video_url: '', pgn: '', annotations: [] }]
    );
    setActiveTab('courseBuilder');
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!courseTitle.trim()) return;

    try {
      await saveCourse(
        {
          id: editingCourseId,
          title: courseTitle.trim(),
          description: courseDesc.trim(),
          type: courseType,
          created_by: profile?.id,
        },
        chapters
      );

      await loadData();
      setActiveTab('courses');
    } catch (err) {
      console.error('Failed to save course:', err);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await deleteCourse(courseId);
      await loadData();
    } catch (err) {
      console.error('Failed to delete course:', err);
    }
  };

  const handleAddChapter = () => {
    setChapters([
      ...chapters,
      {
        title: `Chapter ${chapters.length + 1}: Key Variation`,
        video_url: '',
        pgn: '',
        annotations: [],
      },
    ]);
  };

  const handleRemoveChapter = (idx) => {
    setChapters(chapters.filter((_, i) => i !== idx));
  };

  const handleOpenAssignModal = (course) => {
    setAssigningCourse(course);
    // Pre-check students who already have the course if available
    setSelectedStudentIds(students.map((s) => s.id));
    setAssignSuccess(false);
  };

  const handleToggleStudentSelection = (studentId) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter((id) => id !== studentId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  const handleConfirmAssignment = async () => {
    if (!assigningCourse) return;
    try {
      await assignCourseToStudents(assigningCourse.id, selectedStudentIds);
      setAssignSuccess(true);
      setTimeout(() => {
        setAssigningCourse(null);
        setAssignSuccess(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to assign course:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <ShieldAlert className="w-8 h-8 text-emerald-400" />
            <span>Coach Command Center</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Oversee student development, inspect game telemetry, and author interactive training curriculum.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'students'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Students ({students.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'courses'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Courses ({courses.length})</span>
          </button>
          <button
            onClick={handleOpenNewCourse}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'courseBuilder'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-400 hover:text-emerald-300'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Course Builder</span>
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* TAB 1: STUDENTS OVERVIEW */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-white text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <span>Student Roster & Activity Feed</span>
              </h2>
              <span className="text-xs text-slate-400">
                {students.length} active students enrolled
              </span>
            </div>

            {students.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No students found in database.
              </div>
            ) : (
              <div className="divide-y divide-slate-800 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-5">Student</th>
                      <th className="py-3 px-4">Chess.com Handle</th>
                      <th className="py-3 px-4">Games Synced</th>
                      <th className="py-3 px-4">Course Progress</th>
                      <th className="py-3 px-4">Last Activity</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {students.map((student) => {
                      const studentGames = student.games || [];
                      const completedCount = (student.assignments || []).reduce(
                        (sum, a) => sum + (a.progress?.completed_chapter_ids?.length || 0),
                        0
                      );

                      return (
                        <tr key={student.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <img
                                src={
                                  student.avatar_url ||
                                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'
                                }
                                alt=""
                                className="w-9 h-9 rounded-full object-cover border border-slate-700"
                              />
                              <div>
                                <div className="font-bold text-white">{student.display_name}</div>
                                <div className="text-[11px] text-slate-400">{student.bio || 'Club Student'}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 font-mono">
                            {student.chesscom_username ? (
                              <a
                                href={`https://www.chess.com/member/${student.chesscom_username}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                              >
                                <span>@{student.chesscom_username}</span>
                                <ExternalLink className="w-3 h-3 text-slate-500" />
                              </a>
                            ) : (
                              <span className="text-slate-500 italic">Not linked</span>
                            )}
                          </td>

                          <td className="py-4 px-4 font-mono font-semibold">
                            {studentGames.length} games
                          </td>

                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400">
                              {completedCount} Chapters Done
                            </span>
                          </td>

                          <td className="py-4 px-4 text-slate-400">
                            {studentGames[0]?.played_at
                              ? new Date(studentGames[0].played_at).toLocaleDateString()
                              : 'Recently active'}
                          </td>

                          <td className="py-4 px-5 text-right">
                            <button
                              onClick={() => setSelectedStudent(student)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-white text-xs font-medium transition-colors"
                            >
                              Drill Down
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Drill-down modal for selected student */}
          {selectedStudent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedStudent.avatar_url}
                      alt=""
                      className="w-12 h-12 rounded-full border-2 border-emerald-500"
                    />
                    <div>
                      <h3 className="text-lg font-bold text-white">{selectedStudent.display_name}</h3>
                      <p className="text-xs text-slate-400">
                        {selectedStudent.chesscom_username ? `@${selectedStudent.chesscom_username}` : 'No handle'} • Role: {selectedStudent.role}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Student Games Database ({selectedStudent.games?.length || 0} games)
                  </h4>
                  <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 divide-y divide-slate-800/80 max-h-60 overflow-y-auto">
                    {(selectedStudent.games || []).map((g) => (
                      <div key={g.id} className="py-2 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-white">vs. {g.black_username || 'Opponent'}</span>
                          <span className="ml-2 text-slate-400 font-mono text-[11px] capitalize">({g.time_class})</span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedStudent(null);
                            navigate(`/analysis?gameId=${g.id}`);
                          }}
                          className="text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <span>Analyze</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {(selectedStudent.games || []).length === 0 && (
                      <p className="text-xs text-slate-500 py-4 text-center">No games synced yet for this student.</p>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB 2: COURSES MANAGEMENT */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Published Curriculum Modules</h2>
            <button
              onClick={handleOpenNewCourse}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Course</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {course.type === 'walkthrough' ? 'Chessable Walkthrough' : 'Video'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {course.chapters?.length || 0} Chapters
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white">{course.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenAssignModal(course)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-semibold transition-colors"
                  >
                    Assign to Students
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditCourse(course)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Edit Course"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                      title="Delete Course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB 3: COURSE BUILDER */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'courseBuilder' && (
        <form onSubmit={handleSaveCourse} className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <span>{editingCourseId ? 'Edit Course' : 'Create Course Module'}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="block text-xs font-semibold uppercase text-slate-400">Course Title</label>
                <input
                  type="text"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="e.g. Master the King's Indian Defense"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase text-slate-400">Course Type</label>
                <select
                  value={courseType}
                  onChange={(e) => setCourseType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="walkthrough">Move-by-Move Walkthrough (Chessable-style)</option>
                  <option value="video">Video Masterclass</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase text-slate-400">Description & Goals</label>
              <textarea
                rows={3}
                value={courseDesc}
                onChange={(e) => setCourseDesc(e.target.value)}
                placeholder="What core chess lessons or openings does this module teach?"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Chapters Builder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Chapters & Move Annotations</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {chapters.length} Total
                </span>
              </h3>
              <button
                type="button"
                onClick={handleAddChapter}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold border border-slate-700"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Chapter</span>
              </button>
            </div>

            {chapters.map((ch, idx) => (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Chapter {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={ch.title}
                      onChange={(e) => {
                        const copy = [...chapters];
                        copy[idx].title = e.target.value;
                        setChapters(copy);
                      }}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1 text-sm font-semibold text-white focus:outline-none focus:border-emerald-500"
                      placeholder="Chapter Title"
                      required
                    />
                  </div>

                  {chapters.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveChapter(idx)}
                      className="text-rose-400 hover:text-rose-300 p-1 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {courseType === 'video' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Video Stream URL (Mux, Cloudflare, or MP4)
                    </label>
                    <input
                      type="url"
                      value={ch.video_url || ''}
                      onChange={(e) => {
                        const copy = [...chapters];
                        copy[idx].video_url = e.target.value;
                        setChapters(copy);
                      }}
                      placeholder="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Chapter PGN (Walkthrough moves)
                      </label>
                      <textarea
                        rows={4}
                        value={ch.pgn || ''}
                        onChange={(e) => {
                          const copy = [...chapters];
                          copy[idx].pgn = e.target.value;
                          setChapters(copy);
                        }}
                        placeholder="1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Key Moment Annotation (Ply, Move, Coaching Note)
                      </label>
                      <div className="space-y-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Expected Move (e.g. Bc5)"
                            value={ch.annotations?.[0]?.keyMove || ''}
                            onChange={(e) => {
                              const copy = [...chapters];
                              const anno = copy[idx].annotations?.[0] || { ply: 6 };
                              anno.keyMove = e.target.value;
                              copy[idx].annotations = [anno];
                              setChapters(copy);
                            }}
                            className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-white"
                          />
                          <input
                            type="number"
                            placeholder="Ply (e.g. 6)"
                            value={ch.annotations?.[0]?.ply || 6}
                            onChange={(e) => {
                              const copy = [...chapters];
                              const anno = copy[idx].annotations?.[0] || {};
                              anno.ply = parseInt(e.target.value, 10) || 1;
                              copy[idx].annotations = [anno];
                              setChapters(copy);
                            }}
                            className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-white"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Coach prompt/commentary to show student"
                          value={ch.annotations?.[0]?.comment || ''}
                          onChange={(e) => {
                            const copy = [...chapters];
                            const anno = copy[idx].annotations?.[0] || { ply: 6 };
                            anno.comment = e.target.value;
                            copy[idx].annotations = [anno];
                            setChapters(copy);
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setActiveTab('courses')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20"
            >
              Save Course
            </button>
          </div>
        </form>
      )}

      {/* Course Assignment Modal */}
      {assigningCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <span>Assign Course to Students</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Course: <strong className="text-white">{assigningCourse.title}</strong>
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-60 overflow-y-auto space-y-1.5">
              {students.map((student) => {
                const selected = selectedStudentIds.includes(student.id);
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleToggleStudentSelection(student.id)}
                    className={`w-full p-2.5 rounded-lg flex items-center justify-between text-left text-xs transition-colors ${
                      selected
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                        : 'hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {selected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                      <span className="font-semibold text-white">{student.display_name}</span>
                      {student.chesscom_username && (
                        <span className="text-slate-400 font-mono text-[11px]">
                          (@{student.chesscom_username})
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {assignSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">
                Assigned successfully to {selectedStudentIds.length} students!
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setAssigningCourse(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAssignment}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
              >
                Confirm Assignments
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
