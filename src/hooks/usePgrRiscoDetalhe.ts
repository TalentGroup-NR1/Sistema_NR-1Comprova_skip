import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PgrRiscoDetalhe {
  fundamentacao_legal: string;
  lesoes_agravos: string;
  fontes_circunstancias: string;
  meio_propagacao: string;
  acoes_necessarias: string;
  observacao: string;
}

/** Salva a ficha de detalhes de um risco de GHE no PGR. */
export function useSalvarPgrRiscoDetalhe(documentoId: string | null | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ riscoId, detalhes }: { riscoId: string; detalhes: PgrRiscoDetalhe }) => {
      const { data, error } = await supabase.rpc("pgr_save_risco_detalhe" as never, {
        p_risco_ghe_id: riscoId,
        p_detalhes: detalhes as never,
      } as never);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pgr-dados-automaticos", documentoId] });
      toast.success("Ficha de risco salva");
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar ficha de risco");
    },
  });
}
