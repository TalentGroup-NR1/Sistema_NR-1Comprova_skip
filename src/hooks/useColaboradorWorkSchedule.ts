import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WorkScheduleInfo } from "./usePontoResumo";

/**
 * Carrega o work_schedule (dias_semana + trabalha_feriados) de um colaborador.
 * Retorna null quando o colaborador não possui horário vinculado — neste caso,
 * o cálculo de ponto usa o fallback histórico (seg–sex previsto, sáb/dom não).
 */
export function useColaboradorWorkSchedule(colaboradorId: string | undefined | null) {
  return useQuery({
    queryKey: ["colaborador-work-schedule", colaboradorId],
    enabled: !!colaboradorId,
    queryFn: async (): Promise<WorkScheduleInfo | null> => {
      if (!colaboradorId) return null;
      const { data: colab, error: e1 } = await supabase
        .from("colaboradores")
        .select("work_schedule_id")
        .eq("id", colaboradorId)
        .maybeSingle();
      if (e1) throw e1;
      if (!colab?.work_schedule_id) return null;
      const { data, error } = await supabase
        .from("work_schedules")
        .select("dias_semana, trabalha_feriados, tolerancia_minutos, carga_diaria_minutos, horarios_por_dia")
        .eq("id", colab.work_schedule_id)
        .maybeSingle();
      if (error) throw error;

      return data as unknown as WorkScheduleInfo | null;
    },
  });
}
