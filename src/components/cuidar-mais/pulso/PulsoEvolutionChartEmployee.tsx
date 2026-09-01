import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

interface CampaignData {
  campaign_id: string;
  campaign_title: string;
  campaign_date: string;
  avg_score: number;
}

interface PulsoEvolutionChartEmployeeProps {
  data: CampaignData[];
}

export function PulsoEvolutionChartEmployee({ data }: PulsoEvolutionChartEmployeeProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Ordenar por data (mais antiga primeiro)
    const sorted = [...data].sort(
      (a, b) => new Date(a.campaign_date).getTime() - new Date(b.campaign_date).getTime()
    );

    return sorted.map((campaign) => ({
      date: format(new Date(campaign.campaign_date), "dd/MM", { locale: ptBR }),
      fullDate: format(new Date(campaign.campaign_date), "dd 'de' MMMM", { locale: ptBR }),
      titulo: campaign.campaign_title,
      score: campaign.avg_score,
    }));
  }, [data]);

  const getEmojiForScore = (score: number) => {
    const roundedScore = Math.round(score);
    return EMOJI_SCALE.find((e) => e.score === roundedScore)?.emoji || "😐";
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const emoji = getEmojiForScore(data.score);
      
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium">{data.titulo}</p>
          <p className="text-xs text-muted-foreground mb-2">{data.fullDate}</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{emoji}</span>
            <span className="text-lg font-bold">{data.score.toFixed(1)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evolução do Sentimento
          </CardTitle>
          <CardDescription>
            Histórico de respostas ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>São necessárias pelo menos 2 campanhas respondidas para visualizar a evolução.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Evolução do Sentimento
        </CardTitle>
        <CardDescription>
          Média de respostas por campanha ao longo do tempo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => getEmojiForScore(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={2.5}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                label={{
                  value: "Neutro",
                  position: "insideBottomLeft",
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 10,
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorScore)"
                dot={{ r: 4, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda de emojis */}
        <div className="flex justify-center gap-4 mt-4 flex-wrap">
          {EMOJI_SCALE.map((item) => (
            <div key={item.score} className="flex items-center gap-1 text-xs">
              <span>{item.emoji}</span>
              <span className="text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
