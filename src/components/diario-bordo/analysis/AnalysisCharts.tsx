import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { TrendingUp, Target } from 'lucide-react';

interface ChartData {
  question: string;
  colaborador: number;
  gestor: number;
  fullQuestion: string;
}

interface AnalysisChartsProps {
  radarData: ChartData[];
  barData: ChartData[];
  alignmentScore: number;
  colaboradorAverage: number;
  gestorAverage: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 max-w-xs">
        <p className="text-sm font-medium mb-2">{data.fullQuestion}</p>
        <div className="space-y-1">
          <p className="text-sm text-blue-600">
            Colaborador: <span className="font-bold">{data.colaborador}</span>
          </p>
          <p className="text-sm text-orange-500">
            Gestor: <span className="font-bold">{data.gestor}</span>
          </p>
          {data.colaborador > 0 && data.gestor > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Diferença: {Math.abs(data.colaborador - data.gestor)} pontos
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const AlignmentGauge = ({ score }: { score: number }) => {
  const getColor = (s: number) => {
    if (s >= 80) return '#22c55e';
    if (s >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const data = [
    { name: 'Alinhamento', value: score },
    { name: 'Restante', value: 100 - score },
  ];

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="80%"
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={0}
            dataKey="value"
          >
            <Cell fill={getColor(score)} />
            <Cell fill="#e5e7eb" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
        <span className="text-4xl font-bold" style={{ color: getColor(score) }}>
          {score}%
        </span>
        <span className="text-xs text-muted-foreground">Alinhamento</span>
      </div>
    </div>
  );
};

export function AnalysisCharts({ radarData, barData, alignmentScore, colaboradorAverage, gestorAverage }: AnalysisChartsProps) {
  const hasData = radarData.length > 0 || barData.length > 0;

  if (!hasData) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Não há dados numéricos suficientes para gerar os gráficos comparativos.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Row: Alignment Gauge + Averages Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alignment Gauge */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-primary/5">
          <CardHeader className="pb-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Score de Alinhamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AlignmentGauge score={alignmentScore} />
            <div className="text-center mt-2">
              <Badge variant="outline" className={
                alignmentScore >= 80 ? 'bg-green-50 text-green-700 border-green-200' :
                alignmentScore >= 50 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                'bg-red-50 text-red-700 border-red-200'
              }>
                {alignmentScore >= 80 ? 'Excelente' : alignmentScore >= 50 ? 'Moderado' : 'Baixo'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Averages Comparison */}
        <Card className="lg:col-span-2 shadow-lg border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Médias Comparativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-around h-[180px]">
              {/* Colaborador Average */}
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-lg mx-auto">
                  <span className="text-3xl font-bold text-blue-700">
                    {colaboradorAverage > 0 ? colaboradorAverage.toFixed(1) : '—'}
                  </span>
                </div>
                <p className="text-sm font-medium text-blue-700 mt-2">Colaborador</p>
                <p className="text-xs text-muted-foreground">Autoavaliação</p>
              </div>

              {/* Comparison Arrow */}
              <div className="flex flex-col items-center">
                <div className={`text-2xl font-bold ${
                  Math.abs(colaboradorAverage - gestorAverage) <= 1 ? 'text-green-600' :
                  Math.abs(colaboradorAverage - gestorAverage) <= 2 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {colaboradorAverage > 0 && gestorAverage > 0 ? (
                    <>
                      Δ {Math.abs(colaboradorAverage - gestorAverage).toFixed(1)}
                    </>
                  ) : '—'}
                </div>
                <span className="text-xs text-muted-foreground">Diferença</span>
              </div>

              {/* Gestor Average */}
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center shadow-lg mx-auto">
                  <span className="text-3xl font-bold text-orange-700">
                    {gestorAverage > 0 ? gestorAverage.toFixed(1) : '—'}
                  </span>
                </div>
                <p className="text-sm font-medium text-orange-700 mt-2">Gestor</p>
                <p className="text-xs text-muted-foreground">Avaliação Técnica</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        {radarData.length > 0 && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                📊 Radar de Competências
                <Badge variant="secondary" className="ml-auto">{radarData.length} itens</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid strokeDasharray="3 3" />
                  <PolarAngleAxis 
                    dataKey="question" 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 10]} 
                    tick={{ fontSize: 10 }} 
                  />
                  <Radar
                    name="Colaborador"
                    dataKey="colaborador"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Gestor"
                    dataKey="gestor"
                    stroke="#f97316"
                    fill="#f97316"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Bar Chart */}
        {barData.length > 0 && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                📊 Comparativo por Questão
                <Badge variant="secondary" className="ml-auto">{barData.length} itens</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} layout="vertical" barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <YAxis 
                    dataKey="question" 
                    type="category" 
                    width={40} 
                    tick={{ fontSize: 11 }} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar 
                    dataKey="colaborador" 
                    name="Colaborador" 
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                    barSize={12}
                  />
                  <Bar 
                    dataKey="gestor" 
                    name="Gestor" 
                    fill="#f97316"
                    radius={[0, 4, 4, 0]}
                    barSize={12}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
