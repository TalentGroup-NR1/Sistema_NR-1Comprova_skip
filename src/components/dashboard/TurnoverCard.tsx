import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Minus, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

interface TurnoverCardProps {
  rate: number;
  demissoes: number;
  isLoading?: boolean;
  delay?: number;
  ativos?: number;
  admissoes?: number;
}

export function TurnoverCard({ rate, demissoes, isLoading, delay = 0, ativos, admissoes }: TurnoverCardProps) {
  // Determinar cor e ícone baseado na taxa
  const getTurnoverStatus = (rate: number) => {
    if (rate <= 2) return { color: "text-success", bgColor: "bg-success/10", icon: TrendingDown, label: "Baixo" };
    if (rate <= 5) return { color: "text-warning", bgColor: "bg-warning/10", icon: Minus, label: "Médio" };
    return { color: "text-destructive", bgColor: "bg-destructive/10", icon: TrendingUp, label: "Alto" };
  };

  const status = getTurnoverStatus(rate);
  const StatusIcon = status.icon;

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-20 mb-2" />
          <Skeleton className="h-4 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="shadow-card animate-fade-up border-l-4 border-l-info"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          Taxa de Rotatividade
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground/60" />
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end" sideOffset={8} collisionPadding={12} className="max-w-xs">
                <p className="text-sm">
                  <strong>Fórmula:</strong> ((Admissões + Desligamentos) ÷ 2) ÷ Total de Ativos × 100
                </p>
                {ativos !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Base: {ativos} ativos | {admissoes ?? 0} admissões | {demissoes} deslig.
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <div className={`p-2 rounded-lg ${status.bgColor}`}>
          <StatusIcon className={`h-5 w-5 ${status.color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${status.color}`}>
            {rate}%
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.bgColor} ${status.color}`}>
            {status.label}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
