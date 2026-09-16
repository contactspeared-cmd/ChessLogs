import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Database,
  Crosshair,
  BookOpen,
  ShieldAlert,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';

export default function Navbar() {
  const { user, profile, isAdmin, signOut, switchDemoRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Games', path: '/games', icon: Database },
    { name: 'Analysis', path: '/analysis', icon: Crosshair },
    { name: 'Courses', path: '/courses', icon: BookOpen },
  ];

  if (isAdmin) {
    navLinks.push({ name: 'Coach Admin', path: '/admin', icon: ShieldAlert });
  }

  const isActive = (path) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#15181c]/90 border-b border-slate-800/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <span className="text-xl font-black text-slate-950">♞</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                    ChessLogs
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 border border-emerald-500/30">
                    LMS
                  </span>
                </div>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Section: Role Switcher & User Menu */}
          <div className="hidden md:flex items-center gap-3">
            {/* Quick Demo Switcher if offline/demo or to test both roles */}
            <div className="flex items-center bg-slate-900 border border-slate-700/70 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => switchDemoRole('admin')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  isAdmin
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Switch to Coach (Admin) perspective"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Coach
              </button>
              <button
                onClick={() => switchDemoRole('student')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  !isAdmin
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Switch to Student perspective"
              >
                <User className="w-3.5 h-3.5" />
                Student
              </button>
            </div>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-800/70 border border-transparent hover:border-slate-700 transition-all text-left"
              >
                <img
                  src={
                    profile?.avatar_url ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                  }
                  alt={profile?.display_name || 'User'}
                  className="w-8 h-8 rounded-full object-cover border border-emerald-500/50"
                />
                <div className="hidden lg:block text-xs leading-tight">
                  <div className="font-semibold text-white">{profile?.display_name || 'Chess Player'}</div>
                  <div className="text-slate-400 capitalize flex items-center gap-1">
                    <span>{profile?.role || 'student'}</span>
                    {profile?.chesscom_username && (
                      <span className="text-emerald-400 font-mono">@{profile.chesscom_username}</span>
                    )}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 text-sm"
                  onClick={() => setDropdownOpen(false)}
                >
                  <div className="px-3.5 py-2 border-b border-slate-800">
                    <p className="font-medium text-white">{profile?.display_name}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Sparkles className="w-3 h-3" />
                      Role: {profile?.role?.toUpperCase()}
                    </div>
                  </div>

                  <Link
                    to="/profile"
                    className="flex items-center gap-2.5 px-3.5 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    Profile & Chess.com Link
                  </Link>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-2.5 px-3.5 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60"
                    >
                      <ShieldAlert className="w-4 h-4 text-slate-400" />
                      Coach Command Center
                    </Link>
                  )}

                  <div className="border-t border-slate-800 my-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#121417] px-4 pt-3 pb-5 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{link.name}</span>
              </Link>
            );
          })}

          <div className="pt-3 border-t border-slate-800">
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white"
            >
              <User className="w-5 h-5" />
              Profile & Chess.com Link
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-rose-400 hover:text-rose-300"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
