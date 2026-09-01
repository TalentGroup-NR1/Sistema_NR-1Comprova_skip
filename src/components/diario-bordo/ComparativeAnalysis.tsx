import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  Users, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { useFeedbackCycle, useFeedbackResponses } from '@/hooks/useFeedbackCycles';
import { useQuestionnaireTemplate } from '@/hooks/useQuestionnaireTemplates';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ComparativeAnalysisProps {
  cycleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComparativeAnalysis({ cycleId, open, onOpenChange }: ComparativeAnalysisProps) {
  const { data: cycle, isLoading: loadingCycle } = useFeedbackCycle(cycleId);
  const { data: responses, isLoading: loadingResponses } = useFeedbackResponses(cycleId);
  
  // Load both templates
  const { data: collaboratorTemplate, isLoading: loadingColabTemplate } = useQuestionnaireTemplate(
    cycle?.collaborator_questionnaire_template_id || null
  );
  const { data: gestorTemplate, isLoading: loadingGestorTemplate } = useQuestionnaireTemplate(
    cycle?.gestor_questionnaire_template_id || null
  );

  const analysisData = useMemo(() => {
    if (!responses) return [];

    // Merge questions from both templates
    const allQuestions: any[] = [];
    
    if (collaboratorTemplate?.questions) {
      collaboratorTemplate.questions.forEach(q => {
        if (!allQuestions.find(aq => aq.id === q.id)) {
          allQuestions.push(q);
        }
      });
    }
    
    if (gestorTemplate?.questions) {
      gestorTemplate.questions.forEach(q => {
        if (!allQuestions.find(aq => aq.id === q.id)) {
          allQuestions.push(q);
        }
      });
    }

    // Filter questions answered by both respondents (AMBOS type)
    return allQuestions
      .filter(q => q.respondent_type === 'AMBOS')
      .map(question => {
        const colabResponse = responses.find(
          r => r.question_id === question.id && r.respondent_type === 'COLABORADOR'
        );
        const gestorResponse = responses.find(
          r => r.question_id === question.id && r.respondent_type === 'GESTOR'
        );

        let divergence: 'none' | 'low' | 'medium' | 'high' = 'none';
        if (question.question_type === 'ESCALA_NUMERICA' && colabResponse?.answer_value_numeric && gestorResponse?.answer_value_numeric) {
          const diff = Math.abs(colabResponse.answer_value_numeric - gestorResponse.answer_value_numeric);
          if (diff <= 2) divergence = 'low';
          else if (diff <= 4) divergence = 'medium';
          else divergence = 'high';
        }

        return {
          question,
          colabResponse,
          gestorResponse,
          divergence,
        };
      });
  }, [collaboratorTemplate, gestorTemplate, responses]);

  const colaboradorOnlyQuestions = useMemo(() => {
    if (!collaboratorTemplate?.questions || !responses) return [];
    return collaboratorTemplate.questions
      .filter(q => q.respondent_type === 'COLABORADOR')
      .map(q => ({
        question: q,
        response: responses.find(r => r.question_id === q.id && r.respondent_type === 'COLABORADOR'),
      }));
  }, [collaboratorTemplate, responses]);

  const gestorOnlyQuestions = useMemo(() => {
    if (!gestorTemplate?.questions || !responses) return [];
    return gestorTemplate.questions
      .filter(q => q.respondent_type === 'GESTOR')
      .map(q => ({
        question: q,
        response: responses.find(r => r.question_id === q.id && r.respondent_type === 'GESTOR'),
      }));
  }, [gestorTemplate, responses]);

  const getMilestoneLabel = (type: string) => {
    switch (type) {
      case '30_DIAS': return '30 Dias';
      case '80_DIAS': return '80 Dias';
      case '120_DIAS': return '120 Dias';
      default: return type;
    }
  };

  const getDivergenceColor = (divergence: string) => {
    switch (divergence) {
      case 'low': return 'bg-success/10 border-success/30';
      case 'medium': return 'bg-warning/10 border-warning/30';
      case 'high': return 'bg-destructive/10 border-destructive/30';
      default: return 'bg-muted';
    }
  };

  const getDivergenceIcon = (divergence: string) => {
    switch (divergence) {
      case 'low': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'high': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  const renderAnswer = (type: string, numericValue?: number | null, textValue?: string | null) => {
    if (type === 'ESCALA_NUMERICA' && numericValue !== null && numericValue !== undefined) {
      return (
        <div className="flex items-center gap-2">
          <Progress value={numericValue * 10} className="h-2 flex-1" />
          <span className="font-bold text-lg">{numericValue}/10</span>
        </div>
      );
    }
    if (type === 'SIM_NAO') {
      const isYes = textValue?.toLowerCase() === 'sim';
      return (
        <Badge variant={isYes ? 'default' : 'destructive'} className={isYes ? 'bg-success' : ''}>
          {textValue || '-'}
        </Badge>
      );
    }
    return <p className="text-sm">{textValue || '-'}</p>;
  };

  const isLoading = loadingCycle || loadingResponses || loadingColabTemplate || loadingGestorTemplate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Análise Comparativa de Feedback</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !cycle ? (
          <p className="text-muted-foreground text-center py-8">Ciclo não encontrado</p>
        ) : (
          <div className="space-y-6">
            {/* Cycle Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Colaborador:</span>
                    <span className="ml-2 font-medium">{cycle.colaborador?.full_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Marco:</span>
                    <Badge variant="outline" className="ml-2">{getMilestoneLabel(cycle.milestone_type)}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data Limite:</span>
                    <span className="ml-2">{format(parseISO(cycle.due_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comparative Questions */}
            {analysisData.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Perguntas Comparativas
                </h3>
                {analysisData.map(({ question, colabResponse, gestorResponse, divergence }) => (
                  <Card key={question.id} className={`border ${getDivergenceColor(divergence)}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <p className="font-medium flex-1">{question.question_text}</p>
                        {divergence !== 'none' && (
                          <div className="flex items-center gap-1 ml-2">
                            {getDivergenceIcon(divergence)}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <User className="h-3 w-3" /> Colaborador
                          </p>
                          {colabResponse ? (
                            renderAnswer(question.question_type, colabResponse.answer_value_numeric, colabResponse.answer_value_text)
                          ) : (
                            <p className="text-sm text-muted-foreground italic">Não respondido</p>
                          )}
                        </div>
                        <div className="p-3 rounded-lg bg-info/5 border border-info/20">
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <Users className="h-3 w-3" /> Gestor
                          </p>
                          {gestorResponse ? (
                            renderAnswer(question.question_type, gestorResponse.answer_value_numeric, gestorResponse.answer_value_text)
                          ) : (
                            <p className="text-sm text-muted-foreground italic">Não respondido</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Colaborador Only Questions */}
            {colaboradorOnlyQuestions.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Respostas do Colaborador
                </h3>
                {colaboradorOnlyQuestions.map(({ question, response }) => (
                  <Card key={question.id}>
                    <CardContent className="p-4">
                      <p className="font-medium mb-2">{question.question_text}</p>
                      {response ? (
                        renderAnswer(question.question_type, response.answer_value_numeric, response.answer_value_text)
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Não respondido</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Gestor Only Questions */}
            {gestorOnlyQuestions.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Respostas do Gestor
                </h3>
                {gestorOnlyQuestions.map(({ question, response }) => (
                  <Card key={question.id}>
                    <CardContent className="p-4">
                      <p className="font-medium mb-2">{question.question_text}</p>
                      {response ? (
                        renderAnswer(question.question_type, response.answer_value_numeric, response.answer_value_text)
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Não respondido</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* No responses */}
            {responses?.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium mb-2">Aguardando Respostas</h3>
                  <p className="text-sm text-muted-foreground">
                    Os formulários ainda não foram preenchidos.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
