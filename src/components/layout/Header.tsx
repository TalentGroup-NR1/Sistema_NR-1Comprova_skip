import { useAuth } from "@/hooks/useAuth";
import { CompanySelector } from "./CompanySelector";
import { PlatformModeToggle } from "./PlatformModeToggle";
import { useMyColaborador } from "@/hooks/useMyFeedbackCycles";
import { useUserCompanies } from "@/hooks/useUserCompanies";

/**
 * Header do sistema.
 * Renderiza o seletor de empresa para Admin Master e para usuários multiempresa (2+ vínculos).
 * Super admin vê o alternador Modo Empresa / Modo Plataforma.
 * Usuários de empresa única não veem barra desnecessária.
 */
export function Header() {
  const { isAdminMaster, isSuperAdmin } = useAuth();
  const { hasMultipleCompanies } = useUserCompanies();
  useMyColaborador(); // mantém o hook ativo p/ cache compartilhado

  // Sem conteúdo a exibir → não renderiza a barra (evita espaço em branco)
  if (!isAdminMaster && !isSuperAdmin && !hasMultipleCompanies) return null;

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm px-6 flex items-center justify-end sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <PlatformModeToggle />
        {(isAdminMaster || hasMultipleCompanies) && <CompanySelector />}
      </div>
    </header>
  );
}
