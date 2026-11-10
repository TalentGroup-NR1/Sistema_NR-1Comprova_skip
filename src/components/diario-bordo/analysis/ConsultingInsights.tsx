import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Save, Loader2, Lightbulb, AlertTriangle } from 'lucide-react';
import { useSaveEvolutionReport, useEvolutionReport } from '@/hooks/useEvolutionReports';
import { toast } from 'sonner';

interface ConsultingInsightsProps {
  colaboradorId: string;
  summary: string;
  strongPoints: string[];
  attentionAreas: string[];
  suggestedActions: string[];
  onSummaryChange?: (value: string) => void;
  readOnly?: boolean;
}

export function ConsultingInsights({
  colaboradorId,
  summary,
  strongPoints,
  attentionAreas,
  suggestedActions,
  onSummaryChange,
  readOnly = false,
}: ConsultingInsightsProps) {
  // Clean summary - remove any duplicated "RECOMENDAÇÕES" section from the text
  const cleanSummary = (text: string): string => {
    if (!text) return '';
    // Remove duplicated "RECOMENDAÇÕES:" sections - keep only the insights part
    const parts = text.split(/RECOMENDAÇÕES?:?\s*/i);
    return parts[0].trim();
  };

  const [editableInsights, setEditableInsights] = useState(() => cleanSummary(summary));
  const [hasChanges, setHasChanges] = useState(false);
  
  const { data: existingReport, isLoading: loadingReport } = useEvolutionReport(colaboradorId);
  const { mutate: saveReport, isPending: isSaving } = useSaveEvolutionReport();

  // Load existing insights from saved report
  useEffect(() => {
    if (existingReport?.report_text) {
      setEditableInsights(existingReport.report_text);
    }
  }, [existingReport]);

  // Sync editableInsights when summary prop changes (initial load)
  useEffect(() => {
    if (summary && !editableInsights) {
      setEditableInsights(cleanSummary(summary));
    }
  }, [summary]);

  const handleInsightsChange = (value: string) => {
    setEditableInsights(value);
    setHasChanges(true);
    onSummaryChange?.(value);
  };

  const handleSave = () => {
    saveReport(
      {
        colaborador_id: colaboradorId,
        report_text: editableInsights,
      },
      {
        onSuccess: () => {
          setHasChanges(false);
        },
      }
    );
  };

  return (
    <Card className="shadow-executive mt-6 print:shadow-none print:border print:border-border print:mt-0 print:h-auto print:max-h-none print:overflow-visible consulting-conclusions-card print-conclusions-section print:!p-2">
      <CardHeader className="pb-3 print:pb-1 print:!p-2">
        <CardTitle className="text-lg text-navy-900 flex items-center gap-2 print:text-base">
          📋 Conclusões da Consultoria / RH
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 print:space-y-2 print:h-auto print:max-h-none print:overflow-visible print-text-expand-container print:!p-2">
        {/* Editable Insights - Shows as static text in print */}
        <div className="bg-muted/30 rounded-lg p-4 print:p-0 print:bg-gray-50 consulting-insights-section print-insights-section print:h-auto print:max-h-none print:overflow-visible print:static print-text-expand-container">
          <div className="flex items-center justify-between mb-2 print:mb-1">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-5 w-5 text-executive-warning shrink-0 mt-0.5 print:h-4 print:w-4" />
              <h4 className="font-medium text-navy-700">Insights & Sugestões</h4>
            </div>
          {!readOnly && hasChanges && (
              <span className="text-xs text-executive-warning no-print">Alterações não salvas</span>
            )}
          </div>
          {/* Screen view */}
          {readOnly ? (
            <div className="text-sm text-foreground whitespace-pre-wrap bg-muted/20 rounded-md p-3 mb-3 print:mb-0 print:p-1">
              {editableInsights || 'Nenhum insight registrado.'}
            </div>
          ) : (
            <div className="no-print">
              <Textarea
                value={editableInsights}
                onChange={(e) => handleInsightsChange(e.target.value)}
                placeholder="Digite aqui os insights e sugestões da análise..."
                className="min-h-[120px] text-sm resize-none bg-white mb-3"
                disabled={loadingReport}
              />
            </div>
          )}
          {/* Print ONLY: Static text for INSIGHTS - UNIQUE DATA SOURCE */}
          <div 
            id="print-insights-text"
            className="hidden print:!block print-mirror-text-insights"
            aria-label="Insights e Sugestões"
          >
            {editableInsights || 'Nenhum insight registrado.'}
          </div>
          
          {!readOnly && (
            <div className="flex items-center justify-between no-print">
              <div className="text-xs text-muted-foreground">
                {existingReport?.updated_at && (
                  <span>
                    Última atualização: {new Date(existingReport.updated_at).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
              <Button 
                onClick={handleSave} 
                disabled={isSaving || !hasChanges}
                size="sm"
                className="gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar Insights
              </Button>
            </div>
          )}
        </div>

        {/* Attention Areas */}
        <div className="bg-executive-warning/5 border border-executive-warning/20 rounded-lg p-4 print:p-1.5 print:bg-yellow-50 print-no-break">
          <div className="flex items-start gap-2 mb-3 print:mb-0.5">
            <AlertTriangle className="h-5 w-5 text-executive-warning shrink-0 mt-0.5 print:h-3 print:w-3" />
            <h4 className="font-medium text-navy-700 print:text-sm">Pontos de Atenção</h4>
          </div>
          <ul className="text-sm text-graphite-600 space-y-1.5 pl-7 print:space-y-0 print:pl-4 print:text-xs print:leading-tight">
            {attentionAreas.length > 0 ? (
              attentionAreas.slice(0, 5).map((area, idx) => (
                <li key={idx} className="flex items-start gap-2 print:gap-0.5">
                  <span className="text-executive-warning">•</span>
                  <span>{area}</span>
                </li>
              ))
            ) : (
              <li className="text-muted-foreground italic">Nenhum ponto de atenção identificado</li>
            )}
          </ul>
        </div>

        {/* Strong Points */}
        <div className="bg-executive-success/5 border border-executive-success/20 rounded-lg p-4 print:p-1.5 print:bg-green-50 print-no-break">
          <div className="flex items-start gap-2 mb-3 print:mb-0.5">
            <span className="text-executive-success text-lg print:text-sm">✓</span>
            <h4 className="font-medium text-navy-700 print:text-sm">Pontos Fortes</h4>
          </div>
          <ul className="text-sm text-graphite-600 space-y-1.5 pl-7 print:space-y-0 print:pl-4 print:text-xs print:leading-tight">
            {strongPoints.length > 0 ? (
              strongPoints.slice(0, 5).map((point, idx) => (
                <li key={idx} className="flex items-start gap-2 print:gap-0.5">
                  <span className="text-executive-success">•</span>
                  <span>{point}</span>
                </li>
              ))
            ) : (
              <li className="text-muted-foreground italic">Nenhum ponto forte identificado</li>
            )}
          </ul>
        </div>

        {/* Suggested Actions */}
        <div className="border-t border-border pt-4 print:pt-1.5 print-no-break">
          <h4 className="font-medium text-navy-700 mb-3 print:mb-1 print:text-sm">🎯 Ações Sugeridas</h4>
          <ul className="text-sm text-graphite-600 space-y-2 print:space-y-0.5 print:text-xs print:leading-tight">
            {suggestedActions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2 print:gap-0.5">
                <span className="text-primary shrink-0">→</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Print-only signature section */}
        <div className="hidden print:block border-t border-border pt-4 mt-6">
          <div className="flex justify-between items-end gap-8">
            <div className="flex-1 text-center border-t border-graphite-400 pt-2">
              <p className="text-xs text-graphite-600">Assinatura do Colaborador</p>
            </div>
            <div className="flex-1 text-center border-t border-graphite-400 pt-2">
              <p className="text-xs text-graphite-600">Assinatura do Gestor</p>
            </div>
            <div className="flex-1 text-center border-t border-graphite-400 pt-2">
              <p className="text-xs text-graphite-600">Assinatura RH / Consultoria</p>
            </div>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-4">
            TG Mais - Documento Confidencial
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
