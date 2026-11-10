import { useState, useRef, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, FileText, Loader2, Save } from 'lucide-react';
import { useColaborador } from '@/hooks/useColaboradores';
import { usePromocoes } from '@/hooks/usePromocoes';
import { useFeedbackCycles, useFeedbackResponses } from '@/hooks/useFeedbackCycles';
import { useFichaProfissional, useSaveFichaProfissional } from '@/hooks/useFichaProfissional';
import { FichaProfissionalCard } from '@/components/ficha-profissional/FichaProfissionalCard';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function FichaProfissionalPage() {
  const { colaboradorId } = useParams<{ colaboradorId: string }>();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Form state
  const [formacao, setFormacao] = useState('');
  const [cursos, setCursos] = useState('');
  const [resumo, setResumo] = useState('');
  const [diarioBordoFeedbackText, setDiarioBordoFeedbackText] = useState('');
  const [avaliacaoFeedbackText, setAvaliacaoFeedbackText] = useState('');
  const [careerGridStars, setCareerGridStars] = useState<Record<string, 'inicio' | 'promocao' | null>>({});

  // Data hooks
  const { data: colaborador, isLoading: loadingColab } = useColaborador(colaboradorId || null);
  const { data: promocoes = [], isLoading: loadingPromo } = usePromocoes(colaboradorId || null);
  const { data: ficha, isLoading: loadingFicha } = useFichaProfissional(colaboradorId || null);
  const saveFicha = useSaveFichaProfissional();

  // Company data
  const { data: company } = useQuery({
    queryKey: ['company-for-ficha', colaborador?.company_id],
    queryFn: async () => {
      if (!colaborador?.company_id) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('name, logo_url')
        .eq('id', colaborador.company_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!colaborador?.company_id,
  });

  // Feedback cycles (Diário de Bordo)
  const { data: allCycles = [] } = useFeedbackCycles();
  const completedCycles = useMemo(() => {
    if (!colaboradorId) return [];
    return allCycles
      .filter(c => c.colaborador_id === colaboradorId && c.status === 'CONCLUIDO')
      .sort((a, b) => {
        const order: Record<string, number> = { '30_DIAS': 1, '80_DIAS': 2, '120_DIAS': 3 };
        return (order[a.milestone_type] || 0) - (order[b.milestone_type] || 0);
      });
  }, [allCycles, colaboradorId]);

  const cycle30 = completedCycles.find(c => c.milestone_type === '30_DIAS');
  const cycle80 = completedCycles.find(c => c.milestone_type === '80_DIAS');
  const cycle120 = completedCycles.find(c => c.milestone_type === '120_DIAS');

  const { data: responses30 = [] } = useFeedbackResponses(cycle30?.id || null);
  const { data: responses80 = [] } = useFeedbackResponses(cycle80?.id || null);
  const { data: responses120 = [] } = useFeedbackResponses(cycle120?.id || null);

  // Calculate Diário de Bordo averages
  const calculateAverages = (responses: any[]) => {
    const numericResponses = responses.filter(r => r.answer_value_numeric !== null);
    if (numericResponses.length === 0) return { colab: null, gestor: null, overall: null };

    const colabResponses = numericResponses.filter(r => r.respondent_type === 'COLABORADOR');
    const gestorResponses = numericResponses.filter(r => r.respondent_type === 'GESTOR');

    const avg = (arr: any[]) =>
      arr.length > 0 ? arr.reduce((sum, r) => sum + r.answer_value_numeric, 0) / arr.length : null;

    return { colab: avg(colabResponses), gestor: avg(gestorResponses), overall: avg(numericResponses) };
  };

  const avg30 = calculateAverages(responses30);
  const avg80 = calculateAverages(responses80);
  const avg120 = calculateAverages(responses120);

  const diarioBordoScores = [
    { milestone: '30_DIAS', milestoneLabel: '30 D', profissionalAvg: avg30.colab, gestaoAvg: avg30.gestor, overallAvg: avg30.overall },
    { milestone: '80_DIAS', milestoneLabel: '80 D', profissionalAvg: avg80.colab, gestaoAvg: avg80.gestor, overallAvg: avg80.overall },
    { milestone: '120_DIAS', milestoneLabel: '120 D', profissionalAvg: avg120.colab, gestaoAvg: avg120.gestor, overallAvg: avg120.overall },
  ];

  // Avaliação de desempenho - ALL cycles
  const { data: avaliacoesCiclos = [] } = useQuery({
    queryKey: ['avaliacao-ficha-all', colaboradorId],
    queryFn: async () => {
      if (!colaboradorId) return [];

      // Get ALL avaliacoes for this colaborador
      const { data: avaliacoes, error } = await supabase
        .from('avaliacoes')
        .select(`
          id, ciclo_id, status_autoavaliacao, status_avaliacao_gestor,
          ciclo:ciclos_avaliacao(nome_ciclo, status)
        `)
        .eq('colaborador_id', colaboradorId)
        .order('created_at', { ascending: false });

      if (error || !avaliacoes || avaliacoes.length === 0) return [];

      // Get unique ciclo IDs
      const cicloIds = [...new Set(avaliacoes.map(a => a.ciclo_id))];
      const avaliacaoIds = avaliacoes.map(a => a.id);

      // Fetch metricas for all cycles
      const { data: metricas } = await supabase
        .from('metricas_avaliacao')
        .select('*')
        .in('ciclo_id', cicloIds);

      const metricaIds = (metricas || []).map(m => m.id);
      const { data: metricasValores } = await supabase
        .from('metricas_valores')
        .select('*')
        .in('metrica_id', metricaIds.length > 0 ? metricaIds : ['00000000-0000-0000-0000-000000000000']);

      // Build metricas map
      const metricasMap = new Map<string, any>();
      (metricas || []).forEach(m => {
        const valoresPesos = (metricasValores || [])
          .filter(v => v.metrica_id === m.id)
          .map(v => ({ valor_label: v.valor_label, peso: Number(v.peso) }));
        metricasMap.set(m.id, {
          tipo_metrica: m.tipo_metrica,
          valores_escala: Array.isArray(m.valores_escala) ? m.valores_escala : [],
          valores_pesos: valoresPesos,
        });
      });

      // Fetch competencias and objetivos for all cycles
      const { data: competencias } = await supabase
        .from('competencias_ciclo')
        .select('id, ciclo_id, nome_competencia, metrica_id, ordem')
        .in('ciclo_id', cicloIds)
        .order('ordem');

      const { data: objetivos } = await supabase
        .from('objetivos_ciclo')
        .select('id, ciclo_id, nome_objetivo, metrica_id, ordem')
        .in('ciclo_id', cicloIds)
        .order('ordem');

      // Fetch all respostas
      const { data: respostasComp } = await supabase
        .from('avaliacao_respostas_competencias')
        .select('avaliacao_id, competencia_id, nota_valor, respondente_tipo')
        .in('avaliacao_id', avaliacaoIds);

      const { data: respostasObj } = await supabase
        .from('avaliacao_respostas_objetivos')
        .select('avaliacao_id, objetivo_id, nota_valor, respondente_tipo')
        .in('avaliacao_id', avaliacaoIds);

      // Helper to get peso from nota_valor
      const getPeso = (notaValor: string, metricaId: string | null): number | null => {
        if (!metricaId) return null;
        const metrica = metricasMap.get(metricaId);
        if (!metrica) return null;
        const vp = metrica.valores_pesos?.find((v: any) => v.valor_label === notaValor);
        if (vp) return vp.peso;
        if (metrica.tipo_metrica === 'numerica') {
          const n = parseFloat(notaValor);
          if (!isNaN(n)) return n;
        }
        return null;
      };

      // Build result per cycle
      return avaliacoes.map(av => {
        const ciclo = av.ciclo as any;
        const cycleComps = (competencias || []).filter(c => c.ciclo_id === av.ciclo_id);
        const cycleObjs = (objetivos || []).filter(o => o.ciclo_id === av.ciclo_id);
        const avRespostasComp = (respostasComp || []).filter(r => r.avaliacao_id === av.id);
        const avRespostasObj = (respostasObj || []).filter(r => r.avaliacao_id === av.id);

        const pesosColab: number[] = [];
        const pesosGestor: number[] = [];

        const compResults = cycleComps.map(comp => {
          const rColab = avRespostasComp.find(r => r.competencia_id === comp.id && r.respondente_tipo === 'colaborador');
          const rGestor = avRespostasComp.find(r => r.competencia_id === comp.id && r.respondente_tipo === 'gestor');
          const pesoColab = rColab ? getPeso(rColab.nota_valor, comp.metrica_id) : null;
          const pesoGestor = rGestor ? getPeso(rGestor.nota_valor, comp.metrica_id) : null;
          if (pesoColab !== null) pesosColab.push(pesoColab);
          if (pesoGestor !== null) pesosGestor.push(pesoGestor);
          return {
            nome: comp.nome_competencia,
            notaColaborador: rColab?.nota_valor || null,
            notaGestor: rGestor?.nota_valor || null,
            pesoColaborador: pesoColab,
            pesoGestor: pesoGestor,
          };
        });

        const objResults = cycleObjs.map(obj => {
          const rColab = avRespostasObj.find(r => r.objetivo_id === obj.id && r.respondente_tipo === 'colaborador');
          const rGestor = avRespostasObj.find(r => r.objetivo_id === obj.id && r.respondente_tipo === 'gestor');
          const pesoColab = rColab ? getPeso(rColab.nota_valor, obj.metrica_id) : null;
          const pesoGestor = rGestor ? getPeso(rGestor.nota_valor, obj.metrica_id) : null;
          if (pesoColab !== null) pesosColab.push(pesoColab);
          if (pesoGestor !== null) pesosGestor.push(pesoGestor);
          return {
            nome: obj.nome_objetivo,
            notaColaborador: rColab?.nota_valor || null,
            notaGestor: rGestor?.nota_valor || null,
            pesoColaborador: pesoColab,
            pesoGestor: pesoGestor,
          };
        });

        const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

        return {
          cicloNome: ciclo?.nome_ciclo || 'Avaliação',
          cicloStatus: ciclo?.status || 'configuracao',
          statusAutoavaliacao: av.status_autoavaliacao,
          statusGestor: av.status_avaliacao_gestor,
          mediaColaborador: avg(pesosColab),
          mediaGestor: avg(pesosGestor),
          competencias: compResults,
          objetivos: objResults,
        };
      });
    },
    enabled: !!colaboradorId,
  });

  // Initialize form from saved data
  useEffect(() => {
    if (ficha) {
      setFormacao(ficha.formacao_academica || '');
      setCursos(ficha.cursos_realizados || '');
      setResumo(ficha.breve_resumo || '');
      setCareerGridStars((ficha as any).career_grid_stars || {});
    }
  }, [ficha]);

  // Auto-populate Diário de Bordo feedback from gestor text responses
  useEffect(() => {
    if (diarioBordoFeedbackText) return; // Don't overwrite manual edits

    const buildFeedbackText = (responses: any[], label: string): string => {
      const gestorTextResponses = responses.filter(
        (r) => r.respondent_type === 'GESTOR' && r.answer_value_text
      );
      if (gestorTextResponses.length === 0) return '';

      const lines = gestorTextResponses.map((r) => {
        const questionText = r.question?.question_text || 'Pergunta';
        return `• Pergunta: ${questionText}\n  Resposta: ${r.answer_value_text}`;
      });

      return `━━ ${label} ━━\n\n${lines.join('\n\n')}`;
    };

    const sections = [
      buildFeedbackText(responses30, '30 Dias'),
      buildFeedbackText(responses80, '80 Dias'),
      buildFeedbackText(responses120, '120 Dias'),
    ].filter(Boolean);

    if (sections.length > 0) {
      setDiarioBordoFeedbackText(sections.join('\n\n'));
    }
  }, [responses30, responses80, responses120]);

  const handleSave = () => {
    if (!colaboradorId || !colaborador?.company_id) return;
    saveFicha.mutate({
      colaborador_id: colaboradorId,
      company_id: colaborador.company_id,
      formacao_academica: formacao || null,
      cursos_realizados: cursos || null,
      breve_resumo: resumo || null,
      career_grid_stars: careerGridStars,
    });
  };

  const handleStarClick = (key: string, currentState: 'inicio' | 'promocao' | null) => {
    setCareerGridStars(prev => {
      const next = { ...prev };
      if (currentState === null) {
        next[key] = 'inicio';
      } else if (currentState === 'inicio') {
        next[key] = 'promocao';
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const handleExportPDF = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const pdf = new jsPDF('l', 'mm', 'a4'); // landscape
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margins = { left: 5, right: 5, top: 5, bottom: 5 };
      const contentWidth = pdfWidth - margins.left - margins.right;

      // Find the two page sections
      const page1 = cardRef.current.querySelector('[data-page="1"]') as HTMLElement;
      const page2 = cardRef.current.querySelector('[data-page="2"]') as HTMLElement;

      const pages = [page1, page2].filter(Boolean) as HTMLElement[];

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();

        const canvas = await html2canvas(pages[i], {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 900,
        });

        const ratio = contentWidth / canvas.width;
        const scaledHeight = canvas.height * ratio;
        const availableHeight = pdfHeight - margins.top - margins.bottom;

        if (scaledHeight <= availableHeight) {
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margins.left, margins.top, contentWidth, scaledHeight);
        } else {
          // If a single page section is still too tall, split it
          let remainingHeight = scaledHeight;
          let sourceY = 0;
          while (remainingHeight > 0) {
            const heightToDraw = Math.min(remainingHeight, availableHeight);
            const sourceHeight = heightToDraw / ratio;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = sourceHeight;
            const ctx = tempCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
              pdf.addImage(tempCanvas.toDataURL('image/png'), 'PNG', margins.left, margins.top, contentWidth, heightToDraw);
            }
            remainingHeight -= heightToDraw;
            sourceY += sourceHeight;
            if (remainingHeight > 0) pdf.addPage();
          }
        }
      }

      pdf.save(`Ficha_${colaborador?.full_name?.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = loadingColab || loadingPromo || loadingFicha;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!colaborador) {
    return (
      <MainLayout>
        <div className="p-6 space-y-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <p className="text-muted-foreground">Colaborador não encontrado.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Action bar */}
        <div className="flex items-center justify-between no-print">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} disabled={saveFicha.isPending}>
              {saveFicha.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Dados
            </Button>
            <Button onClick={handleExportPDF} disabled={isExporting}>
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Editable fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Formação Acadêmica</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ex: Bacharelado - Administração – Completo – 2016"
                value={formacao}
                onChange={(e) => setFormacao(e.target.value)}
                className="min-h-[80px] resize-none text-sm"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cursos Realizados</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Lista de cursos ou N/I"
                value={cursos}
                onChange={(e) => setCursos(e.target.value)}
                className="min-h-[80px] resize-none text-sm"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Breve Resumo / Perfil</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Descrição do perfil profissional..."
                value={resumo}
                onChange={(e) => setResumo(e.target.value)}
                className="min-h-[80px] resize-none text-sm"
              />
            </CardContent>
          </Card>
        </div>

        {/* Editable feedbacks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 no-print">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Feedback Diário de Bordo (Gestão Técnica)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Feedback da gestão sobre o diário de bordo..."
                value={diarioBordoFeedbackText}
                onChange={(e) => setDiarioBordoFeedbackText(e.target.value)}
                className="min-h-[60px] resize-none text-sm"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Feedback Avaliação de Desempenho</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Feedback da avaliação de desempenho..."
                value={avaliacaoFeedbackText}
                onChange={(e) => setAvaliacaoFeedbackText(e.target.value)}
                className="min-h-[60px] resize-none text-sm"
              />
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="border rounded-xl overflow-hidden shadow-lg bg-white inline-block">
          <FichaProfissionalCard
            ref={cardRef}
            colaborador={colaborador}
            companyName={company?.name || ''}
            companyLogoUrl={company?.logo_url || null}
            promocoes={promocoes}
            diarioBordoScores={diarioBordoScores}
            diarioBordoFeedback={diarioBordoFeedbackText || null}
            avaliacoesCiclos={avaliacoesCiclos}
            avaliacaoFeedback={avaliacaoFeedbackText || null}
            formacaoAcademica={formacao}
            cursosRealizados={cursos}
            breveResumo={resumo}
            gestorNome={colaborador.gestor_nome || colaborador.manager_name || null}
            careerGridStars={careerGridStars}
            onStarClick={handleStarClick}
          />
        </div>
      </div>
    </MainLayout>
  );
}
