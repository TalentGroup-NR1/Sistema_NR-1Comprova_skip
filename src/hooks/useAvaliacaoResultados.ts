import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export type TipoMetrica = 'numerica' | 'descritiva';

export interface ValorEscala {
  valor: number | string;
  label: string;
}

export interface MetricaValor {
  id: string;
  metrica_id: string;
  valor_label: string;
  peso: number;
  ordem: number;
}

export interface MetricaResultado {
  id: string;
  nome_metrica: string;
  tipo_metrica: TipoMetrica;
  valores_escala: ValorEscala[];
  valores_pesos: MetricaValor[];
}

export interface CompetenciaResultado {
  id: string;
  nome_competencia: string;
  conceito_competencia: string | null;
  metrica_id: string | null;
  metrica?: MetricaResultado | null;
  ordem: number;
  resposta_colaborador: { nota_valor: string; comentario: string | null; peso?: number | null } | null;
  resposta_gestor: { nota_valor: string; comentario: string | null; peso?: number | null } | null;
  discrepancia?: number | null;
}

export interface ObjetivoResultado {
  id: string;
  nome_objetivo: string;
  descricao_objetivo: string | null;
  metrica_id: string | null;
  metrica?: MetricaResultado | null;
  ordem: number;
  resposta_colaborador: { nota_valor: string; comentario: string | null; peso?: number | null } | null;
  resposta_gestor: { nota_valor: string; comentario: string | null; peso?: number | null } | null;
  discrepancia?: number | null;
}

export interface AvaliacaoResultado {
  id: string;
  ciclo_id: string;
  ciclo_nome: string;
  ciclo_status: 'configuracao' | 'ativo' | 'finalizado';
  colaborador_id: string;
  colaborador_nome: string;
  colaborador_cargo: string;
  colaborador_departamento: string;
  gestor_id: string;
  gestor_nome: string;
  status_autoavaliacao: 'nao_iniciada' | 'em_andamento' | 'concluida';
  status_avaliacao_gestor: 'nao_iniciada' | 'em_andamento' | 'concluida';
  prazo_autoavaliacao: string | null;
  prazo_avaliacao_gestor: string | null;
  competencias: CompetenciaResultado[];
  objetivos: ObjetivoResultado[];
  metricas: MetricaResultado[];
}

export interface MediasAvaliacao {
  mediaCompetenciasColaborador: number | null;
  mediaCompetenciasGestor: number | null;
  mediaObjetivosColaborador: number | null;
  mediaObjetivosGestor: number | null;
  mediaGeralColaborador: number | null;
  mediaGeralGestor: number | null;
  discrepanciaGeral: number | null;
  hasNumericMetrics: boolean;
  hasDescriptiveMetrics: boolean;
}

// Helper to parse valores_escala from Json
function parseValoresEscala(json: Json): ValorEscala[] {
  if (Array.isArray(json)) {
    return json.map((item: unknown) => {
      const obj = item as { valor?: number | string; label?: string };
      return {
        valor: obj.valor ?? 0,
        label: obj.label ?? '',
      };
    });
  }
  return [];
}

// Helper to get weight from nota_valor using metricas_valores
function getPesoFromNotaValor(
  notaValor: string,
  metrica: MetricaResultado | null | undefined
): number | null {
  if (!metrica) return null;
  
  // First try to find in valores_pesos (from metricas_valores table)
  const valorPeso = metrica.valores_pesos?.find(
    v => v.valor_label === notaValor || v.valor_label === notaValor.toString()
  );
  
  if (valorPeso) {
    return valorPeso.peso;
  }
  
  // Fallback: for numeric metrics, try to parse as number
  if (metrica.tipo_metrica === 'numerica') {
    const numValue = parseFloat(notaValor);
    if (!isNaN(numValue)) return numValue;
  }
  
  // For descriptive metrics, look up in valores_escala by label
  const escalaItem = metrica.valores_escala.find(
    v => v.valor?.toString() === notaValor || v.label === notaValor
  );
  if (escalaItem) {
    // Use the index as weight if no peso found
    const idx = metrica.valores_escala.indexOf(escalaItem);
    return idx + 1;
  }
  
  return null;
}

