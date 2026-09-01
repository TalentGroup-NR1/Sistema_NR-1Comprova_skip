import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";
import { LIMIARES, DimensaoCuidarMais, DIMENSOES_CUIDAR_MAIS } from "@/lib/cuidarMaisDimensoes";

export interface FiltrosAnalise {
  questionarioId?: string | null;
  departamento?: string | null;
  periodoInicio?: Date | null;
  periodoFim?: Date | null;
  periodoAnteriorInicio?: Date | null;
  periodoAnteriorFim?: Date | null;
}

export interface EstatisticasPergunta {
  pergunta_id: string;
  pergunta_texto: string;
  dimensao: DimensaoCuidarMais | null;
  media: number;
  distribuicao: { [key: number]: number }; // 1-5 -> % 
  percentual_risco: number; // % em 1-2
  total_respostas: number;
}

export interface EstatisticasDimensao {
  dimensao: DimensaoCuidarMais;
  nome: string;
  icone: string;
  cor: string;
  score: number;
  percentual_risco: number;
  total_perguntas: number;
  delta?: number; // Variação vs período anterior
  alerta: boolean;
  motivo_alerta?: string;
}

export interface AnaliseGeral {
  score_geral: number;
  percentual_risco_geral: number;
  total_respostas: number;
  total_respondentes: number;
  taxa_participacao: number;
  delta_geral?: number;
  estatisticas_dimensoes: EstatisticasDimensao[];
  estatisticas_perguntas: EstatisticasPergunta[];
  amostra_suficiente: boolean;
}

// Hook para buscar departamentos distintos
export const useDepartamentosCuidarPlus = () => {
  const companyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ['departamentos-cuidar-plus', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('colaboradores')
        .select('department')
        .eq('company_id', companyId)
        .eq('status', 'ATIVO');

      if (error) throw error;

      // Distinct departments
      const departments = [...new Set(data?.map(c => c.department).filter(Boolean))];
      return departments.sort();
    },
    enabled: !!companyId,
  });
};

