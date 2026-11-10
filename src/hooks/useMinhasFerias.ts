import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export interface SolicitacaoFeriasInput {
  colaborador_id: string;
  company_id: string;
  periodo_aquisitivo_id: string;
  data_inicio_gozo: Date;
  data_fim_gozo: Date;
  dias_gozados: number;
  data_pagamento: Date;
  abono_pecuniario_dias?: number;
  observacoes?: string | null;
}

/** Resolve the colaborador linked to the current authenticated user. */
export function useMeuColaborador() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["meu-colaborador", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, full_name, job_title, department, admission_date, manager_name, company_id, birth_date, contract_type")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

export function useEnsureMeusPeriodos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("ensure_meus_periodos_aquisitivos");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ferias-colaborador"] });
    },
    onError: (error: Error) => {
      console.error("ensure_meus_periodos_aquisitivos:", error.message);
    },
  });
}

export function useSolicitarFerias() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: SolicitacaoFeriasInput) => {
      const payload = {
        colaborador_id: input.colaborador_id,
        company_id: input.company_id,
        periodo_aquisitivo_id: input.periodo_aquisitivo_id,
        data_inicio_gozo: format(input.data_inicio_gozo, "yyyy-MM-dd"),
        data_fim_gozo: format(input.data_fim_gozo, "yyyy-MM-dd"),
        dias_gozados: input.dias_gozados,
        data_pagamento: format(input.data_pagamento, "yyyy-MM-dd"),
        abono_pecuniario_dias: input.abono_pecuniario_dias ?? 0,
        status: "planejado" as const,
        observacoes: input.observacoes ?? null,
        solicitado_por: user?.id ?? null,
      };
      const { data, error } = await supabase
        .from("ferias_gozo")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ferias-colaborador"] });
      queryClient.invalidateQueries({ queryKey: ["minhas-ferias"] });
      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação foi enviada e aguarda aprovação do gestor.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao solicitar férias",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCancelarSolicitacaoFerias() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ferias_gozo").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ferias-colaborador"] });
      queryClient.invalidateQueries({ queryKey: ["minhas-ferias"] });
      toast({ title: "Solicitação cancelada" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao cancelar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
