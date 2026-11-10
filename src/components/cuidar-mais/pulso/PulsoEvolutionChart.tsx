import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { PulseWeekData } from "@/hooks/usePulseSurvey";

interface PulsoEvolutionChartProps {
  data: PulseWeekData[];
}

export function PulsoEvolutionChart({ data }: PulsoEvolutionChartProps) {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Nenhum dado disponível ainda
      </div>
    );
  }

  // Ordenar por semana (mais antiga primeiro)
  const sortedData = [...data]
    .sort((a, b) => a.week_number - b.week_number)
    .map(d => ({
      ...d,
      weekLabel: `Sem ${d.week_number}`,
      avg_score: Number(d.avg_score),
    }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={sortedData}
        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="weekLabel" 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis 
          domain={[0, 5]} 
          ticks={[0, 1, 2, 3, 4, 5]}
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(value: number) => [value.toFixed(2), 'Média']}
          labelFormatter={(label) => `${label}`}
        />
        <ReferenceLine 
          y={3} 
          stroke="hsl(var(--muted-foreground))" 
          strokeDasharray="5 5"
          label={{ 
            value: 'Neutro', 
            position: 'insideBottomRight',
            fill: 'hsl(var(--muted-foreground))',
            fontSize: 10
          }}
        />
        <Line
          type="monotone"
          dataKey="avg_score"
          stroke="hsl(var(--primary))"
          strokeWidth={3}
          dot={{ 
            fill: 'hsl(var(--primary))', 
            strokeWidth: 2,
            r: 5
          }}
          activeDot={{ 
            r: 7, 
            stroke: 'hsl(var(--background))',
            strokeWidth: 2
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
