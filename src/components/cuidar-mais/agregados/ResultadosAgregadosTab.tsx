import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DimensaoAgrupamento,
  PeriodoMeses,
  useCuidarResultadosAgregados,
} from "@/hooks/useCuidarResultadosAgregados";
import { HeatmapAgregados } from "./HeatmapAgregados";
import { TimelineAgregados } from "./TimelineAgregados";

const PERIODOS: { label: string; months: PeriodoMeses }[] = [
  { label: "Último Mês", months: 1 },
  { label: "Últimos 3 Meses", months: 3 },
  { label: "Últimos 6 Meses", months: 6 },
  { label: "Últimos 12 Meses", months: 12 },
];

export function ResultadosAgregadosTab() {
  const [periodoIdx, setPeriodoIdx] = useState<number>(0);
  const dimensao: DimensaoAgrupamento = "departamento";
  const months = PERIODOS[periodoIdx].months;

  const { data, isLoading, isError, refetch } = useCuidarResultadosAgregados(dimensao, months);

  const isEmpty = !isLoading && !isError && data?.heatmap.length === 0 && data?.timeline.length === 0;

  const renderError = () => (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Erro ao carregar resultados</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-4 mt-2">
        <p>Não foi possível carregar os resultados agregados no momento. Por favor, tente novamente.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      </AlertDescription>
    </Alert>
  );

  const renderEmpty = () => (
    <Alert className="bg-muted/50 border-muted">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Sem dados para exibição</AlertTitle>
      <AlertDescription>
        Nenhuma resposta de pulso no período selecionado. Lance um pulso e aguarde as respostas dos colaboradores.
      </AlertDescription>
    </Alert>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resultados Agregados</CardTitle>
          <CardDescription>
            Visão consolidada das respostas do Cuidar+ agrupadas por departamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">


            <Select
              value={String(periodoIdx)}
              onValueChange={(v) => setPeriodoIdx(Number(v))}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODOS.map((p, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mapa de Calor por Dimensão</CardTitle>
          <CardDescription>
            Médias (1 a 5) por departamento e dimensão da pergunta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isError ? (
            renderError()
          ) : isEmpty ? (
            renderEmpty()
          ) : isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <HeatmapAgregados
              data={data?.heatmap ?? []}
              grupos={data?.grupos ?? []}
              dimensoes={data?.dimensoes ?? []}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evolução Temporal</CardTitle>
          <CardDescription>Média semanal por grupo (top 8 + Outros).</CardDescription>
        </CardHeader>
        <CardContent>
          {isError ? (
            renderError()
          ) : isEmpty ? (
            renderEmpty()
          ) : isLoading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : (
            <TimelineAgregados data={data?.timeline ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
