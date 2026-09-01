import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface QuestionAnalysis {
  question_id: string;
  question_text: string;
  question_type: string;
  colaborador_value: number | string | null;
  gestor_value: number | string | null;
  alignment: 'high' | 'medium' | 'low' | 'na';
  difference: number | null;
  is_comparative: boolean;
  respondent_type?: string;
}

interface AnalysisDetailProps {
  questionAnalysis: QuestionAnalysis[];
}

const getAlignmentBadge = (alignment: string) => {
  switch (alignment) {
    case 'high':
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">🟢 Alinhado</Badge>;
    case 'medium':
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">🟡 Divergência Média</Badge>;
    case 'low':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">🔴 Divergência Alta</Badge>;
    default:
      return <Badge variant="secondary">N/A</Badge>;
  }
};

const renderValue = (value: number | string | null, type: string) => {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">Não respondido</span>;
  }

  if (type === 'ESCALA_NUMERICA') {
    const numValue = Number(value);
    return (
      <div className="flex items-center gap-2">
        <Progress value={numValue * 10} className="h-2 w-20" />
        <span className="font-semibold">{numValue}/10</span>
      </div>
    );
  }

  if (type === 'SIM_NAO') {
    const strValue = String(value).toLowerCase();
    const isYes = strValue === 'sim' || strValue === 'yes' || strValue === 'true';
    return (
      <Badge variant={isYes ? 'default' : 'secondary'}>
        {isYes ? 'Sim' : 'Não'}
      </Badge>
    );
  }

  return <span className="text-sm">{String(value)}</span>;
};

export function AnalysisDetail({ questionAnalysis }: AnalysisDetailProps) {
  if (questionAnalysis.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Nenhuma resposta disponível para análise.
        </CardContent>
      </Card>
    );
  }

  // Separate comparative and exclusive questions
  const comparativeQuestions = questionAnalysis.filter(q => q.is_comparative);
  const colaboradorOnlyQuestions = questionAnalysis.filter(
    q => !q.is_comparative && q.colaborador_value !== null
  );
  const gestorOnlyQuestions = questionAnalysis.filter(
    q => !q.is_comparative && q.gestor_value !== null && q.colaborador_value === null
  );

  return (
    <div className="space-y-6">
      {/* Comparative Questions */}
      {comparativeQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              📊 Perguntas Comparativas ({comparativeQuestions.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Perguntas respondidas por ambos - Colaborador e Gestor
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {comparativeQuestions.map((q, index) => (
              <div 
                key={q.question_id} 
                className={cn(
                  'p-4 rounded-lg border',
                  q.alignment === 'high' ? 'bg-green-50/50 border-green-200' :
                  q.alignment === 'medium' ? 'bg-yellow-50/50 border-yellow-200' :
                  q.alignment === 'low' ? 'bg-red-50/50 border-red-200' :
                  'bg-muted/30 border-border'
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-3">
                      <span className="text-muted-foreground">Q{index + 1}:</span> {q.question_text}
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          👤 Resposta Colaborador
                        </p>
                        {renderValue(q.colaborador_value, q.question_type)}
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          👥 Resposta Gestor
                        </p>
                        {renderValue(q.gestor_value, q.question_type)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getAlignmentBadge(q.alignment)}
                    {q.difference !== null && (
                      <span className="text-xs text-muted-foreground">
                        (Δ {q.difference})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Colaborador Only Questions */}
      {colaboradorOnlyQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              👤 Perguntas Exclusivas do Colaborador ({colaboradorOnlyQuestions.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Perguntas respondidas apenas pelo Colaborador
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {colaboradorOnlyQuestions.map((q, index) => (
              <div 
                key={q.question_id} 
                className="p-4 rounded-lg border bg-blue-50/30 border-blue-200"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-sm">
                      <span className="text-muted-foreground">Q{index + 1}:</span> {q.question_text}
                    </p>
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                      Exclusiva Colaborador
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Resposta:</p>
                    {renderValue(q.colaborador_value, q.question_type)}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Gestor Only Questions */}
      {gestorOnlyQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              👥 Perguntas Exclusivas do Gestor ({gestorOnlyQuestions.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Perguntas respondidas apenas pelo Gestor
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {gestorOnlyQuestions.map((q, index) => (
              <div 
                key={q.question_id} 
                className="p-4 rounded-lg border bg-purple-50/30 border-purple-200"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-sm">
                      <span className="text-muted-foreground">Q{index + 1}:</span> {q.question_text}
                    </p>
                    <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                      Exclusiva Gestor
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Resposta:</p>
                    {renderValue(q.gestor_value, q.question_type)}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Fallback if no questions in any category */}
      {comparativeQuestions.length === 0 && 
       colaboradorOnlyQuestions.length === 0 && 
       gestorOnlyQuestions.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Nenhuma resposta disponível para análise.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