// Calculate averages for an evaluation
export function calculateMedias(resultado: AvaliacaoResultado): MediasAvaliacao {
  const numericCompetenciasColab: number[] = [];
  const numericCompetenciasGestor: number[] = [];
  const numericObjetivosColab: number[] = [];
  const numericObjetivosGestor: number[] = [];
  
  let hasDescriptiveMetrics = false;

  // Process competencias
  resultado.competencias.forEach(comp => {
    if (comp.resposta_colaborador?.peso != null) {
      numericCompetenciasColab.push(comp.resposta_colaborador.peso);
    }
    if (comp.resposta_gestor?.peso != null) {
      numericCompetenciasGestor.push(comp.resposta_gestor.peso);
    }
    if (comp.metrica?.tipo_metrica === 'descritiva') {
      hasDescriptiveMetrics = true;
    }
  });

  // Process objetivos
  resultado.objetivos.forEach(obj => {
    if (obj.resposta_colaborador?.peso != null) {
      numericObjetivosColab.push(obj.resposta_colaborador.peso);
    }
    if (obj.resposta_gestor?.peso != null) {
      numericObjetivosGestor.push(obj.resposta_gestor.peso);
    }
    if (obj.metrica?.tipo_metrica === 'descritiva') {
      hasDescriptiveMetrics = true;
    }
  });

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const mediaCompetenciasColaborador = avg(numericCompetenciasColab);
  const mediaCompetenciasGestor = avg(numericCompetenciasGestor);
  const mediaObjetivosColaborador = avg(numericObjetivosColab);
  const mediaObjetivosGestor = avg(numericObjetivosGestor);

  // Calculate overall averages
  const allColab = [...numericCompetenciasColab, ...numericObjetivosColab];
  const allGestor = [...numericCompetenciasGestor, ...numericObjetivosGestor];
  
  const mediaGeralColaborador = avg(allColab);
  const mediaGeralGestor = avg(allGestor);

  const discrepanciaGeral = 
    mediaGeralColaborador !== null && mediaGeralGestor !== null
      ? mediaGeralColaborador - mediaGeralGestor
      : null;

  const hasNumericMetrics = allColab.length > 0 || allGestor.length > 0;

  return {
    mediaCompetenciasColaborador,
    mediaCompetenciasGestor,
    mediaObjetivosColaborador,
    mediaObjetivosGestor,
    mediaGeralColaborador,
    mediaGeralGestor,
    discrepanciaGeral,
    hasNumericMetrics,
    hasDescriptiveMetrics,
  };
}

// Calculate discrepancy for a single item
export function calculateItemDiscrepancy(
  respostaColab: { nota_valor: string; peso?: number | null } | null,
  respostaGestor: { nota_valor: string; peso?: number | null } | null,
  metrica: MetricaResultado | null | undefined
): number | null {
  if (!respostaColab || !respostaGestor || !metrica) {
    return null;
  }
  
  const pesoColab = respostaColab.peso;
  const pesoGestor = respostaGestor.peso;
  
  if (pesoColab == null || pesoGestor == null) return null;
  
  return pesoColab - pesoGestor;
}

