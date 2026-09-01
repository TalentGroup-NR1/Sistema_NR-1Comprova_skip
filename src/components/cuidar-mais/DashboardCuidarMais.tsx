import { useState } from "react";
import { Heart, Users, CheckCircle, MessageCircle, TrendingUp, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardCuidarPlus, useEstatisticasCuidarPlus } from "@/hooks/useCuidarMaisRespostas";
import { useQuestionariosCuidarPlus } from "@/hooks/useCuidarMaisQuestionarios";
import { TopStreaksCard } from "./pulso/TopStreaksCard";
import { BadgesTendenciasCard } from "./pulso/BadgesTendenciasCard";
import { RecomendacoesLideresCard } from "./pulso/RecomendacoesLideresCard";
import { AlertasPreventivosCard } from "./pulso/AlertasPreventivosCard";

export function DashboardCuidarMais() {
  const [selectedQuestionarioId, setSelectedQuestionarioId] = useState<string>("");
  
  const { data: dashboardData, isLoading: loadingDashboard } = useDashboardCuidarPlus();
  const { data: questionarios } = useQuestionariosCuidarPlus();
  const { data: estatisticas, isLoading: loadingEstatisticas } = useEstatisticasCuidarPlus(
    selectedQuestionarioId || null
  );

  const getLikertLabel = (value: number): string => {
    const labels: Record<number, string> = {
      1: "Discordo Totalmente",
      2: "Discordo",
      3: "Neutro",
      4: "Concordo",
      5: "Concordo Totalmente",
    };
    return labels[Math.round(value)] || "N/A";
  };

  const getScoreColor = (score: number): string => {
    if (score >= 4) return "text-green-600";
    if (score >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Cards de visão geral */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questionários Ativos</CardTitle>
            <Heart className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            {loadingDashboard ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{dashboardData?.questionarios_ativos || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Envios Totais</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {loadingDashboard ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{dashboardData?.total_envios || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Participação</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {loadingDashboard ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{dashboardData?.taxa_participacao || 0}%</div>
                <Progress value={dashboardData?.taxa_participacao || 0} className="mt-2" />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitações de Contato</CardTitle>
            <MessageCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {loadingDashboard ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{dashboardData?.solicitacoes_contato || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <TopStreaksCard />

      {/* Análise por questionário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Análise por Questionário
          </CardTitle>
          <CardDescription>
            Visualize as estatísticas anônimas de cada questionário
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedQuestionarioId} onValueChange={setSelectedQuestionarioId}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Selecione um questionário..." />
            </SelectTrigger>
            <SelectContent>
              {questionarios?.map(q => (
                <SelectItem key={q.id} value={q.id}>
                  {q.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedQuestionarioId && (
            loadingEstatisticas ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : estatisticas ? (
              <div className="space-y-6">
                {/* Stats resumidos */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Participação</p>
                    <p className="text-xl font-bold">
                      {estatisticas.total_respondidos} / {estatisticas.total_envios}
                    </p>
                    <Progress 
                      value={estatisticas.taxa_participacao} 
                      className="mt-2" 
                    />
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Taxa</p>
                    <p className="text-xl font-bold">{estatisticas.taxa_participacao}%</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Querem Contato</p>
                    <p className="text-xl font-bold">{estatisticas.solicitacoes_contato}</p>
                  </div>
                </div>

                {/* Médias por pergunta */}
                {Object.keys(estatisticas.media_por_pergunta).length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Médias por Pergunta (Likert)
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(estatisticas.media_por_pergunta).map(([id, data]) => (
                        <Card key={id}>
                          <CardContent className="py-4">
                            <div className="flex items-start justify-between gap-4">
                              <p className="text-sm flex-1">{data.pergunta_texto}</p>
                              <div className="text-right">
                                <p className={`text-xl font-bold ${getScoreColor(data.media)}`}>
                                  {data.media.toFixed(1)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {getLikertLabel(data.media)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  ({data.respostas} respostas)
                                </p>
                              </div>
                            </div>
                            <Progress 
                              value={(data.media / 5) * 100} 
                              className="mt-2"
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma resposta encontrada para este questionário
              </p>
            )
          )}
        </CardContent>
      </Card>

      {/* Onda 7.3 — Badges e tendências da semana */}
      <BadgesTendenciasCard />

      {/* Onda 7.4 — Recomendações para líderes */}
      <RecomendacoesLideresCard />

      {/* Onda 7.5 — Alertas preventivos */}
      <AlertasPreventivosCard />
    </div>
  );
}
