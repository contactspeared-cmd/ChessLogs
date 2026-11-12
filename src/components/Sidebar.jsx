import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChessKnightIcon } from './ChessIcons';
import {
  ShieldAlert,
  GraduationCap,
  Activity,
  Users,
  Award,
  BookOpen,
  UserCheck,
  MessageSquare,
  HelpCircle,
  MessageCircle,
  ShoppingBag,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Crosshair,
  Sliders,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export default function Sidebar() {
  const { profile, isAdmin, isCoach, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const adminLinks = [
    { name: 'Command Center', path: '/admin', icon: ShieldAlert },
    { name: 'Marketplace', path: '/marketplace', icon: ShoppingBag },
    { name: 'Direct Messages', path: '/messages', icon: MessageSquare },
    { name: 'Support Desk', path: '/support', icon: HelpCircle },
    { name: 'Feedback Hub', path: '/feedback', icon: MessageCircle },
    { name: 'Admin Profile', path: '/profile', icon: User },
  ];

  const coachLinks = [
    { name: 'Coach Studio', path: '/coach', icon: GraduationCap },
    { name: 'Student Messages', path: '/messages', icon: MessageSquare },
    { name: 'Marketplace', path: '/marketplace', icon: ShoppingBag },
    { name: 'Help & Support', path: '/support', icon: HelpCircle },
    { name: 'Community Feedback', path: '/feedback', icon: MessageCircle },
    { name: 'Coach Profile', path: '/profile', icon: User },
  ];

  const links = isAdmin ? adminLinks : coachLinks;

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <Link to={isAdmin ? '/admin' : '/coach'} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
            <ChessKnightIcon className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-slate-900">
            ChessLogs
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            {isAdmin ? 'Admin' : 'Coach'}
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 flex flex-col justify-between shadow-sm ${
          collapsed ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          <div className="h-16 border-b border-slate-200 px-4 flex items-center justify-between">
            <Link
              to={isAdmin ? '/admin' : '/coach'}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 overflow-hidden"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                <ChessKnightIcon className="w-5 h-5" />
              </div>
              {!collapsed && (
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-base tracking-tight text-slate-900">
                      ChessLogs
                    </span>
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {isAdmin ? 'Admin' : 'Coach'}
                    </span>
                  </div>
                </div>
              )}
            </Link>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          <div className="p-3">
            <div className={`p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
              <img
                src={
                  profile?.avatar_url ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                }
                alt={profile?.display_name || 'User'}
                className="w-9 h-9 rounded-full object-cover border border-slate-300 shrink-0"
              />
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {profile?.display_name || (isAdmin ? 'Admin' : 'Coach')}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{isAdmin ? 'System Admin' : 'Certified Coach'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <nav className="px-3 py-2 space-y-1">
            {links.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.name : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-600' : 'text-slate-400'}`} />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-slate-200 space-y-1.5">
          <Link
            to="/dashboard"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Switch to Learner View"
          >
            <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
            {!collapsed && <span>Learner View</span>}
          </Link>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Sign out"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