// Hook to fetch a single evaluation result
export function useAvaliacaoResultado(avaliacaoId: string | undefined) {
  return useQuery({
    queryKey: ['avaliacao-resultado', avaliacaoId],
    queryFn: async () => {
      if (!avaliacaoId) return null;

      // Fetch avaliacao with related data
      const { data: avaliacao, error: avalError } = await supabase
        .from('avaliacoes')
        .select(`
          *,
          ciclo:ciclos_avaliacao(id, nome_ciclo, status),
          colaborador:colaboradores!avaliacoes_colaborador_id_fkey(id, full_name, job_title, department),
          gestor:colaboradores!avaliacoes_gestor_id_fkey(id, full_name)
        `)
        .eq('id', avaliacaoId)
        .single();

      if (avalError) throw avalError;
      if (!avaliacao) return null;

      // Fetch metricas with their pesos
      const { data: metricas, error: metricasError } = await supabase
        .from('metricas_avaliacao')
        .select('*')
        .eq('ciclo_id', avaliacao.ciclo_id);

      if (metricasError) throw metricasError;

      // Fetch metricas_valores for all metricas
      const metricaIds = metricas.map(m => m.id);
      const { data: metricasValores, error: valoresError } = await supabase
        .from('metricas_valores')
        .select('*')
        .in('metrica_id', metricaIds.length > 0 ? metricaIds : ['00000000-0000-0000-0000-000000000000']);

      if (valoresError) throw valoresError;

      const metricasMap = new Map<string, MetricaResultado>(
        metricas.map(m => {
          const valoresPesos = (metricasValores || [])
            .filter(v => v.metrica_id === m.id)
            .map(v => ({
              id: v.id,
              metrica_id: v.metrica_id,
              valor_label: v.valor_label,
              peso: Number(v.peso),
              ordem: v.ordem,
            }));
          
          return [m.id, {
            id: m.id,
            nome_metrica: m.nome_metrica,
            tipo_metrica: m.tipo_metrica as TipoMetrica,
            valores_escala: parseValoresEscala(m.valores_escala),
            valores_pesos: valoresPesos,
          }];
        })
      );

      // Fetch competencias
      const { data: competencias, error: compError } = await supabase
        .from('competencias_ciclo')
        .select('*')
        .eq('ciclo_id', avaliacao.ciclo_id)
        .order('ordem');

      if (compError) throw compError;

      // Fetch objetivos
      const { data: objetivos, error: objError } = await supabase
        .from('objetivos_ciclo')
        .select('*')
        .eq('ciclo_id', avaliacao.ciclo_id)
        .order('ordem');

      if (objError) throw objError;

      // Fetch respostas competencias
      const { data: respostasComp, error: respCompError } = await supabase
        .from('avaliacao_respostas_competencias')
        .select('*')
        .eq('avaliacao_id', avaliacaoId);

      if (respCompError) throw respCompError;

      // Fetch respostas objetivos
      const { data: respostasObj, error: respObjError } = await supabase
        .from('avaliacao_respostas_objetivos')
        .select('*')
        .eq('avaliacao_id', avaliacaoId);

      if (respObjError) throw respObjError;

      // Build competencias result with pesos
      const competenciasResult: CompetenciaResultado[] = competencias.map(comp => {
        const metrica = comp.metrica_id ? metricasMap.get(comp.metrica_id) : null;
        
        const respostaColab = respostasComp.find(
          r => r.competencia_id === comp.id && r.respondente_tipo === 'colaborador'
        );
        const respostaGestor = respostasComp.find(
          r => r.competencia_id === comp.id && r.respondente_tipo === 'gestor'
        );

        const colabPeso = respostaColab ? getPesoFromNotaValor(respostaColab.nota_valor, metrica) : null;
        const gestorPeso = respostaGestor ? getPesoFromNotaValor(respostaGestor.nota_valor, metrica) : null;
        
        const discrepancia = colabPeso != null && gestorPeso != null ? colabPeso - gestorPeso : null;

        return {
          id: comp.id,
          nome_competencia: comp.nome_competencia,
          conceito_competencia: comp.conceito_competencia,
          metrica_id: comp.metrica_id,
          metrica,
          ordem: comp.ordem,
          resposta_colaborador: respostaColab 
            ? { nota_valor: respostaColab.nota_valor, comentario: respostaColab.comentario, peso: colabPeso }
            : null,
          resposta_gestor: respostaGestor
            ? { nota_valor: respostaGestor.nota_valor, comentario: respostaGestor.comentario, peso: gestorPeso }
            : null,
          discrepancia,
        };
      });

      // Build objetivos result with pesos
      const objetivosResult: ObjetivoResultado[] = objetivos.map(obj => {
        const metrica = obj.metrica_id ? metricasMap.get(obj.metrica_id) : null;
        
        const respostaColab = respostasObj.find(
          r => r.objetivo_id === obj.id && r.respondente_tipo === 'colaborador'
        );
        const respostaGestor = respostasObj.find(
          r => r.objetivo_id === obj.id && r.respondente_tipo === 'gestor'
        );

        const colabPeso = respostaColab ? getPesoFromNotaValor(respostaColab.nota_valor, metrica) : null;
        const gestorPeso = respostaGestor ? getPesoFromNotaValor(respostaGestor.nota_valor, metrica) : null;
        
        const discrepancia = colabPeso != null && gestorPeso != null ? colabPeso - gestorPeso : null;

        return {
          id: obj.id,
          nome_objetivo: obj.nome_objetivo,
          descricao_objetivo: obj.descricao_objetivo,
          metrica_id: obj.metrica_id,
          metrica,
          ordem: obj.ordem,
          resposta_colaborador: respostaColab
            ? { nota_valor: respostaColab.nota_valor, comentario: respostaColab.comentario, peso: colabPeso }
            : null,
          resposta_gestor: respostaGestor
            ? { nota_valor: respostaGestor.nota_valor, comentario: respostaGestor.comentario, peso: gestorPeso }
            : null,
          discrepancia,
        };
      });

      const cicloData = avaliacao.ciclo as { id: string; nome_ciclo: string; status: string } | null;
      const colaboradorData = avaliacao.colaborador as { id: string; full_name: string; job_title: string; department: string; } | null;
      const gestorData = avaliacao.gestor as { id: string; full_name: string } | null;

      return {
        id: avaliacao.id,
        ciclo_id: avaliacao.ciclo_id,
        ciclo_nome: cicloData?.nome_ciclo ?? '',
        ciclo_status: (cicloData?.status ?? 'configuracao') as 'configuracao' | 'ativo' | 'finalizado',
        colaborador_id: avaliacao.colaborador_id,
        colaborador_nome: colaboradorData?.full_name ?? '',
        colaborador_cargo: colaboradorData?.job_title ?? '',
        colaborador_departamento: colaboradorData?.department ?? '',
        gestor_id: avaliacao.gestor_id,
        gestor_nome: gestorData?.full_name || '',
        status_autoavaliacao: avaliacao.status_autoavaliacao as 'nao_iniciada' | 'em_andamento' | 'concluida',
        status_avaliacao_gestor: avaliacao.status_avaliacao_gestor as 'nao_iniciada' | 'em_andamento' | 'concluida',
        prazo_autoavaliacao: avaliacao.prazo_autoavaliacao,
        prazo_avaliacao_gestor: avaliacao.prazo_avaliacao_gestor,
        competencias: competenciasResult,
        objetivos: objetivosResult,
        metricas: Array.from(metricasMap.values()),
      } as AvaliacaoResultado;
    },
    enabled: !!avaliacaoId,
  });
}

