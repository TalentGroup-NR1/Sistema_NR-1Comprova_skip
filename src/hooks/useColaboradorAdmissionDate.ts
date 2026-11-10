import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Retorna a admission_date (YYYY-MM-DD) do colaborador.
 * Usado pelos componentes do módulo de Ponto para travar o motor de cálculo
 * em dias anteriores à admissão (sem gerar saldo/falta).
 */
export function useColaboradorAdmissionDate(colaboradorId: string | null | undefined) {
  return useQuery({
    queryKey: ["colaborador-admission-date", colaboradorId],
    queryFn: async (): Promise<string | null> => {
      if (!colaboradorId) return null;
      const { data, error } = await supabase
        .from("colaboradores")
        .select("admission_date")
        .eq("id", colaboradorId)
        .maybeSingle();
      if (error) throw error;
      return (data?.admission_date as string | null) ?? null;
    },
    enabled: !!colaboradorId,
    staleTime: 5 * 60_000,
  });
}
