import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  ClipboardCheck, CalendarClock, AlertCircle, ArrowRight, CheckCircle2,
  Clock, FileText, Target, Plus, Eye
} from "lucide-react";
import { useMinhasAvaliacoes, MinhaAvaliacao } from "@/hooks/useMyPendingAvaliacoes";
import { useMinhasPDIs, MinhaPDI } from "@/hooks/useMinhasPDIs";
import { usePDIByAvaliacao } from "@/hooks/usePDI";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { CriarMeuPDIDialog } from "./CriarMeuPDIDialog";

// --- Status Badges ---

function getStatusBadge(avaliacao: MinhaAvaliacao) {
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

// --- Avaliação Cards ---

function AvaliacaoPendenteCard({ avaliacao }: { avaliacao: MinhaAvaliacao }) {
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
            <h4 className="font-medium text-foreground truncate">{avaliacao.ciclo_nome}</h4>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {avaliacao.prazo_autoavaliacao && (
              <span>Prazo: {format(parseISO(avaliacao.prazo_autoavaliacao), "dd/MM/yyyy", { locale: ptBR })}</span>
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

function AvaliacaoConcluidaCard({ avaliacao, colaboradorId }: { avaliacao: MinhaAvaliacao; colaboradorId: string }) {
  const [openPDI, setOpenPDI] = useState(false);
  const { data: existingPDI, isLoading: loadingPDI } = usePDIByAvaliacao(avaliacao.id);

  return (
    <>
      <div className="p-4 rounded-lg border border-success/30 bg-success/5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <h4 className="font-medium text-foreground truncate">{avaliacao.ciclo_nome}</h4>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {avaliacao.data_conclusao && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Concluído em: {format(parseISO(avaliacao.data_conclusao), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              )}
              <Badge variant="success" size="sm">Concluída</Badge>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {!loadingPDI && !existingPDI && (
              <Button size="sm" variant="outline" onClick={() => setOpenPDI(true)} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Criar PDI
              </Button>
            )}
            {existingPDI && (
              <Button asChild size="sm" variant="outline" className="gap-1">
                <Link to={`/pdi/${existingPDI.id}`}>
                  <Eye className="h-3.5 w-3.5" /> Ver PDI
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
      <CriarMeuPDIDialog
        open={openPDI}
        onOpenChange={setOpenPDI}
        avaliacaoId={avaliacao.id}
        cicloId={avaliacao.ciclo_id}
        colaboradorId={colaboradorId}
      />
    </>
  );
}

// --- PDI Card ---

const pdiStatusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" }> = {
  rascunho: { label: "Rascunho", variant: "secondary" },
  em_andamento: { label: "Em Andamento", variant: "default" },
  concluido: { label: "Concluído", variant: "success" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

function PDICard({ pdi }: { pdi: MinhaPDI }) {
  const statusInfo = pdiStatusLabels[pdi.status] || { label: pdi.status, variant: "secondary" as const };

  return (
    <div className="p-4 rounded-lg border border-border bg-muted/30">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-primary shrink-0" />
            <h4 className="font-medium text-foreground truncate">{pdi.ciclo_nome}</h4>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2">
            <span>Início: {format(parseISO(pdi.data_inicio), "dd/MM/yyyy", { locale: ptBR })}</span>
            {pdi.data_fim_prevista && (
              <span>Prazo: {format(parseISO(pdi.data_fim_prevista), "dd/MM/yyyy", { locale: ptBR })}</span>
            )}
            <Badge variant={statusInfo.variant} size="sm">{statusInfo.label}</Badge>
          </div>
          {pdi.count_itens > 0 && (
            <div className="flex items-center gap-2">
              <Progress value={pdi.progresso_medio} className="h-2 flex-1 max-w-[200px]" />
              <span className="text-xs text-muted-foreground">{pdi.progresso_medio}%</span>
              <span className="text-xs text-muted-foreground">({pdi.count_itens} {pdi.count_itens === 1 ? 'ação' : 'ações'})</span>
            </div>
          )}
        </div>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link to={`/pdi/${pdi.id}`}>
            <Eye className="h-4 w-4 mr-1" /> Detalhes
          </Link>
        </Button>
      </div>
    </div>
  );
}

// --- Main Page ---

export function MinhasAvaliacoes() {
  const { data, isLoading, colaborador } = useMinhasAvaliacoes();
  const { data: pdis, isLoading: isLoadingPDIs } = useMinhasPDIs();

  if (!isLoading && !colaborador) {
    return (
      <MainLayout>
        <div className="container mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Avaliações e PDI</h1>
            <p className="text-muted-foreground">Acompanhe suas avaliações e planos de desenvolvimento</p>
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
          <h1 className="text-2xl font-bold text-foreground">Avaliações e PDI</h1>
          <p className="text-muted-foreground">Acompanhe suas avaliações de desempenho e planos de desenvolvimento</p>
        </div>

        <Tabs defaultValue="avaliacoes">
          <TabsList>
            <TabsTrigger value="avaliacoes" className="gap-1.5">
              <ClipboardCheck className="h-4 w-4" /> Avaliações
            </TabsTrigger>
            <TabsTrigger value="pdis" className="gap-1.5">
              <Target className="h-4 w-4" /> Meus PDIs
              {(pdis?.length || 0) > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-[10px]">{pdis?.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Avaliações Tab */}
          <TabsContent value="avaliacoes">
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
                        {data?.pendentes?.map((a) => <AvaliacaoPendenteCard key={a.id} avaliacao={a} />)}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-success/50" />
                        <p className="font-medium">Nenhuma avaliação pendente</p>
                        <p className="text-sm">Você está em dia com suas autoavaliações!</p>
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
                        <AvaliacaoConcluidaCard key={a.id} avaliacao={a} colaboradorId={colaborador!.id} />
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* PDIs Tab */}
          <TabsContent value="pdis">
            {isLoadingPDIs ? (
              <Card>
                <CardContent className="space-y-3 pt-6">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ) : (pdis?.length || 0) > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" /> Meus Planos de Desenvolvimento
                    </CardTitle>
                    <Badge variant="outline">{pdis?.length} {pdis?.length === 1 ? 'PDI' : 'PDIs'}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pdis?.map((pdi) => <PDICard key={pdi.id} pdi={pdi} />)}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="font-medium text-muted-foreground">Nenhum PDI criado</p>
                  <p className="text-sm text-muted-foreground">
                    Conclua uma avaliação para criar seu Plano de Desenvolvimento Individual.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
