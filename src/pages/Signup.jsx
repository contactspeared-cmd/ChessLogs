import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatCompositeName } from '../lib/authStore';
import {
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  User,
  Calendar,
  Mail,
  Lock,
} from 'lucide-react';

export default function Signup() {
  const { signUpWithEmail } = useAuth();
  const navigate = useNavigate();

  // Name Composite fields
  const [firstName, setFirstName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');

  // Personal & Account details
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [email, setEmail] = useState('');
  const [chesscomUsername, setChesscomUsername] = useState('');

  // Password fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Live computed display name
  const previewDisplayName = formatCompositeName({
    firstName,
    middleInitial,
    lastName,
    suffix,
  });

  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const passwordsMismatch = password && confirmPassword && password !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Field validations
    if (!firstName.trim()) {
      setError('First Name is required.');
      return;
    }
    if (!middleInitial.trim()) {
      setError('Middle Initial (MI) is required.');
      return;
    }
    if (!lastName.trim()) {
      setError('Last Name is required.');
      return;
    }
    if (!dateOfBirth) {
      setError('Date of Birth is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail({
        firstName: firstName.trim(),
        middleInitial: middleInitial.trim().toUpperCase(),
        lastName: lastName.trim(),
        suffix: suffix.trim(),
        dateOfBirth,
        email: email.trim(),
        chesscomUsername: chesscomUsername.trim(),
        password,
        confirmPassword,
      });

      setSuccessMessage('Account created successfully! Redirecting to your dashboard...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 700);
    } catch (err) {
      setError(err.message || 'Failed to create site account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Restrict DOB to past dates
  const todayDate = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <span className="text-2xl font-black text-slate-950">♞</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Create Site Account</h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Create your permanent ChessLogs student profile with complete identity records, Stockfish analysis, and curriculum access.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* Primary Account Creation Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Composite Name */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Full Name Composite</span>
              </span>
              <span className="text-[11px] text-slate-400">
                *Required fields
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* First Name */}
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  First Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              {/* Middle Initial */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  M.I. <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={middleInitial}
                  onChange={(e) => setMiddleInitial(e.target.value.toUpperCase())}
                  placeholder="M"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white text-center font-bold uppercase focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              {/* Last Name */}
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Last Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Rivera"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Suffix Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Suffix <span className="text-slate-500">(Optional)</span>
                </label>
                <select
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
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

              {/* Dynamic Composite Display Name Preview */}
              <div className="sm:col-span-8 pt-4 sm:pt-0">
                <div className="px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs flex items-center justify-between">
                  <span className="text-slate-400 font-mono text-[11px]">Display Name:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {previewDisplayName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-3" />

          {/* Section 2: Date of Birth & Chess.com */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date of Birth */}
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Date of Birth <span className="text-rose-400">*</span></span>
              </label>
              <input
                type="date"
                max={todayDate}
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>

            {/* Chess.com Username */}
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">♟</span>
                  <span>Chess.com Username</span>
                </span>
                <span className="text-[10px] text-slate-500">Optional</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 font-mono text-sm">@</span>
                <input
                  type="text"
                  value={chesscomUsername}
                  onChange={(e) => setChesscomUsername(e.target.value)}
                  placeholder="e.g. hikaru, magnus"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Email Address */}
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-400" />
              <span>Email Address <span className="text-rose-400">*</span></span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@chesslogs.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>

          {/* Section 4: Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Password <span className="text-rose-400">*</span></span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  minLength={6}
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

            {/* Confirm Password */}
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Confirm Password <span className="text-rose-400">*</span></span>
                </span>
                {passwordsMatch && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Match
                  </span>
                )}
                {passwordsMismatch && (
                  <span className="text-[10px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Mismatch
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type password"
                  className={`w-full bg-slate-950 border rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white focus:outline-none transition-colors ${
                    passwordsMismatch
                      ? 'border-rose-500/60 focus:border-rose-500'
                      : passwordsMatch
                      ? 'border-emerald-500/60 focus:border-emerald-500'
                      : 'border-slate-800 focus:border-emerald-500'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Creating Your Account...' : 'Create ChessLogs Account'}</span>
          </button>
        </form>

        {/* Link to Login */}
        <p className="text-center text-xs text-slate-400 pt-1">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-400 hover:underline font-bold">
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
}
