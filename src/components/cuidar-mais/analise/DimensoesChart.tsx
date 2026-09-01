import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { EstatisticasDimensao } from '@/hooks/useCuidarMaisAnalise';
import { DIMENSOES_CUIDAR_MAIS } from '@/lib/cuidarMaisDimensoes';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';

interface DimensoesChartProps {
  dimensoes: EstatisticasDimensao[];
  departamentoFiltrado?: string | null;
}

const getBarColor = (score: number) => {
  if (score >= 4) return 'hsl(var(--chart-2))'; // green
  if (score >= 3) return 'hsl(var(--chart-4))'; // yellow
  return 'hsl(var(--chart-1))'; // red
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 min-w-[200px]">
        <p className="font-medium text-sm mb-2">{data.nome}</p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Score:</span>
            <span className="font-medium">{data.score.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">% em risco:</span>
            <span className="font-medium">{data.percentual_risco}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Perguntas:</span>
            <span className="font-medium">{data.total_perguntas}</span>
          </div>
          {data.alerta && (
            <div className="pt-1 mt-1 border-t">
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {data.motivo_alerta}
              </Badge>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export function DimensoesChart({ dimensoes, departamentoFiltrado }: DimensoesChartProps) {
  if (dimensoes.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhuma dimensão com dados disponíveis.</p>
            <p className="text-sm mt-1">
              Certifique-se de que as perguntas Likert têm dimensões atribuídas.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Preparar dados para o gráfico
  const chartData = dimensoes.map(d => ({
    ...d,
    shortName: d.nome.split(' ')[0],
  }));

  return (
    <div className="space-y-6">
      {/* Gráfico de Barras */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Score por Dimensão</span>
            {departamentoFiltrado && (
              <Badge variant="secondary">{departamentoFiltrado}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Média das respostas Likert (1-5) agrupadas por dimensão de saúde mental
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" domain={[0, 5]} tickCount={6} />
                <YAxis 
                  type="category" 
                  dataKey="shortName" 
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine x={3} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cards detalhados por dimensão */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dimensoes.map(d => {
          const dimensaoInfo = DIMENSOES_CUIDAR_MAIS[d.dimensao];
          
          return (
            <Card 
              key={d.dimensao} 
              className={d.alerta ? 'border-destructive/50 bg-destructive/5' : ''}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{d.icone}</span>
                    <CardTitle className="text-sm font-medium leading-tight">
                      {d.nome}
                    </CardTitle>
                  </div>
                  {d.alerta && (
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${
                      d.score >= 4 ? 'text-green-600' : 
                      d.score >= 3 ? 'text-yellow-600' : 
                      'text-red-600'
                    }`}>
                      {d.score.toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground">/ 5.0</span>
                    {d.delta !== undefined && (
                      <Badge 
                        variant={d.delta >= 0 ? 'default' : 'destructive'} 
                        className="ml-auto text-xs"
                      >
                        {d.delta >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {d.delta > 0 ? '+' : ''}{d.delta.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                  <Progress 
                    value={(d.score / 5) * 100} 
                    className="mt-2 h-2"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Em risco:</span>
                  <span className={d.percentual_risco > 35 ? 'text-destructive font-medium' : ''}>
                    {d.percentual_risco}%
                  </span>
                </div>

                {d.alerta && d.motivo_alerta && (
                  <p className="text-xs text-destructive mt-2 pt-2 border-t">
                    ⚠️ {d.motivo_alerta}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
