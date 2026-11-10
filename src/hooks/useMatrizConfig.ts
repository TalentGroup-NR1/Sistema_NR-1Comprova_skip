import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { CONFIG_PADRAO, type MatrizConfig } from "@/lib/matrizRisco";

export function useMatrizConfig() {
  const companyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ["nr1-matriz-config", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<MatrizConfig> => {
      const { data, error } = await supabase.rpc("nr1_get_matriz_config" as never, {
        p_company_id: companyId,
      } as never);
      if (error) throw error;
      return (data ?? CONFIG_PADRAO) as unknown as MatrizConfig;
    },
  });
}

export function useSalvarMatrizConfig() {
  const qc = useQueryClient();
  const companyId = useEffectiveCompanyId();
  return useMutation({
    mutationFn: async (cfg: MatrizConfig) => {
      if (!companyId) throw new Error("Selecione uma empresa.");
      const { error } = await supabase.rpc("nr1_save_matriz_config" as never, {
        p_company_id: companyId,
        p_config: {
          corte_verde: cfg.corte_verde,
          corte_amarelo: cfg.corte_amarelo,
          corte_laranja: cfg.corte_laranja,
          corte_vermelho: cfg.corte_vermelho,
        },
      } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nr1-matriz-config"] }),
  });
}
