import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChessKnightIcon } from './ChessIcons';
import {
  LayoutDashboard,
  Database,
  Crosshair,
  BookOpen,
  ShieldAlert,
  GraduationCap,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
  ShoppingBag,
  MessageSquare,
  HelpCircle,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react';

export default function Navbar() {
  const { user, profile, isAdmin, isCoach, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Marketplace', path: '/marketplace', icon: ShoppingBag },
    { name: 'My Courses', path: '/courses', icon: BookOpen },
    { name: 'Games', path: '/games', icon: Database },
    { name: 'Analysis', path: '/analysis', icon: Crosshair },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
  ];

  if (isCoach) {
    navLinks.push({ name: 'Coach Studio', path: '/coach', icon: GraduationCap });
  }

  if (isAdmin) {
    navLinks.push({ name: 'Admin Console', path: '/admin', icon: ShieldAlert });
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
    <nav className="sticky top-0 z-40 bg-white/95 border-b border-slate-200 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                <ChessKnightIcon className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 group-hover:text-emerald-600 transition-colors">
                  ChessLogs
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
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
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/support"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Help & Customer Service"
            >
              <HelpCircle className="w-4 h-4" />
            </Link>

            <Link
              to="/feedback"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Community Feedback"
            >
              <MessageCircle className="w-4 h-4" />
            </Link>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all text-left"
                >
                  <img
                    src={
                      profile?.avatar_url ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                    }
                    alt={profile?.display_name || 'User'}
                    className="w-8 h-8 rounded-full object-cover border border-slate-300"
                  />
                  <div className="hidden xl:block">
                    <div className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                      {profile?.display_name || 'Learner'}
                    </div>
                    <div className="text-[10px] text-slate-500 capitalize">
                      {profile?.role || 'student'}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 text-xs divide-y divide-slate-100">
                    <div className="px-4 py-2.5">
                      <div className="font-bold text-slate-900">{profile?.display_name || 'Learner'}</div>
                      <div className="text-slate-500 truncate text-[11px]">{profile?.email}</div>
                      {profile?.current_elo && (
                        <div className="mt-1 text-emerald-700 font-mono text-[11px] font-semibold">
                          {profile.current_elo} Elo
                        </div>
                      )}
                    </div>

                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-semibold"
                      >
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Profile &amp; Settings</span>
                      </Link>
                      <Link
                        to="/courses"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-semibold"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        <span>My Enrolled Courses</span>
                      </Link>
                    </div>

                    {isCoach && (
                      <div className="py-1">
                        <Link
                          to="/coach"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-amber-700 hover:bg-amber-50 font-bold"
                        >
                          <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
                          <span>Coach Command Studio</span>
                        </Link>
                      </div>
                    )}

                    {isAdmin && (
                      <div className="py-1">
                        <Link
                          to="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-purple-700 hover:bg-purple-50 font-bold"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
                          <span>Administrator Console</span>
                        </Link>
                      </div>
                    )}

                    <div className="py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 font-semibold text-left"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-500" />
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
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
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
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 text-slate-400" />
                <span>{link.name}</span>
              </Link>
            );
          })}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
            <Link
              to="/support"
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-600 hover:text-slate-900"
            >
              Support Desk
            </Link>
            <Link
              to="/feedback"
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-600 hover:text-slate-900"
            >
              Feedback
            </Link>
            {user ? (
              <button onClick={handleLogout} className="text-rose-600 font-bold">
                Sign Out
              </button>
            ) : (
              <Link to="/login" className="text-emerald-600 font-bold">
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
