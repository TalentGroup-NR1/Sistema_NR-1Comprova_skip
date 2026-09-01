import { useAuth } from "@/hooks/useAuth";
import { CompanySelector } from "./CompanySelector";
import { PlatformModeToggle } from "./PlatformModeToggle";
import { useMyColaborador } from "@/hooks/useMyFeedbackCycles";

/**
 * Header com saudação personalizada ao colaborador.
 * Admin master também vê o seletor de empresa.
 * Super admin vê o alternador Modo Empresa / Modo Plataforma.
 * O menu de usuário (perfil/sair) está no rodapé da Sidebar.
 */
export function Header() {
  const { isAdminMaster, isSuperAdmin } = useAuth();
  useMyColaborador(); // mantém o hook ativo p/ cache compartilhado

  // Sem conteúdo a exibir → não renderiza a barra (evita espaço em branco)
  if (!isAdminMaster && !isSuperAdmin) return null;

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm px-6 flex items-center justify-end sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <PlatformModeToggle />
        {isAdminMaster && <CompanySelector />}
      </div>
    </header>
  );
}
