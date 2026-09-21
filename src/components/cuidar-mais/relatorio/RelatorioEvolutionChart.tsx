import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Activity } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { EMOJI_SCALE } from "@/hooks/usePulseCampaigns";
import { formatReportDateTime, formatReportDate } from "./normalizeReportData";
import type { ReportPulso } from "./types";

interface RelatorioEvolutionChartProps {
  pulsos: ReportPulso[];
}

export function RelatorioEvolutionChart({ pulsos }: RelatorioEvolutionChartProps) {
  const chartData = useMemo(() => {
    if (!pulsos || pulsos.length === 0) return [];

    return pulsos
      .filter((p) => p.score_numeric !== null && !isNaN(p.score_numeric))
      .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
      .map((p, index) => ({
        index: index + 1,
        dateLabel: formatReportDate(p.data_hora),
        fullDateTime: formatReportDateTime(p.data_hora),
        origem: p.origem === "campanha" ? "Campanha" : "Pulso Direto",
        campanha: p.campanha || "Pulso Direto",
        score: p.score_numeric as number,
        pergunta: p.pergunta,
      }));
  }, [pulsos]);

  const getEmojiForScore = (score: number) => {
    const rounded = Math.round(score);
    return EMOJI_SCALE.find((e) => e.score === rounded)?.emoji || "😐";
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const emoji = getEmojiForScore(data.score);

      return (
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-xl p-3 max-w-xs space-y-1 text-sm">
          <div className="flex items-center justify-between gap-2 border-b pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {data.origem}
            </span>
            <span className="text-xs text-muted-foreground">{data.fullDateTime}</span>
          </div>
          <p className="font-medium text-foreground">{data.campanha}</p>
          {data.pergunta && (
            <p className="text-xs text-muted-foreground line-clamp-2 italic">
              "{data.pergunta}"
            </p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-2xl">{emoji}</span>
            <span className="text-base font-bold text-foreground">
              Nota {data.score.toFixed(1)} / 5.0
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length < 2) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Evolução Cronológica do Sentimento
          </CardTitle>
          <CardDescription>
            Gráfico probatório da variação de humor ao longo do período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border flex flex-col items-center justify-center">
            <Activity className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium text-foreground">
              Histórico insuficiente para curva de tendência
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              São necessários ao menos 2 pulsos com nota numérica no período para renderizar a linha de evolução.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Evolução Cronológica do Sentimento
        </CardTitle>
        <CardDescription>
          Registro probatório da variação de humor do colaborador ao longo do tempo (Escala 0 a 5)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreReportGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/60" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => getEmojiForScore(val)}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={2.5}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                label={{
                  value: "Linha Neutra (2.5)",
                  position: "insideTopRight",
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 10,
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#scoreReportGradient)"
                activeDot={{ r: 6, strokeWidth: 2, className: "fill-primary stroke-background" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
