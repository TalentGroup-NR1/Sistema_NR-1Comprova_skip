import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PgrDominioPsico {
  id: string;
  nome_dominio: string;
  grupo: string;
  peso: number;
  mediana: number | null;
  classificacao: string | null;
  polaridade: string;
  ordem: number;
}

export interface PgrResultadoSetor {
  setor: string;
  respondentes: number;
  escala_1: number | null;
  escala_2: number | null;
  escala_3: number | null;
  escala_4: number | null;
}

export interface PgrPlanoPsico {
  id: string;
  numero: number;
  acao: string;
  descricao: string | null;
  obrigatoriedade: string;
  responsavel: string | null;
  metodo: string | null;
  data_prevista: string | null;
  local: string | null;
  status: string | null;
  prioridade_dias: number | null;
  dimensao: string | null;
}

export interface PgrDadosPsicossociais {
  dominios: PgrDominioPsico[];
  score_ponderado: number | null;
  classificacao_geral: string;
  resultados_por_setor: PgrResultadoSetor[];
  planos_acao: PgrPlanoPsico[];
}

/** Dados do adendo psicossocial: domínios, resultados por setor, classificação e planos de ação. */
export function usePgrDadosPsicossociais(documentoId: string | null | undefined) {
  return useQuery({
    queryKey: ["pgr-dados-psicossociais", documentoId],
    enabled: !!documentoId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("pgr_get_dados_psicossociais", {
        p_documento_id: documentoId!,
      });
      if (error) throw error;
      return (data ?? {}) as unknown as PgrDadosPsicossociais;
    },
  });
}
