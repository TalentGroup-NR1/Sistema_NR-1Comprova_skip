import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CategoriaRisco } from "@/lib/matrizRisco";

export interface SugestaoRisco {
  risco_catalogo_id: string;
  nome: string;
  categoria: CategoriaRisco;
  probabilidade: number;
  severidade: number;
  origem_dados: string | null;
  motivo_sugestao: string | null;
  ja_adicionado: boolean;
}

export function useSugestaoRiscos(gheId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["nr1-sugestoes", gheId],
    enabled: !!gheId && enabled,
    queryFn: async (): Promise<SugestaoRisco[]> => {
      const { data, error } = await supabase.rpc("nr1_sugerir_riscos" as never, {
        p_ghe_id: gheId as string,
      } as never);
      if (error) throw error;
      return (data ?? []) as unknown as SugestaoRisco[];
    },
  });
}

export function useSyncPsicossociais() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (avaliacaoId: string) => {
      const { data, error } = await supabase.rpc("nr1_sync_psicossociais" as never, {
        p_avaliacao_id: avaliacaoId,
      } as never);
      if (error) throw error;
      return (data ?? { riscos_criados: 0, planos_criados: 0 }) as unknown as {
        riscos_criados: number;
        planos_criados: number;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nr1-riscos-ghe"] });
      qc.invalidateQueries({ queryKey: ["nr1-matriz"] });
      qc.invalidateQueries({ queryKey: ["planos-acao-nr1"] });
      qc.invalidateQueries({ queryKey: ["nr1-planos-risco"] });
    },
  });
}
