import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";

export interface TurnoverAlert {
  ghe_id: string;
  departamento: string;
  qtde_desligamentos: number;
  alerta_nota: number;
}

export function usePgrAnaliseTurnover() {
  const companyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ["pgr-analise-turnover", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("pgr_analise_turnover");

      if (error) {
        console.error("Erro ao analisar turnover do PGR:", error);
        throw error;
      }

      return (data || []) as TurnoverAlert[];
    },
  });
}
