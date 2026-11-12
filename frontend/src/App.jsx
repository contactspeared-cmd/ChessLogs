import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import CoachProfile from './pages/CoachProfile';
import Chat from './pages/Chat';
import Support from './pages/Support';
import Feedback from './pages/Feedback';
import Profile from './pages/Profile';
import Games from './pages/Games';
import Analysis from './pages/Analysis';
import Courses from './pages/Courses';
import CoursePlayer from './pages/CoursePlayer';
import MoveTrainer from './pages/MoveTrainer';
import AdminDashboard from './pages/AdminDashboard';
import CoachDashboard from './components/dashboard/CoachDashboard';
import Applications from './pages/Applications';
import ErrorBoundary from './components/ErrorBoundary';
import ChatWidget from './components/ChatWidget';

function AppLayout({ children }) {
  const location = useLocation();
  const { user, isCoach, isAdmin } = useAuth();

  const isAuthPage = ['/login', '/signup'].includes(location.pathname);
  const isSidebarPage = isAdmin || ['/coach', '/admin'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {!isAuthPage && isSidebarPage && <Sidebar />}
      {!isAuthPage && !isSidebarPage && <Navbar />}

      <main className={`flex-1 pb-16 ${isSidebarPage ? 'lg:pl-64 pt-16 lg:pt-0' : ''}`}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>

      {!isAuthPage && <ChatWidget />}

      {!isAuthPage && (
        <footer className={`border-t border-slate-800 bg-slate-900 py-10 text-xs text-slate-400 text-center ${isSidebarPage ? 'lg:pl-64' : ''}`}>
          <div className="max-w-7xl mx-auto px-4 space-y-3">
            <div className="flex items-center justify-center gap-6 font-semibold text-slate-300">
              <a href="/marketplace" className="hover:text-emerald-400">Marketplace</a>
              <a href="/support" className="hover:text-emerald-400">Customer Support</a>
              <a href="/feedback" className="hover:text-emerald-400">Community Feedback</a>
              <a href="/login" className="hover:text-emerald-400">Account Access</a>
            </div>
            <p className="font-bold text-slate-200">
              ChessLogs LMS — Science-Backed MoveTrainer &amp; Spaced Repetition Platform
            </p>
            <p className="max-w-2xl mx-auto text-slate-400">
              Powered by Stockfish 18 NNUE (WASM Web Worker) &amp; Chess.com Public API. Evaluations closely reflect engine classifications.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/coaches/:id" element={<CoachProfile />} />
            <Route path="/support" element={<Support />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route
              path="/applications"
              element={
                <ProtectedRoute disallowAdmin>
                  <Applications />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute disallowAdmin>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/games"
              element={
                <ProtectedRoute disallowAdmin>
                  <Games />
                </ProtectedRoute>
              }
            />

            <Route
              path="/analysis"
              element={
                <ProtectedRoute disallowAdmin>
                  <Analysis />
                </ProtectedRoute>
              }
            />

            <Route
              path="/courses"
              element={
                <ProtectedRoute disallowAdmin>
                  <Courses />
                </ProtectedRoute>
              }
            />

            <Route
              path="/courses/:id"
              element={
                <ProtectedRoute disallowAdmin>
                  <CoursePlayer />
                </ProtectedRoute>
              }
            />

            <Route
              path="/courses/:id/train"
              element={
                <ProtectedRoute disallowAdmin>
                  <MoveTrainer />
                </ProtectedRoute>
              }
            />

            <Route
              path="/coach"
              element={
                <ProtectedRoute requireCoach>
                  <CoachDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </AuthProvider>
    </BrowserRouter>
  );
}
