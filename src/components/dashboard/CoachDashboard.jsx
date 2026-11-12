import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StatisticsPanel from './StatisticsPanel';
import {
  getAllStudents,
  getCourses,
  saveCourse,
  deleteCourse,
  assignCourseToStudents,
  updateStudentProfile,
  getCoachCredentials,
  submitCoachCredential,
  getStudentEnrollments,
  reviewStudentEnrollment,
  getGamesForStudent,
} from '../../lib/db';
import PgnImportWizard from '../PgnImportWizard';
import EngineVariationTools from '../EngineVariationTools';
import OpeningBadge from '../OpeningBadge';
import {
  GraduationCap,
  Users,
  BookOpen,
  PlusCircle,
  Trash2,
  Edit,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Crosshair,
  TrendingUp,
  Award,
  FileText,
  Search,
  ShieldCheck,
  ChevronRight,
  Eye,
  Zap,
  Sliders,
  CheckSquare,
  Square,
  Save,
  UserCheck,
  BarChart2,
} from 'lucide-react';

export default function CoachDashboard({ onPreviewStudentView }) {
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('roster');

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [myGames, setMyGames] = useState([]);
  const [loading, setLoading] = useState(true);

  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [editingCourseId, setEditingCourseId] = useState(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseType, setCourseType] = useState('walkthrough');
  const [courseOrientation, setCourseOrientation] = useState('white');
  const [courseTrainedSide, setCourseTrainedSide] = useState('white');
  const [courseMinElo, setCourseMinElo] = useState(0);
  const [courseMaxElo, setCourseMaxElo] = useState(3000);
  const [chapters, setChapters] = useState([]);
  const [courseSaving, setCourseSaving] = useState(false);
  const [courseSaveError, setCourseSaveError] = useState('');
  const [showPgnWizard, setShowPgnWizard] = useState(false);

  const [assigningCourse, setAssigningCourse] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [assignError, setAssignError] = useState('');

  const [deletingCourse, setDeletingCourse] = useState(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const [minStudentElo, setMinStudentElo] = useState(profile?.min_student_elo || 1200);
  const [coachingStandards, setCoachingStandards] = useState(
    profile?.coaching_standards ||
      'Mastery of opening principles, tactical pattern recognition, pawn structures, and endgame fundamentals.'
  );
  const [coachingBio, setCoachingBio] = useState(profile?.bio || '');
  const [standardsSaving, setStandardsSaving] = useState(false);
  const [standardsSuccess, setStandardsSuccess] = useState(false);

  const [newCredType, setNewCredType] = useState('FIDE Trainer License');
  const [newCredIssuer, setNewCredIssuer] = useState('FIDE Qualification Commission');
  const [newCredUrl, setNewCredUrl] = useState('');
  const [credSubmitting, setCredSubmitting] = useState(false);
  const [credSuccess, setCredSuccess] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [sData, cData, mgData] = await Promise.all([
        getAllStudents().catch(() => []),
        getCourses({ role: 'admin' }).catch(() => []),
        profile?.id ? getGamesForStudent(profile.id).catch(() => []) : [],
      ]);
      setStudents(sData || []);
      setCourses(cData || []);
      setMyGames(mgData || []);

      const creds = getCoachCredentials(profile?.id);
      setCredentials(creds || []);

      const enrs = getStudentEnrollments(profile?.id);
      setEnrollments(enrs || []);
    } catch (err) {
      console.error('Failed to load coach dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [profile?.id]);

  const totalStudents = students.length;
  const activeTrainingStudents = students.filter((s) =>
    (s.assignments || []).some((a) => (a.progress?.completed_chapter_ids?.length || 0) > 0)
  ).length;

  const coachCourses = courses.filter(
    (c) => c.created_by === profile?.id || !c.created_by || profile?.role === 'admin'
  );

  const allStudentGames = useMemo(() => {
    const list = [];
    students.forEach((s) => {
      (s.games || []).forEach((g) => {
        list.push({ ...g, studentName: s.display_name, studentId: s.id });
      });
    });
    return list;
  }, [students]);

  const reviewedGames = allStudentGames.filter((g) => g.review?.accuracy_white || g.review?.accuracy_black);
  const cohortAvgAccuracy =
    reviewedGames.length > 0
      ? Math.round(
          reviewedGames.reduce(
            (sum, g) => sum + (Number(g.review?.accuracy_white || g.review?.accuracy_black) || 75),
            0
          ) / reviewedGames.length
        )
      : null;

  const pendingEnrollments = enrollments.filter((e) => e.review_status === 'pending');

  const verifiedCredential = credentials.find((c) => c.verification_status === 'verified');
  const pendingCredential = credentials.find((c) => c.verification_status === 'pending');

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(
      (s) =>
        s.display_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.chesscom_username?.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const handleOpenNewCourse = () => {
    setEditingCourseId(null);
    setCourseTitle('');
    setCourseDesc('');
    setCourseType('walkthrough');
    setCourseOrientation('white');
    setCourseTrainedSide('white');
    setCourseMinElo(0);
    setCourseMaxElo(3000);
    setChapters([
      {
        title: 'Chapter 1: Critical Positional Theme',
        description: 'Key opening moves and ideas to study.',
        video_url: '',
        orientation: 'white',
        trained_side: 'white',
        pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ *',
        annotations: [{ ply: 12, keyMove: 'Bb4+', comment: 'Check with bishop to challenge the center.' }],
      },
    ]);
    setActiveTab('courseBuilder');
  };

  const handleEditCourse = (course) => {
    setEditingCourseId(course.id);
    setCourseTitle(course.title);
    setCourseDesc(course.description || '');
    setCourseType(course.type || 'walkthrough');
    setCourseOrientation(course.orientation || 'white');
    setCourseTrainedSide(course.trained_side || 'white');
    setCourseMinElo(course.min_elo || 0);
    setCourseMaxElo(course.max_elo || 3000);
    setChapters(
      (course.chapters || []).length > 0
        ? course.chapters.map((ch) => ({
            ...ch,
            orientation: ch.orientation || course.orientation || 'white',
            trained_side: ch.trained_side || course.trained_side || 'white',
          }))
        : [
            {
              title: 'Chapter 1',
              description: '',
              video_url: '',
              orientation: course.orientation || 'white',
              trained_side: course.trained_side || 'white',
              pgn: '',
              annotations: [],
            },
          ]
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
          min_elo: parseInt(courseMinElo, 10) || 0,
          max_elo: parseInt(courseMaxElo, 10) || 3000,
          created_by: profile?.id,
        },
        chapters.map((ch) => ({
          ...ch,
          orientation: ch.orientation || courseOrientation || 'white',
          trained_side: ch.trained_side || courseTrainedSide || 'white',
        }))
      );

      await loadDashboardData();
      setActiveTab('curriculum');
    } catch (err) {
      console.error('Failed to save course:', err);
      setCourseSaveError(err?.message || 'Failed to save course.');
    } finally {
      setCourseSaving(false);
    }
  };

  const handleOpenDeleteModal = (course) => {
    setDeletingCourse(course);
    setDeleteConfirmTitle('');
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!deletingCourse) return;
    if (deleteConfirmTitle.trim().toLowerCase() !== deletingCourse.title.trim().toLowerCase()) {
      setDeleteError('Course title does not match. Please type the exact title to confirm.');
      return;
    }
    try {
      await deleteCourse(deletingCourse.id);
      setDeletingCourse(null);
      setDeleteConfirmTitle('');
      setDeleteError('');
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to delete course:', err);
      setDeleteError(err?.message || 'Failed to delete course. Please try again.');
    }
  };

  const handleAddChapter = () => {
    setChapters([
      ...chapters,
      {
        title: `Chapter ${chapters.length + 1}: Key Variation`,
        description: '',
        video_url: '',
        orientation: courseOrientation,
        trained_side: courseTrainedSide,
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

  const handleSaveAssignments = async () => {
    if (!assigningCourse) return;
    setAssigning(true);
    setAssignError('');
    try {
      await assignCourseToStudents(assigningCourse.id, selectedStudentIds);
      setAssignSuccess(true);
      await loadDashboardData();
      setTimeout(() => {
        setAssigningCourse(null);
        setAssignSuccess(false);
      }, 900);
    } catch (err) {
      setAssignError(err.message || 'Failed to update student assignments.');
    } finally {
      setAssigning(false);
    }
  };

  const handleSaveStandards = async (e) => {
    e.preventDefault();
    setStandardsSaving(true);
    setStandardsSuccess(false);
    try {
      await updateProfile({
        min_student_elo: parseInt(minStudentElo, 10) || 0,
        coaching_standards: coachingStandards,
        bio: coachingBio,
      });
      setStandardsSuccess(true);
      setTimeout(() => setStandardsSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save coaching standards:', err);
    } finally {
      setStandardsSaving(false);
    }
  };

  const handleSubmitCredential = (e) => {
    e.preventDefault();
    if (!newCredUrl.trim()) return;
    setCredSubmitting(true);
    setCredSuccess(false);
    try {
      submitCoachCredential({
        coachId: profile?.id,
        coachName: profile?.display_name || 'Coach',
        coachEmail: profile?.email || '',
        credentialType: newCredType,
        issuer: newCredIssuer,
        documentUrl: newCredUrl.trim(),
      });
      setCredSuccess(true);
      setNewCredUrl('');
      const updatedCreds = getCoachCredentials(profile?.id);
      setCredentials(updatedCreds);
      setTimeout(() => setCredSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to submit credential:', err);
    } finally {
      setCredSubmitting(false);
    }
  };

  const handleReviewEnrollment = (enrollmentId, status) => {
    reviewStudentEnrollment(enrollmentId, status, `Reviewed by coach ${profile?.display_name}`);
    const updated = getStudentEnrollments(profile?.id);
    setEnrollments(updated);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/100/20 text-amber-400 border border-amber-500/30 font-bold flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              Coach Command Studio
            </span>
            {verifiedCredential ? (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/100/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified FIDE / USCF Coach
              </span>
            ) : pendingCredential ? (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Credential Pending Admin Review
              </span>
            ) : (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-800">
                Independent Instructor
              </span>
            )}
            {profile?.chesscom_username && (
              <span className="text-xs text-slate-400 font-mono">@{profile.chesscom_username}</span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome, Coach {profile?.display_name || 'Instructor'}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Manage your student cohorts, author interactive curriculum walkthroughs with Stockfish 18 NNUE,
            and monitor performance analytics across your entire training roster.
          </p>
        </div>

        {}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleOpenNewCourse}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-lg shadow-amber-600/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Author Course</span>
          </button>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
            title="Switch to Student Mode"
          >
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>Switch to Student Mode</span>
          </Link>
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Students
            </span>
            <div className="text-2xl font-black text-white">{totalStudents}</div>
            <p className="text-[11px] text-emerald-400">
              {activeTrainingStudents} currently active in training
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/100/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Authored Courses
            </span>
            <div className="text-2xl font-black text-white">{coachCourses.length}</div>
            <p className="text-[11px] text-slate-400">
              {coachCourses.reduce((acc, c) => acc + (c.chapters?.length || 0), 0)} total chapters
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/100/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Cohort Avg Accuracy
            </span>
            <div className="text-2xl font-black text-white">
              {cohortAvgAccuracy ? `${cohortAvgAccuracy}%` : '—'}
            </div>
            <p className="text-[11px] text-cyan-400">
              {reviewedGames.length} reviewed student games
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/100/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Zap className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pending Inquiries
            </span>
            <div className="text-2xl font-black text-white">{pendingEnrollments.length}</div>
            <p className="text-[11px] text-amber-400">
              {pendingEnrollments.length > 0 ? 'Applications awaiting review' : 'All applications resolved'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/100/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {}
      <div className="flex border-b border-slate-800 gap-2 sm:gap-4 overflow-x-auto pb-1 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('roster')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'roster'
              ? 'border-amber-400 text-amber-400 bg-amber-500/100/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student Roster ({students.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'border-amber-400 text-amber-400 bg-amber-500/100/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Analytics &amp; Telemetry</span>
        </button>

        <button
          onClick={() => setActiveTab('curriculum')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'curriculum' || activeTab === 'courseBuilder'
              ? 'border-amber-400 text-amber-400 bg-amber-500/100/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Curriculum Studio ({coachCourses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'diagnostics'
              ? 'border-amber-400 text-amber-400 bg-amber-500/100/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Crosshair className="w-4 h-4" />
          <span>Student Games ({allStudentGames.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('standards')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'standards'
              ? 'border-amber-400 text-amber-400 bg-amber-500/100/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Coaching Standards &amp; Credentials</span>
        </button>
      </div>

      {}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search students by name, email, or Chess.com handle..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors placeholder:text-slate-400"
              />
            </div>
            <div className="text-xs text-slate-400">
              Showing {filteredStudents.length} of {students.length} enrolled students
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
              No students found matching your criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredStudents.map((student) => {
                const assigned = student.assignments || [];
                const games = student.games || [];
                const reviews = games.filter((g) => g.result);
                const winCount = games.filter((g) => g.result === 'win').length;
                const winRate = games.length > 0 ? Math.round((winCount / games.length) * 100) : 0;

                return (
                  <div
                    key={student.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-800 rounded-2xl p-5 shadow-lg transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              student.avatar_url ||
                              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                            }
                            alt={student.display_name}
                            className="w-11 h-11 rounded-full object-cover border border-amber-500/30 shrink-0"
                          />
                          <div>
                            <h3 className="font-bold text-white text-sm group-hover:text-amber-400 transition-colors">
                              {student.display_name}
                            </h3>
                            <div className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
                              {student.chesscom_username ? (
                                <a
                                  href={`https://www.chess.com/member/${student.chesscom_username}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-amber-400 hover:underline flex items-center gap-0.5"
                                >
                                  <span>@{student.chesscom_username}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span>No Chess.com link</span>
                              )}
                              <span>•</span>
                              <span className="text-slate-400 font-mono font-semibold">
                                {student.current_elo || 1200} Elo
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {}
                      <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center text-xs">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Games</div>
                          <div className="font-bold text-white">{games.length}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Win Rate</div>
                          <div className="font-bold text-emerald-400">{winRate}%</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Courses</div>
                          <div className="font-bold text-amber-400">{assigned.length}</div>
                        </div>
                      </div>

                      {}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Curriculum Progress</span>
                          <span className="font-mono">
                            {assigned.filter((a) => (a.progress?.completed_chapter_ids?.length || 0) > 0).length}{' '}
                            active
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="bg-amber-500/100 h-full rounded-full transition-all"
                            style={{
                              width: `${
                                assigned.length > 0
                                  ? Math.min(
                                      100,
                                      Math.round(
                                        (assigned.filter(
                                          (a) => (a.progress?.completed_chapter_ids?.length || 0) > 0
                                        ).length /
                                          assigned.length) *
                                          100
                                      )
                                    )
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                      >
                        <span>Inspect Student</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (coachCourses.length > 0) {
                            handleOpenAssignModal(coachCourses[0]);
                          } else {
                            setActiveTab('curriculum');
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-800 transition-colors"
                      >
                        Assign Module
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <StatisticsPanel
            role="coach"
            students={students}
            courses={coachCourses}
            credentials={credentials}
            enrollments={enrollments}
            myGames={myGames}
            profile={profile}
          />
        </div>
      )}

      {}
      {activeTab === 'curriculum' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span>Coach Curriculum Studio</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Build masterclasses, tactical repertoires, and interactive move walkthroughs for your students.
              </p>
            </div>
            <button
              onClick={handleOpenNewCourse}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Course</span>
            </button>
          </div>

          {coachCourses.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-semibold text-white">No courses authored yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Start crafting your curriculum by clicking &quot;Create New Course&quot; above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coachCourses.map((course) => (
                <div
                  key={course.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-800 rounded-2xl p-6 shadow-xl transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          course.type === 'walkthrough'
                            ? 'bg-emerald-500/100/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}
                      >
                        {course.type === 'walkthrough' ? 'Interactive Board' : 'Video Lecture'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {course.chapters?.length || 0} chapters
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {course.description || 'No description provided.'}
                    </p>

                    <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        Elo {course.min_elo || 0} – {course.max_elo || 3000}
                      </span>
                      <span className="capitalize px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        Side: {course.trained_side || 'white'}
                      </span>
                      {}
                      {(() => {
                        const assignedCount = students.filter((s) =>
                          (s.assignments || []).some((a) => a.course_id === course.id)
                        ).length;
                        return assignedCount > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-purple-500/100/10 text-purple-400 border border-purple-500/20 font-semibold flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {assignedCount} assigned
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-800">
                            Unassigned
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-800 space-y-2">
                    {}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditCourse(course)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-800 transition-colors"
                        title="Edit course details and chapters"
                      >
                        <Edit className="w-3.5 h-3.5 text-amber-400" />
                        Edit Course
                      </button>
                      <button
                        onClick={() => handleOpenAssignModal(course)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/100/10 hover:bg-amber-500/100/20 text-amber-400 text-xs font-semibold border border-amber-500/20 transition-colors"
                        title="Assign or re-assign this course to students"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Assign / Re-assign
                      </button>
                    </div>

                    {}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/courses/${course.id}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold border border-slate-800 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(course)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/100/10 hover:bg-rose-500/100/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition-colors"
                        title="Delete this course permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {}
      {activeTab === 'courseBuilder' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span>{editingCourseId ? 'Edit Curriculum Module' : 'Create Curriculum Module'}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Set module parameters, target Elo rating bounds, and write coaching commentary.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('curriculum')}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800"
            >
              Cancel
            </button>
          </div>

          {courseSaveError && (
            <div className="p-3.5 rounded-xl bg-rose-500/100/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{courseSaveError}</span>
            </div>
          )}

          <form onSubmit={handleSaveCourse} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Course Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master the Sicilian Najdorf: Key Pawn Breaks"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Course Mode
                </label>
                <select
                  value={courseType}
                  onChange={(e) => setCourseType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="walkthrough">Interactive Board Walkthrough</option>
                  <option value="video">Video Masterclass &amp; Lecture</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Course Description
              </label>
              <textarea
                rows={2}
                placeholder="Core objectives, tactical goals, and what the student will learn..."
                value={courseDesc}
                onChange={(e) => setCourseDesc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Min Student Elo
                </label>
                <input
                  type="number"
                  value={courseMinElo}
                  onChange={(e) => setCourseMinElo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Max Student Elo
                </label>
                <input
                  type="number"
                  value={courseMaxElo}
                  onChange={(e) => setCourseMaxElo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Board Orientation
                </label>
                <select
                  value={courseOrientation}
                  onChange={(e) => setCourseOrientation(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="white">White</option>
                  <option value="black">Black</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Trained Side
                </label>
                <select
                  value={courseTrainedSide}
                  onChange={(e) => setCourseTrainedSide(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="white">White</option>
                  <option value="black">Black</option>
                </select>
              </div>
            </div>

            {}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">Course Chapters ({chapters.length})</h3>
                  <p className="text-[11px] text-slate-400">
                    Each chapter contains a PGN variation tree, move commentary, and key training moments.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddChapter}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold border border-slate-800"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Chapter</span>
                </button>
              </div>

              <div className="space-y-4">
                {chapters.map((ch, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4.5 space-y-3.5 relative"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        Chapter {idx + 1}
                      </span>
                      {chapters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveChapter(idx)}
                          className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400">Chapter Title</label>
                        <input
                          type="text"
                          value={ch.title}
                          onChange={(e) => {
                            const next = [...chapters];
                            next[idx].title = e.target.value;
                            setChapters(next);
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400">
                          Video URL (YouTube / MP4)
                        </label>
                        <input
                          type="text"
                          placeholder="https://www.youtube.com/watch?v=..."
                          value={ch.video_url || ''}
                          onChange={(e) => {
                            const next = [...chapters];
                            next[idx].video_url = e.target.value;
                            setChapters(next);
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">
                        PGN Notation / Move Sequence
                      </label>
                      <textarea
                        rows={3}
                        placeholder="1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 *"
                        value={ch.pgn || ''}
                        onChange={(e) => {
                          const next = [...chapters];
                          next[idx].pgn = e.target.value;
                          setChapters(next);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('curriculum')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={courseSaving}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-lg shadow-amber-600/20 disabled:opacity-50"
              >
                {courseSaving ? 'Saving Curriculum...' : 'Publish Curriculum Module'}
              </button>
            </div>
          </form>
        </div>
      )}

      {}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-amber-400" />
                <span>Student Game Diagnostics</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Examine games synced by your students, view Stockfish 18 NNUE accuracy evaluations, and spot opening weaknesses.
              </p>
            </div>
            <div className="text-xs text-slate-400">
              Total Student Games: {allStudentGames.length}
            </div>
          </div>

          {allStudentGames.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
              No student games synced yet. Once your students sync their Chess.com games, they will appear here.
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800 overflow-hidden shadow-xl">
              {allStudentGames.slice(0, 20).map((game) => (
                <div
                  key={game.id}
                  className="p-4 hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-amber-400">
                        {game.studentName}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          game.result === 'win'
                            ? 'bg-emerald-500/100/10 text-emerald-400 border border-emerald-500/20'
                            : game.result === 'loss'
                            ? 'bg-rose-500/100/10 text-rose-400 border border-rose-500/20'
                            : 'bg-slate-700/30 text-slate-400'
                        }`}
                      >
                        {game.result}
                      </span>
                      <span className="text-xs font-semibold text-white">
                        vs. {game.black_username || 'Opponent'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                      <span className="capitalize">{game.time_class || 'Rapid'}</span>
                      {game.played_at && (
                        <>
                          <span>•</span>
                          <span>{new Date(game.played_at).toLocaleDateString()}</span>
                        </>
                      )}
                      {(game.opening || game.eco) && (
                        <>
                          <span>•</span>
                          <OpeningBadge
                            eco={game.eco}
                            opening={game.opening}
                            variation={game.variation}
                            size="sm"
                          />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {game.review ? (
                      <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/100/10 px-2 py-1 rounded-lg border border-cyan-500/20">
                        {game.review.accuracy_white}% Acc
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Unreviewed</span>
                    )}

                    <button
                      onClick={() => navigate(`/analysis?gameId=${game.id}`)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <span>Analyze</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {}
      {activeTab === 'standards' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <span>Coaching Standards &amp; Philosophy</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Set minimum Elo expectations and guidelines for incoming students.
              </p>
            </div>

            {standardsSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/100/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Coaching standards updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveStandards} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Minimum Student Elo Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  max="3000"
                  value={minStudentElo}
                  onChange={(e) => setMinStudentElo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-400">
                  Students below this rating will be flagged when applying for mentorship.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Coaching Guidelines &amp; Syllabus Focus
                </label>
                <textarea
                  rows={4}
                  value={coachingStandards}
                  onChange={(e) => setCoachingStandards(e.target.value)}
                  placeholder="Outline your coaching methodology, recommended study time, and expectations..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Public Coaching Bio
                </label>
                <textarea
                  rows={3}
                  value={coachingBio}
                  onChange={(e) => setCoachingBio(e.target.value)}
                  placeholder="Your background, titles, and tournament achievements..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={standardsSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{standardsSaving ? 'Saving...' : 'Save Coaching Standards'}</span>
              </button>
            </form>
          </div>

          {}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span>Coach Verification Status</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Official credentials verified by ChessLogs Administrators.
                </p>
              </div>

              <div className="space-y-3">
                {credentials.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
                    No credentials submitted yet. Submit your FIDE or national certification below.
                  </div>
                ) : (
                  credentials.map((cred) => (
                    <div
                      key={cred.id}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{cred.credential_type}</span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            cred.verification_status === 'verified'
                              ? 'bg-emerald-500/100/10 text-emerald-400 border-emerald-500/20'
                              : cred.verification_status === 'rejected'
                              ? 'bg-rose-500/100/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/100/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {cred.verification_status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Issuer: {cred.issuer || 'Official Federation'}
                      </div>
                      {cred.document_url && (
                        <a
                          href={cred.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>View Certificate Document</span>
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>

              {}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Submit Credential for Review
                </span>

                {credSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/100/10 text-emerald-400 text-xs">
                    Credential submitted for admin verification!
                  </div>
                )}

                <form onSubmit={handleSubmitCredential} className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="Credential Title (e.g. FIDE Trainer, USCF Senior Coach)"
                    value={newCredType}
                    onChange={(e) => setNewCredType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Issuer (e.g. FIDE, US Chess Federation)"
                    value={newCredIssuer}
                    onChange={(e) => setNewCredIssuer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="url"
                    required
                    placeholder="Document URL (PDF / Verification link)"
                    value={newCredUrl}
                    onChange={(e) => setNewCredUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={credSubmitting}
                    className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {credSubmitting ? 'Submitting...' : 'Submit to Admin Desk'}
                  </button>
                </form>
              </div>
            </div>

            {}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-purple-400" />
                  <span>Mentorship Inquiries</span>
                </h3>
                <span className="text-xs text-purple-400 font-mono">
                  {pendingEnrollments.length} pending
                </span>
              </div>

              {enrollments.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No incoming mentorship inquiries at this time.
                </div>
              ) : (
                <div className="space-y-3">
                  {enrollments.map((enr) => (
                    <div
                      key={enr.id}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{enr.student_name}</span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            enr.review_status === 'approved'
                              ? 'bg-emerald-500/100/10 text-emerald-400'
                              : enr.review_status === 'rejected'
                              ? 'bg-rose-500/100/10 text-rose-400'
                              : 'bg-amber-500/100/10 text-amber-400'
                          }`}
                        >
                          {enr.review_status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {enr.review_notes || 'Student applied for coaching.'}
                      </p>
                      {enr.review_status === 'pending' && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleReviewEnrollment(enr.id, 'approved')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                          >
                            Accept Student
                          </button>
                          <button
                            onClick={() => handleReviewEnrollment(enr.id, 'rejected')}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white text-[11px]"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {}
      {deletingCourse && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            {}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/100/15 border border-rose-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Course</h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  This action is <span className="text-rose-400 font-semibold">permanent and irreversible</span>.
                  All chapter data and student assignments linked to this course will be removed.
                </p>
              </div>
            </div>

            {}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Course to delete
              </div>
              <div className="font-bold text-white text-sm">{deletingCourse.title}</div>
              <div className="text-[11px] text-slate-400">
                {deletingCourse.chapters?.length || 0} chapters ·{' '}
                {students.filter((s) =>
                  (s.assignments || []).some((a) => a.course_id === deletingCourse.id)
                ).length}{' '}
                students assigned
              </div>
            </div>

            {}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">
                Type the course title to confirm deletion:
              </label>
              <input
                type="text"
                placeholder={deletingCourse.title}
                value={deleteConfirmTitle}
                onChange={(e) => {
                  setDeleteConfirmTitle(e.target.value);
                  setDeleteError('');
                }}
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-colors placeholder:text-slate-400"
                autoFocus
              />
              {deleteError && (
                <div className="p-2.5 rounded-xl bg-rose-500/100/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {deleteError}
                </div>
              )}
            </div>

            {}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setDeletingCourse(null);
                  setDeleteConfirmTitle('');
                  setDeleteError('');
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={
                  deleteConfirmTitle.trim().toLowerCase() !==
                  deletingCourse.title.trim().toLowerCase()
                }
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500/100 disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={
                    selectedStudent.avatar_url ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                  }
                  alt={selectedStudent.display_name}
                  className="w-12 h-12 rounded-full object-cover border border-amber-500/30"
                />
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedStudent.display_name}</h3>
                  <div className="text-xs text-slate-400">
                    {selectedStudent.email} • {selectedStudent.current_elo || 1200} Elo
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            {}
            {selectedStudent.bio && (
              <p className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                {selectedStudent.bio}
              </p>
            )}

            {}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Assigned Modules ({(selectedStudent.assignments || []).length})
              </h4>
              {(selectedStudent.assignments || []).length === 0 ? (
                <div className="text-xs text-slate-400 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  No courses assigned to this student yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {(selectedStudent.assignments || []).map((a, i) => {
                    const course = courses.find((c) => c.id === a.course_id);
                    return (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-white">
                          {course?.title || `Course ID: ${a.course_id}`}
                        </span>
                        <span className="text-[11px] text-amber-400 font-mono">
                          {a.progress?.completed_chapter_ids?.length || 0} chapters complete
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent Synced Games ({(selectedStudent.games || []).length})
              </h4>
              {(selectedStudent.games || []).length === 0 ? (
                <div className="text-xs text-slate-400 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  No games synced by this student yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(selectedStudent.games || []).slice(0, 5).map((g) => (
                    <div
                      key={g.id}
                      onClick={() => {
                        setSelectedStudent(null);
                        navigate(`/analysis?gameId=${g.id}`);
                      }}
                      className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 transition-colors cursor-pointer border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white">vs. {g.black_username}</span>
                        <span className="text-slate-400 ml-2">({g.result})</span>
                      </div>
                      <span className="text-[11px] text-emerald-400">Open Analysis →</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {}
      {assigningCourse && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  Assign / Re-assign Students
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 font-mono">
                  {assigningCourse.title}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Check students to assign · Uncheck to remove assignment
                </p>
              </div>
              <button
                onClick={() => setAssigningCourse(null)}
                className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>

            {assignSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/100/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Assignments successfully updated!</span>
              </div>
            )}

            {assignError && (
              <div className="p-3.5 rounded-xl bg-rose-500/100/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{assignError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider">
                  Select Students ({selectedStudentIds.length} selected)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedStudentIds.length === students.length) {
                      setSelectedStudentIds([]);
                    } else {
                      setSelectedStudentIds(students.map((s) => s.id));
                    }
                  }}
                  className="text-amber-400 hover:underline text-[11px]"
                >
                  {selectedStudentIds.length === students.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-800 rounded-2xl p-2 bg-slate-950">
                {students.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No students enrolled yet.
                  </div>
                ) : (
                  students.map((s) => {
                    const isChecked = selectedStudentIds.includes(s.id);
                    const wasAlreadyAssigned = students
                      .filter((st) =>
                        (st.assignments || []).some((a) => a.course_id === assigningCourse?.id)
                      )
                      .map((st) => st.id)
                      .includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleToggleStudentSelection(s.id)}
                        className={`p-2.5 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-colors ${
                          isChecked
                            ? 'bg-amber-500/100/10 border border-amber-500/20'
                            : 'hover:bg-slate-900 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div>
                            <span className="font-semibold text-white">{s.display_name}</span>
                            {wasAlreadyAssigned && (
                              <span className="ml-2 text-[10px] text-emerald-400 font-semibold uppercase tracking-wide">
                                Currently Assigned
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {s.current_elo || 1200} Elo
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAssigningCourse(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAssignments}
                disabled={assigning}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold disabled:opacity-50"
              >
                {assigning ? 'Saving...' : 'Confirm Assignments'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
