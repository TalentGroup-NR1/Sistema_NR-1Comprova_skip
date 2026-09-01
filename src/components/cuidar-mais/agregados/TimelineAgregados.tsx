import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TimelinePoint } from "@/hooks/useCuidarResultadosAgregados";

interface Props {
  data: TimelinePoint[];
}

const COLORS = [
  "hsl(var(--primary))",
  "#8B0000",
  "#C5A572",
  "#0A1628",
  "#2563eb",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
];

function formatSemana(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(
    d.getUTCMonth() + 1
  ).padStart(2, "0")}`;
}

export function TimelineAgregados({ data }: Props) {
  const { chartData, gruposTop } = useMemo(() => {
    if (data.length === 0) return { chartData: [], gruposTop: [] as string[] };

    // Total de respondentes por grupo → top 8
    const totals = new Map<string, number>();
    data.forEach((d) =>
      totals.set(d.grupo, (totals.get(d.grupo) ?? 0) + d.respondentes)
    );
    const sortedGroups = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([g]) => g);
    const top = sortedGroups.slice(0, 8);
    const topSet = new Set(top);
    const hasOutros = sortedGroups.length > 8;

    // Agrupa por semana
    const bySemana = new Map<string, Record<string, { soma: number; n: number }>>();
    data.forEach((d) => {
      const bucket = topSet.has(d.grupo) ? d.grupo : "Outros";
      if (!bySemana.has(d.semana)) bySemana.set(d.semana, {});
      const row = bySemana.get(d.semana)!;
      if (!row[bucket]) row[bucket] = { soma: 0, n: 0 };
      row[bucket].soma += d.media * d.respondentes;
      row[bucket].n += d.respondentes;
    });

    const grupos = hasOutros ? [...top, "Outros"] : top;

    const chartData = Array.from(bySemana.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([semana, row]) => {
        const obj: Record<string, string | number> = { semana: formatSemana(semana) };
        grupos.forEach((g) => {
          if (row[g] && row[g].n > 0) {
            obj[g] = Number((row[g].soma / row[g].n).toFixed(2));
          }
        });
        return obj;
      });

    return { chartData, gruposTop: grupos };
  }, [data]);

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        Sem dados temporais no período.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="semana" tick={{ fontSize: 12 }} />
        <YAxis domain={[1, 5]} tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {gruposTop.map((g, i) => (
          <Line
            key={g}
            type="monotone"
            dataKey={g}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
