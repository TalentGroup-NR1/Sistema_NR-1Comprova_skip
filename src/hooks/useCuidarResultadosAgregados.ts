import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DimensaoAgrupamento = "departamento" | "cliente";
export type PeriodoMeses = 1 | 3 | 6 | 12;

export interface HeatmapCell {
  grupo: string;
  dimensao: string;
  media: number;
  respondentes: number;
  total_colaboradores: number;
}

export interface TimelinePoint {
  grupo: string;
  semana: string;
  media: number;
  respondentes: number;
}

export interface ResultadosAgregadosData {
  heatmap: HeatmapCell[];
  timeline: TimelinePoint[];
  grupos: string[];
  dimensoes: string[];
}

export const useCuidarResultadosAgregados = (
  dimensao: DimensaoAgrupamento,
  months: PeriodoMeses
) => {
  return useQuery({
    queryKey: ["cuidar-resultados-agregados", dimensao, months],
    queryFn: async (): Promise<ResultadosAgregadosData> => {
      const { data, error } = await supabase.rpc(
        "get_cuidar_plus_resultados_agregados" as any,
        { p_dimensao: dimensao, p_months: months }
      );
      if (error) throw error;
      const payload = (data ?? {}) as Partial<ResultadosAgregadosData>;
      return {
        heatmap: payload.heatmap ?? [],
        timeline: payload.timeline ?? [],
        grupos: payload.grupos ?? [],
        dimensoes: payload.dimensoes ?? [],
      };
    },
  });
};
