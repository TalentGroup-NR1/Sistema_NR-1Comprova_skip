import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";
import { toast } from "sonner";

export interface PontoCompensacao {
  id: string;
  company_id: string;
  descricao: string;
  total_horas_compensar: number; // in minutes
  dias_compensacao: number;
  minutos_extras_dia: number | null;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  created_at: string;
}

export function usePontoCompensacoes() {
  const companyId = useEffectiveCompanyId();
  const queryClient = useQueryClient();

  const { data: compensacoes = [], isLoading } = useQuery({
    queryKey: ["ponto-compensacoes", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("ponto_compensacoes" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PontoCompensacao[];
    },
    enabled: !!companyId,
  });

  const createCompensacao = useMutation({
    mutationFn: async (params: Omit<PontoCompensacao, "id" | "minutos_extras_dia" | "created_at">) => {
      const { error } = await supabase
        .from("ponto_compensacoes" as any)
        .insert(params as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ponto-compensacoes"] });
      toast.success("Compensação criada com sucesso");
    },
    onError: () => toast.error("Erro ao criar compensação"),
  });

  const updateCompensacao = useMutation({
    mutationFn: async ({ id, ...params }: Partial<PontoCompensacao> & { id: string }) => {
      const { error } = await supabase
        .from("ponto_compensacoes" as any)
        .update(params as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ponto-compensacoes"] });
      toast.success("Compensação atualizada");
    },
    onError: () => toast.error("Erro ao atualizar compensação"),
  });

  const deleteCompensacao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ponto_compensacoes" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ponto-compensacoes"] });
      toast.success("Compensação removida");
    },
    onError: () => toast.error("Erro ao remover compensação"),
  });

  return { compensacoes, isLoading, createCompensacao, updateCompensacao, deleteCompensacao };
}
