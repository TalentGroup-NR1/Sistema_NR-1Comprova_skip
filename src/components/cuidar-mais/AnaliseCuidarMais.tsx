import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  Users, 
  Activity, 
  ShieldAlert,
  BarChart3,
  PieChart,
  Lock
} from 'lucide-react';
import { useAnaliseCuidarPlus, useDepartamentosCuidarPlus, FiltrosAnalise } from '@/hooks/useCuidarMaisAnalise';
import { useQuestionariosCuidarPlus } from '@/hooks/useCuidarMaisQuestionarios';
import { DIMENSOES_CUIDAR_MAIS, RECOMENDACOES, LIMIARES, DimensaoCuidarMais } from '@/lib/cuidarMaisDimensoes';
import { useAuth } from '@/hooks/useAuth';
import { DimensoesChart } from './analise/DimensoesChart';
import { DistribuicaoChart } from './analise/DistribuicaoChart';
import { AlertasRecomendacoes } from './analise/AlertasRecomendacoes';

export function AnaliseCuidarMais() {
  const { role } = useAuth();
  const [filtros, setFiltros] = useState<FiltrosAnalise>({});
  
  const { data: questionarios, isLoading: loadingQuestionarios } = useQuestionariosCuidarPlus();
  const { data: departamentos, isLoading: loadingDepartamentos } = useDepartamentosCuidarPlus();
  const { data: analise, isLoading: loadingAnalise } = useAnaliseCuidarPlus(filtros);

  // Verificar permissão
  const temPermissao = role === 'admin_master' || role === 'admin_empresa' || role === 'analista_rh';

  if (!temPermissao) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground max-w-md">
              Esta área é restrita para Administradores e Analistas de RH.
              Entre em contato com seu gestor para solicitar acesso.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleFiltroChange = (key: keyof FiltrosAnalise, value: string | null) => {
    setFiltros(prev => ({
      ...prev,
      [key]: value === '__all__' ? null : value,
    }));
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 4) return 'bg-green-500';
    if (score >= 3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const dimensoesComAlerta = analise?.estatisticas_dimensoes.filter(d => d.alerta) || [];

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Filtros de Análise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Questionário</label>
              <Select
                value={filtros.questionarioId || '__all__'}
                onValueChange={(v) => handleFiltroChange('questionarioId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os questionários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os questionários</SelectItem>
                  {questionarios?.map(q => (
                    <SelectItem key={q.id} value={q.id}>{q.titulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Departamento/Seção</label>
              <Select
                value={filtros.departamento || '__all__'}
                onValueChange={(v) => handleFiltroChange('departamento', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os departamentos</SelectItem>
                  {departamentos?.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select defaultValue="todos">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todo o período</SelectItem>
                  <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                  <SelectItem value="90dias">Últimos 90 dias</SelectItem>
                  <SelectItem value="6meses">Últimos 6 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verificação de amostra */}
      {analise && !analise.amostra_suficiente && filtros.departamento && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">Amostra insuficiente</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            Para preservar a confidencialidade dos colaboradores, os dados detalhados não são exibidos 
            quando há menos de {LIMIARES.AMOSTRA_MINIMA} respondentes no filtro selecionado.
          </AlertDescription>
        </Alert>
      )}

      {loadingAnalise ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : analise && analise.amostra_suficiente ? (
        <>
          {/* Cards de Visão Geral */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Score Geral</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getScoreColor(analise.score_geral)}`}>
                  {analise.score_geral.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  de 5.0 pontos
                </p>
                <Progress 
                  value={(analise.score_geral / 5) * 100} 
                  className="mt-2 h-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Colaboradores em Risco</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${analise.percentual_risco_geral > 35 ? 'text-red-600' : 'text-foreground'}`}>
                  {analise.percentual_risco_geral}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  respostas em níveis 1-2
                </p>
                {analise.percentual_risco_geral > LIMIARES.PERCENTUAL_RISCO && (
                  <Badge variant="destructive" className="mt-2">Atenção necessária</Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Participação</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {analise.taxa_participacao}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analise.total_respondentes} respondentes
                </p>
                <Progress value={analise.taxa_participacao} className="mt-2 h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alertas Ativos</CardTitle>
                <ShieldAlert className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${dimensoesComAlerta.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {dimensoesComAlerta.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  dimensões requerem atenção
                </p>
                {dimensoesComAlerta.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {dimensoesComAlerta.slice(0, 2).map(d => (
                      <Badge key={d.dimensao} variant="outline" className="text-xs">
                        {d.icone} {d.nome.split(' ')[0]}
                      </Badge>
                    ))}
                    {dimensoesComAlerta.length > 2 && (
                      <Badge variant="outline" className="text-xs">+{dimensoesComAlerta.length - 2}</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabs de Análise */}
          <Tabs defaultValue="dimensoes" className="space-y-4">
            <TabsList>
              <TabsTrigger value="dimensoes" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Dimensões
              </TabsTrigger>
              <TabsTrigger value="distribuicao" className="flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Distribuição
              </TabsTrigger>
              <TabsTrigger value="alertas" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Alertas e Ações
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dimensoes">
              <DimensoesChart 
                dimensoes={analise.estatisticas_dimensoes} 
                departamentoFiltrado={filtros.departamento}
              />
            </TabsContent>

            <TabsContent value="distribuicao">
              <DistribuicaoChart 
                dimensoes={analise.estatisticas_dimensoes}
                perguntas={analise.estatisticas_perguntas}
              />
            </TabsContent>

            <TabsContent value="alertas">
              <AlertasRecomendacoes 
                dimensoes={analise.estatisticas_dimensoes}
              />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum dado disponível</p>
              <p className="text-sm mt-1">
                Não há respostas de questionários para os filtros selecionados.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
