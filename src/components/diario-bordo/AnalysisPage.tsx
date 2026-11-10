import { useState } from 'react';
import { AnalysisListPage } from './analysis/AnalysisListPage';
import { AnalysisReportPage } from './analysis/AnalysisReportPage';
import { AnalysisEvolutionPage } from './analysis/AnalysisEvolutionPage';

type ViewType = 'list' | 'report' | 'evolution';

interface AnalysisPageProps {
  statusFilter?: 'ATIVO' | 'DESLIGADO';
}

export function AnalysisPage({ statusFilter = 'ATIVO' }: AnalysisPageProps) {
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string | null>(null);

  const handleViewAnalysis = (colaboradorId: string, cycleId: string) => {
    setSelectedColaboradorId(colaboradorId);
    setSelectedCycleId(cycleId);
    setCurrentView('report');
  };

  const handleViewEvolution = (colaboradorId: string) => {
    setSelectedColaboradorId(colaboradorId);
    setCurrentView('evolution');
  };

  const handleBack = () => {
    setCurrentView('list');
    setSelectedCycleId(null);
    setSelectedColaboradorId(null);
  };

  if (currentView === 'report' && selectedCycleId) {
    return <AnalysisReportPage cycleId={selectedCycleId} onBack={handleBack} />;
  }

  if (currentView === 'evolution' && selectedColaboradorId) {
    return <AnalysisEvolutionPage colaboradorId={selectedColaboradorId} onBack={handleBack} />;
  }

  return (
    <AnalysisListPage
      statusFilter={statusFilter}
      onViewAnalysis={handleViewAnalysis}
      onViewEvolution={handleViewEvolution}
    />
  );
}
