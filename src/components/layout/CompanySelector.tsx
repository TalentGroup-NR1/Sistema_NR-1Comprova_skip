import { Building2, Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompanies } from "@/hooks/useCompanies";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

export function CompanySelector() {
  const { isAdminMaster } = useAuth();
  const { data: companies, isLoading } = useCompanies();
  const { selectedCompanyId, setSelectedCompanyId } = useCompanyContext();

  // Only render for admin_master
  if (!isAdminMaster) return null;

  const handleValueChange = (value: string) => {
    setSelectedCompanyId(value === "__all__" ? null : value);
  };

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
        {isLoading ? (
          <SelectItem value="__loading__" disabled>
            Carregando...
          </SelectItem>
        ) : (
          companies?.map((company) => (
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
