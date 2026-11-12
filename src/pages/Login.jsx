import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChessKnightIcon } from '../components/ChessIcons';
import { LogIn, AlertCircle, CheckCircle2, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Login() {
  const { signInWithEmail } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto text-white shadow-md shadow-emerald-600/20">
              <ChessKnightIcon className="w-7 h-7" />
            </div>
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Sign In to ChessLogs</h1>
          <p className="text-xs text-slate-500">
            Next-Gen Chess LMS for Students, Coaches &amp; Grandmasters
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span className="leading-relaxed">{infoMessage}</span>
          </div>
        )}

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@chesslogs.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 space-y-2.5 text-center text-xs">
          <p className="text-slate-500">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-emerald-700 hover:underline font-extrabold">
              Create an Account
            </Link>
          </p>

          <div className="pt-2 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Demo Instant Login
            </span>
            <div className="flex items-center justify-center gap-2 flex-wrap text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickDemo('satoalt33@gmail.com', 'ChessLogsAdmin2026!')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 font-semibold transition-colors"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('coach@chesslogs.com', 'Coach2026!')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700 font-semibold transition-colors"
              >
                Coach
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('student@chesslogs.com', 'Student2026!')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-semibold transition-colors"
              >
                Student
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