// Hook principal de análise
export const useAnaliseCuidarPlus = (filtros: FiltrosAnalise) => {
  const companyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ['analise-cuidar-plus', companyId, filtros],
    queryFn: async (): Promise<AnaliseGeral | null> => {
      if (!companyId) return null;

      // 1. Buscar questionários da empresa
      let questionariosQuery = supabase
        .from('questionarios_cuidar_plus')
        .select('id')
        .eq('company_id', companyId);

      if (filtros.questionarioId) {
        questionariosQuery = questionariosQuery.eq('id', filtros.questionarioId);
      }

      const { data: questionarios, error: questError } = await questionariosQuery;
      if (questError) throw questError;

      const questionarioIds = questionarios?.map(q => q.id) || [];
      if (questionarioIds.length === 0) {
        return {
          score_geral: 0,
          percentual_risco_geral: 0,
          total_respostas: 0,
          total_respondentes: 0,
          taxa_participacao: 0,
          estatisticas_dimensoes: [],
          estatisticas_perguntas: [],
          amostra_suficiente: false,
        };
      }

      // 2. Buscar perguntas Likert com dimensão
      const { data: perguntas, error: pergError } = await supabase
        .from('perguntas_cuidar_plus')
        .select('id, pergunta_texto, tipo_pergunta, dimensao')
        .in('questionario_id', questionarioIds)
        .eq('tipo_pergunta', 'LIKERT_5');

      if (pergError) throw pergError;

      const perguntaIds = perguntas?.map(p => p.id) || [];
      if (perguntaIds.length === 0) {
        return {
          score_geral: 0,
          percentual_risco_geral: 0,
          total_respostas: 0,
          total_respondentes: 0,
          taxa_participacao: 0,
          estatisticas_dimensoes: [],
          estatisticas_perguntas: [],
          amostra_suficiente: false,
        };
      }

      // 3. Buscar respostas com filtro de departamento
      let respostasQuery = supabase
        .from('respostas_cuidar_plus')
        .select(`
          id,
          pergunta_id,
          session_id,
          resposta_valor,
          submitted_at
        `)
        .in('pergunta_id', perguntaIds);

      // Filtrar por período
      if (filtros.periodoInicio) {
        respostasQuery = respostasQuery.gte('submitted_at', filtros.periodoInicio.toISOString());
      }
      if (filtros.periodoFim) {
        respostasQuery = respostasQuery.lte('submitted_at', filtros.periodoFim.toISOString());
      }

      const { data: respostas, error: respError } = await respostasQuery;
      if (respError) throw respError;

      // 4. Se filtro de departamento, precisamos filtrar por envios de colaboradores daquele departamento
      let sessionIdsValidos: Set<string> | null = null;
      
      if (filtros.departamento) {
        // Buscar colaboradores do departamento
        const { data: colaboradores, error: colabError } = await supabase
          .from('colaboradores')
          .select('id')
          .eq('company_id', companyId)
          .eq('department', filtros.departamento);

        if (colabError) throw colabError;

        const colaboradorIds = colaboradores?.map(c => c.id) || [];
        
        // Buscar envios desses colaboradores
        const { data: envios, error: enviosError } = await supabase
          .from('envios_cuidar_plus')
          .select('colaborador_id')
          .in('colaborador_id', colaboradorIds)
          .eq('status', 'RESPONDIDO');

        if (enviosError) throw enviosError;

        // Mapear para session_ids (precisamos das respostas para obter session_id)
        // Simplificação: filtrar envios respondidos do departamento
        const colaboradorIdsRespondidos = new Set(envios?.map(e => e.colaborador_id));
        
        // Como session_id é anônimo, precisamos de uma abordagem diferente
        // Vamos usar respostas que têm colaborador_id_identificado (quando deseja_contato = true)
        // OU assumir que todas as respostas do período são do departamento se não pudermos rastrear
        
        // Buscar respostas com colaborador identificado desse departamento
        const { data: respostasIdentificadas, error: respIdError } = await supabase
          .from('respostas_cuidar_plus')
          .select('session_id, colaborador_id_identificado')
          .in('colaborador_id_identificado', colaboradorIds);
        
        if (!respIdError && respostasIdentificadas) {
          sessionIdsValidos = new Set(respostasIdentificadas.map(r => r.session_id));
        }
      }

      // 5. Calcular estatísticas
      let respostasFiltradas = respostas || [];
      
      if (sessionIdsValidos && sessionIdsValidos.size > 0) {
        respostasFiltradas = respostasFiltradas.filter(r => sessionIdsValidos!.has(r.session_id));
      }

      // Contagem de respondentes únicos (session_id)
      const respondentesUnicos = new Set(respostasFiltradas.map(r => r.session_id));
      const totalRespondentes = respondentesUnicos.size;

      // Verificar amostra mínima
      const amostraSuficiente = totalRespondentes >= LIMIARES.AMOSTRA_MINIMA;

      // Se amostra insuficiente e há filtro de departamento, não mostrar detalhes
      if (!amostraSuficiente && filtros.departamento) {
        return {
          score_geral: 0,
          percentual_risco_geral: 0,
          total_respostas: respostasFiltradas.length,
          total_respondentes: totalRespondentes,
          taxa_participacao: 0,
          estatisticas_dimensoes: [],
          estatisticas_perguntas: [],
          amostra_suficiente: false,
        };
      }

      // Agrupar respostas por pergunta
      const respostasPorPergunta: Record<string, number[]> = {};
      respostasFiltradas.forEach(r => {
        const valor = parseInt(r.resposta_valor);
        if (!isNaN(valor) && valor >= 1 && valor <= 5) {
          if (!respostasPorPergunta[r.pergunta_id]) {
            respostasPorPergunta[r.pergunta_id] = [];
          }
          respostasPorPergunta[r.pergunta_id].push(valor);
        }
      });

      // Calcular estatísticas por pergunta
      const estatisticasPerguntas: EstatisticasPergunta[] = perguntas?.map(p => {
        const valores = respostasPorPergunta[p.id] || [];
        const total = valores.length;
        
        if (total === 0) {
          return {
            pergunta_id: p.id,
            pergunta_texto: p.pergunta_texto,
            dimensao: p.dimensao as DimensaoCuidarMais | null,
            media: 0,
            distribuicao: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            percentual_risco: 0,
            total_respostas: 0,
          };
        }

        const media = valores.reduce((a, b) => a + b, 0) / total;
        
        const distribuicao: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        valores.forEach(v => {
          distribuicao[v] = (distribuicao[v] || 0) + 1;
        });
        
        // Converter para percentuais
        Object.keys(distribuicao).forEach(k => {
          distribuicao[Number(k)] = Math.round((distribuicao[Number(k)] / total) * 100);
        });

        const percentualRisco = ((distribuicao[1] + distribuicao[2]) / 100) * 100;

        return {
          pergunta_id: p.id,
          pergunta_texto: p.pergunta_texto,
          dimensao: p.dimensao as DimensaoCuidarMais | null,
          media: Math.round(media * 100) / 100,
          distribuicao,
          percentual_risco: Math.round(percentualRisco),
          total_respostas: total,
        };
      }) || [];

      // Calcular estatísticas por dimensão
      const estatisticasDimensoes: EstatisticasDimensao[] = [];
      
      Object.entries(DIMENSOES_CUIDAR_MAIS).forEach(([key, dimensaoInfo]) => {
        const perguntasDimensao = estatisticasPerguntas.filter(
          p => p.dimensao === key && p.total_respostas > 0
        );

        if (perguntasDimensao.length === 0) return;

        const scoreDimensao = perguntasDimensao.reduce((sum, p) => sum + p.media, 0) / perguntasDimensao.length;
        const percentualRiscoDimensao = perguntasDimensao.reduce((sum, p) => sum + p.percentual_risco, 0) / perguntasDimensao.length;

        // Verificar alertas
        let alerta = false;
        let motivoAlerta: string | undefined;

        if (scoreDimensao < LIMIARES.SCORE_RISCO) {
          alerta = true;
          motivoAlerta = `Score abaixo de ${LIMIARES.SCORE_RISCO}`;
        } else if (percentualRiscoDimensao > LIMIARES.PERCENTUAL_RISCO) {
          alerta = true;
          motivoAlerta = `${percentualRiscoDimensao.toFixed(0)}% em risco (>35%)`;
        }

        estatisticasDimensoes.push({
          dimensao: key as DimensaoCuidarMais,
          nome: dimensaoInfo.nome,
          icone: dimensaoInfo.icone,
          cor: dimensaoInfo.cor,
          score: Math.round(scoreDimensao * 100) / 100,
          percentual_risco: Math.round(percentualRiscoDimensao),
          total_perguntas: perguntasDimensao.length,
          alerta,
          motivo_alerta: motivoAlerta,
        });
      });

      // Calcular score geral
      const perguntasComRespostas = estatisticasPerguntas.filter(p => p.total_respostas > 0);
      const scoreGeral = perguntasComRespostas.length > 0
        ? perguntasComRespostas.reduce((sum, p) => sum + p.media, 0) / perguntasComRespostas.length
        : 0;

      const percentualRiscoGeral = perguntasComRespostas.length > 0
        ? perguntasComRespostas.reduce((sum, p) => sum + p.percentual_risco, 0) / perguntasComRespostas.length
        : 0;

      // Buscar taxa de participação
      const { count: totalEnvios } = await supabase
        .from('envios_cuidar_plus')
        .select('*', { count: 'exact', head: true })
        .in('questionario_id', questionarioIds);

      const taxaParticipacao = totalEnvios && totalEnvios > 0
        ? Math.round((totalRespondentes / totalEnvios) * 100)
        : 0;

      return {
        score_geral: Math.round(scoreGeral * 100) / 100,
        percentual_risco_geral: Math.round(percentualRiscoGeral),
        total_respostas: respostasFiltradas.length,
        total_respondentes: totalRespondentes,
        taxa_participacao: taxaParticipacao,
        estatisticas_dimensoes: estatisticasDimensoes.sort((a, b) => a.score - b.score),
        estatisticas_perguntas: estatisticasPerguntas,
        amostra_suficiente: amostraSuficiente || !filtros.departamento,
      };
    },
    enabled: !!companyId,
  });
};
