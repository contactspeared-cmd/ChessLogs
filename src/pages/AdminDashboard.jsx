import { useState, useEffect } from 'react';
import PgnImportWizard from '../components/PgnImportWizard';
import EngineVariationTools from '../components/EngineVariationTools';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getAllStudents,
  getCourses,
  saveCourse,
  deleteCourse,
  assignCourseToStudents,
  deleteStudent,
  updateStudentProfile,
  replaceSyncedChesscomGames,
} from '../lib/db';
import {
  ShieldAlert,
  ShieldCheck,
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
  FileDown,
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

  // Edit student state
  const [isEditingStudent, setIsEditingStudent] = useState(false);
  const [editName, setEditName] = useState('');
  const [editChesscom, setEditChesscom] = useState('');
  const [savingStudent, setSavingStudent] = useState(false);

  // Course Builder Form State
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseType, setCourseType] = useState('walkthrough');
  const [courseOrientation, setCourseOrientation] = useState('white');
  const [courseTrainedSide, setCourseTrainedSide] = useState('white');
  const [chapters, setChapters] = useState([
    {
      title: 'Chapter 1: Critical Novelty',
      description: '',
      video_url: '',
      orientation: 'white',
      trained_side: 'white',
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
  const [assignError, setAssignError] = useState('');
  const [assigning, setAssigning] = useState(false);

  // PGN Import Wizard
  const [showPgnWizard, setShowPgnWizard] = useState(false);
  const [courseSaveError, setCourseSaveError] = useState('');
  const [courseSaving, setCourseSaving] = useState(false);

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

  // Delete student account
  const handleDeleteStudent = async (studentId, studentName) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete the account for "${studentName}"? All synced games, reviews, and course progress will be removed.`
      )
    ) {
      return;
    }

    try {
      await deleteStudent(studentId);
      if (selectedStudent?.id === studentId) {
        setSelectedStudent(null);
      }
      await loadData();
    } catch (err) {
      console.error('Failed to delete student account:', err);
      alert('Failed to delete student account. Please try again.');
    }
  };

  const handleStartEditStudent = (student) => {
    setIsEditingStudent(!isEditingStudent);
    setEditName(student.display_name || '');
    setEditChesscom(student.chesscom_username || '');
  };

  const handleSaveStudentEdit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSavingStudent(true);
    try {
      const nextUsername = editChesscom.trim().toLowerCase();
      const prevUsername = (selectedStudent.chesscom_username || '').toLowerCase();
      const updated = await updateStudentProfile(selectedStudent.id, {
        display_name: editName.trim() || selectedStudent.display_name,
        chesscom_username: nextUsername,
      });
      if (prevUsername !== nextUsername) {
        await replaceSyncedChesscomGames(selectedStudent.id, []);
      }
      if (updated) {
        setSelectedStudent((prev) => ({ ...prev, ...updated, games: prevUsername !== nextUsername ? [] : prev?.games }));
      }
      setIsEditingStudent(false);
      await loadData();
    } catch (err) {
      console.error('Failed to update student profile:', err);
      alert('Failed to update student profile.');
    } finally {
      setSavingStudent(false);
    }
  };

  // Open Course Builder to create a new course
  const handleOpenNewCourse = () => {
    setEditingCourseId(null);
    setCourseTitle('');
    setCourseDesc('');
    setCourseType('walkthrough');
    setCourseOrientation('white');
    setCourseTrainedSide('white');
    setChapters([
      {
        title: 'Chapter 1: Opening Moves',
        description: '',
        video_url: '',
        orientation: 'white',
        trained_side: 'white',
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
    setCourseOrientation(c.orientation || 'white');
    setCourseTrainedSide(c.trained_side || 'white');
    setChapters(
      (c.chapters || []).length > 0
        ? c.chapters.map((ch) => ({
            ...ch,
            orientation: ch.orientation || c.orientation || 'white',
            trained_side: ch.trained_side || c.trained_side || 'white',
          }))
        : [{ title: 'Chapter 1', description: '', video_url: '', orientation: c.orientation || 'white', trained_side: c.trained_side || 'white', pgn: '', annotations: [] }]
    );
    setActiveTab('courseBuilder');
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!courseTitle.trim()) return;

    setCourseSaving(true);
    setCourseSaveError('');
    try {
      await saveCourse(
        {
          id: editingCourseId,
          title: courseTitle.trim(),
          description: courseDesc.trim(),
          type: courseType,
          orientation: courseOrientation,
          trained_side: courseTrainedSide,
          created_by: profile?.id,
        },
        chapters.map((ch) => ({
          ...ch,
          orientation: ch.orientation || courseOrientation || 'white',
          trained_side: ch.trained_side || courseTrainedSide || 'white',
        }))
      );

      await loadData();
      setActiveTab('courses');
    } catch (err) {
      console.error('Failed to save course:', err);
      setCourseSaveError(err?.message || 'Failed to save course. Check the console for details.');
    } finally {
      setCourseSaving(false);
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
        description: '',
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
    // Pre-check students who already have this course assigned
    const alreadyAssigned = students
      .filter((s) => (s.assignments || []).some((a) => a.course_id === course.id))
      .map((s) => s.id);
    setSelectedStudentIds(alreadyAssigned);
    setAssignSuccess(false);
    setAssignError('');
    setAssigning(false);
  };

  const handleToggleStudentSelection = (studentId) => {
    setAssignError('');
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSelectAllStudents = () => {
    setAssignError('');
    setSelectedStudentIds(students.map((s) => s.id));
  };

  const handleClearStudentSelection = () => {
    setAssignError('');
    setSelectedStudentIds([]);
  };

  const handleConfirmAssignment = async () => {
    if (!assigningCourse) return;
    if (selectedStudentIds.length < 1) {
      setAssignError('Select at least 1 student to assign this course.');
      return;
    }
    setAssigning(true);
    setAssignError('');
    try {
      await assignCourseToStudents(assigningCourse.id, selectedStudentIds);
      setAssignSuccess(true);
      await loadData();
      setTimeout(() => {
        setAssigningCourse(null);
        setAssignSuccess(false);
        setAssigning(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to assign course:', err);
      setAssignError(err?.message || 'Failed to assign course. Please try again.');
      setAssigning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1.5 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Super Admin • {profile?.email || 'satoalt33@gmail.com'}</span>
            </span>
            <span className="text-xs text-slate-500 font-mono">Full Account Governance</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <ShieldAlert className="w-8 h-8 text-emerald-400" />
            <span>Super Admin & Coach Command Center</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage student rosters, delete accounts, inspect game telemetry, and author interactive training curriculum.
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
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setIsEditingStudent(false);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-white text-xs font-medium transition-colors"
                              >
                                Manage
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(student.id, student.display_name)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition-colors"
                                title="Delete Account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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
                      className="w-12 h-12 rounded-full border-2 border-emerald-500 object-cover"
                    />
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>{selectedStudent.display_name}</span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {selectedStudent.role || 'student'}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        {selectedStudent.chesscom_username ? `@${selectedStudent.chesscom_username}` : 'No handle linked'}
                        {selectedStudent.created_at ? ` • Joined ${new Date(selectedStudent.created_at).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedStudent(null);
                      setIsEditingStudent(false);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* Edit Student Account Form */}
                {isEditingStudent && (
                  <form onSubmit={handleSaveStudentEdit} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                    <h5 className="text-xs font-bold uppercase text-emerald-400 tracking-wider">
                      Edit Student Account
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Display Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Chess.com Username</label>
                        <input
                          type="text"
                          value={editChesscom}
                          onChange={(e) => setEditChesscom(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                          placeholder="e.g. hikaru"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingStudent(false)}
                        className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingStudent}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50 transition-all shadow-sm"
                      >
                        {savingStudent ? 'Saving...' : 'Save Profile'}
                      </button>
                    </div>
                  </form>
                )}

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Student Games Database ({selectedStudent.games?.length || 0} games)
                  </h4>
                  <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 divide-y divide-slate-800/80 max-h-60 overflow-y-auto">
                    {(selectedStudent.games || []).map((g) => (
                      <div key={g.id} className="py-2 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-white">
                            {g.white_username && g.black_username
                              ? (g.white_username.toLowerCase() === selectedStudent.chesscom_username?.toLowerCase()
                                  ? `vs. ${g.black_username}`
                                  : `vs. ${g.white_username}`)
                              : (g.black_username ? `vs. ${g.black_username}` : 'Opponent')}
                          </span>
                          <span className="ml-2 text-slate-400 font-mono text-[11px] capitalize">({g.time_class || 'rapid'})</span>
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

                {/* Footer Actions: Delete Account & Edit Options */}
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => handleDeleteStudent(selectedStudent.id, selectedStudent.display_name)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-semibold transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Student Account</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartEditStudent(selectedStudent)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                    >
                      {isEditingStudent ? 'Close Edit' : 'Edit Account'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedStudent(null);
                        setIsEditingStudent(false);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm"
                    >
                      Done
                    </button>
                  </div>
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
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed whitespace-pre-line">
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase text-slate-400">Default Perspective</label>
                <select
                  value={courseOrientation}
                  onChange={(e) => setCourseOrientation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="white">White (White at bottom)</option>
                  <option value="black">Black (Black at bottom)</option>
                </select>
              </div>
            </div>

            {courseType === 'walkthrough' && (
              <div className="flex items-center gap-4 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs">
                <span className="font-semibold text-slate-300">Default Trained Side:</span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-white">
                  <input
                    type="radio"
                    name="course_trained_side"
                    value="white"
                    checked={courseTrainedSide === 'white'}
                    onChange={(e) => setCourseTrainedSide(e.target.value)}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>White moves only</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-white">
                  <input
                    type="radio"
                    name="course_trained_side"
                    value="black"
                    checked={courseTrainedSide === 'black'}
                    onChange={(e) => setCourseTrainedSide(e.target.value)}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Black moves only</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-white">
                  <input
                    type="radio"
                    name="course_trained_side"
                    value="both"
                    checked={courseTrainedSide === 'both'}
                    onChange={(e) => setCourseTrainedSide(e.target.value)}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Both sides</span>
                </label>
              </div>
            )}

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
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Chapters & Move Annotations</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {chapters.length} Total
                </span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPgnWizard(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/25 transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Import from PGN</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddChapter}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold border border-slate-700"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Chapter</span>
                </button>
              </div>
            </div>

            {/* PGN Import Wizard modal */}
            {showPgnWizard && (
              <PgnImportWizard
                onClose={() => setShowPgnWizard(false)}
                onConfirm={(importedChapters) => {
                  // Template chapters always include a sample PGN, so treat a single
                  // untitled/template chapter as replaceable rather than appending.
                  const isPlaceholder =
                    chapters.length === 1 &&
                    !chapters[0].video_url &&
                    !String(chapters[0].description || '').trim() &&
                    String(chapters[0].title || '').startsWith('Chapter 1');
                  setChapters(
                    isPlaceholder ? importedChapters : [...chapters, ...importedChapters]
                  );
                  setShowPgnWizard(false);
                }}
              />
            )}

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

                <textarea
                  rows={2}
                  value={ch.description || ''}
                  onChange={(e) => {
                    const copy = [...chapters];
                    copy[idx].description = e.target.value;
                    setChapters(copy);
                  }}
                  placeholder="Chapter description or learning objective (optional)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 placeholder:text-slate-600 resize-none"
                />

                {courseType === 'walkthrough' && (
                  <div className="flex items-center gap-4 flex-wrap text-xs bg-slate-950/40 border border-slate-800/60 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <label className="text-slate-400 font-semibold">Study Orientation:</label>
                      <select
                        value={ch.orientation || courseOrientation}
                        onChange={(e) => {
                          const copy = [...chapters];
                          copy[idx].orientation = e.target.value;
                          setChapters(copy);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="white">White (Board from White)</option>
                        <option value="black">Black (Board from Black)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-slate-400 font-semibold">Trained side:</label>
                      <select
                        value={ch.trained_side || courseTrainedSide}
                        onChange={(e) => {
                          const copy = [...chapters];
                          copy[idx].trained_side = e.target.value;
                          setChapters(copy);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="white">White moves only</option>
                        <option value="black">Black moves only</option>
                        <option value="both">Both sides</option>
                      </select>
                    </div>
                  </div>
                )}

                {courseType === 'video' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Video URL (YouTube, Mux, Cloudflare, or MP4)
                    </label>
                    <input
                      type="url"
                      value={ch.video_url || ''}
                      onChange={(e) => {
                        const copy = [...chapters];
                        copy[idx].video_url = e.target.value;
                        setChapters(copy);
                      }}
                      placeholder="https://www.youtube.com/watch?v=… or direct .mp4 URL"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      Paste a YouTube watch or share link — it will embed automatically in the course player.
                    </p>
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
                      <div className="mt-2">
                        <EngineVariationTools
                          pgn={ch.pgn || ''}
                          onPgnChange={(nextPgn) => {
                            const copy = [...chapters];
                            copy[idx].pgn = nextPgn;
                            setChapters(copy);
                          }}
                        />
                      </div>
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
            {courseSaveError && (
              <p className="flex-1 text-xs text-rose-400 mr-auto">{courseSaveError}</p>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('courses')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={courseSaving}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {courseSaving ? 'Saving…' : 'Save Course'}
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
              <p className="text-[11px] text-slate-500 mt-1">
                Select 1–{students.length || 'all'} students. Confirming updates the roster:
                only checked students keep this course.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-slate-400">
                {selectedStudentIds.length} of {students.length} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllStudents}
                  disabled={students.length === 0 || selectedStudentIds.length === students.length}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={handleClearStudentSelection}
                  disabled={selectedStudentIds.length === 0}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-60 overflow-y-auto space-y-1.5">
              {students.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  No students in the roster yet.
                </p>
              ) : (
                students.map((student) => {
                  const selected = selectedStudentIds.includes(student.id);
                  const alreadyHas = (student.assignments || []).some(
                    (a) => a.course_id === assigningCourse.id
                  );
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => handleToggleStudentSelection(student.id)}
                      className={`w-full p-2.5 rounded-lg flex items-center justify-between text-left text-xs transition-colors ${
                        selected
                          ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                          : 'hover:bg-slate-900 text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {selected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span className="font-semibold text-white truncate">
                          {student.display_name}
                        </span>
                        {student.chesscom_username && (
                          <span className="text-slate-400 font-mono text-[11px] truncate">
                            (@{student.chesscom_username})
                          </span>
                        )}
                      </div>
                      {alreadyHas && (
                        <span className="text-[10px] uppercase font-bold tracking-wide text-emerald-500/80 shrink-0 ml-2">
                          Assigned
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {assignSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">
                Assigned successfully to {selectedStudentIds.length} student
                {selectedStudentIds.length === 1 ? '' : 's'}!
              </div>
            )}

            {assignError && (
              <div className="p-3 rounded-lg bg-rose-500/10 text-rose-400 text-xs border border-rose-500/20">
                {assignError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAssigningCourse(null)}
                disabled={assigning}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignment}
                disabled={assigning || assignSuccess || selectedStudentIds.length < 1}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
              >
                {assigning
                  ? 'Assigning…'
                  : `Assign to ${selectedStudentIds.length || 0} student${selectedStudentIds.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
