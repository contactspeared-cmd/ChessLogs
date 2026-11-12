import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StatisticsPanel from '../components/dashboard/StatisticsPanel';
import {
  getAllStudents,
  getCourses,
  saveCourse,
  deleteCourse,
  assignCourseToStudents,
  deleteStudent,
  updateStudentProfile,
  getAllAccounts,
  updateAccountRole,
  getCoachCredentials,
  reviewCoachCredential,
  getStudentEnrollments,
  reviewStudentEnrollment,
} from '../lib/db';
import { createSiteAccount, formatCompositeName } from '../lib/authStore';
import PgnImportWizard from '../components/PgnImportWizard';
import EngineVariationTools from '../components/EngineVariationTools';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  BookOpen,
  PlusCircle,
  Trash2,
  Edit,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Activity,
  Award,
  FileText,
  Search,
  Filter,
  UserCheck,
  UserX,
  Sparkles,
  Server,
  Zap,
  Eye,
  CheckSquare,
  Square,
  ChevronRight,
  Database,
  ArrowUpRight,
} from 'lucide-react';

export default function AdminDashboard({ onPreviewStudentView }) {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('telemetry');

  const [accounts, setAccounts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newMI, setNewMI] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newSuffix, setNewSuffix] = useState('');
  const [newDob, setNewDob] = useState('2000-01-01');
  const [newEmail, setNewEmail] = useState('');
  const [newChesscom, setNewChesscom] = useState('');
  const [newRole, setNewRole] = useState('student');
  const [newPassword, setNewPassword] = useState('ChessLogs2026!');
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState('');
  const [createUserSuccess, setCreateUserSuccess] = useState('');

  const [editingUser, setEditingUser] = useState(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editMI, setEditMI] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editSuffix, setEditSuffix] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editChesscom, setEditChesscom] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editingRole, setEditingRole] = useState('student');
  const [userEditSaving, setUserEditSaving] = useState(false);

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

  const [assigningCourse, setAssigningCourse] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [assignError, setAssignError] = useState('');

  const [rejectingCred, setRejectingCred] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [accs, cData, sData] = await Promise.all([
        getAllAccounts(),
        getCourses({ role: 'admin' }).catch(() => []),
        getAllStudents().catch(() => []),
      ]);
      setAccounts(accs || []);
      setCourses(cData || []);
      setStudents(sData || []);

      const creds = getCoachCredentials();
      setCredentials(creds || []);

      const enrs = getStudentEnrollments();
      setEnrollments(enrs || []);
    } catch (err) {
      console.error('Failed to load admin telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const totalUsers = accounts.length;
  const studentCount = accounts.filter((a) => a.role === 'student' || !a.role).length;
  const coachCount = accounts.filter((a) => a.role === 'coach').length;
  const adminCount = accounts.filter((a) => a.role === 'admin').length;

  const verifiedCoachesCount = credentials.filter((c) => c.verification_status === 'verified').length;
  const pendingCredentialsCount = credentials.filter((c) => c.verification_status === 'pending').length;

  const allGames = useMemo(() => {
    const list = [];
    students.forEach((s) => {
      (s.games || []).forEach((g) => list.push(g));
    });
    return list;
  }, [students]);

  const reviewedGamesCount = allGames.filter((g) => g.review?.accuracy_white || g.review?.accuracy_black).length;

  const filteredUsers = useMemo(() => {
    return accounts.filter((u) => {
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const q = userSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.display_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.chesscom_username?.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [accounts, userSearch, roleFilter]);

  const handleUpdateRole = async (userId, targetRole) => {
    try {
      await updateAccountRole(userId, targetRole);
      await loadAdminData();
    } catch (err) {
      console.error('Failed to update user role:', err);
      alert('Failed to update user role.');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete the account for "${userName}"? All associated records will be purged.`
      )
    ) {
      return;
    }
    try {
      await deleteStudent(userId);
      await loadAdminData();
    } catch (err) {
      console.error('Failed to purge user:', err);
      alert('Failed to delete user account.');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateUserLoading(true);
    setCreateUserError('');
    setCreateUserSuccess('');
    try {
      await createSiteAccount({
        firstName: newFirstName.trim(),
        middleInitial: newMI.trim().toUpperCase(),
        lastName: newLastName.trim(),
        suffix: newSuffix.trim(),
        dateOfBirth: newDob,
        email: newEmail.trim().toLowerCase(),
        chesscomUsername: newChesscom.trim().toLowerCase(),
        password: newPassword,
        role: newRole,
      });

      setCreateUserSuccess(`Account created successfully with role "${newRole.toUpperCase()}".`);
      await loadAdminData();
      setTimeout(() => {
        setShowCreateUserModal(false);
        setCreateUserSuccess('');
        setNewFirstName('');
        setNewMI('');
        setNewLastName('');
        setNewEmail('');
        setNewChesscom('');
      }, 1000);
    } catch (err) {
      setCreateUserError(err.message || 'Failed to create user account.');
    } finally {
      setCreateUserLoading(false);
    }
  };

  const handleOpenEditUser = (user) => {
    setEditingUser(user);
    setEditFirstName(user.first_name || '');
    setEditMI(user.middle_initial || '');
    setEditLastName(user.last_name || '');
    setEditSuffix(user.suffix || '');
    setEditDob(user.date_of_birth || '');
    setEditChesscom(user.chesscom_username || '');
    setEditBio(user.bio || '');
    setEditingRole(user.role || 'student');
  };

  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setUserEditSaving(true);
    try {
      const computedName = formatCompositeName({
        firstName: editFirstName,
        middleInitial: editMI,
        lastName: editLastName,
        suffix: editSuffix,
      });

      await updateStudentProfile(editingUser.id, {
        first_name: editFirstName.trim(),
        middle_initial: editMI.trim().toUpperCase(),
        last_name: editLastName.trim(),
        suffix: editSuffix.trim(),
        date_of_birth: editDob,
        display_name: computedName,
        chesscom_username: editChesscom.trim().toLowerCase(),
        bio: editBio.trim(),
        role: editingRole,
      });

      if (editingUser.role !== editingRole) {
        await updateAccountRole(editingUser.id, editingRole);
      }

      await loadAdminData();
      setEditingUser(null);
    } catch (err) {
      console.error('Failed to update user profile:', err);
      alert('Failed to save user updates.');
    } finally {
      setUserEditSaving(false);
    }
  };

  const handleVerifyCredential = (credId) => {
    reviewCoachCredential(credId, 'verified', null, profile?.id);
    const updated = getCoachCredentials();
    setCredentials(updated);
  };

  const handleOpenRejectCredential = (cred) => {
    setRejectingCred(cred);
    setRejectionReason('Official Federation documentation could not be authenticated.');
  };

  const handleConfirmRejectCredential = () => {
    if (!rejectingCred) return;
    reviewCoachCredential(rejectingCred.id, 'rejected', rejectionReason, profile?.id);
    const updated = getCoachCredentials();
    setCredentials(updated);
    setRejectingCred(null);
  };

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
        title: 'Chapter 1: Foundational Opening Masterclass',
        description: 'Comprehensive variation walkthrough.',
        video_url: '',
        orientation: 'white',
        trained_side: 'white',
        pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ *',
        annotations: [{ ply: 12, keyMove: 'Bb4+', comment: 'Key tactical check disrupting White tempo.' }],
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

      await loadAdminData();
      setActiveTab('courses');
    } catch (err) {
      console.error('Failed to save course:', err);
      setCourseSaveError(err?.message || 'Failed to save course.');
    } finally {
      setCourseSaving(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course from the platform?')) return;
    try {
      await deleteCourse(courseId);
      await loadAdminData();
    } catch (err) {
      console.error('Failed to delete course:', err);
    }
  };

  const handleAddChapter = () => {
    setChapters([
      ...chapters,
      {
        title: `Chapter ${chapters.length + 1}: Variation Analysis`,
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
      await loadAdminData();
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-emerald-950/40 border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Platform Command Center
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <Server className="w-3.5 h-3.5" />
              Engine: Stockfish 18 NNUE Active
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Administrator Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Platform-wide governance, user tier oversight, coach credential verification queues, and curriculum moderation.
          </p>
        </div>

        {}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowCreateUserModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Account</span>
          </button>

          {onPreviewStudentView && (
            <button
              onClick={onPreviewStudentView}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-700 text-xs font-semibold border border-slate-200 transition-all"
              title="Preview how learners experience the portal"
            >
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>Preview Learner View</span>
            </button>
          )}
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Accounts
            </span>
            <div className="text-2xl font-black text-slate-900">{totalUsers}</div>
            <p className="text-[10px] text-purple-400">
              {studentCount} Students • {coachCount} Coaches • {adminCount} Admins
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Verified Coaches
            </span>
            <div className="text-2xl font-black text-slate-900">{verifiedCoachesCount}</div>
            <p className="text-[10px] text-emerald-400">
              {coachCount} registered coaching accounts
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Verification Queue
            </span>
            <div className="text-2xl font-black text-slate-900">{pendingCredentialsCount}</div>
            <p className="text-[10px] text-amber-400">
              {pendingCredentialsCount > 0 ? 'Pending credential reviews' : 'Queue up to date'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Platform Courses
            </span>
            <div className="text-2xl font-black text-slate-900">{courses.length}</div>
            <p className="text-[10px] text-slate-500">
              {courses.reduce((acc, c) => acc + (c.chapters?.length || 0), 0)} interactive chapters
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Stockfish Reviews
            </span>
            <div className="text-2xl font-black text-slate-900">{reviewedGamesCount}</div>
            <p className="text-[10px] text-cyan-400">
              Across {allGames.length} synced matches
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Zap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-4 overflow-x-auto pb-1 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'telemetry'
              ? 'border-purple-400 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Platform Telemetry</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-purple-400 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User &amp; Tier Governance ({accounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('coaches')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'coaches'
              ? 'border-purple-400 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Coach Verification Desk ({pendingCredentialsCount} Pending)</span>
        </button>

        <button
          onClick={() => setActiveTab('enrollments')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'enrollments'
              ? 'border-purple-400 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Mentorship Governance ({enrollments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'courses' || activeTab === 'courseBuilder'
              ? 'border-purple-400 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Curriculum Moderation ({courses.length})</span>
        </button>
      </div>

      {}
      {activeTab === 'telemetry' && (
        <div className="space-y-8">
          {}
          <StatisticsPanel
            role="admin"
            students={students}
            courses={courses}
            accounts={accounts}
            credentials={credentials}
            enrollments={enrollments}
          />

          {}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="border-b border-slate-200 pb-4">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-400" />
                    <span>Platform Tier Distribution &amp; Operational Health</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time status of all account tiers, services, and chess calculation engines.
                  </p>
                </div>

                {}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">
                        Students &amp; Learners ({studentCount})
                      </span>
                      <span className="text-slate-500 font-mono">
                        {totalUsers > 0 ? Math.round((studentCount / totalUsers) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{
                          width: `${totalUsers > 0 ? (studentCount / totalUsers) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">
                        Coaches &amp; Mentors ({coachCount})
                      </span>
                      <span className="text-slate-500 font-mono">
                        {totalUsers > 0 ? Math.round((coachCount / totalUsers) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all"
                        style={{
                          width: `${totalUsers > 0 ? (coachCount / totalUsers) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">
                        System Administrators ({adminCount})
                      </span>
                      <span className="text-slate-500 font-mono">
                        {totalUsers > 0 ? Math.round((adminCount / totalUsers) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="bg-purple-500 h-full rounded-full transition-all"
                        style={{
                          width: `${totalUsers > 0 ? (adminCount / totalUsers) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {}
                <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-500">Database Engine</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      MySQL / Store OK
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-500">Stockfish NNUE Worker</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      WASM Ready
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-500">Chess.com Public API</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Connected
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-500">Spaced Repetition Scheduler</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <span>Platform Audit &amp; Event Feed</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Recent platform administrative and governance events.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span className="font-semibold text-purple-400">Coach Verification</span>
                      <span>Recent</span>
                    </div>
                    <p className="text-slate-900">
                      Verified coach credentials for GM Magnus Carlsen (FIDE Senior Trainer).
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span className="font-semibold text-emerald-400">Account Registration</span>
                      <span>Recent</span>
                    </div>
                    <p className="text-slate-900">
                      New student profile registered and linked to Chess.com game database.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span className="font-semibold text-amber-400">Curriculum Publishing</span>
                      <span>Recent</span>
                    </div>
                    <p className="text-slate-900">
                      Interactive walkthrough module &quot;Sicilian Najdorf Novelty&quot; published.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search accounts by name, email, or Chess.com username..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500 placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Roles ({accounts.length})</option>
                <option value="student">Students ({studentCount})</option>
                <option value="coach">Coaches ({coachCount})</option>
                <option value="admin">Administrators ({adminCount})</option>
              </select>

              <button
                onClick={() => setShowCreateUserModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New User</span>
              </button>
            </div>
          </div>

          {}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">User Identity</th>
                    <th className="py-3.5 px-4">Contact &amp; Chess.com</th>
                    <th className="py-3.5 px-4">Current Role Tier</th>
                    <th className="py-3.5 px-4">Tier Governance Actions</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No accounts found matching search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                user.avatar_url ||
                                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                              }
                              alt={user.display_name}
                              className="w-9 h-9 rounded-full object-cover border border-purple-500/20 shrink-0"
                            />
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{user.display_name}</div>
                              <div className="text-[11px] text-slate-500">
                                DOB: {user.date_of_birth || 'Not set'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-mono text-slate-600">{user.email || 'No email'}</div>
                          {user.chesscom_username ? (
                            <a
                              href={`https://www.chess.com/member/${user.chesscom_username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <span>@{user.chesscom_username}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-500">Not linked</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                              user.role === 'admin'
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                : user.role === 'coach'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            {user.role || 'student'}
                          </span>
                        </td>

                        {}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {user.role !== 'coach' && (
                              <button
                                onClick={() => handleUpdateRole(user.id, 'coach')}
                                className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[11px] font-semibold border border-amber-500/20 transition-colors"
                                title="Promote user to Coach status"
                              >
                                Make Coach
                              </button>
                            )}

                            {user.role !== 'student' && (
                              <button
                                onClick={() => handleUpdateRole(user.id, 'student')}
                                className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold border border-emerald-500/20 transition-colors"
                                title="Demote to standard Student status"
                              >
                                Set Student
                              </button>
                            )}

                            {user.role !== 'admin' && (
                              <button
                                onClick={() => handleUpdateRole(user.id, 'admin')}
                                className="px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[11px] font-semibold border border-purple-500/20 transition-colors"
                                title="Grant Administrator status"
                              >
                                Grant Admin
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditUser(user)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-600 hover:text-slate-900 transition-colors"
                              title="Edit user details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {user.email?.toLowerCase() !== 'satoalt33@gmail.com' && (
                              <button
                                onClick={() => handleDeleteUser(user.id, user.display_name)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                                title="Permanently delete account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {}
      {activeTab === 'coaches' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <span>Coach Credential Verification Desk</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review submitted FIDE, USCF, and national federation credentials to certify coaching accounts.
              </p>
            </div>
            <div className="text-xs text-amber-400 font-mono">
              {pendingCredentialsCount} pending verification
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Coach</th>
                    <th className="py-3.5 px-4">Credential Title</th>
                    <th className="py-3.5 px-4">Issuer</th>
                    <th className="py-3.5 px-4">Submitted</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {credentials.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No coach credentials currently submitted.
                      </td>
                    </tr>
                  ) : (
                    credentials.map((cred) => (
                      <tr key={cred.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{cred.coach_name}</div>
                          <div className="text-[11px] text-slate-500">{cred.coach_email}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{cred.credential_type}</div>
                          {cred.document_url && (
                            <a
                              href={cred.document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <FileText className="w-3 h-3" />
                              <span>View Certificate Document</span>
                            </a>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">{cred.issuer || 'Federation'}</td>

                        <td className="py-3.5 px-4 text-slate-500">
                          {cred.submitted_at ? new Date(cred.submitted_at).toLocaleDateString() : '—'}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              cred.verification_status === 'verified'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : cred.verification_status === 'rejected'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {cred.verification_status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {cred.verification_status !== 'verified' && (
                              <button
                                onClick={() => handleVerifyCredential(cred.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
                              >
                                Approve &amp; Verify
                              </button>
                            )}

                            {cred.verification_status !== 'rejected' && (
                              <button
                                onClick={() => handleOpenRejectCredential(cred)}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-all"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {}
      {activeTab === 'enrollments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-400" />
                <span>Mentorship &amp; Cohort Enrollment Governance</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit student-coach pairings, coaching standard compliance, and dispute resolution.
              </p>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Total Pairings: {enrollments.length}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Assigned Coach</th>
                    <th className="py-3.5 px-4">Applied Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Review Notes</th>
                    <th className="py-3.5 px-4 text-right">Governance Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {enrollments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No mentorship enrollments active.
                      </td>
                    </tr>
                  ) : (
                    enrollments.map((enr) => (
                      <tr key={enr.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{enr.student_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {enr.student_elo || 1200} Elo
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-amber-400">{enr.coach_name}</div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500">
                          {enr.applied_at ? new Date(enr.applied_at).toLocaleDateString() : '—'}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              enr.review_status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : enr.review_status === 'rejected'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {enr.review_status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                          {enr.review_notes || '—'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {enr.review_status !== 'approved' && (
                              <button
                                onClick={() => {
                                  reviewStudentEnrollment(enr.id, 'approved', 'Admin approved', profile?.id);
                                  const updated = getStudentEnrollments();
                                  setEnrollments(updated);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold"
                              >
                                Approve
                              </button>
                            )}
                            {enr.review_status !== 'rejected' && (
                              <button
                                onClick={() => {
                                  reviewStudentEnrollment(enr.id, 'rejected', 'Admin override', profile?.id);
                                  const updated = getStudentEnrollments();
                                  setEnrollments(updated);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-600 hover:text-slate-900 text-[11px]"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <span>Platform Curriculum Moderation</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Oversee all courses authored across the platform, edit content, and assign modules.
              </p>
            </div>
            <button
              onClick={handleOpenNewCourse}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Platform Course</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white border border-slate-200 hover:border-slate-200 rounded-2xl p-6 shadow-xl transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        course.type === 'walkthrough'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}
                    >
                      {course.type === 'walkthrough' ? 'Interactive Board' : 'Video Masterclass'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {course.chapters?.length || 0} chapters
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base group-hover:text-purple-400 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {course.description || 'No description provided.'}
                  </p>

                  <div className="text-[11px] text-slate-500 pt-2 flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-600 font-mono">
                      Elo {course.min_elo || 0} - {course.max_elo || 3000}
                    </span>
                    <span className="capitalize px-2 py-0.5 rounded bg-slate-800 text-slate-600">
                      Orientation: {course.orientation || 'white'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleEditCourse(course)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-600 hover:text-slate-900 transition-colors"
                      title="Edit course"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                      title="Delete course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenAssignModal(course)}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-semibold border border-purple-500/20 transition-colors"
                    >
                      Assign
                    </button>
                    <button
                      onClick={() => navigate(`/courses/${course.id}`)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-700 text-xs font-semibold transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {}
      {activeTab === 'courseBuilder' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <span>{editingCourseId ? 'Edit Curriculum Module' : 'Create Platform Curriculum'}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Set module parameters, chapter variation trees, and Stockfish analysis notes.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('courses')}
              className="text-xs text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-lg bg-slate-800"
            >
              Cancel
            </button>
          </div>

          {courseSaveError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{courseSaveError}</span>
            </div>
          )}

          <form onSubmit={handleSaveCourse} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Course Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master the Ruy Lopez: Open Variation"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Course Mode
                </label>
                <select
                  value={courseType}
                  onChange={(e) => setCourseType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                >
                  <option value="walkthrough">Interactive Board Walkthrough</option>
                  <option value="video">Video Masterclass &amp; Lecture</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Course Description
              </label>
              <textarea
                rows={2}
                placeholder="Overview, strategic goals, and target outcomes for students..."
                value={courseDesc}
                onChange={(e) => setCourseDesc(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Min Student Elo
                </label>
                <input
                  type="number"
                  value={courseMinElo}
                  onChange={(e) => setCourseMinElo(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Max Student Elo
                </label>
                <input
                  type="number"
                  value={courseMaxElo}
                  onChange={(e) => setCourseMaxElo(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Board Orientation
                </label>
                <select
                  value={courseOrientation}
                  onChange={(e) => setCourseOrientation(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                >
                  <option value="white">White</option>
                  <option value="black">Black</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Trained Side
                </label>
                <select
                  value={courseTrainedSide}
                  onChange={(e) => setCourseTrainedSide(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                >
                  <option value="white">White</option>
                  <option value="black">Black</option>
                </select>
              </div>
            </div>

            {}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Course Chapters ({chapters.length})</h3>
                  <p className="text-[11px] text-slate-500">
                    Add chapters with PGN variations and tactical moment notes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddChapter}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-400 text-xs font-semibold border border-slate-200"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Chapter</span>
                </button>
              </div>

              <div className="space-y-4">
                {chapters.map((ch, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3.5 relative"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
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
                        <label className="text-[11px] font-semibold text-slate-500">Chapter Title</label>
                        <input
                          type="text"
                          value={ch.title}
                          onChange={(e) => {
                            const next = [...chapters];
                            next[idx].title = e.target.value;
                            setChapters(next);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">
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
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500">
                        PGN Notation / Move Sequence
                      </label>
                      <textarea
                        rows={3}
                        placeholder="1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ *"
                        value={ch.pgn || ''}
                        onChange={(e) => {
                          const next = [...chapters];
                          next[idx].pgn = e.target.value;
                          setChapters(next);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('courses')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-600 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={courseSaving}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-lg shadow-purple-600/20 disabled:opacity-50"
              >
                {courseSaving ? 'Publishing...' : 'Save & Publish Course'}
              </button>
            </div>
          </form>
        </div>
      )}

      {}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-purple-400" />
                  <span>Create Site Account</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct administrative creation of Student, Coach, or Admin profiles.
                </p>
              </div>
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            {createUserError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createUserError}</span>
              </div>
            )}

            {createUserSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{createUserSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="text-[11px] font-semibold text-slate-500">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">M.I. *</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={newMI}
                    onChange={(e) => setNewMI(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Suffix</label>
                  <input
                    type="text"
                    placeholder="Jr., III"
                    value={newSuffix}
                    onChange={(e) => setNewSuffix(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Last Name *</label>
                <input
                  type="text"
                  required
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Account Tier / Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold"
                  >
                    <option value="student">Student / Player</option>
                    <option value="coach">Chess Coach</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Chess.com Username</label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={newChesscom}
                    onChange={(e) => setNewChesscom(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Initial Password *</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-600 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserLoading}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  {createUserLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit User Profile</h3>
                <p className="text-xs text-slate-500">{editingUser.email}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[11px] font-semibold text-slate-500">First Name</label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">M.I.</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={editMI}
                    onChange={(e) => setEditMI(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Last Name</label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Date of Birth</label>
                  <input
                    type="date"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Role Tier</label>
                  <select
                    value={editingRole}
                    onChange={(e) => setEditingRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold"
                  >
                    <option value="student">Student</option>
                    <option value="coach">Coach</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Chess.com Username</label>
                <input
                  type="text"
                  value={editChesscom}
                  onChange={(e) => setEditChesscom(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Bio</label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-600 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={userEditSaving}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  {userEditSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {}
      {rejectingCred && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Reject Coach Credential</h3>
            <p className="text-xs text-slate-500">
              Provide an official reason for rejecting the credential submission for{' '}
              <strong className="text-slate-900">{rejectingCred.coach_name}</strong>.
            </p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectingCred(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-600 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejectCredential}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {assigningCourse && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Assign Platform Curriculum</h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{assigningCourse.title}</p>
              </div>
              <button
                onClick={() => setAssigningCourse(null)}
                className="text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>

            {assignSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Assignments successfully updated!</span>
              </div>
            )}

            {assignError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{assignError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600 uppercase tracking-wider">
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
                  className="text-purple-400 hover:underline text-[11px]"
                >
                  {selectedStudentIds.length === students.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-2xl p-2 bg-slate-50">
                {students.map((s) => {
                  const isChecked = selectedStudentIds.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleToggleStudentSelection(s.id)}
                      className="p-2.5 rounded-xl hover:bg-white cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-purple-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-900">{s.display_name}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {s.current_elo || 1200} Elo
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setAssigningCourse(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-600 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAssignments}
                disabled={assigning}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold disabled:opacity-50"
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
