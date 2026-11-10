import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TransferenciaItem {
  id: string;
  colaborador_id: string;
  empresa_origem_id: string;
  empresa_destino_id: string;
  transferido_por: string;
  motivo: string;
  created_at: string;
  empresa_origem_nome: string;
  empresa_destino_nome: string;
  transferido_por_nome: string;
}

export function useTransferenciasColaborador(colaboradorId: string | null | undefined) {
  return useQuery({
    enabled: !!colaboradorId,
    queryKey: ["transferencias", colaboradorId],
    queryFn: async (): Promise<TransferenciaItem[]> => {
      const { data: transferencias, error } = await supabase
        .from("transferencias_colaborador")
        .select("*")
        .eq("colaborador_id", colaboradorId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!transferencias || transferencias.length === 0) return [];

      const companyIds = Array.from(
        new Set(transferencias.flatMap((t) => [t.empresa_origem_id, t.empresa_destino_id])),
      );
      const userIds = Array.from(new Set(transferencias.map((t) => t.transferido_por)));

      const [{ data: companies }, { data: profiles }] = await Promise.all([
        supabase.from("companies").select("id, name").in("id", companyIds),
        supabase.from("profiles").select("user_id, full_name").in("user_id", userIds),
      ]);

      const companyName = (id: string) => {
        const c = companies?.find((x) => x.id === id);
        return c?.name || "—";
      };
      const userName = (id: string) =>
        profiles?.find((p) => p.user_id === id)?.full_name || "Usuário";

      return transferencias.map((t) => ({
        ...t,
        empresa_origem_nome: companyName(t.empresa_origem_id),
        empresa_destino_nome: companyName(t.empresa_destino_id),
        transferido_por_nome: userName(t.transferido_por),
      }));
    },
  });
}

// Set de colaborador_ids transferidos nas últimas 48h (para badge na listagem).
export function useTransferenciasRecentes() {
  return useQuery({
    queryKey: ["transferencias", "recent-48h"],
    queryFn: async (): Promise<Set<string>> => {
      const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("transferencias_colaborador")
        .select("colaborador_id")
        .gte("created_at", since);
      if (error) return new Set();
      return new Set((data || []).map((r) => r.colaborador_id));
    },
    staleTime: 60_000,
  });
}

export function useTransferirColaborador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      colaboradorId: string;
      empresaDestinoId: string;
      motivo?: string;
    }) => {
      const { data, error } = await supabase.rpc("transferir_colaborador", {
        p_colaborador_id: args.colaboradorId,
        p_empresa_destino_id: args.empresaDestinoId,
        p_motivo: args.motivo ?? "",
      });
      if (error) throw error;
      return data as unknown as {
        transferencia_id: string;
        colaborador_id: string;
        empresa_origem_id: string;
        empresa_destino_id: string;
        empresa_destino_nome: string;
      };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["colaboradores"] });
      qc.invalidateQueries({ queryKey: ["colaborador", data.colaborador_id] });
      qc.invalidateQueries({ queryKey: ["transferencias", data.colaborador_id] });
      qc.invalidateQueries({ queryKey: ["transferencias", "recent-48h"] });
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success(`Colaborador transferido para ${data.empresa_destino_nome} com sucesso!`);
    },
    onError: (err: Error) => {
      toast.error("Erro ao transferir colaborador: " + err.message);
    },
  });
}
