import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllAccounts, getCoachCredentials, applyStudentEnrollment, getStudentEnrollments } from '../lib/authStore';
import { getAllMarketplaceCourses, enrollInCourse } from '../lib/db';
import {
  ShieldCheck,
  Award,
  BookOpen,
  Users,
  Star,
  CheckCircle2,
  FileText,
  Clock,
  ExternalLink,
  Mail,
  Send,
  Sparkles,
  ArrowLeft,
  X,
  AlertCircle,
} from 'lucide-react';

export default function CoachProfile() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [studentElo, setStudentElo] = useState(profile?.current_elo || 1200);
  const [goals, setGoals] = useState('Aiming to build a strong classical opening repertoire and improve tactical calculation.');
  const [notes, setNotes] = useState('Available for weekly game reviews and interactive Stockfish analysis sessions.');
  const [submitting, setSubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState('');

  const accounts = useMemo(() => getAllAccounts(), []);
  const coach = useMemo(() => {
    return (
      accounts.find((a) => a.id === id) ||
      accounts.find((a) => a.role === 'coach') || {
        id: 'coach-magnus-uuid',
        display_name: 'Magnus C. Carlsen',
        role: 'coach',
        bio: 'FIDE Grandmaster, Senior Trainer, and former World Chess Champion. Mentoring competitive tournament players.',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        chesscom_username: 'magnuscarlsen',
        elo_rating: 2850,
        min_student_elo: 1300,
        coaching_standards: 'Mastery of opening principles, tactical pattern recognition, pawn structures, and endgame fundamentals.',
      }
    );
  }, [accounts, id]);

  const credentials = useMemo(() => {
    const creds = getCoachCredentials(coach.id);
    return creds.length > 0
      ? creds
      : [
          {
            id: 'cred-fide-01',
            credential_type: 'FIDE Senior Trainer License',
            issuer: 'FIDE Qualification Commission',
            document_url: 'https://ratings.fide.com',
            verification_status: 'verified',
            submitted_at: '2026-01-05T00:00:00.000Z',
          },
        ];
  }, [coach.id]);

  const authoredCourses = useMemo(() => {
    const all = getAllMarketplaceCourses();
    return all.filter((c) => c.created_by === coach.id || !c.created_by);
  }, [coach.id]);

  const myEnrollment = useMemo(() => {
    if (!profile?.id) return null;
    const allEnr = getStudentEnrollments();
    return allEnr.find((e) => e.student_id === profile.id && e.coach_id === coach.id);
  }, [profile?.id, coach.id]);

  const handleApply = (e) => {
    e.preventDefault();
    if (!profile?.id) {
      navigate('/login');
      return;
    }
    setSubmitting(true);
    setApplyError('');
    try {
      applyStudentEnrollment({
        studentId: profile.id,
        studentName: profile.display_name || 'Student',
        studentEmail: profile.email || '',
        studentElo: parseInt(studentElo, 10) || 1200,
        coachId: coach.id,
        coachName: coach.display_name,
        notes: `Goals: ${goals} | Schedule/Notes: ${notes}`,
      });
      setApplySuccess(true);
      setTimeout(() => {
        setShowApplyModal(false);
        setApplySuccess(false);
      }, 1500);
    } catch (err) {
      setApplyError(err.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Link
        to="/marketplace"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Course Marketplace</span>
      </Link>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-5">
          <img
            src={
              coach.avatar_url ||
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
            }
            alt={coach.display_name}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-slate-200 shadow-md shrink-0"
          />

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified FIDE Instructor
              </span>
              {coach.chesscom_username && (
                <a
                  href={`https://www.chess.com/member/${coach.chesscom_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1 font-mono"
                >
                  <span>@{coach.chesscom_username}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {coach.display_name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
              {coach.bio || 'Professional chess coach dedicated to tournament player growth.'}
            </p>
          </div>
        </div>

        <div className="shrink-0 space-y-2">
          {myEnrollment ? (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">Mentorship Status</span>
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 capitalize">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{myEnrollment.review_status} Student</span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowApplyModal(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              <Award className="w-4 h-4" />
              <span>Apply for 1-on-1 Mentorship</span>
            </button>
          )}

          <Link
            to={`/messages?recipient=${coach.id}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Send Message</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Peak Rating</span>
          <div className="text-2xl font-black text-slate-900">{coach.elo_rating || 2850} Elo</div>
          <p className="text-[11px] text-emerald-700 font-semibold">Grandmaster</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Authored Modules</span>
          <div className="text-2xl font-black text-slate-900">{authoredCourses.length}</div>
          <p className="text-[11px] text-slate-500">Free open enrollment</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Min. Student Elo</span>
          <div className="text-2xl font-black text-slate-900">{coach.min_student_elo || 1200}</div>
          <p className="text-[11px] text-amber-700 font-semibold">Recommended Level</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            <span>Federation Credentials &amp; Verification</span>
          </h2>

          <div className="space-y-3">
            {credentials.map((cred) => (
              <div key={cred.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{cred.credential_type}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                    {cred.verification_status}
                  </span>
                </div>
                <div className="text-slate-500 text-[11px]">Issuer: {cred.issuer || 'Official Federation'}</div>
                {cred.document_url && (
                  <a
                    href={cred.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:underline pt-0.5"
                  >
                    <FileText className="w-3 h-3" />
                    <span>View Federation Document</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Coaching Methodology &amp; Standards</span>
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
            {coach.coaching_standards ||
              'Rigorous opening preparation, weekly tactical problem sets, and post-game engine evaluation reviews.'}
          </p>
          <div className="text-xs text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Notice for Prospective Students</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              You do not need to be an accepted private student to study this coach&apos;s interactive courses. Any player can enroll from the marketplace.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            <span>Masterclasses Authored by {coach.display_name}</span>
          </h2>
          <Link to="/marketplace" className="text-xs font-bold text-emerald-700 hover:underline">
            Browse All Marketplace →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {authoredCourses.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {c.trained_side || 'White'}
                </span>
                <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{c.title}</h3>
                <p className="text-[11px] text-slate-500">{c.chapters?.length || 0} Interactive Chapters</p>
              </div>

              <button
                onClick={() => {
                  if (profile?.id) {
                    enrollInCourse(c.id, profile.id);
                    navigate('/courses');
                  } else {
                    navigate('/login');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0 transition-colors"
              >
                Enroll Free
              </button>
            </div>
          ))}
        </div>
      </div>

      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600" />
                  <span>Apply for 1-on-1 Mentorship</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">With Coach {coach.display_name}</p>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {applySuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Application submitted to Coach {coach.display_name} for review!</span>
              </div>
            )}

            {applyError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{applyError}</span>
              </div>
            )}

            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Your Current Elo Rating</label>
                <input
                  type="number"
                  required
                  value={studentElo}
                  onChange={(e) => setStudentElo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Primary Chess Goals</label>
                <textarea
                  rows={2}
                  required
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Availability &amp; Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Send Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
