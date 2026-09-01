import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { BarChart3 } from "lucide-react";
import { EMOJI_SCALE } from "@/hooks/usePulseCampaigns";

interface PulsoCampaignDistributionChartProps {
  distribution: Record<string, number>;
}

export function PulsoCampaignDistributionChart({ distribution }: PulsoCampaignDistributionChartProps) {
  // Agrupar em 3 categorias: Negativo (0-1), Neutro (2-3), Positivo (4-5)
  const grouped = {
    negativo: (distribution['0'] || 0) + (distribution['1'] || 0),
    neutro: (distribution['2'] || 0) + (distribution['3'] || 0),
    positivo: (distribution['4'] || 0) + (distribution['5'] || 0),
  };

  const total = grouped.negativo + grouped.neutro + grouped.positivo;

  const pieData = [
    {
      name: "Negativo (0-1)",
      value: grouped.negativo,
      color: "#ef4444",
      emoji: "😢😟",
    },
    {
      name: "Neutro (2-3)",
      value: grouped.neutro,
      color: "#eab308",
      emoji: "😐🙂",
    },
    {
      name: "Positivo (4-5)",
      value: grouped.positivo,
      color: "#22c55e",
      emoji: "😊🤩",
    },
  ].filter((d) => d.value > 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Distribuição de Respostas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Nenhuma resposta para exibir
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Distribuição de Respostas
        </CardTitle>
        <CardDescription>
          {total} resposta{total !== 1 ? "s" : ""} total
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pie Chart - Agrupado */}
          <div>
            <h4 className="text-sm font-medium mb-4 text-center">Por Categoria</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${(percent * 100).toFixed(0)}%`
                  }
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium">{data.emoji}</p>
                        <p className="text-sm">{data.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.value} resposta{data.value !== 1 ? "s" : ""}
                        </p>
                      </div>
                    );
                  }}
                />
                <Legend
                  formatter={(value, entry: any) => (
                    <span className="text-sm">
                      {entry.payload.emoji} {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar-like list - Detalhado */}
          <div>
            <h4 className="text-sm font-medium mb-4 text-center">Por Sentimento</h4>
            <div className="space-y-3">
              {EMOJI_SCALE.map((e) => {
                const count = distribution[String(e.score)] || 0;
                const percent = total > 0 ? (count / total) * 100 : 0;

                return (
                  <div key={e.score} className="flex items-center gap-3">
                    <span className="text-2xl w-8">{e.emoji}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{e.label}</span>
                        <span className="text-muted-foreground">
                          {count} ({percent.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            e.score <= 1
                              ? "bg-red-500"
                              : e.score <= 3
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
