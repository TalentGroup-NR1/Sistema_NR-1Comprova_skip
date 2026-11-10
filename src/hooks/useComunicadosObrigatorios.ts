import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ComunicadoPendente {
  id: string;
  company_id: string;
  titulo: string;
  conteudo: string;
  autor_nome: string;
  data_publicacao: string | null;
  image_url: string | null;
  is_pinned: boolean;
}

export interface LeituraReportRow {
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

export function useComunicadosPendentes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["comunicados-pendentes", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as ComunicadoPendente[];
      const { data, error } = await supabase.rpc("buscar_comunicados_pendentes", {
        p_user_id: user.id,
      });
      if (error) throw error;
      return (data ?? []) as ComunicadoPendente[];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

export function useRegistrarLeitura() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (comunicadoId: string) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { error } = await supabase.rpc("registrar_leitura_comunicado", {
        p_comunicado_id: comunicadoId,
        p_user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comunicados-pendentes"] });
      qc.invalidateQueries({ queryKey: ["dashboard-comunicados"] });
      qc.invalidateQueries({ queryKey: ["relatorio-leituras"] });
    },
  });
}

export function useRelatorioLeituras(comunicadoId: string | null) {
  return useQuery({
    queryKey: ["relatorio-leituras", comunicadoId],
    queryFn: async () => {
      if (!comunicadoId) return [] as LeituraReportRow[];
      const { data, error } = await supabase.rpc("relatorio_leituras_comunicado", {
        p_comunicado_id: comunicadoId,
      });
      if (error) throw error;
      return (data ?? []) as LeituraReportRow[];
    },
    enabled: !!comunicadoId,
  });
}
