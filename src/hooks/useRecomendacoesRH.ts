import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";

export interface RecomendacaoRHRow {
  departamento: string;
  tipo: string;
  recomendacao: string;
  metric: number;
  total_respondentes: number;
}

/** Recomendações organizacionais agregadas por departamento na semana. */
export function useRecomendacoesRH(ano: number, semana: number) {
  const companyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ["recomendacoes-rh", companyId, ano, semana],
    queryFn: async (): Promise<RecomendacaoRHRow[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc("agregar_recomendacoes_rh", {
        p_company_id: companyId,
        p_ano: ano,
        p_semana: semana,
      });
      if (error) throw error;
      return (data || []) as RecomendacaoRHRow[];
    },
    enabled: !!companyId,
  });
}
