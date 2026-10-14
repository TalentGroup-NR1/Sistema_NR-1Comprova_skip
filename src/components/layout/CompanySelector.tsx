import { Building2, Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompanies } from "@/hooks/useCompanies";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

const ROLE_LABELS: Record<string, string> = {
  admin_master: "Admin Master",
  admin_empresa: "Admin Empresa",
  analista_rh: "Analista RH",
  gestor_departamento: "Gestor",
  colaborador: "Colaborador",
  super_admin: "Super Admin",
};

export function CompanySelector() {
  const { isAdminMaster, isSuperAdmin } = useAuth();
  const { data: allCompanies, isLoading: isLoadingAll } = useCompanies();
  const { userCompanies, isLoading: isLoadingUser, isError: isUserError } = useUserCompanies();
  const { selectedCompanyId, setSelectedCompanyId } = useCompanyContext();

  const isGlobalAdmin = isAdminMaster || isSuperAdmin;
  const hasMultiple = userCompanies.length > 1;

  if (isUserError && !isGlobalAdmin) {
    return (
      <div 
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-md" 
        title="Não foi possível carregar empresas vinculadas"
        role="status"
      >
        <Building2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Vínculos indisponíveis</span>
      </div>
    );
  }

  // Se não for admin global e não possuir múltiplos vínculos (ex.: 1 único vínculo),
  // não renderiza o seletor. Zero mudança na experiência para usuários comuns.
  if (!isGlobalAdmin && !hasMultiple) {
    return null;
  }

  const handleValueChange = (value: string) => {
    setSelectedCompanyId(value === "__all__" ? null : value);
  };

  // Se for admin global, pode listar todas as empresas cadastradas
  if (isGlobalAdmin) {
    return (
      <Select
        value={selectedCompanyId ?? "__all__"}
        onValueChange={handleValueChange}
      >
        <SelectTrigger className="w-[220px] bg-secondary/50 border-border">
          <div className="flex items-center gap-2">
            {selectedCompanyId ? (
              <Building2 className="h-4 w-4 text-primary" />
            ) : (
              <Globe className="h-4 w-4 text-muted-foreground" />
            )}
            <SelectValue placeholder="Selecione empresa" />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          <SelectItem value="__all__">
            <span>Todas as Empresas</span>
          </SelectItem>
          {isLoadingAll ? (
            <SelectItem value="__loading__" disabled>
              Carregando...
            </SelectItem>
          ) : (
            allCompanies?.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                <div className="flex items-center justify-between gap-3 w-full">
                  <span className="truncate max-w-[140px]">{company.name}</span>
                  <Badge 
                    variant={company.status === 'active' ? 'default' : 'secondary'}
                    className="text-xs ml-2"
                  >
                    {company.status === 'active' ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    );
  }

  // Usuário multiempresa cliente (2+ vínculos):
  // Não exibe opção "__all__". Alterna estritamente entre suas empresas autorizadas.
  return (
    <Select
      value={selectedCompanyId ?? userCompanies[0]?.companyId}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-[240px] bg-secondary/50 border-border">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <SelectValue placeholder="Selecione empresa" />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-card border-border">
        {isLoadingUser ? (
          <SelectItem value="__loading__" disabled>
            Carregando empresas...
          </SelectItem>
        ) : (
          userCompanies.map((uc) => (
            <SelectItem key={uc.companyId} value={uc.companyId}>
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="truncate max-w-[130px] font-medium">{uc.name}</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0">
                  {ROLE_LABELS[uc.role] ?? uc.role}
                </Badge>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
