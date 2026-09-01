import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp } from "lucide-react";
import { usePulseTrendData } from "@/hooks/usePulseCampaigns";

interface PulsoTrendChartProps {
  monthsBack?: number;
}

export function PulsoTrendChart({ monthsBack = 6 }: PulsoTrendChartProps) {
  const { data: trendData, isLoading } = usePulseTrendData(monthsBack);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = trendData?.map((d) => ({
    name: format(parseISO(d.campaign_date), "dd/MM", { locale: ptBR }),
    titulo: d.campaign_title,
    media: d.avg_score || 0,
    respostas: d.total_responses,
  })) || [];

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evolução do Pulso
          </CardTitle>
          <CardDescription>Tendência ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Sem dados de campanhas anteriores
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
          Evolução do Pulso
        </CardTitle>
        <CardDescription>
          Média de sentimento por campanha
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorMedia" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis domain={[0, 5]} className="text-xs" />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border rounded-lg shadow-lg p-3">
                    <p className="font-medium text-sm">{data.titulo}</p>
                    <p className="text-sm text-muted-foreground">{data.name}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm">Média: <strong>{data.media?.toFixed(1)}</strong></p>
                      <p className="text-sm text-muted-foreground">
                        {data.respostas} resposta{data.respostas !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="media"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#colorMedia)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
