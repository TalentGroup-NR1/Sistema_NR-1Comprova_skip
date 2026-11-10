import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TipoDimensaoRisco } from "@/lib/psicoRiscos";

export type AgrupamentoHeatmap = "ghe" | "departamento";

export interface HeatmapDimensao {
  dimensao_id: string;
  dimensao: string;
  tipo_dimensao: TipoDimensaoRisco;
  corte_medio: number | null;
  corte_alto: number | null;
  ordem: number;
}

export interface HeatmapCelula extends HeatmapDimensao {
  media: number | null;
  indice: number | null;
}

export interface HeatmapLinha {
  grupo_chave: string;
  grupo_nome: string;
  grupo_id: string | null;
  respondentes: number;
  celulas: HeatmapCelula[];
}

export interface HeatmapPsicoData {
  agrupamento: AgrupamentoHeatmap;
  min_respondentes: number;
  total_atribuidos: number;
  total_respondidos: number;
  grupos_omitidos: number;
  dimensoes: HeatmapDimensao[];
  linhas: HeatmapLinha[];
}

export function useHeatmapPsico(avaliacaoId: string | null, agrupamento: AgrupamentoHeatmap) {
  return useQuery({
    queryKey: ["psico-heatmap", avaliacaoId, agrupamento],
    enabled: !!avaliacaoId,
    queryFn: async (): Promise<HeatmapPsicoData> => {
      const { data, error } = await supabase.rpc("psico_get_heatmap" as never, {
        p_avaliacao_id: avaliacaoId as string,
        p_agrupamento: agrupamento,
      } as never);
      if (error) throw error;
      return data as unknown as HeatmapPsicoData;
    },
  });
}

export function useGerarPlanosPsico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { avaliacaoId: string; agrupamento: AgrupamentoHeatmap }) => {
      const { data, error } = await supabase.rpc("psico_gerar_planos" as never, {
        p_avaliacao_id: v.avaliacaoId,
        p_agrupamento: v.agrupamento,
      } as never);
      if (error) throw error;
      return (data ?? { criados: 0, ja_existentes: 0 }) as { criados: number; ja_existentes: number };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planos-acao-nr1"] }),
  });
}
