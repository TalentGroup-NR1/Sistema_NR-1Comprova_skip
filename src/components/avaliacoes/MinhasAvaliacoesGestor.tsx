import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardCheck, CalendarClock, AlertCircle, ArrowRight, CheckCircle2,
  Clock, FileText, Users
} from "lucide-react";
import { useMinhasAvaliacoesGestor, AvaliacaoGestor } from "@/hooks/useMyPendingAvaliacoes";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";

function getStatusBadge(avaliacao: AvaliacaoGestor) {
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

function AvaliacaoGestorPendenteCard({ avaliacao }: { avaliacao: AvaliacaoGestor }) {
  return (
    <div className={`p-4 rounded-lg border ${
      avaliacao.isOverdue
        ? 'border-destructive/30 bg-destructive/5'
        : avaliacao.daysUntil <= 3
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-border bg-muted/30'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <h4 className="font-medium text-foreground truncate">{avaliacao.colaborador_nome}</h4>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="text-xs">{avaliacao.ciclo_nome}</span>
            {avaliacao.prazo_avaliacao_gestor && (
              <span>Prazo: {format(parseISO(avaliacao.prazo_avaliacao_gestor), "dd/MM/yyyy", { locale: ptBR })}</span>
            )}
            {getStatusBadge(avaliacao)}
          </div>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link to={avaliacao.avaliacaoUrl}>
            Responder <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function AvaliacaoGestorConcluidaCard({ avaliacao }: { avaliacao: AvaliacaoGestor }) {
  return (
    <div className="p-4 rounded-lg border border-success/30 bg-success/5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            <h4 className="font-medium text-foreground truncate">{avaliacao.colaborador_nome}</h4>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="text-xs">{avaliacao.ciclo_nome}</span>
            {avaliacao.data_conclusao && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Concluído em: {format(parseISO(avaliacao.data_conclusao), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            )}
            <Badge variant="success" size="sm">Concluída</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MinhasAvaliacoesGestor() {
  const { data, isLoading, colaborador } = useMinhasAvaliacoesGestor();

  if (!isLoading && !colaborador) {
    return (
      <MainLayout>
        <div className="container mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Avaliações da Minha Equipe</h1>
            <p className="text-muted-foreground">Responda as avaliações de desempenho da sua equipe</p>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive/50" />
              <p className="font-medium text-destructive">Cadastro não encontrado</p>
              <p className="text-sm text-muted-foreground">
                Seu usuário não está vinculado a um registro de colaborador. Entre em contato com o RH.
              </p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" /> Avaliações da Minha Equipe
          </h1>
          <p className="text-muted-foreground">Responda as avaliações de desempenho dos colaboradores da sua equipe</p>
        </div>

        {isLoading ? (
          <Card>
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-primary" /> Pendentes
                  </CardTitle>
                  {(data?.pendentes?.length || 0) > 0 && (
                    <Badge variant="outline" className="text-primary">
                      {data?.pendentes?.length} {data?.pendentes?.length === 1 ? 'avaliação' : 'avaliações'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {(data?.pendentes?.length || 0) > 0 ? (
                  <div className="space-y-3">
                    {data?.pendentes?.map((a) => <AvaliacaoGestorPendenteCard key={a.id} avaliacao={a} />)}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-success/50" />
                    <p className="font-medium">Nenhuma avaliação pendente</p>
                    <p className="text-sm">Você está em dia com as avaliações da sua equipe!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {(data?.concluidas?.length || 0) > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-success" /> Concluídas
                    </CardTitle>
                    <Badge variant="secondary">
                      {data?.concluidas?.length} {data?.concluidas?.length === 1 ? 'avaliação' : 'avaliações'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data?.concluidas?.map((a) => (
                    <AvaliacaoGestorConcluidaCard key={a.id} avaliacao={a} />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
