import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sparkles, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center text-zinc-300">
        <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-2xl backdrop-blur-md">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-accent-600/20 border border-accent-500/40 flex items-center justify-center text-accent-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1">
              <Loader2 className="w-4 h-4 text-accent-400 animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-zinc-100">PaperPilot Workspace</div>
            <div className="text-xs text-zinc-400 font-mono mt-1">Verifying scientific session...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    // Unauthenticated user -> redirect to /login and remember target route
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated user -> access application
  return children ? <>{children}</> : <Outlet />;
};
