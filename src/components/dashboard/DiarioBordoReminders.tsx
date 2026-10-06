import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BookOpen, AlertTriangle, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInDays, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Colaborador {
  id: string;
  full_name: string;
  avatar_url?: string;
  department?: string;
}

interface FeedbackCycle {
  id: string;
  milestone_type: string;
  due_date: string;
  status: string;
  colaborador?: Colaborador;
}

interface DiarioBordoRemindersProps {
  cycles: FeedbackCycle[];
  isLoading?: boolean;
  delay?: number;
}

const MILESTONE_LABELS: Record<string, string> = {
  '30_DIAS': '30 Dias',
  '80_DIAS': '80 Dias',
  '120_DIAS': '120 Dias',
};

type CycleStatus = 'atrasado' | 'proximo' | 'no_prazo' | 'concluido';

interface ProcessedCycle extends FeedbackCycle {
  daysRemaining: number;
  cycleStatus: CycleStatus;
  sortOrder: number;
}

function getStatusInfo(daysRemaining: number, status: string): { 
  cycleStatus: CycleStatus; 
  sortOrder: number;
  badge: { variant: string; text: string; icon: React.ReactNode; className: string };
} {
  // Ciclo já concluído
  if (status === 'COMPLETO') {
    return {
      cycleStatus: 'concluido',
      sortOrder: 4,
      badge: {
        variant: 'secondary',
        text: 'Enviado',
        icon: <CheckCircle className="h-3 w-3" />,
        className: 'bg-muted text-muted-foreground border-muted-foreground/20',
      },
    };
  }

  // Atrasado (data já passou)
  if (daysRemaining < 0) {
    const daysLate = Math.abs(daysRemaining);
    return {
      cycleStatus: 'atrasado',
      sortOrder: 1,
      badge: {
        variant: 'destructive',
        text: `Atrasado ${daysLate} ${daysLate === 1 ? 'dia' : 'dias'}`,
        icon: <AlertTriangle className="h-3 w-3" />,
        className: 'bg-destructive/10 text-destructive border-destructive/20',
      },
    };
  }

  // Próximo (faltam 1-3 dias)
  if (daysRemaining <= 3) {
    return {
      cycleStatus: 'proximo',
      sortOrder: 2,
      badge: {
        variant: 'warning',
        text: daysRemaining === 0 ? 'Hoje' : `Faltam ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}`,
        icon: <AlertCircle className="h-3 w-3" />,
        className: 'bg-warning/10 text-warning border-warning/20',
      },
    };
  }

  // No prazo (faltam 4+ dias)
  return {
    cycleStatus: 'no_prazo',
    sortOrder: 3,
    badge: {
      variant: 'success',
      text: `Faltam ${daysRemaining} dias`,
      icon: <Clock className="h-3 w-3" />,
      className: 'bg-success/10 text-success border-success/20',
    },
  };
}

function processCycles(cycles: FeedbackCycle[]): ProcessedCycle[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return cycles
    .map(cycle => {
      const dueDate = parseISO(cycle.due_date);
      const daysRemaining = differenceInDays(dueDate, today);
      const { cycleStatus, sortOrder } = getStatusInfo(daysRemaining, cycle.status);

      return {
        ...cycle,
        daysRemaining,
        cycleStatus,
        sortOrder,
      };
    })
    .sort((a, b) => {
      // Primeiro por status (atrasado -> próximo -> no prazo -> concluído)
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      // Dentro do mesmo status, ordenar por urgência
      if (a.sortOrder === 1) {
        // Atrasados: mais dias de atraso primeiro
        return a.daysRemaining - b.daysRemaining;
      }
      // Outros: menor prazo primeiro
      return a.daysRemaining - b.daysRemaining;
    })
    .slice(0, 8); // Limitar a 8 registros
}

export function DiarioBordoReminders({ cycles, isLoading, delay = 0 }: DiarioBordoRemindersProps) {
  const navigate = useNavigate();
  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const formatDueDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    return format(date, "dd/MM", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const processedCycles = processCycles(cycles);

  return (
    <Card 
      className="shadow-card animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Próximos Diários de Bordo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {processedCycles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum diário de bordo pendente
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {processedCycles.map((cycle) => {
              const { badge } = getStatusInfo(cycle.daysRemaining, cycle.status);
              
              return (
                <div
                  key={cycle.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => cycle.colaborador?.id && navigate(`/diario-bordo?colaborador=${cycle.colaborador.id}`)}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && cycle.colaborador?.id) {
                      e.preventDefault();
                      navigate(`/diario-bordo?colaborador=${cycle.colaborador.id}`);
                    }
                  }}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarImage src={cycle.colaborador?.avatar_url} alt={cycle.colaborador?.full_name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {getInitials(cycle.colaborador?.full_name || '?')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {cycle.colaborador?.full_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium">{MILESTONE_LABELS[cycle.milestone_type] || cycle.milestone_type}</span>
                      <span>•</span>
                      <span>{formatDueDate(cycle.due_date)}</span>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`${badge.className} text-xs shrink-0 flex items-center gap-1`}
                  >
                    {badge.icon}
                    {badge.text}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
