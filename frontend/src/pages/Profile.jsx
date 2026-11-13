import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchChesscomProfile,
  fetchChesscomStats,
  generateVerificationCode,
} from '../lib/chesscom';
import { replaceSyncedChesscomGames } from '../lib/db';
import { formatCompositeName } from '../lib/authStore';
import { APP_CONFIG } from '../config/engine';
import {
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Zap,
  Flame,
  Clock,
  Save,
  GraduationCap,
  ChevronRight,
  Award,
  BookOpen,
} from 'lucide-react';

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i);

function getDaysInMonth(m, y) {
  if (!m) return 31;
  const monthNum = parseInt(m, 10);
  const yearNum = y ? parseInt(y, 10) : CURRENT_YEAR;
  return new Date(yearNum, monthNum, 0).getDate();
}

export default function Profile() {
  const { profile, updateProfile, isCoach, isAdmin } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [middleInitial, setMiddleInitial] = useState(profile?.middle_initial || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [suffix, setSuffix] = useState(profile?.suffix || '');
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth || '');
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [bio, setBio] = useState(profile?.bio || '');
  const [chesscomInput, setChesscomInput] = useState(profile?.chesscom_username || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [copied, setCopied] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState(null);

  const [chesscomData, setChesscomData] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (chesscomInput) {
      setVerificationCode(generateVerificationCode(chesscomInput));
    }
  }, [chesscomInput]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setFirstName(profile.first_name || '');
      setMiddleInitial(profile.middle_initial || '');
      setLastName(profile.last_name || '');
      setSuffix(profile.suffix || '');
      setDateOfBirth(profile.date_of_birth || '');
      if (profile.date_of_birth && profile.date_of_birth.includes('-')) {
        const [y, m, d] = profile.date_of_birth.split('-');
        setDobYear(y || '');
        setDobMonth(m || '');
        setDobDay(d || '');
      }
      setBio(profile.bio || '');
      setChesscomInput(profile.chesscom_username || '');
    }
  }, [profile]);

  const handleDobChange = (nextMonth, nextDay, nextYear) => {
    const maxDays = getDaysInMonth(nextMonth, nextYear);
    let validDay = nextDay;
    if (nextDay && parseInt(nextDay, 10) > maxDays) {
      validDay = String(maxDays).padStart(2, '0');
    }
    setDobMonth(nextMonth);
    setDobDay(validDay);
    setDobYear(nextYear);
    if (nextMonth && validDay && nextYear) {
      setDateOfBirth(`${nextYear}-${nextMonth}-${validDay}`);
    } else {
      setDateOfBirth('');
    }
  };

  const loadChesscomData = async (username) => {
    if (!username) return;
    setLoadingStats(true);
    try {
      const [prof, stats] = await Promise.all([
        fetchChesscomProfile(username).catch(() => null),
        fetchChesscomStats(username).catch(() => null),
      ]);
      setChesscomData(prof);
      setStatsData(stats);
    } catch (err) {
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (profile?.chesscom_username) {
      loadChesscomData(profile.chesscom_username);
    }
  }, [profile?.chesscom_username]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const computedDefault = formatCompositeName({
        firstName,
        middleInitial,
        lastName,
        suffix,
      });
      const finalDisplayName = displayName.trim() || computedDefault;

      await updateProfile({
        display_name: finalDisplayName,
        first_name: firstName.trim(),
        middle_initial: middleInitial.trim().toUpperCase(),
        last_name: lastName.trim(),
        suffix: suffix.trim(),
        date_of_birth: dateOfBirth,
        bio,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
    } finally {
      setIsSaving(false);
    }
  };

  const linkChesscomUsername = async (liveProfile) => {
    const nextUsername = liveProfile?.username || chesscomInput.trim();
    const prevUsername = profile?.chesscom_username || '';

    await updateProfile({
      chesscom_username: nextUsername,
      avatar_url: liveProfile?.avatar || profile?.avatar_url,
    });

    if (profile?.id && prevUsername.toLowerCase() !== nextUsername.toLowerCase()) {
      await replaceSyncedChesscomGames(profile.id, []);
    }

    await loadChesscomData(nextUsername);
    return nextUsername;
  };

  const handleVerifyBio = async () => {
    if (!chesscomInput.trim()) return;
    setIsVerifying(true);
    setVerifyMessage(null);

    try {
      const liveProfile = await fetchChesscomProfile(chesscomInput.trim());
      const bioText = (liveProfile?.bio || '').toLowerCase();
      const codeToFind = verificationCode.toLowerCase();

      if (bioText.includes(codeToFind) || APP_CONFIG.verificationMethod === 'trusted') {
        const linked = await linkChesscomUsername(liveProfile);
        setVerifyMessage({
          type: 'success',
          text: `Success! Linked @${linked}. Previous Chess.com games were cleared — open Games and sync to load this account.`,
        });
      } else {
        setVerifyMessage({
          type: 'error',
          text: `Verification code was not found in @${chesscomInput}'s Chess.com bio. Please paste "${verificationCode}" into your bio and try again, or click "Quick Link".`,
        });
      }
    } catch (err) {
      setVerifyMessage({
        type: 'error',
        text: err.message || 'Verification check failed. Please check the username.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleQuickLink = async () => {
    if (!chesscomInput.trim()) return;
    setIsVerifying(true);
    setVerifyMessage(null);
    try {
      const liveProfile = await fetchChesscomProfile(chesscomInput.trim());
      const linked = await linkChesscomUsername(liveProfile);
      setVerifyMessage({
        type: 'success',
        text: `Linked @${linked} via trusted ownership. Previous Chess.com games were cleared — open Games and sync to load this account.`,
      });
    } catch (err) {
      setVerifyMessage({
        type: 'error',
        text: err.message || 'Could not find that Chess.com user.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const copyVerificationCode = () => {
    navigator.clipboard.writeText(verificationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Student Profile &amp; Settings</h1>
        <p className="text-slate-400 mt-1">
          Manage your platform identity, Chess.com game synchronization, and coaching credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-4">
              <img
                src={
                  profile?.avatar_url ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
                }
                alt={profile?.display_name || 'Profile'}
                className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-md"
              />
              <div>
                <h2 className="text-lg font-bold text-white">{profile?.display_name || 'Chess Enthusiast'}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    {profile?.role || 'student'}
                  </span>
                  {profile?.chesscom_username ? (
                    <span className="text-xs text-emerald-400 font-mono font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      @{profile.chesscom_username}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-400 font-medium">No Chess.com account linked</span>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-6 space-y-4 pt-6 border-t border-slate-800">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Display Name
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const auto = formatCompositeName({
                        firstName,
                        middleInitial,
                        lastName,
                        suffix,
                      });
                      if (auto) setDisplayName(auto);
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                  >
                    Auto-fill from Full Name
                  </button>
                </div>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Your display name or handle"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Configure how your name appears across the dashboard, leaderboards, and coach records.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Full Name Composite
                </span>

                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                      M.I.
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={middleInitial}
                      onChange={(e) => setMiddleInitial(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white text-center font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="col-span-5">
                    <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div className="w-full sm:w-1/2">
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                    Suffix
                  </label>
                  <select
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">None</option>
                    <option value="Jr.">Jr.</option>
                    <option value="Sr.">Sr.</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                    <option value="V">V</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Date of Birth
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={dobMonth}
                    onChange={(e) => handleDobChange(e.target.value, dobDay, dobYear)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 focus:bg-slate-900"
                  >
                    <option value="" disabled className="text-slate-500">Month</option>
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value} className="bg-slate-900 text-white">
                        {m.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={dobDay}
                    onChange={(e) => handleDobChange(dobMonth, e.target.value, dobYear)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 focus:bg-slate-900"
                  >
                    <option value="" disabled className="text-slate-500">Day</option>
                    {Array.from({ length: getDaysInMonth(dobMonth, dobYear) }, (_, i) => {
                      const dayVal = String(i + 1).padStart(2, '0');
                      return (
                        <option key={dayVal} value={dayVal} className="bg-slate-900 text-white">
                          {i + 1}
                        </option>
                      );
                    })}
                  </select>

                  <select
                    value={dobYear}
                    onChange={(e) => handleDobChange(dobMonth, dobDay, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 focus:bg-slate-900"
                  >
                    <option value="" disabled className="text-slate-500">Year</option>
                    {YEARS.map((y) => (
                      <option key={y} value={String(y)} className="bg-slate-900 text-white">
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Bio &amp; Study Goals
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Describe your current study goals, rating target, opening rep..."
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
                {saveSuccess && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Updated!
                  </span>
                )}
              </div>
            </form>
          </div>

          {!isAdmin && (
            !isCoach ? (
              <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-emerald-950/30 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Become an Official Coach</h3>
                    <p className="text-xs text-slate-400">All accounts start as Students. Apply with your titles to teach.</p>
                  </div>
                </div>
                <Link
                  to="/applications"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                >
                  <span>Become a Coach</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-emerald-950/30 border border-amber-500/30 rounded-3xl p-5 shadow-xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">Coach Accreditation Verified</h3>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">You are an approved and verified coach.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/coach"
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20 text-center"
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>Coaching Mode</span>
                  </Link>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 text-center"
                  >
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span>Student Mode</span>
                  </Link>
                </div>
              </div>
            )
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-xs text-slate-400 space-y-2 shadow-xl">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <AlertCircle className="w-4 h-4 text-emerald-400" />
              <span>Chess.com Identity Architecture</span>
            </div>
            <p className="leading-relaxed">
              Chess.com’s Public API is unauthenticated and read-only. ChessLogs uses secure authentication with lightweight ownership linking.
            </p>
            <div className="text-[11px] font-mono text-slate-500">
              Config flag: <code>VITE_CHESSCOM_OAUTH_ENABLED={String(APP_CONFIG.chesscomOAuthEnabled)}</code>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Chess.com Account Linking</span>
                  {profile?.chesscom_username && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Verified
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Link your username to unlock game sync, Stockfish reviews, and coach progress tracking.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Chess.com Username
                </label>
                <input
                  type="text"
                  value={chesscomInput}
                  onChange={(e) => setChesscomInput(e.target.value)}
                  placeholder="e.g. hikaru, magnuscarlsen, danielnaroditsky"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={handleQuickLink}
                  disabled={isVerifying || !chesscomInput.trim()}
                  className="w-full px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isVerifying ? 'Checking...' : 'Link Account'}
                </button>
              </div>
            </div>

            {chesscomInput && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Optional Bio Ownership Check:</span>
                  <button
                    type="button"
                    onClick={copyVerificationCode}
                    className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-400 font-bold break-all flex items-center justify-between">
                  <span>{verificationCode}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-400">
                    Paste this into your Chess.com bio, then click &quot;Verify Bio Check&quot;.
                  </span>
                  <button
                    type="button"
                    onClick={handleVerifyBio}
                    disabled={isVerifying}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 font-medium whitespace-nowrap transition-colors"
                  >
                    Verify Bio Check
                  </button>
                </div>
              </div>
            )}

            {verifyMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 font-medium ${
                  verifyMessage.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {verifyMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{verifyMessage.text}</span>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>Chess.com Ratings &amp; Stats</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Synchronized live from <code>api.chess.com/pub/player/{profile?.chesscom_username || 'username'}/stats</code>
                </p>
              </div>

              {profile?.chesscom_username && (
                <button
                  onClick={() => loadChesscomData(profile.chesscom_username)}
                  disabled={loadingStats}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Refresh Public API Stats"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
              )}
            </div>

            {loadingStats ? (
              <div className="py-12 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                <span>Fetching live ratings from Chess.com Public API...</span>
              </div>
            ) : statsData ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Rapid</span>
                    <Clock className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-white">
                    {statsData.chess_rapid?.last?.rating || '—'}
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between font-medium">
                    <span>Best: {statsData.chess_rapid?.best?.rating || '—'}</span>
                    <span>
                      W: {statsData.chess_rapid?.record?.win || 0} / L: {statsData.chess_rapid?.record?.loss || 0}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Blitz</span>
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-white">
                    {statsData.chess_blitz?.last?.rating || '—'}
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between font-medium">
                    <span>Best: {statsData.chess_blitz?.best?.rating || '—'}</span>
                    <span>
                      W: {statsData.chess_blitz?.record?.win || 0} / L: {statsData.chess_blitz?.record?.loss || 0}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Bullet</span>
                    <Flame className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-2xl font-black text-white">
                    {statsData.chess_bullet?.last?.rating || '—'}
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between font-medium">
                    <span>Best: {statsData.chess_bullet?.best?.rating || '—'}</span>
                    <span>
                      W: {statsData.chess_bullet?.record?.win || 0} / L: {statsData.chess_bullet?.record?.loss || 0}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Daily</span>
                    <Trophy className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-black text-white">
                    {statsData.chess_daily?.last?.rating || '—'}
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between font-medium">
                    <span>Best: {statsData.chess_daily?.best?.rating || '—'}</span>
                    <span>
                      W: {statsData.chess_daily?.record?.win || 0} / L: {statsData.chess_daily?.record?.loss || 0}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                No stats available. Link a valid Chess.com username above to load ratings automatically.
              </div>
            )}

            {chesscomData && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <img
                    src={chesscomData.avatar || profile?.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-full border border-slate-700"
                  />
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>{chesscomData.name || chesscomData.username}</span>
                      {chesscomData.title && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                          {chesscomData.title}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-400">Member since {new Date(chesscomData.joined * 1000).toLocaleDateString()}</div>
                  </div>
                </div>

                <a
                  href={chesscomData.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
                >
                  <span>View on Chess.com</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
