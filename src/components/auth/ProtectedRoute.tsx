import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, AppRole } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { BlockedUserScreen } from './BlockedUserScreen';
import { isPublicRoute } from '@/lib/publicRoutes';
import { useRef, useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  allowedRoles?: AppRole[];
  /** Para onde enviar visitantes não autenticados (padrão: /auth) */
  unauthenticatedRedirect?: string;
}

export function ProtectedRoute({ children, requireAdmin = false, requireSuperAdmin = false, allowedRoles, unauthenticatedRedirect }: ProtectedRouteProps) {
  const { isAuthenticated, loading, isAdmin, isSuperAdmin, role, mustChangePassword, isBlocked, blockReason } = useAuth();
  const location = useLocation();
  
  // Track previous authentication state to prevent flicker during token refresh
  const wasAuthenticatedRef = useRef(isAuthenticated);
  const [isWaitingForRefresh, setIsWaitingForRefresh] = useState(false);
  
  useEffect(() => {
    // If user was authenticated but now appears not to be, wait briefly for token refresh
    if (wasAuthenticatedRef.current && !isAuthenticated && !loading) {
      setIsWaitingForRefresh(true);
      const timeout = setTimeout(() => {
        // After waiting, if still not authenticated, allow redirect
        setIsWaitingForRefresh(false);
      }, 500);
      return () => clearTimeout(timeout);
    }
    
    // Update the ref when authentication state stabilizes
    if (isAuthenticated) {
      wasAuthenticatedRef.current = true;
      setIsWaitingForRefresh(false);
    } else if (!loading && !isWaitingForRefresh) {
      wasAuthenticatedRef.current = false;
    }
  }, [isAuthenticated, loading, isWaitingForRefresh]);

  // Rotas públicas (links compartilháveis) nunca exigem login
  if (isPublicRoute(location.pathname)) {
    return <>{children}</>;
  }

  // Show loader during initial load or while waiting for token refresh
  if (loading || isWaitingForRefresh) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show blocked screen if user is blocked
  if (isBlocked) {
    return <BlockedUserScreen reason={blockReason || undefined} />;
  }

  if (!isAuthenticated) {
    return <Navigate to={unauthenticatedRedirect ?? '/auth'} state={{ from: location }} replace />;
  }

  // If user must change password, redirect to password change page
  if (mustChangePassword && location.pathname !== '/alterar-senha') {
    return <Navigate to="/alterar-senha" replace />;
  }

  // Super admin only routes (platform panel)
  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  // Check for specific allowed roles

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  // Legacy requireAdmin check
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
