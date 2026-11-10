import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { PulseWeekData, EMOJI_SCALE } from "@/hooks/usePulseSurvey";

interface PulsoDistributionChartProps {
  weekData?: PulseWeekData | null;
}

const COLORS = [
  '#ef4444', // red - 0
  '#f97316', // orange - 1
  '#eab308', // yellow - 2
  '#84cc16', // lime - 3
  '#22c55e', // green - 4
  '#10b981', // emerald - 5
];

export function PulsoDistributionChart({ weekData }: PulsoDistributionChartProps) {
  if (!weekData) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Sem dados para a semana atual
      </div>
    );
  }

  const chartData = EMOJI_SCALE.map((item, index) => ({
    name: item.emoji,
    label: item.label,
    value: Number(weekData[`score_${index}` as keyof PulseWeekData]) || 0,
    color: COLORS[index],
  }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 20, left: 0, bottom: 40 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 20 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          allowDecimals={false}
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted))' }}
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(value: number, name: string, props: any) => {
            const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
            return [`${value} (${percentage}%)`, props.payload.label];
          }}
        />
        <Bar 
          dataKey="value" 
          radius={[4, 4, 0, 0]}
          maxBarSize={50}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
