import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChessKnightIcon } from './ChessIcons';
import {
  LayoutDashboard,
  ShoppingBag,
  BookOpen,
  Database,
  Crosshair,
  MessageSquare,
  GraduationCap,
  ShieldAlert,
  Award,
  HelpCircle,
  MessageCircle,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

export default function Navbar() {
  const { user, profile, isAdmin, isCoach, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Marketplace', path: '/marketplace', icon: ShoppingBag },
    { name: 'My Courses', path: '/courses', icon: BookOpen },
    { name: 'Games', path: '/games', icon: Database },
    { name: 'Analysis', path: '/analysis', icon: Crosshair },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
  ];

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
    <nav className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md shadow-xl text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
                <ChessKnightIcon className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  ChessLogs
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  LMS
                </span>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/support"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Help & Customer Service"
            >
              <HelpCircle className="w-4 h-4" />
            </Link>

            <Link
              to="/feedback"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Community Feedback"
            >
              <MessageCircle className="w-4 h-4" />
            </Link>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all text-left"
                >
                  <img
                    src={
                      profile?.avatar_url ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                    }
                    alt={profile?.display_name || 'User'}
                    className="w-8 h-8 rounded-full object-cover border border-emerald-500/40"
                  />
                  <div className="hidden xl:block">
                    <div className="text-xs font-bold text-white truncate max-w-[120px]">
                      {profile?.display_name || 'Learner'}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize">
                      {profile?.role || 'student'}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 text-xs divide-y divide-slate-800">
                    <div className="px-4 py-2.5">
                      <div className="font-bold text-white">{profile?.display_name || 'Learner'}</div>
                      <div className="text-slate-400 truncate text-[11px]">{profile?.email}</div>
                      {profile?.current_elo && (
                        <div className="mt-1 text-emerald-400 font-mono text-[11px] font-semibold">
                          {profile.current_elo} Elo
                        </div>
                      )}
                    </div>

                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white font-semibold"
                      >
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Profile &amp; Settings</span>
                      </Link>
                      <Link
                        to="/courses"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white font-semibold"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        <span>My Enrolled Courses</span>
                      </Link>
                      {!isCoach && !isAdmin && (
                        <Link
                          to="/applications"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-emerald-400 hover:bg-slate-800 font-semibold"
                        >
                          <Award className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Become a Coach</span>
                        </Link>
                      )}

                      {isCoach && (
                        <>
                          <Link
                            to="/coach"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-amber-400 hover:bg-slate-800 font-bold"
                          >
                            <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                            <span>Switch to Coaching Mode</span>
                          </Link>
                          <Link
                            to="/dashboard"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-emerald-400 hover:bg-slate-800 font-bold"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Switch to Student Mode</span>
                          </Link>
                        </>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="py-1">
                        <Link
                          to="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-purple-400 hover:bg-slate-800 font-bold"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                          <span>Administrator Console</span>
                        </Link>
                      </div>
                    )}

                    <div className="py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-rose-400 hover:bg-slate-800 font-semibold text-left"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-400" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900 px-4 py-4 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 text-slate-400" />
                <span>{link.name}</span>
              </Link>
            );
          })}

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-bold">
            {!isCoach && !isAdmin ? (
              <Link
                to="/applications"
                onClick={() => setMobileMenuOpen(false)}
                className="text-emerald-400 hover:text-emerald-300"
              >
                Become a Coach
              </Link>
            ) : isCoach ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/coach"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-amber-400 hover:text-amber-300 font-bold"
                >
                  Coaching Mode
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-emerald-400 hover:text-emerald-300 font-bold"
                >
                  Student Mode
                </Link>
              </div>
            ) : null}
            <Link
              to="/support"
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              Support Desk
            </Link>
            <Link
              to="/feedback"
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              Feedback
            </Link>
            {user ? (
              <button onClick={handleLogout} className="text-rose-400 font-bold">
                Sign Out
              </button>
            ) : (
              <Link to="/login" className="text-emerald-400 font-bold">
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
