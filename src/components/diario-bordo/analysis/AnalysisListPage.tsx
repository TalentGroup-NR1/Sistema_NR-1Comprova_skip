import { useMemo } from 'react';
import { useColaboradoresMilestones } from '@/hooks/useFeedbackCycles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, History } from 'lucide-react';
import { AnalysisTable } from './AnalysisTable';

interface AnalysisListPageProps {
  statusFilter?: 'ATIVO' | 'DESLIGADO';
  onViewAnalysis: (colaboradorId: string, cycleId: string) => void;
  onViewEvolution: (colaboradorId: string) => void;
}

export function AnalysisListPage({ statusFilter = 'ATIVO', onViewAnalysis, onViewEvolution }: AnalysisListPageProps) {
  const { data: colaboradores = [], isLoading } = useColaboradoresMilestones(statusFilter);

  // Filter to only show colaboradores with at least one cycle with responses
  const colaboradoresWithResponses = useMemo(() => {
    return colaboradores.filter(c =>
      c.milestones.some(m =>
        m.status === 'CONCLUIDO' ||
        m.status === 'COLAB_RESPONDIDO' ||
        m.status === 'GESTOR_RESPONDIDO'
      )
    );
  }, [colaboradores]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-executive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-navy-900">
            <BarChart3 className="h-5 w-5 text-primary" />
            Análise de Desempenho
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Visualize relatórios individuais e acompanhe a evolução dos colaboradores ao longo dos ciclos de avaliação.
          </p>
        </CardHeader>
      </Card>

      {/* Histórico Header */}
      {statusFilter === 'DESLIGADO' && (
        <Card className="shadow-card mb-6 border-l-4 border-l-muted-foreground">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Histórico de Análises</p>
                <p className="text-sm text-muted-foreground">
                  Visualize análises de colaboradores desligados. Todos os dados históricos são preservados.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collaborators Table */}
      <AnalysisTable
        colaboradores={colaboradoresWithResponses}
        isLoading={isLoading}
        onViewAnalysis={onViewAnalysis}
        onViewEvolution={onViewEvolution}
        showStatusBadge={statusFilter === 'DESLIGADO'}
      />
    </div>
  );
}
