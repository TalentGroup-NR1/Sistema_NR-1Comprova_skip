import { ShieldCheck, Building2, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function AdminMasterEmptyDashboard() {
  const navigate = useNavigate();

  return (
    <div
      data-testid="admin-master-empty-dashboard"
      className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-border bg-card shadow-xs max-w-2xl mx-auto my-8"
    >
      <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-5">
        <ShieldCheck className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">
        Você está como Admin Master
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mb-6">
        O painel consolidado de clientes é exibido por empresa. Selecione uma empresa para visualizar dados operacionais, ou trabalhe nos módulos diretamente.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => navigate('/empresas')} className="gap-2">
          <Building2 className="w-4 h-4" />
          Ver empresas cadastradas
        </Button>
        <Button variant="outline" onClick={() => navigate('/colaboradores')} className="gap-2">
          <LayoutGrid className="w-4 h-4" />
          Módulos
        </Button>
      </div>
    </div>
  );
}
