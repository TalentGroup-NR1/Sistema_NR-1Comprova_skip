import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionData {
  question_id: string;
  colaborador_question_text: string | null;
  gestor_question_text: string | null;
  question_type: string;
  colaborador_value: number | string | null;
  gestor_value: number | string | null;
}

interface SideBySideComparisonProps {
  questions: QuestionData[];
  topThreeIds: string[];
  gapAlertIds: string[];
}

function getScoreBgClass(score: number): string {
  if (score >= 8) return 'bg-executive-success';
  if (score >= 6) return 'bg-executive-warning';
  return 'bg-executive-danger';
}

// Get alignment status based on score difference
function getAlignmentStatus(colabValue: number | null, gestorValue: number | null) {
  if (colabValue === null || gestorValue === null) {
    return { icon: null, label: 'N/A', color: 'text-muted-foreground', bgColor: 'bg-muted/30' };
  }
  
  const diff = Math.abs(gestorValue - colabValue);
  
  if (diff <= 0.5) {
    return { 
      icon: Star, 
      label: 'Alto Alinhamento', 
      color: 'text-amber-500', 
      bgColor: 'bg-amber-50' 
    };
  } else if (diff <= 1.5) {
    return { 
      icon: AlertTriangle, 
      label: 'Necessita Conversa', 
      color: 'text-executive-warning', 
      bgColor: 'bg-yellow-50' 
    };
  } else {
    return { 
      icon: AlertCircle, 
      label: 'Gap Crítico', 
      color: 'text-executive-danger', 
      bgColor: 'bg-red-50' 
    };
  }
}

export function SideBySideComparison({ 
  questions, 
  topThreeIds, 
  gapAlertIds 
}: SideBySideComparisonProps) {
  // Filter only numeric questions for main comparison
  const numericQuestions = questions.filter(q => q.question_type === 'ESCALA_NUMERICA');
  const textQuestions = questions.filter(q => q.question_type === 'TEXTO_LIVRE');

  if (numericQuestions.length === 0 && textQuestions.length === 0) {
    return (
      <Card className="shadow-executive">
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhuma pergunta encontrada para comparação.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-executive mb-6 print:shadow-none print:border print:border-border">
      <CardHeader className="pb-3 print:pb-2">
        <CardTitle className="text-lg text-navy-900">Comparação de Avaliações</CardTitle>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-2 print:gap-2 print:mt-1">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-500" /> Diferença ≤ 0.5 (Alto Alinhamento)
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-executive-warning" /> Diferença 1.0-1.5 (Atenção)
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-executive-danger" /> Diferença ≥ 2.0 (Gap Crítico)
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Header Row */}
        <div className="print-comparison-grid grid grid-cols-[1fr_auto_1fr] gap-0 border-b border-border">
          <div className="p-4 bg-navy-50/30 print:p-2">
            <h4 className="font-semibold text-navy-700 text-sm">
              📋 Diário de Bordo - Profissional
            </h4>
          </div>
          <div className="flex items-center justify-center px-3 bg-muted/20 min-w-[80px] print:px-2 print:min-w-[60px]">
            <span className="text-xs font-medium text-muted-foreground">Alinhamento</span>
          </div>
          <div className="p-4 bg-navy-50/30 print:p-2">
            <h4 className="font-semibold text-navy-700 text-sm">
              📋 Diário de Bordo - Gestão Técnica
            </h4>
          </div>
        </div>

        {/* Numeric Questions Grid */}
        {numericQuestions.length > 0 && (
          <div className="divide-y divide-border">
            {numericQuestions.map((q) => {
              const isTopThree = topThreeIds.includes(q.question_id);
              const colabValue = q.colaborador_value !== null ? Number(q.colaborador_value) : null;
              const gestorValue = q.gestor_value !== null ? Number(q.gestor_value) : null;
              const alignment = getAlignmentStatus(colabValue, gestorValue);
              const AlignmentIcon = alignment.icon;

              return (
                <div 
                  key={q.question_id}
                  className={cn(
                    "print-comparison-grid print-no-break question-card grid grid-cols-[1fr_auto_1fr] gap-0",
                    isTopThree && "bg-amber-50/30"
                  )}
                >
                  {/* Colaborador Column - Score on RIGHT edge */}
                  <div className="p-4 bg-white flex items-start gap-3 print:p-2 print:gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-graphite-600 leading-relaxed print:text-xs print:leading-snug">
                        {q.colaborador_question_text || <span className="italic text-muted-foreground">Sem pergunta</span>}
                      </p>
                    </div>
                    {/* Score Badge - Pushed to right edge */}
                    <div className="shrink-0 flex items-center">
                      {colabValue !== null ? (
                        <Badge className={cn(
                          "text-base font-bold px-3 py-1.5 min-w-[60px] justify-center shadow-sm print:text-sm print:px-2 print:py-1 print:min-w-[45px] print:shadow-none",
                          getScoreBgClass(colabValue)
                        )}>
                          {colabValue}/10
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-sm px-3 py-1.5 min-w-[60px] justify-center print:text-xs print:px-2 print:py-1 print:min-w-[45px]">
                          –
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Center Status Column - Icons between scores */}
                  <div className={cn(
                    "flex flex-col items-center justify-center px-3 py-4 min-w-[80px] border-x border-border print:px-2 print:py-2 print:min-w-[50px]",
                    alignment.bgColor
                  )}>
                    {AlignmentIcon && (
                      <AlignmentIcon className={cn("h-6 w-6 print:h-4 print:w-4", alignment.color)} />
                    )}
                    {colabValue !== null && gestorValue !== null && (
                      <span className={cn("text-xs mt-1.5 font-semibold print:text-[10px] print:mt-0.5", alignment.color)}>
                        Δ {Math.abs(gestorValue - colabValue).toFixed(1)}
                      </span>
                    )}
                  </div>

                  {/* Gestor Column - Score on LEFT edge */}
                  <div className="p-4 bg-white flex items-start gap-3 print:p-2 print:gap-2">
                    {/* Score Badge - Pushed to left edge */}
                    <div className="shrink-0 flex items-center">
                      {gestorValue !== null ? (
                        <Badge className={cn(
                          "text-base font-bold px-3 py-1.5 min-w-[60px] justify-center shadow-sm print:text-sm print:px-2 print:py-1 print:min-w-[45px] print:shadow-none",
                          getScoreBgClass(gestorValue)
                        )}>
                          {gestorValue}/10
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-sm px-3 py-1.5 min-w-[60px] justify-center print:text-xs print:px-2 print:py-1 print:min-w-[45px]">
                          –
                        </Badge>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-graphite-600 leading-relaxed print:text-xs print:leading-snug">
                        {q.gestor_question_text || <span className="italic text-muted-foreground">Sem pergunta</span>}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Text Questions Section */}
        {textQuestions.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <h4 className="font-semibold text-navy-700 mb-4">📝 Respostas Descritivas</h4>
            <div className="space-y-4">
              {textQuestions.map(q => (
                <div key={q.question_id} className="bg-muted/30 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-navy-900 mb-2">
                        {q.colaborador_question_text || 'Colaborador'}
                      </p>
                      <p className="text-sm text-graphite-600">
                        {q.colaborador_value || <span className="italic text-muted-foreground">Sem resposta</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-navy-900 mb-2">
                        {q.gestor_question_text || 'Gestor'}
                      </p>
                      <p className="text-sm text-graphite-600">
                        {q.gestor_value || <span className="italic text-muted-foreground">Sem resposta</span>}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
