import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, AlertCircle, Sparkles, Mail, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { signInWithEmail, signInWithChesscom } = useAuth();
  const navigate = useNavigate();

  const [authMode, setAuthMode] = useState('email'); // 'email' | 'chesscom'

  // Email login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  // Chess.com login state
  const [chesscomUsername, setChesscomUsername] = useState('');
  const [chesscomLoading, setChesscomLoading] = useState(false);

  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Handle Email & Password Sign In
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setEmailLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle Chess.com Username Sign In
  const handleChesscomSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    if (!chesscomUsername.trim()) {
      setError('Please enter your Chess.com username.');
      return;
    }

    setChesscomLoading(true);
    try {
      await signInWithChesscom(chesscomUsername.trim());
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.message || `Chess.com account "${chesscomUsername}" could not be found. Please check your username.`
      );
    } finally {
      setChesscomLoading(false);
    }
  };

  // Helper to fill demo credentials
  const fillCredentials = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <span className="text-2xl font-black text-slate-950">♞</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Sign In to ChessLogs</h1>
          <p className="text-xs text-slate-400">
            Mastery LMS for Chess Students & Coaches
          </p>
        </div>

        {/* Auth Method Selector */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setAuthMode('email');
              setError('');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'email'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Site Account</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('chesscom');
              setError('');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'chesscom'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>♟</span>
            <span>Chess.com Login</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{infoMessage}</span>
          </div>
        )}

        {/* Tab 1: Site Account (Email & Password) */}
        {authMode === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@chesslogs.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={emailLoading}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{emailLoading ? 'Authenticating...' : 'Sign In to ChessLogs'}</span>
            </button>

            {/* Quick Demo Credentials Helpers */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1.5 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Quick Test Credentials:</span>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fillCredentials('satoalt33@gmail.com', 'ChessLogsAdmin2026!')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors"
                >
                  Coach Admin
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('alex@chesslogs.com', 'Student123!')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  Student Alex
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('elena@chesslogs.com', 'Student123!')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  Student Elena
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: Chess.com Account Sign In */}
        {authMode === 'chesscom' && (
          <form onSubmit={handleChesscomSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Chess.com Username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 font-mono text-sm">@</span>
                <input
                  type="text"
                  value={chesscomUsername}
                  onChange={(e) => setChesscomUsername(e.target.value)}
                  placeholder="e.g. hikaru, magnuscarlsen"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Instantly connects your profile, ratings, and game archives.</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={chesscomLoading}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{chesscomLoading ? 'Verifying Chess.com...' : 'Sign In with Chess.com'}</span>
            </button>
          </form>
        )}

        <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800">
          Don&apos;t have an account yet?{' '}
          <Link to="/signup" className="text-emerald-400 hover:underline font-bold">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
