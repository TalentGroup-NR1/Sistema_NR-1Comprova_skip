import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EstatisticasDimensao, EstatisticasPergunta } from '@/hooks/useCuidarMaisAnalise';
import { DIMENSOES_CUIDAR_MAIS, DimensaoCuidarMais } from '@/lib/cuidarMaisDimensoes';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';

interface DistribuicaoChartProps {
  dimensoes: EstatisticasDimensao[];
  perguntas: EstatisticasPergunta[];
}

const LIKERT_LABELS: Record<number, string> = {
  1: 'Discordo totalmente',
  2: 'Discordo',
  3: 'Neutro',
  4: 'Concordo',
  5: 'Concordo totalmente',
};

const LIKERT_COLORS: Record<number, string> = {
  1: 'hsl(0, 84%, 60%)',      // red
  2: 'hsl(25, 95%, 53%)',     // orange
  3: 'hsl(48, 96%, 53%)',     // yellow
  4: 'hsl(142, 71%, 45%)',    // green
  5: 'hsl(142, 76%, 36%)',    // dark green
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm">{data.name}</p>
        <p className="text-muted-foreground text-xs mt-1">{data.value}% das respostas</p>
      </div>
    );
  }
  return null;
};

export function DistribuicaoChart({ dimensoes, perguntas }: DistribuicaoChartProps) {
  const [selectedDimensao, setSelectedDimensao] = useState<string>('__all__');

  // Calcular distribuição agregada
  const calcularDistribuicaoAgregada = (perguntasFiltradas: EstatisticasPergunta[]) => {
    if (perguntasFiltradas.length === 0) return [];

    const totais: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRespostas = 0;

    perguntasFiltradas.forEach(p => {
      Object.entries(p.distribuicao).forEach(([key, percent]) => {
        const valor = Number(key);
        const respostasNaCategoria = Math.round((percent / 100) * p.total_respostas);
        totais[valor] += respostasNaCategoria;
        totalRespostas += respostasNaCategoria;
      });
    });

    if (totalRespostas === 0) return [];

    return Object.entries(totais).map(([key, count]) => ({
      name: LIKERT_LABELS[Number(key)],
      value: Math.round((count / totalRespostas) * 100),
      nivel: Number(key),
      fill: LIKERT_COLORS[Number(key)],
    }));
  };

  // Filtrar perguntas pela dimensão selecionada
  const perguntasFiltradas = selectedDimensao === '__all__'
    ? perguntas.filter(p => p.total_respostas > 0)
    : perguntas.filter(p => p.dimensao === selectedDimensao && p.total_respostas > 0);

  const distribuicaoData = calcularDistribuicaoAgregada(perguntasFiltradas);

  // Calcular % em risco (1-2)
  const percentualRisco = distribuicaoData
    .filter(d => d.nivel <= 2)
    .reduce((sum, d) => sum + d.value, 0);

  // Calcular % positivo (4-5)
  const percentualPositivo = distribuicaoData
    .filter(d => d.nivel >= 4)
    .reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-6">
      {/* Filtro de Dimensão */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Distribuição de Respostas Likert</CardTitle>
              <CardDescription>
                Visualize como as respostas estão distribuídas na escala de 1 a 5
              </CardDescription>
            </div>
            <Select value={selectedDimensao} onValueChange={setSelectedDimensao}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecionar dimensão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as dimensões</SelectItem>
                {dimensoes.map(d => (
                  <SelectItem key={d.dimensao} value={d.dimensao}>
                    {d.icone} {d.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {distribuicaoData.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum dado de distribuição disponível para o filtro selecionado.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Gráfico de Barras */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição por Nível</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribuicaoData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={140}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {distribuicaoData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Pizza */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visão Proporcional</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribuicaoData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value }) => `${value}%`}
                      labelLine={false}
                    >
                      {distribuicaoData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value, entry) => (
                        <span className="text-xs">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Resumo */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Resumo da Distribuição</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Em Risco (1-2)</p>
                    <p className="text-2xl font-bold text-red-600">{percentualRisco}%</p>
                  </div>
                  {percentualRisco > 35 && (
                    <Badge variant="destructive">Atenção</Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Neutro (3)</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {distribuicaoData.find(d => d.nivel === 3)?.value || 0}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Positivo (4-5)</p>
                    <p className="text-2xl font-bold text-green-600">{percentualPositivo}%</p>
                  </div>
                  {percentualPositivo >= 60 && (
                    <Badge className="bg-green-600">Bom</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de Perguntas da Dimensão */}
      {selectedDimensao !== '__all__' && perguntasFiltradas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Perguntas da Dimensão: {DIMENSOES_CUIDAR_MAIS[selectedDimensao as DimensaoCuidarMais]?.nome}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {perguntasFiltradas.map((p, index) => (
                <div key={p.pergunta_id} className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{index + 1}. {p.pergunta_texto}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Média: <strong className={
                          p.media >= 4 ? 'text-green-600' : 
                          p.media >= 3 ? 'text-yellow-600' : 
                          'text-red-600'
                        }>{p.media.toFixed(2)}</strong></span>
                        <span>Respostas: {p.total_respostas}</span>
                        <span>Em risco: {p.percentual_risco}%</span>
                      </div>
                    </div>
                    {p.percentual_risco > 35 && (
                      <Badge variant="destructive" className="shrink-0">Alerta</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
