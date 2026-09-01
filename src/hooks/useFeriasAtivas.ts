import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { eachDayOfInterval, format, parseISO } from "date-fns";

/**
 * Retorna Set de datas (yyyy-MM-dd) em que o colaborador estará de férias
 * dentro do período informado. Considera status planejado/aprovado/gozado.
 */
export function useFeriasAtivas(
  colaboradorId: string | null | undefined,
  periodoInicio?: string,
  periodoFim?: string,
) {
  const query = useQuery({
    queryKey: ["ferias-ativas", colaboradorId, periodoInicio, periodoFim],
    queryFn: async () => {
      if (!colaboradorId) return new Set<string>();
      let q = supabase
        .from("ferias_gozo")
        .select("data_inicio_gozo, data_fim_gozo, status")
        .eq("colaborador_id", colaboradorId)
        .in("status", ["planejado", "aprovado", "gozado"]);
      if (periodoFim) q = q.lte("data_inicio_gozo", periodoFim);
      if (periodoInicio) q = q.gte("data_fim_gozo", periodoInicio);
      const { data, error } = await q;
      if (error) throw error;
      const set = new Set<string>();
      for (const f of data || []) {
        const days = eachDayOfInterval({
          start: parseISO(f.data_inicio_gozo),
          end: parseISO(f.data_fim_gozo),
        });
        for (const d of days) set.add(format(d, "yyyy-MM-dd"));
      }
      return set;
    },
    enabled: !!colaboradorId,
  });

  return {
    feriasDates: query.data || new Set<string>(),
    isLoading: query.isLoading,
  };
}
