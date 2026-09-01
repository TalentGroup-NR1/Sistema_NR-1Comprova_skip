import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";
import { toast } from "sonner";
import { getIsoWeek } from "@/lib/cuidarEngine";

export interface CuidarInsight {
  id: string;
  company_id: string;
  escopo: "semana" | "mes";
  ano: number;
  semana_iso: number | null;
  mes: number | null;
  humor_medio: number | null;
  tendencia: number | null;
  total_respostas: number;
  alertas_json: Array<Record<string, unknown>>;
  calculado_em: string;
}

/** Insight da semana corrente (auto_semanal). */
export function useInsightSemanaAtual() {
  const companyId = useEffectiveCompanyId();
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const semana = getIsoWeek(hoje);

  return useQuery({
    queryKey: ["cuidar-insight-semana", companyId, ano, semana],
    queryFn: async (): Promise<CuidarInsight | null> => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("cuidar_insights")
        .select("*")
        .eq("company_id", companyId)
        .eq("escopo", "semana")
        .eq("ano", ano)
        .eq("semana_iso", semana)
        .maybeSingle();
      if (error) throw error;
      return data as CuidarInsight | null;
    },
    enabled: !!companyId,
  });
}

/** Gera todas as campanhas automáticas (semanais + mensais) do ano informado. */
export function useGerarCampanhasAno() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { companyId: string; ano: number }) => {
      const { data, error } = await supabase.rpc("gerar_campanhas_cuidar_ano", {
        p_company_id: params.companyId,
        p_ano: params.ano,
      });
      if (error) throw error;
      return data as Array<{ criadas_semanal: number; criadas_mensal: number }>;
    },
    onSuccess: (data) => {
      const r = data?.[0];
      toast.success(
        `Calendário gerado: ${r?.criadas_semanal ?? 0} pulsos semanais e ${r?.criadas_mensal ?? 0} mensais.`
      );
      queryClient.invalidateQueries({ queryKey: ["pulse-campaigns"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
