import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, Star, AlertTriangle, CheckCircle, User, Users, Activity, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PerformanceStatus } from '@/hooks/useAnalysisCalculations';

interface AnalysisKPICardsProps {
  colaboradorAverage: number;
  gestorAverage: number;
  adaptationAverage: number;
  alignmentScore: number;
  strongPoints: number;
  attentionAreas: number;
  cycleStatus: string;
  performanceStatus: PerformanceStatus;
}

const getAlignmentColor = (score: number) => {
  if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
  if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-red-600 bg-red-50 border-red-200';
};

const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'CONCLUIDO':
      return { label: 'Concluído', color: 'text-green-600 bg-green-50 border-green-200' };
    case 'COLAB_RESPONDIDO':
    case 'GESTOR_RESPONDIDO':
    case 'LINKS_GERADOS':
      return { label: 'Em Andamento', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
    case 'ATRASADO':
      return { label: 'Atrasado', color: 'text-red-600 bg-red-50 border-red-200' };
    default:
      return { label: 'Não Iniciado', color: 'text-muted-foreground bg-muted border-border' };
  }
};

const getPerformanceStatusColor = (status: string) => {
  switch (status) {
    case 'ASCENSAO':
      return 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50';
    case 'ATENCAO':
      return 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50';
    case 'RISCO_MODERADO':
      return 'border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50';
    case 'RISCO_ELEVADO':
      return 'border-red-300 bg-gradient-to-br from-red-50 to-rose-50';
    default:
      return 'border-gray-300 bg-gradient-to-br from-gray-50 to-slate-50';
  }
};

const getAverageColor = (avg: number) => {
  if (avg >= 8) return 'text-green-600';
  if (avg >= 6) return 'text-yellow-600';
  if (avg >= 4) return 'text-orange-600';
  return 'text-red-600';
};

const getProgressColor = (avg: number) => {
  if (avg >= 8) return 'bg-green-500';
  if (avg >= 6) return 'bg-yellow-500';
  if (avg >= 4) return 'bg-orange-500';
  return 'bg-red-500';
};

