import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PgrDadosAutomaticos {
  setores?: Array<Record<string, any>>;
  cargos?: Array<Record<string, any>>;
  headcount?: number;
  ghes?: Array<Record<string, any>>;
  fichas_risco?: Array<Record<string, any>>;
  planos_acao?: Array<Record<string, any>>;
  [key: string]: any;
}

/** Dados automáticos do PGR: setores/cargos/headcount, GHEs, fichas de risco e planos de ação. */
export function usePgrDadosAutomaticos(documentoId: string | null | undefined) {
  return useQuery({
    queryKey: ["pgr-dados-automaticos", documentoId],
    enabled: !!documentoId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("pgr_get_dados_automaticos", {
        p_documento_id: documentoId!,
      });
      if (error) throw error;
      return (data ?? {}) as unknown as PgrDadosAutomaticos;
    },
  });
}
