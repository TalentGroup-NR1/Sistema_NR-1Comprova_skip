import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";
import { toast } from "sonner";

export interface PontoConfig {
  id: string;
  company_id: string;
  jornada_diaria_minutos: number;
  tolerancia_minutos: number;
  intervalo_minutos: number;
  inicio_noturno: string;
  fim_noturno: string;
  adicional_noturno_pct: number;
  adicional_hora_extra_pct: number;
  adicional_hora_extra_domingo_pct: number;
  faixas_hora_extra: any | null;
  bonus_fora_escala_ativo: boolean;
  bonus_sabado_pct: number;
  bonus_domingo_pct: number;
  bonus_feriado_pct: number;
  geolocation_required: boolean;
  banco_horas_ativo: boolean;
  periodo_fechamento_banco: string;
  banco_horas_inicio: string | null;
  banco_horas_fim: string | null;
  updated_at?: string;
}

export function usePontoConfig() {
  const companyId = useEffectiveCompanyId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["bancoHorasConfig", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("ponto_configuracoes")
        .select("*")
        .eq("company_id", companyId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PontoConfig | null;
    },
    enabled: !!companyId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const upsertConfig = useMutation({
    mutationFn: async (config: Partial<PontoConfig>) => {
      if (!companyId) throw new Error("Empresa não selecionada");
      const payload = { ...config, company_id: companyId, updated_at: new Date().toISOString() };

      const { data, error } = await supabase
        .from("ponto_configuracoes")
        .upsert(payload, { onConflict: "company_id" })
        .select("*")
        .single();
      if (error) throw error;
      return data as PontoConfig;
    },
    onSuccess: async (savedConfig) => {
      queryClient.setQueryData(["bancoHorasConfig", companyId], savedConfig);
      await queryClient.invalidateQueries({ queryKey: ["bancoHorasConfig", companyId] });
      await queryClient.refetchQueries({ queryKey: ["bancoHorasConfig", companyId] });
      toast.success("Configuração salva com sucesso");
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar configuração: " + err.message);
    },
  });

  return { config: query.data, isLoading: query.isLoading, upsertConfig };
}
