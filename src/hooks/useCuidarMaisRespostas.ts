import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";

export interface RespostaCuidarPlus {
  id: string;
  questionario_id: string;
  pergunta_id: string;
  session_id: string;
  resposta_valor: string;
  colaborador_id_identificado: string | null;
  deseja_contato: boolean;
  submitted_at: string;
}

export interface EstatisticasQuestionario {
  total_envios: number;
  total_respondidos: number;
  taxa_participacao: number;
  solicitacoes_contato: number;
  media_por_pergunta: Record<string, {
    pergunta_texto: string;
    media: number;
    respostas: number;
  }>;
}

export interface ColaboradorContato {
  colaborador_id: string;
  full_name: string;
  corporate_email: string;
  submitted_at: string;
}

// Hook para buscar estatísticas de um questionário
export const useEstatisticasCuidarPlus = (questionarioId: string | null) => {
  return useQuery({
    queryKey: ['estatisticas-cuidar-plus', questionarioId],
    queryFn: async (): Promise<EstatisticasQuestionario | null> => {
      if (!questionarioId) return null;

      // Buscar total de envios
      const { count: totalEnvios, error: enviosError } = await supabase
        .from('envios_cuidar_plus')
        .select('*', { count: 'exact', head: true })
        .eq('questionario_id', questionarioId);

      if (enviosError) throw enviosError;

      // Buscar total de respondidos
      const { count: totalRespondidos, error: respondidosError } = await supabase
        .from('envios_cuidar_plus')
        .select('*', { count: 'exact', head: true })
        .eq('questionario_id', questionarioId)
        .eq('status', 'RESPONDIDO');

      if (respondidosError) throw respondidosError;

      // Buscar solicitações de contato (sessões únicas com deseja_contato = true)
      const { data: contatoData, error: contatoError } = await supabase
        .from('respostas_cuidar_plus')
        .select('session_id')
        .eq('questionario_id', questionarioId)
        .eq('deseja_contato', true);

      if (contatoError) throw contatoError;

      const sessoesContato = new Set(contatoData?.map(r => r.session_id)).size;

      // Buscar perguntas e respostas para calcular médias (apenas LIKERT_5)
      const { data: perguntas, error: perguntasError } = await supabase
        .from('perguntas_cuidar_plus')
        .select('id, pergunta_texto, tipo_pergunta')
        .eq('questionario_id', questionarioId)
        .eq('tipo_pergunta', 'LIKERT_5');

      if (perguntasError) throw perguntasError;

      const { data: respostas, error: respostasError } = await supabase
        .from('respostas_cuidar_plus')
        .select('pergunta_id, resposta_valor')
        .eq('questionario_id', questionarioId);

      if (respostasError) throw respostasError;

      // Calcular médias por pergunta
      const mediaPorPergunta: EstatisticasQuestionario['media_por_pergunta'] = {};
      
      perguntas?.forEach(pergunta => {
        const respostasPergunta = respostas?.filter(r => r.pergunta_id === pergunta.id) || [];
        const valores = respostasPergunta
          .map(r => parseInt(r.resposta_valor))
          .filter(v => !isNaN(v));
        
        const media = valores.length > 0 
          ? valores.reduce((a, b) => a + b, 0) / valores.length 
          : 0;

        mediaPorPergunta[pergunta.id] = {
          pergunta_texto: pergunta.pergunta_texto,
          media: Math.round(media * 10) / 10,
          respostas: valores.length,
        };
      });

      return {
        total_envios: totalEnvios || 0,
        total_respondidos: totalRespondidos || 0,
        taxa_participacao: totalEnvios ? Math.round(((totalRespondidos || 0) / totalEnvios) * 100) : 0,
        solicitacoes_contato: sessoesContato,
        media_por_pergunta: mediaPorPergunta,
      };
    },
    enabled: !!questionarioId,
  });
};

// Hook para buscar colaboradores que solicitaram contato
export const useColaboradoresContato = (questionarioId: string | null) => {
  return useQuery({
    queryKey: ['colaboradores-contato-cuidar-plus', questionarioId],
    queryFn: async (): Promise<ColaboradorContato[]> => {
      if (!questionarioId) return [];

      // Buscar respostas com deseja_contato = true e colaborador identificado
      const { data: respostas, error } = await supabase
        .from('respostas_cuidar_plus')
        .select(`
          colaborador_id_identificado,
          submitted_at,
          session_id
        `)
        .eq('questionario_id', questionarioId)
        .eq('deseja_contato', true)
        .not('colaborador_id_identificado', 'is', null);

      if (error) throw error;

      // Agrupar por colaborador (remover duplicatas por session)
      const colaboradoresMap = new Map<string, { submitted_at: string }>();
      respostas?.forEach(r => {
        if (r.colaborador_id_identificado) {
          if (!colaboradoresMap.has(r.colaborador_id_identificado)) {
            colaboradoresMap.set(r.colaborador_id_identificado, {
              submitted_at: r.submitted_at,
            });
          }
        }
      });

      if (colaboradoresMap.size === 0) return [];

      // Buscar dados dos colaboradores
      const colaboradorIds = Array.from(colaboradoresMap.keys());
      const { data: colaboradores, error: colabError } = await supabase
        .from('colaboradores')
        .select('id, full_name, corporate_email')
        .in('id', colaboradorIds);

      if (colabError) throw colabError;

      return colaboradores?.map(c => ({
        colaborador_id: c.id,
        full_name: c.full_name,
        corporate_email: c.corporate_email,
        submitted_at: colaboradoresMap.get(c.id)?.submitted_at || '',
      })) || [];
    },
    enabled: !!questionarioId,
  });
};

// Hook para dashboard geral - estatísticas agregadas de todos os questionários
export const useDashboardCuidarPlus = () => {
  const companyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ['dashboard-cuidar-plus', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      // Buscar todos os questionários ativos
      const { data: questionarios, error: questError } = await supabase
        .from('questionarios_cuidar_plus')
        .select('id, titulo')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (questError) throw questError;

      // Buscar total de envios e respondidos da empresa
      const { data: envios, error: enviosError } = await supabase
        .from('envios_cuidar_plus')
        .select(`
          status,
          questionarios_cuidar_plus!inner (
            company_id
          )
        `)
        .eq('questionarios_cuidar_plus.company_id', companyId);

      if (enviosError) throw enviosError;

      const totalEnvios = envios?.length || 0;
      const totalRespondidos = envios?.filter(e => e.status === 'RESPONDIDO').length || 0;

      // Buscar total de solicitações de contato
      const { data: respostas, error: respostasError } = await supabase
        .from('respostas_cuidar_plus')
        .select(`
          session_id,
          deseja_contato,
          questionarios_cuidar_plus!inner (
            company_id
          )
        `)
        .eq('questionarios_cuidar_plus.company_id', companyId)
        .eq('deseja_contato', true);

      if (respostasError) throw respostasError;

      const sessoesContato = new Set(respostas?.map(r => r.session_id)).size;

      return {
        questionarios_ativos: questionarios?.length || 0,
        total_envios: totalEnvios,
        total_respondidos: totalRespondidos,
        taxa_participacao: totalEnvios ? Math.round((totalRespondidos / totalEnvios) * 100) : 0,
        solicitacoes_contato: sessoesContato,
      };
    },
    enabled: !!companyId,
  });
};
