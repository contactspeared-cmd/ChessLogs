import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, AlertCircle, Sparkles, Mail, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const { signInWithEmail, signInWithGoogle, signInWithChesscom } = useAuth();
  const navigate = useNavigate();

  const [authMode, setAuthMode] = useState('chesscom'); // 'chesscom' | 'email'

  // Chess.com login state
  const [chesscomUsername, setChesscomUsername] = useState('');
  const [chesscomLoading, setChesscomLoading] = useState(false);

  // Email login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Google state
  const [googleLoading, setGoogleLoading] = useState(false);

  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

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

  // Handle Google OAuth Sign In
  const handleGoogleSignIn = async () => {
    setError('');
    setInfoMessage('');
    setGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      // If client didn't redirect (e.g. local mode), navigate to dashboard
      if (res?.user) {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setGoogleLoading(false);
    }
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
            Coach-Student Learning Management System for Chess Mastery
          </p>
        </div>

        {/* Auth Method Selector */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
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
            <span>Chess.com Account</span>
          </button>
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
            <span>Email & Password</span>
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

        {/* Tab 1: Chess.com Account Sign In */}
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
                  placeholder="e.g. hikaru, magnuscarlsen, or your handle"
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
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{chesscomLoading ? 'Verifying Chess.com...' : 'Sign In with Chess.com'}</span>
            </button>
          </form>
        )}

        {/* Tab 2: Email & Password Sign In */}
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
                placeholder="coach@chesslogs.com or your email"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={emailLoading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{emailLoading ? 'Authenticating...' : 'Sign In with Email'}</span>
            </button>
          </form>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-3 text-slate-500 font-semibold">Or continue with</span>
          </div>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
            />
          </svg>
          <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
        </button>

        <p className="text-center text-xs text-slate-400">
          Don&apos;t have an account yet?{' '}
          <Link to="/signup" className="text-emerald-400 hover:underline font-semibold">
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}