export function AnalysisKPICards({ 
  colaboradorAverage,
  gestorAverage,
  adaptationAverage,
  alignmentScore, 
  strongPoints, 
  attentionAreas, 
  cycleStatus,
  performanceStatus 
}: AnalysisKPICardsProps) {
  const alignmentColor = getAlignmentColor(alignmentScore);
  const statusDisplay = getStatusDisplay(cycleStatus);

  return (
    <div className="space-y-4">
      {/* Row 1: Performance Status (Featured) */}
      <Card className={cn('border-2 shadow-lg', getPerformanceStatusColor(performanceStatus.status))}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-inner',
                performanceStatus.status === 'ASCENSAO' ? 'bg-green-100' :
                performanceStatus.status === 'ATENCAO' ? 'bg-yellow-100' :
                performanceStatus.status === 'RISCO_MODERADO' ? 'bg-orange-100' :
                performanceStatus.status === 'RISCO_ELEVADO' ? 'bg-red-100' : 'bg-gray-100'
              )}>
                {performanceStatus.emoji}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Status de Desempenho</p>
                <p className={cn('text-2xl font-bold', performanceStatus.color)}>
                  {performanceStatus.label}
                </p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm text-muted-foreground">Ciclo</p>
              <p className={cn('text-lg font-semibold', statusDisplay.color.split(' ')[0])}>
                {statusDisplay.label}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Row 2: Averages Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Média Colaborador */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-full bg-blue-100 shadow-sm">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Média Colaborador</p>
                <p className={cn('text-3xl font-bold', getAverageColor(colaboradorAverage))}>
                  {colaboradorAverage > 0 ? colaboradorAverage.toFixed(1) : '—'}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <Progress 
                value={colaboradorAverage * 10} 
                className="h-2 bg-blue-100"
              />
              <p className="text-xs text-blue-600/70 text-right">Autoavaliação</p>
            </div>
          </CardContent>
        </Card>

        {/* Média Gestor */}
        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-full bg-orange-100 shadow-sm">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-orange-700 uppercase tracking-wide">Média Gestor</p>
                <p className={cn('text-3xl font-bold', getAverageColor(gestorAverage))}>
                  {gestorAverage > 0 ? gestorAverage.toFixed(1) : '—'}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <Progress 
                value={gestorAverage * 10} 
                className="h-2 bg-orange-100"
              />
              <p className="text-xs text-orange-600/70 text-right">Avaliação Técnica</p>
            </div>
          </CardContent>
        </Card>

        {/* Média de Adaptação */}
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-full bg-purple-100 shadow-sm">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Média Adaptação</p>
                <p className={cn('text-3xl font-bold', getAverageColor(adaptationAverage))}>
                  {adaptationAverage > 0 ? adaptationAverage.toFixed(1) : '—'}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <Progress 
                value={adaptationAverage * 10} 
                className="h-2 bg-purple-100"
              />
              <p className="text-xs text-purple-600/70 text-right">Integração e Ambiente</p>
            </div>
          </CardContent>
        </Card>

        {/* Score de Alinhamento */}
        <Card className={cn('border-2 shadow-md hover:shadow-lg transition-shadow', alignmentColor)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={cn('p-2.5 rounded-full shadow-sm', alignmentColor.split(' ')[1])}>
                <Target className={cn('h-5 w-5', alignmentColor.split(' ')[0])} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alinhamento</p>
                <p className={cn('text-3xl font-bold', alignmentColor.split(' ')[0])}>
                  {alignmentScore}%
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <Progress 
                value={alignmentScore} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground text-right">Colaborador x Gestor</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Strong Points & Attention Areas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pontos Fortes */}
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-green-100 shadow-sm">
                  <Star className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Pontos Fortes</p>
                  <p className="text-3xl font-bold text-green-600">{strongPoints}</p>
                </div>
              </div>
              <div className="text-right">
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
            </div>
            <p className="text-xs text-green-600/70 mt-2">Áreas de destaque identificadas</p>
          </CardContent>
        </Card>

        {/* Áreas de Atenção */}
        <Card className={cn(
          'border-2 shadow-md',
          attentionAreas === 0 ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50' :
          attentionAreas <= 2 ? 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50' :
          'border-red-200 bg-gradient-to-br from-red-50 to-rose-50'
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'p-2.5 rounded-full shadow-sm',
                  attentionAreas === 0 ? 'bg-green-100' :
                  attentionAreas <= 2 ? 'bg-yellow-100' :
                  'bg-red-100'
                )}>
                  <AlertTriangle className={cn(
                    'h-5 w-5',
                    attentionAreas === 0 ? 'text-green-600' :
                    attentionAreas <= 2 ? 'text-yellow-600' :
                    'text-red-600'
                  )} />
                </div>
                <div>
                  <p className={cn(
                    'text-xs font-medium uppercase tracking-wide',
                    attentionAreas === 0 ? 'text-green-700' :
                    attentionAreas <= 2 ? 'text-yellow-700' :
                    'text-red-700'
                  )}>Áreas de Atenção</p>
                  <p className={cn(
                    'text-3xl font-bold',
                    attentionAreas === 0 ? 'text-green-600' :
                    attentionAreas <= 2 ? 'text-yellow-600' :
                    'text-red-600'
                  )}>
                    {attentionAreas}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <CheckCircle className={cn(
                  'h-8 w-8',
                  attentionAreas === 0 ? 'text-green-400' :
                  attentionAreas <= 2 ? 'text-yellow-400' :
                  'text-red-400'
                )} />
              </div>
            </div>
            <p className={cn(
              'text-xs mt-2',
              attentionAreas === 0 ? 'text-green-600/70' :
              attentionAreas <= 2 ? 'text-yellow-600/70' :
              'text-red-600/70'
            )}>
              {attentionAreas === 0 ? 'Nenhuma área crítica identificada' : 'Requerem acompanhamento'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
