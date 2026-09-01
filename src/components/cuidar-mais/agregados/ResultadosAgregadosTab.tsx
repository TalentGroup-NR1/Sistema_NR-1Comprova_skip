import { useState } from "react";
import { Building2, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  const [dimensao, setDimensao] = useState<DimensaoAgrupamento>("departamento");
  const [periodoIdx, setPeriodoIdx] = useState<number>(0);
  const months = PERIODOS[periodoIdx].months;

  const { data, isLoading } = useCuidarResultadosAgregados(dimensao, months);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resultados Agregados</CardTitle>
          <CardDescription>
            Visão consolidada das respostas do Cuidar+ agrupadas por{" "}
            {dimensao === "departamento" ? "departamento" : "empresa cliente"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <ToggleGroup
              type="single"
              value={dimensao}
              onValueChange={(v) => v && setDimensao(v as DimensaoAgrupamento)}
              className="justify-start"
            >
              <ToggleGroupItem value="departamento" className="gap-2">
                <Users className="h-4 w-4" />
                Departamento
              </ToggleGroupItem>
              <ToggleGroupItem value="cliente" className="gap-2">
                <Building2 className="h-4 w-4" />
                Empresa Cliente
              </ToggleGroupItem>
            </ToggleGroup>

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
            Médias (1 a 5) por {dimensao === "departamento" ? "departamento" : "empresa cliente"} e dimensão da pergunta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
          {isLoading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : (
            <TimelineAgregados data={data?.timeline ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
