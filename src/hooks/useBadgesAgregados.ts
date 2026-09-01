import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";

export interface BadgeAgregadoRow {
  badge_tipo: string;
  badge_label: string;
  total: number;
  departamento: string;
  total_por_depto: number;
}

/** Agregação semanal de badges para dashboard de RH. */
export function useBadgesAgregados(ano: number, semana: number) {
  const companyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ["badges-agregados", companyId, ano, semana],
    queryFn: async (): Promise<BadgeAgregadoRow[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc("agregar_badges_semana", {
        p_company_id: companyId,
        p_ano: ano,
        p_semana: semana,
      });
      if (error) throw error;
      return (data || []) as BadgeAgregadoRow[];
    },
    enabled: !!companyId,
  });
}
