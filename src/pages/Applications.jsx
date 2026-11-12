import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCoachCredentials, submitCoachCredential } from '../lib/authStore';
import {
  GraduationCap,
  Award,
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Sparkles,
  ChevronRight,
  Send,
  User,
  BookOpen,
  HelpCircle,
  XCircle,
  ShieldAlert,
} from 'lucide-react';

const FEDERATION_TITLES = [
  'None / Candidate Instructor',
  'Grandmaster (GM)',
  'International Master (IM)',
  'FIDE Master (FM)',
  'Candidate Master (CM)',
  'Woman Grandmaster (WGM)',
  'Woman International Master (WIM)',
  'National Master (NM)',
  'FIDE Senior Trainer (FST)',
  'FIDE Trainer (FT)',
  'FIDE Instructor (FI)',
  'National Instructor (NI)',
  'Certified Club Coach (1800+ ELO)',
];

const SPECIALTIES = [
  'Opening Repertoire & Theory',
  'Middle-game Tactics & Calculation',
  'Endgame Technique & Bridges',
  'Tournament Psychology & Strategy',
  'Youth & Scholastic Foundations',
  'Adult Improver Coaching (1000–1800)',
];

export default function Applications() {
  const { profile, isCoach, isAdmin } = useAuth();

  const [myCredentials, setMyCredentials] = useState([]);
  const [loading, setLoading] = useState(true);

  const [applicantName, setApplicantName] = useState(profile?.display_name || '');
  const [fideTitle, setFideTitle] = useState('FIDE Instructor (FI)');
  const [federationId, setFederationId] = useState(profile?.chesscom_username || '');
  const [peakRating, setPeakRating] = useState('2050');
  const [experienceYears, setExperienceYears] = useState('4');
  const [specialty, setSpecialty] = useState('Opening Repertoire & Theory');
  const [documentUrl, setDocumentUrl] = useState('');
  const [coachingBio, setCoachingBio] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (profile?.id) {
      const creds = getCoachCredentials(profile.id);
      setMyCredentials(creds);
      setLoading(false);
    }
  }, [profile?.id]);

  const handleSubmitApplication = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!profile?.id) {
      setErrorMsg('You must be signed in to submit a coach application.');
      return;
    }

    if (!applicantName.trim()) {
      setErrorMsg('Please provide your full legal or coach display name.');
      return;
    }

    if (!documentUrl.trim()) {
      setErrorMsg('Please provide a documentation URL (e.g., FIDE profile, USCF card, certification link).');
      return;
    }

    setSubmitting(true);

    try {
      const newCred = submitCoachCredential({
        coachId: profile.id,
        coachName: applicantName.trim(),
        coachEmail: profile.email || '',
        credentialType: fideTitle,
        issuer: 'Official Chess Federation / Verification Bureau',
        documentUrl: documentUrl.trim(),
        title: fideTitle,
        rating: peakRating.trim(),
        specialty,
        experience: `${experienceYears} years`,
        bio: coachingBio.trim(),
      });

      setMyCredentials((prev) => [newCred, ...prev]);
      setSuccessMsg('Your coach credential application has been submitted to the platform administration queue!');
      setDocumentUrl('');
      setCoachingBio('');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingApps = myCredentials.filter((c) => c.verification_status === 'pending');
  const verifiedApps = myCredentials.filter((c) => c.verification_status === 'verified');
  const rejectedApps = myCredentials.filter((c) => c.verification_status === 'rejected');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-amber-950/30 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              Coach Accreditation Bureau
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Role: <strong className="text-white capitalize">{profile?.role || 'student'}</strong>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Apply to Become an Official Coach
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            By default, all ChessLogs accounts are created as Tournament Students. Certified instructors, titled players (GM/IM/FM/NM), and experienced coaches can apply here to unlock Coach Studio tools, publish masterclasses to the Marketplace, and mentor students 1-on-1.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          {isCoach && (
            <Link
              to="/coach"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/20 transition-all"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Open Coach Studio</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Review Verification Queue</span>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span>Coach Accreditation Form</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Provide your chess credentials, tournament history, and teaching experience for administrator evaluation.
              </p>
            </div>

            {successMsg && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitApplication} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Coach Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="Full legal or coaching name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profile?.email || 'user@chesslogs.com'}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Accreditation / Title Tier *
                  </label>
                  <select
                    value={fideTitle}
                    onChange={(e) => setFideTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    {FEDERATION_TITLES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Chess.com / FIDE / USCF ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={federationId}
                    onChange={(e) => setFederationId(e.target.value)}
                    placeholder="e.g. magnuscarlsen or FIDE #1503014"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Peak Elo Rating *
                  </label>
                  <input
                    type="text"
                    required
                    value={peakRating}
                    onChange={(e) => setPeakRating(e.target.value)}
                    placeholder="e.g. 2150"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Coaching Experience *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    placeholder="Years active"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Core Curriculum Focus
                  </label>
                  <select
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {SPECIALTIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Credential / Verification URL *
                </label>
                <input
                  type="url"
                  required
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  placeholder="https://ratings.fide.com/profile/... or certificate link"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Provide a publicly verifiable link to your FIDE ratings profile, USCF member card, or official coaching diploma.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Coaching Bio &amp; Philosophy
                </label>
                <textarea
                  rows={4}
                  value={coachingBio}
                  onChange={(e) => setCoachingBio(e.target.value)}
                  placeholder="Describe your coaching philosophy, target student rating range, preferred opening repertoires, and any notable tournament pupils..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <p className="text-[11px] text-slate-500">
                  Applications are reviewed by platform admins within 24–48 hours.
                </p>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Submitting Application...' : 'Submit Application'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Your Application History</span>
            </h3>

            {loading ? (
              <p className="text-xs text-slate-500">Checking credentials on file...</p>
            ) : myCredentials.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl p-4 space-y-2">
                <Award className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">No applications submitted yet.</p>
                <p className="text-[11px] text-slate-500">Fill out the form on the left to apply for certified coach status.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myCredentials.map((cred) => {
                  const isVerified = cred.verification_status === 'verified';
                  const isRejected = cred.verification_status === 'rejected';
                  const isPending = cred.verification_status === 'pending';

                  return (
                    <div
                      key={cred.id}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-xs text-white block">
                            {cred.credential_type || 'Coach Credential'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Submitted: {new Date(cred.submitted_at).toLocaleDateString()}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            isVerified
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : isRejected
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {cred.verification_status}
                        </span>
                      </div>

                      {cred.document_url && (
                        <a
                          href={cred.document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-mono"
                        >
                          <span>View submitted verification document</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      {isRejected && cred.rejection_reason && (
                        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 space-y-1">
                          <strong className="block text-rose-400">Admin Feedback:</strong>
                          <span>{cred.rejection_reason}</span>
                        </div>
                      )}

                      {isVerified && (
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                          <span>Approved &amp; verified. Your account tier is upgraded to Coach!</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>Accreditation Guidelines</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
              <div className="space-y-1">
                <span className="font-bold text-slate-200 block">1. Who is eligible?</span>
                <p>
                  Any player holding an official FIDE title (GM, IM, FM, CM), national federation title (NM), or recognized instructor license (FST, FT, FI, NI).
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-200 block">2. What can Coaches do?</span>
                <p>
                  Coaches can create MoveTrainer &amp; video curriculum, list courses in the public Marketplace, review games, and offer private 1-on-1 mentorship.
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-200 block">3. Can students still study courses?</span>
                <p>
                  Yes! All students can freely browse the Marketplace, enroll in courses, and study with MoveTrainer regardless of coach status.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
