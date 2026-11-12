import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChessKnightIcon } from '../components/ChessIcons';
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
  GraduationCap,
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

export default function Signup() {
  const { signUpWithEmail } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [email, setEmail] = useState('');
  const [chesscomUsername, setChesscomUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const passwordsMismatch = password && confirmPassword && password !== confirmPassword;

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!firstName.trim()) {
      setError('First Name is required.');
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
        role: 'student',
      });

      setSuccessMessage('Account created successfully! Redirecting to dashboard...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 900);
    } catch (err) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12 bg-slate-950">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto text-white shadow-md shadow-emerald-600/20">
              <ChessKnightIcon className="w-7 h-7" />
            </div>
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-white">Create Your ChessLogs Account</h1>
          <p className="text-xs text-slate-400">
            Join the community of students and coaches studying with Spaced Repetition
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span className="leading-relaxed">{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Legal Composite Name
            </label>
            <div className="grid grid-cols-12 gap-2.5">
              <div className="col-span-5">
                <input
                  type="text"
                  placeholder="First Name *"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 focus:bg-slate-900"
                  required
                />
              </div>

              <div className="col-span-2">
                <input
                  type="text"
                  maxLength={2}
                  placeholder="M.I."
                  value={middleInitial}
                  onChange={(e) => setMiddleInitial(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white text-center uppercase focus:outline-none focus:border-emerald-500 focus:bg-slate-900"
                />
              </div>

              <div className="col-span-3">
                <input
                  type="text"
                  placeholder="Last Name *"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 focus:bg-slate-900"
                  required
                />
              </div>

              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Suffix"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white text-center focus:outline-none focus:border-emerald-500 focus:bg-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Date of Birth *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  required
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
                  required
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
                  required
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="name@chesslogs.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 focus:bg-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Chess.com Username (Optional)
              </label>
              <input
                type="text"
                placeholder="Chess.com handle"
                value={chesscomUsername}
                onChange={(e) => setChesscomUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 focus:bg-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-9 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 focus:bg-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full bg-slate-950 border rounded-xl pl-3 pr-9 py-2 text-xs text-white focus:outline-none focus:bg-slate-900 ${
                    passwordsMismatch
                      ? 'border-rose-400 focus:border-rose-500'
                      : passwordsMatch
                      ? 'border-emerald-400 focus:border-emerald-500'
                      : 'border-slate-800 focus:border-emerald-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 pt-1">
          Already registered?{' '}
          <Link to="/login" className="text-emerald-400 hover:underline font-extrabold">
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
}
