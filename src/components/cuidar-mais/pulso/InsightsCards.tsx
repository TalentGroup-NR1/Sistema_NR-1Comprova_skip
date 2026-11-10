import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Smile, AlertTriangle } from "lucide-react";
import { useInsightSemanaAtual } from "@/hooks/useCuidarInsights";

export function InsightsCards() {
  const { data, isLoading } = useInsightSemanaAtual();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  const humor = data?.humor_medio ?? null;
  const tendencia = data?.tendencia ?? 0;
  const alertas = Array.isArray(data?.alertas_json) ? data!.alertas_json : [];
  const total = data?.total_respostas ?? 0;

  const TrendIcon = tendencia > 0 ? TrendingUp : tendencia < 0 ? TrendingDown : Minus;
  const trendColor =
    tendencia > 0 ? "text-emerald-600" : tendencia < 0 ? "text-red-600" : "text-muted-foreground";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Humor da semana</span>
            <Smile className="h-4 w-4 text-pink-500" />
          </div>
          <div className="text-3xl font-bold">
            {humor !== null ? humor.toFixed(0) : "—"}
            <span className="text-base font-normal text-muted-foreground">/100</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{total} resposta(s)</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Tendência</span>
            <TrendIcon className={`h-4 w-4 ${trendColor}`} />
          </div>
          <div className={`text-3xl font-bold ${trendColor}`}>
            {tendencia > 0 ? "+" : ""}
            {tendencia.toFixed(1)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">vs. semana anterior</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Alertas ativos</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold">{alertas.length}</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {alertas.slice(0, 3).map((a, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {String((a as { tipo?: string }).tipo ?? "alerta")}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
