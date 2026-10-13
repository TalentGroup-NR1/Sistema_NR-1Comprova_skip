import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, AppRole } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { BlockedUserScreen } from './BlockedUserScreen';
import { ModuleNotContractedScreen } from './ModuleNotContractedScreen';
import { useIsModuleVisible } from '@/hooks/useVisibleModules';
import { isPublicRoute } from '@/lib/publicRoutes';
import { useRef, useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  allowedRoles?: AppRole[];
  /** Chave do módulo canônico ou sub-rota para guarda comercial (ex: '/avaliacoes') */
  moduleKey?: string;
  /** Para onde enviar visitantes não autenticados (padrão: /auth) */
  unauthenticatedRedirect?: string;
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  requireSuperAdmin = false, 
  allowedRoles, 
  moduleKey,
  unauthenticatedRedirect 
}: ProtectedRouteProps) {
  const { isAuthenticated, loading, isAdmin, isSuperAdmin, role, mustChangePassword, isBlocked, blockReason } = useAuth();
  const location = useLocation();
  const { 
    isVisible, 
    isLoading: isModuleLoading, 
    isError: isModuleError, 
    isSuperAdminBypass, 
    refetch: refetchModule 
  } = useIsModuleVisible(moduleKey);
  
  // Track previous authentication state to prevent flicker during token refresh
  const wasAuthenticatedRef = useRef(isAuthenticated);
  const [isWaitingForRefresh, setIsWaitingForRefresh] = useState(false);
  
  useEffect(() => {
    // If user was authenticated but now appears not to be, wait briefly for token refresh
    if (wasAuthenticatedRef.current && !isAuthenticated && !loading) {
      setIsWaitingForRefresh(true);
      const timeout = setTimeout(() => {
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

  // Guarda Comercial de Módulo (Modelo Solides)
  if (moduleKey && isModuleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (moduleKey && !isVisible) {
    return (
      <ModuleNotContractedScreen 
        moduleKey={moduleKey} 
        isError={isModuleError}
        onRetry={() => refetchModule()}
      />
    );
  }

  // Banner discreto quando Super Admin acessa módulo que está desativado para a empresa
  if (moduleKey && isSuperAdminBypass) {
    return (
      <>
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center justify-between z-50">
          <span>
            ⚠️ Visualizando como Super Admin: o módulo <strong>{moduleKey}</strong> está desativado para o tenant.
          </span>
        </div>
        {children}
      </>
    );
  }

  return <>{children}</>;
}
