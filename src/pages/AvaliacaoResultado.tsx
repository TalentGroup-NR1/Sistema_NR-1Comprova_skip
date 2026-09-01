import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MainLayout } from "@/components/layout/MainLayout";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  useAvaliacaoResultado, 
  calculateMedias,
} from "@/hooks/useAvaliacaoResultados";
import { usePDIByAvaliacao, useCreatePDI, generateSuggestedItems } from "@/hooks/usePDI";
import {
  AvaliacaoReportHeader,
  AvaliacaoKPICards,
  AvaliacaoRadarChart,
  AvaliacaoCompetenciasTable,
  AvaliacaoObjetivosTable,
  AvaliacaoComentarios,
} from "@/components/avaliacoes/resultado";

export default function AvaliacaoResultado() {
  const { avaliacaoId } = useParams<{ avaliacaoId: string }>();
  const navigate = useNavigate();
  const { data: resultado, isLoading, error } = useAvaliacaoResultado(avaliacaoId);
  const { data: existingPDI, isLoading: isLoadingPDI } = usePDIByAvaliacao(avaliacaoId);
  const createPDI = useCreatePDI();

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto max-w-6xl space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (error || !resultado) {
    return (
      <MainLayout>
        <div className="container mx-auto max-w-6xl">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h2 className="text-lg font-semibold mb-2">Avaliação não encontrada</h2>
              <p className="text-muted-foreground mb-4">
                Não foi possível carregar os dados desta avaliação.
              </p>
              <Button onClick={() => navigate(-1)} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const medias = calculateMedias(resultado);
  const canCreatePDI = resultado.status_autoavaliacao === 'concluida' && resultado.status_avaliacao_gestor === 'concluida';
  
  const handleCreatePDI = async () => {
    if (!resultado || !avaliacaoId) return;
    
    const competenciasParaSugestao = resultado.competencias.map(c => ({
      id: c.id,
      nome_competencia: c.nome_competencia,
      discrepancia: c.discrepancia,
      peso_colab: c.resposta_colaborador?.peso,
      peso_gestor: c.resposta_gestor?.peso,
    }));
    
    const objetivosParaSugestao = resultado.objetivos.map(o => ({
      id: o.id,
      nome_objetivo: o.nome_objetivo,
      discrepancia: o.discrepancia,
      peso_colab: o.resposta_colaborador?.peso,
      peso_gestor: o.resposta_gestor?.peso,
    }));
    
    const itensSugeridos = generateSuggestedItems(competenciasParaSugestao, objetivosParaSugestao);
    
    const pdi = await createPDI.mutateAsync({
      avaliacao_id: avaliacaoId,
      ciclo_id: resultado.ciclo_id,
      colaborador_id: resultado.colaborador_id,
      gestor_id: resultado.gestor_id,
      itens_sugeridos: itensSugeridos,
    });
    
    navigate(`/pdi/${pdi.id}`);
  };

  return (
    <MainLayout>
      <div className="container mx-auto max-w-6xl">
        {/* Action Bar - Hidden on print */}
        <div className="flex items-center justify-between mb-6 print:hidden no-print">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Gerar Relatório PDF
          </Button>
        </div>

        {/* Report Container - Isolated for print */}
        <div id="avaliacao-report-print" className="avaliacao-report-print-container space-y-6">
          {/* Print Header */}
          <div className="hidden print:block text-center mb-4 print-report-title">
            <h1 className="text-xl font-bold text-gray-800">Relatório de Avaliação de Desempenho</h1>
            <p className="text-sm text-gray-500">
              Gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* Header */}
          <AvaliacaoReportHeader
            colaboradorNome={resultado.colaborador_nome}
            colaboradorCargo={resultado.colaborador_cargo}
            colaboradorDepartamento={resultado.colaborador_departamento}
            gestorNome={resultado.gestor_nome}
            cicloNome={resultado.ciclo_nome}
            cicloStatus={resultado.ciclo_status}
            statusAutoavaliacao={resultado.status_autoavaliacao}
            statusAvaliacaoGestor={resultado.status_avaliacao_gestor}
            prazoAutoavaliacao={resultado.prazo_autoavaliacao}
            prazoAvaliacaoGestor={resultado.prazo_avaliacao_gestor}
          />

          {/* KPI Cards */}
          {medias.hasNumericMetrics && (
            <AvaliacaoKPICards medias={medias} />
          )}

          {/* Radar Chart */}
          {resultado.competencias.length > 0 && (
            <AvaliacaoRadarChart 
              competencias={resultado.competencias}
              maxScale={5}
            />
          )}

          {/* Competências Table */}
          <AvaliacaoCompetenciasTable 
            competencias={resultado.competencias}
            maxScale={5}
          />

          {/* Objetivos Table */}
          <AvaliacaoObjetivosTable 
            objetivos={resultado.objetivos}
            maxScale={5}
          />

          {/* Comentários e PDI */}
          <AvaliacaoComentarios
            competencias={resultado.competencias}
            objetivos={resultado.objetivos}
            existingPDI={existingPDI}
            canCreatePDI={canCreatePDI}
            onCreatePDI={handleCreatePDI}
            isCreatingPDI={createPDI.isPending}
          />

          {/* Print Footer with Signature */}
          <div className="hidden print:block mt-8 pt-6 border-t-2 border-gray-300 print-signature-section">
            <div className="grid grid-cols-2 gap-12 mb-8">
              <div className="text-center">
                <div className="border-b border-gray-400 pb-1 mb-2 mx-8"></div>
                <p className="text-sm font-medium text-gray-700">Colaborador</p>
                <p className="text-xs text-gray-500">{resultado.colaborador_nome}</p>
              </div>
              <div className="text-center">
                <div className="border-b border-gray-400 pb-1 mb-2 mx-8"></div>
                <p className="text-sm font-medium text-gray-700">Gestor</p>
                <p className="text-xs text-gray-500">{resultado.gestor_nome}</p>
              </div>
            </div>
            <div className="text-center text-xs text-gray-400 mt-4">
              <p>Este documento é confidencial e destinado exclusivamente ao uso interno.</p>
              <p>© {new Date().getFullYear()} - Sistema de Gestão de RH</p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
