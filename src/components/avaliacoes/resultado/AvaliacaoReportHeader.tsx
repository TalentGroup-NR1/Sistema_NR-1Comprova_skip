import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, CheckCircle, AlertTriangle, Lock } from "lucide-react";

interface AvaliacaoReportHeaderProps {
  colaboradorNome: string;
  colaboradorCargo: string;
  colaboradorDepartamento: string;
  gestorNome: string;
  cicloNome: string;
  cicloStatus: string;
  statusAutoavaliacao: string;
  statusAvaliacaoGestor: string;
  prazoAutoavaliacao?: string | null;
  prazoAvaliacaoGestor?: string | null;
  showLogo?: boolean;
}

const statusConfig = {
  nao_iniciada: { label: "Não iniciada", icon: Clock, className: "bg-muted text-muted-foreground" },
  em_andamento: { label: "Em andamento", icon: AlertTriangle, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  concluida: { label: "Concluída", icon: CheckCircle, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
};

const cicloStatusConfig: Record<string, { label: string; className: string; icon?: React.ElementType }> = {
  configuracao: { label: "Em Configuração", className: "bg-muted text-muted-foreground" },
  ativo: { label: "Ativo", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  finalizado: { label: "Finalizado", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200", icon: Lock },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

export function AvaliacaoReportHeader({
  colaboradorNome,
  colaboradorCargo,
  colaboradorDepartamento,
  gestorNome,
  cicloNome,
  cicloStatus,
  statusAutoavaliacao,
  statusAvaliacaoGestor,
  prazoAutoavaliacao,
  prazoAvaliacaoGestor,
  showLogo = true,
}: AvaliacaoReportHeaderProps) {
  const autoStatus = statusConfig[statusAutoavaliacao as keyof typeof statusConfig] || statusConfig.nao_iniciada;
  const gestorStatus = statusConfig[statusAvaliacaoGestor as keyof typeof statusConfig] || statusConfig.nao_iniciada;
  const cicloStatusInfo = cicloStatusConfig[cicloStatus] || cicloStatusConfig.configuracao;
  const AutoIcon = autoStatus.icon;
  const GestorIcon = gestorStatus.icon;

  return (
    <div className="bg-card border border-border rounded-xl p-6 print:p-4 print:border-gray-300">
      <div className="flex items-start justify-between gap-6">
        {/* Left: Avatar and Info */}
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 print:h-14 print:w-14 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
              {getInitials(colaboradorNome)}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground print:text-xl">
              {colaboradorNome}
            </h1>
            <p className="text-muted-foreground">
              {colaboradorCargo} • {colaboradorDepartamento}
            </p>
            <p className="text-sm text-muted-foreground">
              Gestor: <span className="font-medium text-foreground">{gestorNome}</span>
            </p>
            
            <div className="flex items-center gap-2 pt-2">
              <Badge className={cicloStatusInfo.className} variant="outline">
                {cicloStatusInfo.icon && <cicloStatusInfo.icon className="h-3 w-3 mr-1" />}
                {cicloStatusInfo.label}
              </Badge>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm font-medium">{cicloNome}</span>
            </div>
          </div>
        </div>

        {/* Right: Logo placeholder and Status */}
        <div className="flex flex-col items-end gap-3">
          
          <div className="flex flex-col gap-1.5 items-end">
            <Badge className={autoStatus.className} variant="outline">
              <AutoIcon className="h-3 w-3 mr-1" />
              Auto: {autoStatus.label}
            </Badge>
            <Badge className={gestorStatus.className} variant="outline">
              <GestorIcon className="h-3 w-3 mr-1" />
              Gestor: {gestorStatus.label}
            </Badge>
          </div>

          {(prazoAutoavaliacao || prazoAvaliacaoGestor) && (
            <div className="text-xs text-muted-foreground text-right space-y-0.5 print:hidden">
              {prazoAutoavaliacao && (
                <p>Prazo Auto: {format(new Date(prazoAutoavaliacao), "dd/MM/yyyy", { locale: ptBR })}</p>
              )}
              {prazoAvaliacaoGestor && (
                <p>Prazo Gestor: {format(new Date(prazoAvaliacaoGestor), "dd/MM/yyyy", { locale: ptBR })}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