// Hook to fetch all results for a cycle (for the Results tab)
export interface ResultadoResumo {
  avaliacaoId: string;
  colaboradorNome: string;
  colaboradorCargo: string;
  colaboradorDepartamento: string;
  gestorNome: string;
  statusAutoavaliacao: 'nao_iniciada' | 'em_andamento' | 'concluida';
  statusAvaliacaoGestor: 'nao_iniciada' | 'em_andamento' | 'concluida';
  mediaColaborador: number | null;
  mediaGestor: number | null;
  discrepancia: number | null;
  hasNumericMetrics: boolean;
}

export function useResultadosCiclo(cicloId: string | null) {
  return useQuery({
    queryKey: ['resultados-ciclo', cicloId],
    queryFn: async () => {
      if (!cicloId) return [];

      // Fetch all avaliacoes for the cycle
      const { data: avaliacoes, error: avalError } = await supabase
        .from('avaliacoes')
        .select(`
          id,
          status_autoavaliacao,
          status_avaliacao_gestor,
          colaborador:colaboradores!avaliacoes_colaborador_id_fkey(full_name, job_title, department),
          gestor:colaboradores!avaliacoes_gestor_id_fkey(full_name)
        `)
        .eq('ciclo_id', cicloId)
        .order('created_at', { ascending: false });

      if (avalError) throw avalError;

      // Fetch metricas for the cycle
      const { data: metricas, error: metricasError } = await supabase
        .from('metricas_avaliacao')
        .select('*')
        .eq('ciclo_id', cicloId);

      if (metricasError) throw metricasError;

      // Fetch metricas_valores
      const metricaIds = metricas.map(m => m.id);
      const { data: metricasValores } = await supabase
        .from('metricas_valores')
        .select('*')
        .in('metrica_id', metricaIds.length > 0 ? metricaIds : ['00000000-0000-0000-0000-000000000000']);

      const metricasMap = new Map<string, MetricaResultado>(
        metricas.map(m => {
          const valoresPesos = (metricasValores || [])
            .filter(v => v.metrica_id === m.id)
            .map(v => ({
              id: v.id,
              metrica_id: v.metrica_id,
              valor_label: v.valor_label,
              peso: Number(v.peso),
              ordem: v.ordem,
            }));
          
          return [m.id, {
            id: m.id,
            nome_metrica: m.nome_metrica,
            tipo_metrica: m.tipo_metrica as TipoMetrica,
            valores_escala: parseValoresEscala(m.valores_escala),
            valores_pesos: valoresPesos,
          }];
        })
      );

      // Fetch competencias and objetivos
      const { data: competencias } = await supabase
        .from('competencias_ciclo')
        .select('id, metrica_id')
        .eq('ciclo_id', cicloId);

      const { data: objetivos } = await supabase
        .from('objetivos_ciclo')
        .select('id, metrica_id')
        .eq('ciclo_id', cicloId);

      // Get all avaliacao IDs
      const avaliacaoIds = avaliacoes.map(a => a.id);

      // Fetch all respostas
      const { data: respostasComp } = await supabase
        .from('avaliacao_respostas_competencias')
        .select('*')
        .in('avaliacao_id', avaliacaoIds.length > 0 ? avaliacaoIds : ['00000000-0000-0000-0000-000000000000']);

      const { data: respostasObj } = await supabase
        .from('avaliacao_respostas_objetivos')
        .select('*')
        .in('avaliacao_id', avaliacaoIds.length > 0 ? avaliacaoIds : ['00000000-0000-0000-0000-000000000000']);

      // Build results for each avaliacao
      const results: ResultadoResumo[] = avaliacoes.map(aval => {
        const colaborador = aval.colaborador as { full_name: string; job_title: string; department: string } | null;
        const gestor = aval.gestor as { full_name: string } | null;

        // Calculate averages using pesos
        const colabValues: number[] = [];
        const gestorValues: number[] = [];

        // Process competencias
        competencias?.forEach(comp => {
          const metrica = comp.metrica_id ? metricasMap.get(comp.metrica_id) : null;
          if (!metrica) return;

          const respostaColab = respostasComp?.find(
            r => r.avaliacao_id === aval.id && r.competencia_id === comp.id && r.respondente_tipo === 'colaborador'
          );
          const respostaGestor = respostasComp?.find(
            r => r.avaliacao_id === aval.id && r.competencia_id === comp.id && r.respondente_tipo === 'gestor'
          );

          if (respostaColab) {
            const peso = getPesoFromNotaValor(respostaColab.nota_valor, metrica);
            if (peso !== null) colabValues.push(peso);
          }
          if (respostaGestor) {
            const peso = getPesoFromNotaValor(respostaGestor.nota_valor, metrica);
            if (peso !== null) gestorValues.push(peso);
          }
        });

        // Process objetivos
        objetivos?.forEach(obj => {
          const metrica = obj.metrica_id ? metricasMap.get(obj.metrica_id) : null;
          if (!metrica) return;

          const respostaColab = respostasObj?.find(
            r => r.avaliacao_id === aval.id && r.objetivo_id === obj.id && r.respondente_tipo === 'colaborador'
          );
          const respostaGestor = respostasObj?.find(
            r => r.avaliacao_id === aval.id && r.objetivo_id === obj.id && r.respondente_tipo === 'gestor'
          );

          if (respostaColab) {
            const peso = getPesoFromNotaValor(respostaColab.nota_valor, metrica);
            if (peso !== null) colabValues.push(peso);
          }
          if (respostaGestor) {
            const peso = getPesoFromNotaValor(respostaGestor.nota_valor, metrica);
            if (peso !== null) gestorValues.push(peso);
          }
        });

        const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
        const mediaColab = avg(colabValues);
        const mediaGestor = avg(gestorValues);

        return {
          avaliacaoId: aval.id,
          colaboradorNome: colaborador?.full_name ?? '',
          colaboradorCargo: colaborador?.job_title ?? '',
          colaboradorDepartamento: colaborador?.department ?? '',
          gestorNome: gestor?.full_name ?? '',
          statusAutoavaliacao: aval.status_autoavaliacao as 'nao_iniciada' | 'em_andamento' | 'concluida',
          statusAvaliacaoGestor: aval.status_avaliacao_gestor as 'nao_iniciada' | 'em_andamento' | 'concluida',
          mediaColaborador: mediaColab,
          mediaGestor: mediaGestor,
          discrepancia: mediaColab !== null && mediaGestor !== null ? mediaColab - mediaGestor : null,
          hasNumericMetrics: colabValues.length > 0 || gestorValues.length > 0,
        };
      });

      return results;
    },
    enabled: !!cicloId,
  });
}
