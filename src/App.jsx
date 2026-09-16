import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Navbar from './components/Navbar';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Games from './pages/Games';
import Analysis from './pages/Analysis';
import Courses from './pages/Courses';
import CoursePlayer from './pages/CoursePlayer';
import MoveTrainer from './pages/MoveTrainer';
import AdminDashboard from './pages/AdminDashboard';

function AppLayout({ children }) {
  const location = useLocation();
  const isAuthPage = ['/login', '/signup'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-[#121417] text-slate-100 flex flex-col font-sans">
      {!isAuthPage && <Navbar />}

      <main className="flex-1 pb-16">{children}</main>

      {!isAuthPage && (
        <footer className="border-t border-slate-800/80 bg-[#0f1114] py-8 text-xs text-slate-500 text-center">
          <div className="max-w-7xl mx-auto px-4 space-y-2">
            <p className="font-semibold text-slate-400">
              ChessLogs — Coach &amp; Student LMS for Chess Improvement
            </p>
            <p className="max-w-2xl mx-auto text-slate-500">
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
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
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
                <ProtectedRoute>
                  <Games />
                </ProtectedRoute>
              }
            />

            <Route
              path="/analysis"
              element={
                <ProtectedRoute>
                  <Analysis />
                </ProtectedRoute>
              }
            />

            <Route
              path="/courses"
              element={
                <ProtectedRoute>
                  <Courses />
                </ProtectedRoute>
              }
            />

            <Route
              path="/courses/:id"
              element={
                <ProtectedRoute>
                  <CoursePlayer />
                </ProtectedRoute>
              }
            />

            <Route
              path="/courses/:id/train"
              element={
                <ProtectedRoute>
                  <MoveTrainer />
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

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AppLayout>
      </AuthProvider>
    </BrowserRouter>
  );
}
