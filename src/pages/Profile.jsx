import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchChesscomProfile,
  fetchChesscomStats,
  generateVerificationCode,
} from '../lib/chesscom';
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
} from 'lucide-react';

export default function Profile() {
  const { profile, updateProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
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

  // Generate verification code when input changes
  useEffect(() => {
    if (chesscomInput) {
      setVerificationCode(generateVerificationCode(chesscomInput));
    }
  }, [chesscomInput]);

  // Sync state if profile changes
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setChesscomInput(profile.chesscom_username || '');
    }
  }, [profile]);

  // Fetch live Chess.com stats
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
      console.error('Failed to load Chess.com public data:', err);
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
      await updateProfile({
        display_name: displayName,
        bio,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
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
        await updateProfile({
          chesscom_username: chesscomInput.trim().toLowerCase(),
          avatar_url: liveProfile?.avatar || profile?.avatar_url,
        });
        await loadChesscomData(chesscomInput.trim());
        setVerifyMessage({
          type: 'success',
          text: `Success! Linked Chess.com account @${chesscomInput.trim()}.`,
        });
      } else {
        setVerifyMessage({
          type: 'error',
          text: `Verification code was not found in @${chesscomInput}'s Chess.com bio. Please paste "${verificationCode}" into your bio and try again, or click "Quick Trusted Link".`,
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
      await updateProfile({
        chesscom_username: chesscomInput.trim().toLowerCase(),
        avatar_url: liveProfile?.avatar || profile?.avatar_url,
      });
      await loadChesscomData(chesscomInput.trim());
      setVerifyMessage({
        type: 'success',
        text: `Linked Chess.com account @${chesscomInput.trim()} via trusted ownership declaration.`,
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Student Profile & Settings</h1>
        <p className="text-slate-400 mt-1">
          Manage your coach-student identity and link your Chess.com account to sync games and rating telemetry.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Card & Edit */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
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
                  <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {profile?.role || 'student'}
                  </span>
                  {profile?.chesscom_username ? (
                    <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      @{profile.chesscom_username}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-400">No Chess.com account linked</span>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Edit Form */}
            <form onSubmit={handleSaveProfile} className="mt-6 space-y-4 pt-6 border-t border-slate-800">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Your full name or handle"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Coach Bio & Goals
                </label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Describe your current study goals, rating target, opening rep..."
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
                {saveSuccess && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Updated!
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Constraint #1 Architecture Notice */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <AlertCircle className="w-4 h-4 text-cyan-400" />
              <span>Chess.com Identity Architecture</span>
            </div>
            <p>
              Chess.com’s Public API is unauthenticated and read-only. Official OAuth requires manual partner approval.
              ChessLogs uses secure Supabase Auth as identity provider with lightweight ownership linking.
            </p>
            <div className="text-[11px] font-mono text-slate-500">
              Config flag: <code>VITE_CHESSCOM_OAUTH_ENABLED={String(APP_CONFIG.chesscomOAuthEnabled)}</code>
            </div>
          </div>
        </div>

        {/* Right Column: Chess.com Linking & Live Ratings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Linking Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Chess.com Account Linking</span>
                  {profile?.chesscom_username && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={handleQuickLink}
                  disabled={isVerifying || !chesscomInput.trim()}
                  className="w-full px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
                >
                  {isVerifying ? 'Checking...' : 'Link Account'}
                </button>
              </div>
            </div>

            {/* Verification Code Box */}
            {chesscomInput && (
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Optional Bio Ownership Check:</span>
                  <button
                    type="button"
                    onClick={copyVerificationCode}
                    className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-400 font-semibold break-all flex items-center justify-between">
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
                    className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium whitespace-nowrap transition-colors"
                  >
                    Verify Bio Check
                  </button>
                </div>
              </div>
            )}

            {verifyMessage && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  verifyMessage.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {verifyMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{verifyMessage.text}</span>
              </div>
            )}
          </div>

          {/* Live Chess.com Telemetry & Ratings */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>Chess.com Ratings & Stats</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Synchronized live from <code>api.chess.com/pub/player/{profile?.chesscom_username || 'username'}/stats</code>
                </p>
              </div>

              {profile?.chesscom_username && (
                <button
                  onClick={() => loadChesscomData(profile.chesscom_username)}
                  disabled={loadingStats}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Refresh Public API Stats"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
              )}
            </div>

            {loadingStats ? (
              <div className="py-12 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                <span>Fetching live ratings from Chess.com Public API...</span>
              </div>
            ) : statsData ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Rapid */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Rapid</span>
                    <Clock className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-white">
                    {statsData.chess_rapid?.last?.rating || '—'}
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>Best: {statsData.chess_rapid?.best?.rating || '—'}</span>
                    <span>
                      W: {statsData.chess_rapid?.record?.win || 0} / L: {statsData.chess_rapid?.record?.loss || 0}
                    </span>
                  </div>
                </div>

                {/* Blitz */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Blitz</span>
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-white">
                    {statsData.chess_blitz?.last?.rating || '—'}
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>Best: {statsData.chess_blitz?.best?.rating || '—'}</span>
                    <span>
                      W: {statsData.chess_blitz?.record?.win || 0} / L: {statsData.chess_blitz?.record?.loss || 0}
                    </span>
                  </div>
                </div>

                {/* Bullet */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Bullet</span>
                    <Flame className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-2xl font-black text-white">
                    {statsData.chess_bullet?.last?.rating || '—'}
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>Best: {statsData.chess_bullet?.best?.rating || '—'}</span>
                    <span>
                      W: {statsData.chess_bullet?.record?.win || 0} / L: {statsData.chess_bullet?.record?.loss || 0}
                    </span>
                  </div>
                </div>

                {/* Daily */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Daily</span>
                    <Trophy className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-black text-white">
                    {statsData.chess_daily?.last?.rating || '—'}
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>Best: {statsData.chess_daily?.best?.rating || '—'}</span>
                    <span>
                      W: {statsData.chess_daily?.record?.win || 0} / L: {statsData.chess_daily?.record?.loss || 0}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No stats available. Link a valid Chess.com username above to load ratings automatically.
              </div>
            )}

            {chesscomData && (
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs">
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
                        <span className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
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
