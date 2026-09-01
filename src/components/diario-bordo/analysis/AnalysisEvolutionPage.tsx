import { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, FileText, Loader2, Save } from 'lucide-react';
import { useColaboradores } from '@/hooks/useColaboradores';
import { useFeedbackCycles, useFeedbackResponses } from '@/hooks/useFeedbackCycles';
import { useQuestionnaireTemplate } from '@/hooks/useQuestionnaireTemplates';
import { useEvolutionReport, useSaveEvolutionReport } from '@/hooks/useEvolutionReports';
import { AnalysisHeader } from './AnalysisHeader';
import { EvolutionChart } from './EvolutionChart';
import { EvolutionMatrix } from './EvolutionMatrix';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { formatDateToISO, parseISODate } from '@/lib/validators/colaborador';

const MILESTONE_LABELS: Record<string, string> = {
  '30_DIAS': '30 Dias',
  '80_DIAS': '80 Dias',
  '120_DIAS': '120 Dias',
};

interface AnalysisEvolutionPageProps {
  colaboradorId: string;
  onBack: () => void;
}

export function AnalysisEvolutionPage({ colaboradorId, onBack }: AnalysisEvolutionPageProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [parecerText, setParecerText] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch data
  const { data: colaboradores = [] } = useColaboradores();
  const { data: allCycles = [], isLoading: loadingCycles } = useFeedbackCycles();
  const { data: evolutionReport, isLoading: loadingReport } = useEvolutionReport(colaboradorId);
  const saveReport = useSaveEvolutionReport();

  // Get colaborador info
  const colaborador = colaboradores.find(c => c.id === colaboradorId);

  // Get completed cycles for this colaborador
  const completedCycles = useMemo(() => {
    return allCycles
      .filter(c => c.colaborador_id === colaboradorId && c.status === 'CONCLUIDO')
      .sort((a, b) => {
        const order = { '30_DIAS': 1, '80_DIAS': 2, '120_DIAS': 3, 'GERAL': 4 };
        return (order[a.milestone_type] || 0) - (order[b.milestone_type] || 0);
      });
  }, [allCycles, colaboradorId]);

  // Load responses for each cycle
  const cycle30 = completedCycles.find(c => c.milestone_type === '30_DIAS');
  const cycle80 = completedCycles.find(c => c.milestone_type === '80_DIAS');
  const cycle120 = completedCycles.find(c => c.milestone_type === '120_DIAS');

  const { data: responses30 = [] } = useFeedbackResponses(cycle30?.id || null);
  const { data: responses80 = [] } = useFeedbackResponses(cycle80?.id || null);
  const { data: responses120 = [] } = useFeedbackResponses(cycle120?.id || null);

  // Calculate averages for each cycle
  const calculateAverages = (responses: any[]) => {
    const numericResponses = responses.filter(r => r.answer_value_numeric !== null);
    if (numericResponses.length === 0) return { colab: null, gestor: null, overall: null };

    const colabResponses = numericResponses.filter(r => r.respondent_type === 'COLABORADOR');
    const gestorResponses = numericResponses.filter(r => r.respondent_type === 'GESTOR');

    const colabAvg = colabResponses.length > 0
      ? colabResponses.reduce((sum, r) => sum + r.answer_value_numeric, 0) / colabResponses.length
      : null;

    const gestorAvg = gestorResponses.length > 0
      ? gestorResponses.reduce((sum, r) => sum + r.answer_value_numeric, 0) / gestorResponses.length
      : null;

    const overallAvg = numericResponses.length > 0
      ? numericResponses.reduce((sum, r) => sum + r.answer_value_numeric, 0) / numericResponses.length
      : null;

    return { colab: colabAvg, gestor: gestorAvg, overall: overallAvg };
  };

  const avg30 = calculateAverages(responses30);
  const avg80 = calculateAverages(responses80);
  const avg120 = calculateAverages(responses120);

  // Chart data
  const chartData = [
    { milestone: '30_DIAS', milestoneLabel: '30 Dias', colaboradorAvg: avg30.colab, gestorAvg: avg30.gestor, overallAvg: avg30.overall },
    { milestone: '80_DIAS', milestoneLabel: '80 Dias', colaboradorAvg: avg80.colab, gestorAvg: avg80.gestor, overallAvg: avg80.overall },
    { milestone: '120_DIAS', milestoneLabel: '120 Dias', colaboradorAvg: avg120.colab, gestorAvg: avg120.gestor, overallAvg: avg120.overall },
  ];

  // Matrix data
  const matrixData = useMemo(() => {
    const calculateDelta = (initial: number | null, final: number | null) => {
      if (initial === null || final === null || initial === 0) return null;
      return ((final - initial) / initial) * 100;
    };

    // Get first and last non-null values for delta calculation
    const getFirstLast = (v30: number | null, v80: number | null, v120: number | null) => {
      const values = [v30, v80, v120].filter(v => v !== null);
      if (values.length < 2) return { first: null, last: null };
      return { first: values[0], last: values[values.length - 1] };
    };

    const colabRange = getFirstLast(avg30.colab, avg80.colab, avg120.colab);
    const gestorRange = getFirstLast(avg30.gestor, avg80.gestor, avg120.gestor);
    const overallRange = getFirstLast(avg30.overall, avg80.overall, avg120.overall);

    return [
      {
        category: 'Média Colaborador',
        value30: avg30.colab,
        value80: avg80.colab,
        value120: avg120.colab,
        delta: calculateDelta(colabRange.first, colabRange.last),
      },
      {
        category: 'Média Gestor',
        value30: avg30.gestor,
        value80: avg80.gestor,
        value120: avg120.gestor,
        delta: calculateDelta(gestorRange.first, gestorRange.last),
      },
      {
        category: 'Média Geral',
        value30: avg30.overall,
        value80: avg80.overall,
        value120: avg120.overall,
        delta: calculateDelta(overallRange.first, overallRange.last),
      },
    ];
  }, [avg30, avg80, avg120]);

  // Initialize parecer from saved report
  useState(() => {
    if (evolutionReport?.report_text) {
      setParecerText(evolutionReport.report_text);
    }
  });

  // Update parecer when report loads
  useMemo(() => {
    if (evolutionReport?.report_text && !parecerText) {
      setParecerText(evolutionReport.report_text);
    }
  }, [evolutionReport]);

  const handleSaveParecer = () => {
    saveReport.mutate({
      colaborador_id: colaboradorId,
      report_text: parecerText,
      period_start: colaborador?.admission_date,
      period_end: formatDateToISO(new Date()),
    });
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 900,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const margins = { left: 10, right: 10, top: 10, bottom: 15 };
      const contentWidth = pdfWidth - margins.left - margins.right;
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = contentWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;

      let remainingHeight = scaledHeight;
      let currentPage = 1;
      let sourceY = 0;
      const availableHeight = pdfHeight - margins.top - margins.bottom;

      while (remainingHeight > 0) {
        const heightToDraw = Math.min(remainingHeight, availableHeight);
        const sourceHeight = heightToDraw / ratio;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = sourceHeight;
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
          tempCtx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
          const pageImgData = tempCanvas.toDataURL('image/png');
          pdf.addImage(pageImgData, 'PNG', margins.left, margins.top, contentWidth, heightToDraw);
        }

        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text('TG Mais - Documento Confidencial', margins.left, pdfHeight - 5);
        pdf.text(`Página ${currentPage}`, pdfWidth - margins.right, pdfHeight - 5, { align: 'right' });

        remainingHeight -= heightToDraw;
        sourceY += sourceHeight;

        if (remainingHeight > 0) {
          pdf.addPage();
          currentPage++;
        }
      }

      pdf.save(`Evolucao_${colaborador?.full_name?.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = loadingCycles || loadingReport;

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

  if (!colaborador) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Card className="shadow-executive">
          <CardContent className="py-8 text-center text-muted-foreground">
            Colaborador não encontrado
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate period
  const periodStart = colaborador.admission_date
    ? format(parseISODate(colaborador.admission_date), 'dd/MM/yyyy', { locale: ptBR })
    : '-';
  const periodEnd = format(new Date(), 'dd/MM/yyyy', { locale: ptBR });

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between no-print">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={handleExportPDF} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileText className="h-4 w-4 mr-2" />
          )}
          Exportar PDF
        </Button>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="bg-white rounded-lg max-w-4xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="executive-header rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-lg p-2 shadow-sm">
                <span className="font-bold text-navy-900 text-lg">TG MAIS</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">
                  Análise Evolutiva - {colaborador.full_name}
                </h1>
                <p className="text-white/80 text-sm mt-1">
                  Período: {periodStart} a {periodEnd}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-white/60">Cargo</span>
              <p className="text-white font-medium">{colaborador.job_title}</p>
            </div>
            <div>
              <span className="text-white/60">Departamento</span>
              <p className="text-white font-medium">{colaborador.department}</p>
            </div>
            <div>
              <span className="text-white/60">Ciclos Concluídos</span>
              <p className="text-white font-medium">{completedCycles.length}</p>
            </div>
          </div>
        </div>

        {/* Evolution Chart */}
        <EvolutionChart data={chartData} />

        {/* Evolution Matrix */}
        <EvolutionMatrix data={matrixData} />

        {/* Parecer Evolutivo */}
        <Card className="shadow-executive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-navy-900">
              📝 Parecer Evolutivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Digite aqui o parecer evolutivo sobre a curva de aprendizado do profissional..."
              value={parecerText}
              onChange={(e) => setParecerText(e.target.value)}
              className="min-h-[120px] resize-none"
            />
            <div className="flex justify-end no-print">
              <Button
                onClick={handleSaveParecer}
                disabled={saveReport.isPending}
              >
                {saveReport.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Parecer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
