import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Landing from "@/pages/Landing";
import Index from "@/pages/Index";

/**
 * Home inteligente: visitante anônimo vê a landing comercial;
 * usuário autenticado continua caindo no dashboard de sempre.
 */
export function HomeRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return (
    <ProtectedRoute>
      <Index />
    </ProtectedRoute>
  );
}
