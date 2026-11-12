import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({
  children,
  requireAdmin = false,
  requireCoach = false,
  allowedRoles = null,
}) {
  const { user, profile, isAdmin, isCoach, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-sm">
        Loading ChessLogs...
      </div>
    );
  }

  if (!user && !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireCoach && !isCoach && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isAdmin && !requireAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const role = profile?.role || 'student';
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
