import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, FileText, LineChart, Download } from 'lucide-react';
import { useFeedbackCycle, useFeedbackResponses } from '@/hooks/useFeedbackCycles';
import { useQuestionnaireTemplate } from '@/hooks/useQuestionnaireTemplates';
import { useAnalysisCalculations } from '@/hooks/useAnalysisCalculations';
import { useEvolutionReport } from '@/hooks/useEvolutionReports';
import { useAuth } from '@/hooks/useAuth';
import { AnalysisHeader } from './AnalysisHeader';
import { SideBySideComparison } from './SideBySideComparison';
import { ConsultingInsights } from './ConsultingInsights';
import { AnalysisCharts } from './AnalysisCharts';

const MILESTONE_LABELS: Record<string, string> = {
  '30_DIAS': '30 Dias',
  '80_DIAS': '80 Dias',
  '120_DIAS': '120 Dias',
  'GERAL': 'Geral',
};

interface AnalysisReportPageProps {
  cycleId: string;
  onBack: () => void;
  onEvolution?: () => void;
  isColaboradorView?: boolean;
}

export function AnalysisReportPage({ cycleId, onBack, onEvolution, isColaboradorView = false }: AnalysisReportPageProps) {
  const [showCharts, setShowCharts] = useState(false);
  const { role } = useAuth();

  const isColaborador = isColaboradorView || role === 'colaborador';

  const { data: cycle, isLoading: loadingCycle } = useFeedbackCycle(cycleId);
  const { data: responses = [], isLoading: loadingResponses } = useFeedbackResponses(cycleId);

  // Load templates
  const { data: collaboratorTemplate } = useQuestionnaireTemplate(
    cycle?.collaborator_questionnaire_template_id || null
  );
  const { data: gestorTemplate } = useQuestionnaireTemplate(
    cycle?.gestor_questionnaire_template_id || null
  );

  // Check if admin has saved a conclusion
  const { data: existingReport, isLoading: loadingReport, fetchStatus: reportFetchStatus } = useEvolutionReport(
    cycle?.colaborador_id || null
  );

  // Transform responses - pair questions by RELATIVE POSITION within each template
  // Colaborador and Gestor have separate templates with different order_index ranges
  // We pair them by their position: 1st colaborador with 1st gestor, etc.
  const analysisResponses = (() => {
    if (!responses || responses.length === 0) return [];

    // Separate responses by respondent type
    const colaboradorResponses = responses.filter(r => r.respondent_type === 'COLABORADOR');
    const gestorResponses = responses.filter(r => r.respondent_type === 'GESTOR');

    // Sort each group by their original order_index to maintain question order
    const sortedColabResponses = [...colaboradorResponses].sort((a, b) => {
      const aIndex = (a as any).question?.order_index ?? 0;
      const bIndex = (b as any).question?.order_index ?? 0;
      return aIndex - bIndex;
    });

    const sortedGestorResponses = [...gestorResponses].sort((a, b) => {
      const aIndex = (a as any).question?.order_index ?? 0;
      const bIndex = (b as any).question?.order_index ?? 0;
      return aIndex - bIndex;
    });

    // Create paired questions by relative position (1st with 1st, 2nd with 2nd, etc.)
    const maxLength = Math.max(sortedColabResponses.length, sortedGestorResponses.length);
    const pairedQuestions = [];

    for (let i = 0; i < maxLength; i++) {
      const colabResp = sortedColabResponses[i] || null;
      const gestorResp = sortedGestorResponses[i] || null;
      const colabQuestion = colabResp ? (colabResp as any).question : null;
      const gestorQuestion = gestorResp ? (gestorResp as any).question : null;

      const questionType = colabQuestion?.question_type || gestorQuestion?.question_type || 'TEXTO_LIVRE';

      pairedQuestions.push({
        question_id: `position_${i}`,
        index: i,
        colaborador_question_text: colabQuestion?.question_text || null,
        gestor_question_text: gestorQuestion?.question_text || null,
        question_text: colabQuestion?.question_text || gestorQuestion?.question_text || 'Pergunta',
        question_type: questionType,
        colaborador_response: colabResp?.answer_value_numeric ?? colabResp?.answer_value_text ?? null,
        gestor_response: gestorResp?.answer_value_numeric ?? gestorResp?.answer_value_text ?? null,
      });
    }

    return pairedQuestions;
  })();

  // Calculate analysis
  const analysisData = useAnalysisCalculations(
    analysisResponses,
    cycle?.colaborador?.full_name || '',
    cycle?.milestone_type ? MILESTONE_LABELS[cycle.milestone_type] : '',
    cycle?.status || ''
  );

  const handleGenerateReport = () => {
    window.print();
  };

  // For colaborador, wait until the report query has actually completed
  // fetchStatus === 'fetching' means query is in-flight; 'idle' + no data + colaborador_id present means it hasn't fired yet
  const isReportReady = !isColaborador || existingReport !== undefined || (reportFetchStatus === 'idle' && !cycle?.colaborador_id);
  const isLoading = loadingCycle || loadingResponses || (isColaborador && !isReportReady);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Card className="shadow-executive">
          <CardContent className="py-8 text-center text-muted-foreground">
            Ciclo não encontrado
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if admin has saved a conclusion (used to conditionally show PDF download)
  const hasAdminConclusion = !!existingReport?.report_text;

  // Transform questionAnalysis for SideBySideComparison (with separate texts)
  const comparisonQuestions = analysisResponses.map(q => ({
    question_id: q.question_id,
    colaborador_question_text: q.colaborador_question_text,
    gestor_question_text: q.gestor_question_text,
    question_type: q.question_type,
    colaborador_value: q.colaborador_response,
    gestor_value: q.gestor_response,
  }));

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 print-root-container">
      {/* Action Bar - Hidden on print */}
      <div className="flex items-center justify-between no-print">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex gap-2">
          {/* Admin-only actions */}
          {!isColaborador && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setShowCharts(!showCharts)}
                className="gap-2"
              >
                <LineChart className="h-4 w-4" />
                {showCharts ? 'Ocultar Gráficos' : 'Ver Gráficos'}
              </Button>
              {onEvolution && (
                <Button variant="outline" onClick={onEvolution} className="gap-2">
                  <LineChart className="h-4 w-4" />
                  Evolução
                </Button>
              )}
              <Button 
                onClick={handleGenerateReport} 
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <FileText className="h-4 w-4" />
                Gerar Relatório Executivo (PDF)
              </Button>
            </>
          )}
          {/* Colaborador download button */}
          {isColaborador && hasAdminConclusion && (
            <Button 
              onClick={handleGenerateReport} 
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Download className="h-4 w-4" />
              Baixar Meu Relatório de Feedback (PDF)
            </Button>
          )}
        </div>
      </div>

      {/* Report Content - Print optimized container */}
      <div className="print-report-container bg-white rounded-lg max-w-5xl mx-auto p-6 shadow-executive">
        {/* Header with Identity Card */}
        <AnalysisHeader
          colaboradorName={cycle.colaborador?.full_name || ''}
          jobTitle={cycle.colaborador?.job_title}
          admissionDate={cycle.colaborador?.admission_date}
          gestorName={cycle.gestor_name || undefined}
          milestone={MILESTONE_LABELS[cycle.milestone_type]}
          status={analysisData.performanceStatus}
          showLogo={false}
        />

        {/* Summary Metrics */}
        <Card className="shadow-sm mb-6 border-0 bg-muted/30 print:shadow-none print:mb-4 print:bg-gray-50 print-no-break">
          <CardContent className="py-4 print:py-2">
            <div className="grid grid-cols-4 gap-4 text-center print:gap-2">
              <div className="p-3 bg-white rounded-lg shadow-sm print:p-2 print:shadow-none print:border print:border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wide print:text-[10px]">Média Colaborador</p>
                <p className="text-2xl font-bold text-primary print:text-xl">
                  {analysisData.colaboradorAverage.toFixed(1)}
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg shadow-sm print:p-2 print:shadow-none print:border print:border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wide print:text-[10px]">Média Gestor</p>
                <p className="text-2xl font-bold text-primary/70 print:text-xl">
                  {analysisData.gestorAverage.toFixed(1)}
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg shadow-sm print:p-2 print:shadow-none print:border print:border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wide print:text-[10px]">Alinhamento</p>
                <p className="text-2xl font-bold text-green-600 print:text-xl">
                  {analysisData.alignmentScore}%
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg shadow-sm print:p-2 print:shadow-none print:border print:border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wide print:text-[10px]">Score Geral</p>
                <p className="text-2xl font-bold text-foreground print:text-xl">
                  {analysisData.overallAverage.toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Side by Side Comparison - visible to all (read-only for colaborador) */}
        <SideBySideComparison
          questions={comparisonQuestions}
          topThreeIds={analysisData.topThreeScoreIds}
          gapAlertIds={analysisData.gapAlertIds}
        />

        {/* Charts (toggleable) - Admin only */}
        {!isColaborador && showCharts && analysisData.radarData.length > 0 && (
          <div className="no-print">
            <AnalysisCharts
              radarData={analysisData.radarData}
              barData={analysisData.barData}
              alignmentScore={analysisData.alignmentScore}
              colaboradorAverage={analysisData.colaboradorAverage}
              gestorAverage={analysisData.gestorAverage}
            />
          </div>
        )}

        {/* Consulting Insights with Editable Recommendations */}
        <ConsultingInsights
          colaboradorId={cycle.colaborador_id}
          summary={analysisData.summary}
          strongPoints={analysisData.strongPointsList}
          attentionAreas={analysisData.attentionAreasList}
          suggestedActions={analysisData.suggestedActions}
          readOnly={isColaborador}
        />
      </div>
    </div>
  );
}
