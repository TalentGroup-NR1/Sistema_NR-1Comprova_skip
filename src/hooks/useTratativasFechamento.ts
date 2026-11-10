import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TratativaAcao = "pagar" | "descontar" | "transferir" | "perdoar";

export interface SaldoFechamentoRow {
  colaborador_id: string;
  full_name: string;
  matricula: string | null;
  department: string | null;
  saldo_minutos: number;
  tratativa_id: string | null;
  tratativa_acao: TratativaAcao | null;
  tratativa_observacao: string | null;
  decidido_em: string | null;
}

export function useSaldosFechamento(companyId: string | null | undefined, ini: string, fim: string) {
  return useQuery({
    queryKey: ["saldos-fechamento", companyId, ini, fim],
    queryFn: async (): Promise<SaldoFechamentoRow[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc("get_saldos_para_fechamento", {
        p_company_id: companyId,
        p_periodo_inicio: ini,
        p_periodo_fim: fim,
      });
      if (error) throw error;
      return (data || []) as unknown as SaldoFechamentoRow[];
    },
    enabled: !!companyId,
    staleTime: 15_000,
  });
}

export function useRegistrarTratativa(companyId: string | null | undefined, ini: string, fim: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      colaborador_id: string;
      acao: TratativaAcao;
      observacao?: string | null;
    }) => {
      if (!companyId) throw new Error("Empresa não selecionada");
      const { data, error } = await supabase.rpc("registrar_tratativa_fechamento", {
        p_company_id: companyId,
        p_colaborador_id: params.colaborador_id,
        p_periodo_inicio: ini,
        p_periodo_fim: fim,
        p_acao: params.acao,
        p_observacao: params.observacao ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saldos-fechamento", companyId, ini, fim] });
    },
    onError: (e: any) => toast.error("Erro ao registrar tratativa: " + e.message),
  });
}
