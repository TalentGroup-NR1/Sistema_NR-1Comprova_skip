import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck, CalendarClock, AlertCircle, ArrowRight } from "lucide-react";
import { useMyPendingAvaliacoes, PendingAvaliacao } from "@/hooks/useMyPendingAvaliacoes";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

function getStatusBadge(avaliacao: PendingAvaliacao) {
  if (avaliacao.isOverdue) {
    return (
      <Badge variant="destructive" size="sm" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        Atrasado
      </Badge>
    );
  }
  
  if (avaliacao.daysUntil <= 3) {
    return (
      <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30 gap-1" size="sm">
        <CalendarClock className="h-3 w-3" />
        {avaliacao.daysUntil === 0 ? 'Vence hoje' : `Faltam ${avaliacao.daysUntil} dias`}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" size="sm" className="gap-1">
      <CalendarClock className="h-3 w-3" />
      Faltam {avaliacao.daysUntil} dias
    </Badge>
  );
}

function AvaliacaoCard({ avaliacao }: { avaliacao: PendingAvaliacao }) {
  return (
    <div 
      className={`p-4 rounded-lg border ${
        avaliacao.isOverdue 
          ? 'border-destructive/30 bg-destructive/5' 
          : avaliacao.daysUntil <= 3 
            ? 'border-amber-500/30 bg-amber-500/5' 
            : 'border-border bg-muted/30'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck className="h-4 w-4 text-primary shrink-0" />
            <h4 className="font-medium text-foreground truncate">
              {avaliacao.ciclo_nome}
            </h4>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {avaliacao.prazo_autoavaliacao && (
              <span>
                Prazo: {format(parseISO(avaliacao.prazo_autoavaliacao), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            )}
            {getStatusBadge(avaliacao)}
          </div>
        </div>
        
        <Button asChild size="sm" className="shrink-0">
          <Link to={avaliacao.avaliacaoUrl}>
            Responder
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function MinhasAvaliacoesPendentes() {
  const { data: avaliacoes, isLoading } = useMyPendingAvaliacoes();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const pendingCount = avaliacoes?.length || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Avaliações Pendentes
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary">
              {pendingCount} {pendingCount === 1 ? 'pendente' : 'pendentes'}
            </Badge>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/avaliacoes">
                Ver todas
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingCount === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma avaliação pendente no momento.
          </p>
        ) : (
          avaliacoes?.map((avaliacao) => (
            <AvaliacaoCard key={avaliacao.id} avaliacao={avaliacao} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
