import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Legend, 
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { CompetenciaResultado } from "@/hooks/useAvaliacaoResultados";
import { Award } from "lucide-react";

interface AvaliacaoRadarChartProps {
  competencias: CompetenciaResultado[];
  maxScale?: number;
}

interface RadarDataPoint {
  competencia: string;
  autoavaliacao: number | null;
  gestor: number | null;
  fullName: string;
}

function truncateText(text: string, maxLength: number = 15): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-2">{data.fullName}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Autoavaliação:</span>
          <span className="font-medium">{data.autoavaliacao ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-muted-foreground">Gestor:</span>
          <span className="font-medium">{data.gestor ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}

export function AvaliacaoRadarChart({ competencias, maxScale = 5 }: AvaliacaoRadarChartProps) {
  // Transform competencias to radar data format
  const radarData: RadarDataPoint[] = competencias.map(comp => {
    // Get numeric values from peso if available
    const autoValue = comp.resposta_colaborador?.peso ?? null;
    const gestorValue = comp.resposta_gestor?.peso ?? null;

    return {
      competencia: truncateText(comp.nome_competencia),
      autoavaliacao: autoValue,
      gestor: gestorValue,
      fullName: comp.nome_competencia,
    };
  });

  // Check if we have any data to display
  const hasData = radarData.some(d => d.autoavaliacao !== null || d.gestor !== null);

  if (!hasData || competencias.length === 0) {
    return (
      <Card className="border-border print:border-gray-300">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Comparativo de Competências
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          Aguardando conclusão das avaliações para exibir o gráfico
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border print:border-gray-300 avaliacao-radar-chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Comparativo de Competências
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 print:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis 
                dataKey="competencia" 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                className="print:text-gray-600"
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, maxScale]} 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickCount={6}
              />
              <Radar
                name="Autoavaliação"
                dataKey="autoavaliacao"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Radar
                name="Gestor"
                dataKey="gestor"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: 10 }}
                iconType="circle"
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
