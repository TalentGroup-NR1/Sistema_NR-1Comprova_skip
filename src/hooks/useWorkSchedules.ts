import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";

export interface HorarioDia {
  em?: string | null;
  sm?: string | null;
  et?: string | null;
  st?: string | null;
  carga?: number;
}

export type HorariosPorDia = Record<string, HorarioDia>;

export interface WorkSchedule {
  id: string;
  company_id: string;
  nome: string;
  entrada_manha: string | null;
  saida_manha: string | null;
  entrada_tarde: string | null;
  saida_tarde: string | null;
  carga_diaria_minutos: number;
  tolerancia_minutos: number;
  ativo: boolean;
  dias_semana: number[];
  trabalha_feriados: boolean;
  horarios_por_dia: HorariosPorDia | null;
  created_at: string;
  updated_at: string;
}


export type WorkScheduleInput = Omit<WorkSchedule, "id" | "created_at" | "updated_at" | "company_id">;

export function formatScheduleLabel(s: WorkSchedule): string {
  const parts: string[] = [];
  if (s.entrada_manha && s.saida_manha) {
    parts.push(`${s.entrada_manha.substring(0, 5)}–${s.saida_manha.substring(0, 5)}`);
  }
  if (s.entrada_tarde && s.saida_tarde) {
    parts.push(`${s.entrada_tarde.substring(0, 5)}–${s.saida_tarde.substring(0, 5)}`);
  }
  return parts.length ? `${s.nome} (${parts.join(" / ")})` : s.nome;
}

export function useWorkSchedules(companyIdOverride?: string | null) {
  const effectiveCompanyId = useEffectiveCompanyId();
  const companyId = companyIdOverride ?? effectiveCompanyId;
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["work_schedules", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_schedules")
        .select("*")
        .eq("company_id", companyId!)
        .order("nome");
      if (error) throw error;
      return data as WorkSchedule[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: WorkScheduleInput) => {
      if (!companyId) throw new Error("Empresa não selecionada");
      const { data, error } = await supabase
        .from("work_schedules")
        .insert({ ...input, company_id: companyId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as WorkSchedule;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work_schedules"] });
      toast.success("Horário cadastrado");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao cadastrar horário"),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: WorkScheduleInput & { id: string }) => {
      const { data, error } = await supabase
        .from("work_schedules")
        .update(input as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as WorkSchedule;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work_schedules"] });
      toast.success("Horário atualizado");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar horário"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("work_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work_schedules"] });
      toast.success("Horário removido");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao remover horário"),
  });

  return { ...list, create, update, remove };
}
