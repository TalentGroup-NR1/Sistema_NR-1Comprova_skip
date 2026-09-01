import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface CampanhaPendente {
  id: string;
  company_id: string;
  titulo: string;
  descricao: string | null;
  imagem_url: string | null;
  data_inicio: string;
  data_fim: string;
  materiais: Array<{ nome: string; url: string; tipo?: string }> | null;
}

export interface LeituraCampanhaReportRow {
  user_id: string;
  nome: string;
  departamento: string;
  cargo: string;
  cpf: string | null;
  matricula: string | null;
  email_pessoal: string | null;
  lido: boolean;
  lido_em: string | null;
}

export function useCampanhasPendentes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["campanhas-pendentes", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as CampanhaPendente[];
      const { data, error } = await supabase.rpc("buscar_campanhas_pendentes" as any, {
        p_user_id: user.id,
      });
      if (error) throw error;
      return (data ?? []) as CampanhaPendente[];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

export function useRegistrarLeituraCampanha() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campanhaId: string) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { error } = await supabase.rpc("registrar_leitura_campanha" as any, {
        p_campanha_id: campanhaId,
        p_user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campanhas-pendentes"] });
      qc.invalidateQueries({ queryKey: ["relatorio-leituras-campanha"] });
    },
  });
}

export function useRelatorioLeiturasCampanha(campanhaId: string | null) {
  return useQuery({
    queryKey: ["relatorio-leituras-campanha", campanhaId],
    queryFn: async () => {
      if (!campanhaId) return [] as LeituraCampanhaReportRow[];
      const { data, error } = await supabase.rpc("relatorio_leituras_campanha" as any, {
        p_campanha_id: campanhaId,
      });
      if (error) throw error;
      return (data ?? []) as LeituraCampanhaReportRow[];
    },
    enabled: !!campanhaId,
  });
}
