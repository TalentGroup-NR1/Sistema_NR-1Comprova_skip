import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, TrendingUp, ClipboardList, Sparkles, Target, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PerformanceStatus } from '@/hooks/useAnalysisCalculations';

interface AnalysisConclusionProps {
  performanceStatus: PerformanceStatus;
  summary: string;
  suggestedActions: string[];
  strongPointsList: string[];
  attentionAreasList: string[];
  colaboradorAverage: number;
  gestorAverage: number;
  alignmentScore: number;
}

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'ASCENSAO':
      return 'bg-green-100 text-green-800 border-green-300 shadow-sm';
    case 'ATENCAO':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300 shadow-sm';
    case 'RISCO_MODERADO':
      return 'bg-orange-100 text-orange-800 border-orange-300 shadow-sm';
    case 'RISCO_ELEVADO':
      return 'bg-red-100 text-red-800 border-red-300 shadow-sm';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const getStatusCardClass = (status: string) => {
  switch (status) {
    case 'ASCENSAO':
      return 'border-green-300 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100';
    case 'ATENCAO':
      return 'border-yellow-300 bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100';
    case 'RISCO_MODERADO':
      return 'border-orange-300 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100';
    case 'RISCO_ELEVADO':
      return 'border-red-300 bg-gradient-to-br from-red-50 via-rose-50 to-red-100';
    default:
      return 'border-gray-300 bg-gradient-to-br from-gray-50 to-slate-100';
  }
};

const getPriorityBadge = (priority: string) => {
  if (priority.includes('🚨') || priority.includes('⚠️')) {
    return 'bg-red-100 text-red-700 border-red-200';
  }
  if (priority.includes('📋') || priority.includes('📝') || priority.includes('👥')) {
    return 'bg-orange-100 text-orange-700 border-orange-200';
  }
  if (priority.includes('✅') || priority.includes('🎯') || priority.includes('💼')) {
    return 'bg-green-100 text-green-700 border-green-200';
  }
  return 'bg-blue-100 text-blue-700 border-blue-200';
};

export function AnalysisConclusion({ 
  performanceStatus, 
  summary, 
  suggestedActions,
  strongPointsList,
  attentionAreasList,
  colaboradorAverage,
  gestorAverage,
  alignmentScore
}: AnalysisConclusionProps) {
  // Parse summary to highlight bold text
  const renderSummary = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="text-primary font-semibold">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary Card */}
      <Card className={cn('border-2 shadow-lg', getStatusCardClass(performanceStatus.status))}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Conclusão Executiva
            </CardTitle>
            <Badge 
              className={cn(
                'text-base px-4 py-2 font-semibold',
                getStatusBadgeClass(performanceStatus.status)
              )}
            >
              {performanceStatus.emoji} {performanceStatus.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Key Metrics Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-white/60 rounded-lg border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">Colaborador</p>
              <p className="text-2xl font-bold text-blue-600">{colaboradorAverage > 0 ? colaboradorAverage.toFixed(1) : '—'}</p>
            </div>
            <div className="text-center border-x">
              <p className="text-xs text-muted-foreground uppercase">Gestor</p>
              <p className="text-2xl font-bold text-orange-600">{gestorAverage > 0 ? gestorAverage.toFixed(1) : '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">Alinhamento</p>
              <p className="text-2xl font-bold text-primary">{alignmentScore}%</p>
            </div>
          </div>

          {/* Summary Text */}
          <div className="p-4 bg-white/80 rounded-lg border shadow-inner">
            <p className="text-sm leading-relaxed text-foreground/90">
              {renderSummary(summary)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Strong Points and Attention Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strong Points */}
        <Card className="border-2 border-green-200 shadow-md bg-gradient-to-br from-white to-green-50">
          <CardHeader className="pb-2 bg-green-50/50 border-b border-green-100">
            <CardTitle className="text-base flex items-center gap-2 text-green-700">
              <TrendingUp className="h-5 w-5" />
              Pontos Fortes Destacados
              <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700">
                {strongPointsList.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {strongPointsList.length > 0 ? (
              <ul className="space-y-3">
                {strongPointsList.map((point, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm p-2 rounded-lg hover:bg-green-50 transition-colors">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground/90">{point}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic text-center py-4">
                Nenhum ponto de destaque identificado neste ciclo
              </p>
            )}
          </CardContent>
        </Card>

        {/* Attention Areas */}
        <Card className={cn(
          'border-2 shadow-md',
          attentionAreasList.length === 0 
            ? 'border-green-200 bg-gradient-to-br from-white to-green-50' 
            : 'border-yellow-200 bg-gradient-to-br from-white to-yellow-50'
        )}>
          <CardHeader className={cn(
            'pb-2 border-b',
            attentionAreasList.length === 0 
              ? 'bg-green-50/50 border-green-100' 
              : 'bg-yellow-50/50 border-yellow-100'
          )}>
            <CardTitle className={cn(
              'text-base flex items-center gap-2',
              attentionAreasList.length === 0 ? 'text-green-700' : 'text-yellow-700'
            )}>
              <AlertCircle className="h-5 w-5" />
              Áreas que Requerem Atenção
              <Badge variant="secondary" className={cn(
                'ml-auto',
                attentionAreasList.length === 0 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-yellow-100 text-yellow-700'
              )}>
                {attentionAreasList.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {attentionAreasList.length > 0 ? (
              <ul className="space-y-3">
                {attentionAreasList.map((area, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm p-2 rounded-lg hover:bg-yellow-50 transition-colors">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground/90">{area}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-4">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-green-700 font-medium">
                  Excelente! Nenhuma área crítica identificada
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommended Actions */}
      <Card className="border-2 border-primary/20 shadow-lg bg-gradient-to-br from-white to-primary/5">
        <CardHeader className="pb-3 bg-primary/5 border-b border-primary/10">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Próximos Passos Recomendados
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Ações personalizadas baseadas no status de desempenho
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {suggestedActions.map((action, index) => {
              const isUrgent = action.includes('🚨') || action.includes('⚠️');
              return (
                <div 
                  key={index} 
                  className={cn(
                    'flex items-start gap-4 p-3 rounded-lg border transition-all hover:shadow-md',
                    isUrgent ? 'bg-red-50 border-red-200' : 'bg-white hover:bg-muted/30'
                  )}
                >
                  <div className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                    isUrgent 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-primary/10 text-primary'
                  )}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground/90">{action}</p>
                  </div>
                  {isUrgent && (
                    <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Urgente
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
