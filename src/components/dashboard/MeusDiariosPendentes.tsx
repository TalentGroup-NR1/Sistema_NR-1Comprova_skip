import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyPendingDiarios, PendingDiario } from "@/hooks/useMyPendingDiarios";
import { ClipboardList, Clock, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

const MILESTONE_LABELS: Record<string, string> = {
  '30_DIAS': '30 Dias',
  '80_DIAS': '80 Dias',
  '120_DIAS': '120 Dias',
};

function getMilestoneLabel(type: string): string {
  return MILESTONE_LABELS[type] || type;
}

function getStatusBadge(diario: PendingDiario) {
  if (diario.isOverdue) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Atrasado ({Math.abs(diario.daysUntil)} dias)
      </Badge>
    );
  }
  
  if (diario.daysUntil === 0) {
    return (
      <Badge variant="warning" className="gap-1">
        <Clock className="h-3 w-3" />
        Vence hoje
      </Badge>
    );
  }
  
  if (diario.daysUntil <= 3) {
    return (
      <Badge variant="warning" className="gap-1">
        <Clock className="h-3 w-3" />
        Faltam {diario.daysUntil} dias
      </Badge>
    );
  }
  
  return (
    <Badge variant="secondary" className="gap-1">
      <Clock className="h-3 w-3" />
      Faltam {diario.daysUntil} dias
    </Badge>
  );
}

function DiarioCard({ diario }: { diario: PendingDiario }) {
  const formattedDate = format(parseISO(diario.due_date), "dd 'de' MMMM", { locale: ptBR });
  
  return (
    <div 
      className={`p-4 rounded-lg border transition-colors ${
        diario.isOverdue 
          ? 'bg-destructive/5 border-destructive/20' 
          : diario.daysUntil <= 3 
            ? 'bg-warning/5 border-warning/20'
            : 'bg-muted/30 border-border'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${
            diario.isOverdue ? 'bg-destructive/10' : 'bg-primary/10'
          }`}>
            <ClipboardList className={`h-5 w-5 ${
              diario.isOverdue ? 'text-destructive' : 'text-primary'
            }`} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium">
                Feedback {getMilestoneLabel(diario.milestone_type)}
              </h4>
              {getStatusBadge(diario)}
            </div>
            <p className="text-sm text-muted-foreground">
              Prazo: {formattedDate}
            </p>
            {diario.collaborator_template && (
              <p className="text-xs text-muted-foreground">
                {diario.collaborator_template.template_name}
              </p>
            )}
          </div>
        </div>
        
        <Button asChild size="sm" className="gap-2 shrink-0">
          <Link to={diario.feedbackUrl}>
            Preencher Agora
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function MeusDiariosPendentes() {
  const { data: pendingDiarios, isLoading } = useMyPendingDiarios();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Meus Diários de Bordo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasPending = pendingDiarios && pendingDiarios.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Meus Diários de Bordo
          {hasPending && (
            <Badge variant="default" className="ml-2">
              {pendingDiarios.length} pendente{pendingDiarios.length > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasPending ? (
          <div className="space-y-3">
            {pendingDiarios.map(diario => (
              <DiarioCard key={diario.id} diario={diario} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 bg-success/10 rounded-full mb-3">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <p className="text-muted-foreground">
              Você não tem diários pendentes no momento.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
