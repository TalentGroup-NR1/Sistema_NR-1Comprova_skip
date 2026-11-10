import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export type FaleConoscoItemTipo = "sugestao" | "duvida";
export type FaleConoscoStatus = "recebido" | "em_analise" | "respondido" | "arquivado";

export interface FaleConoscoAdminItem {
  id: string;
  tipo: FaleConoscoItemTipo;
  titulo: string;
  mensagem: string;
  anonimo: boolean;
  autor_nome: string | null;
  status: FaleConoscoStatus;
  resposta: string | null;
  respondido_em: string | null;
  created_at: string;
}

export interface MinhaMensagemFaleConosco {
  id: string;
  tipo: FaleConoscoItemTipo;
  titulo: string;
  mensagem: string;
  status: FaleConoscoStatus;
  resposta: string | null;
  respondido_em: string | null;
  created_at: string;
}

export function useCriarFaleConosco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tipo: FaleConoscoItemTipo;
      titulo: string;
      mensagem: string;
      anonimo: boolean;
    }) => {
      const { data, error } = await supabase.rpc("criar_fale_conosco", {
        p_tipo: input.tipo,
        p_titulo: input.titulo,
        p_mensagem: input.mensagem,
        p_anonimo: input.anonimo,
      } as any);

      if (error) {
        if (error.message?.includes("rate_limit_exceeded")) {
          throw new Error("Muitos envios em pouco tempo. Tente novamente em 1 minuto.");
        }
        throw error;
      }

      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fale-conosco-admin"] });
      qc.invalidateQueries({ queryKey: ["fale-conosco-minhas"] });
      toast.success("Mensagem enviada com sucesso ao RH!");
    },
  });
}

export function useFaleConoscoAdmin(statusFiltro?: FaleConoscoStatus | "todos") {
  const { user, role } = useAuth();
  const canView = role === "admin_empresa" || role === "analista_rh";

  return useQuery({
    queryKey: ["fale-conosco-admin", user?.id, statusFiltro],
    enabled: !!user && canView,
    refetchInterval: 15000,
    queryFn: async () => {
      const p_status = statusFiltro && statusFiltro !== "todos" ? statusFiltro : null;
      const { data, error } = await supabase.rpc("listar_fale_conosco", {
        p_status,
      } as any);
      if (error) throw error;
      return (data ?? []) as FaleConoscoAdminItem[];
    },
  });
}

export function useResponderFaleConosco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      resposta: string;
      status?: FaleConoscoStatus;
    }) => {
      const { error } = await supabase.rpc("responder_fale_conosco", {
        p_id: input.id,
        p_resposta: input.resposta.trim(),
        p_novo_status: input.status || "respondido",
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fale-conosco-admin"] });
      qc.invalidateQueries({ queryKey: ["fale-conosco-minhas"] });
      toast.success("Resposta enviada com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao responder", { description: err?.message });
    },
  });
}

export function useMinhasMensagensFaleConosco() {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["fale-conosco-minhas", user?.id],
    enabled: !!isAuthenticated && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("minhas_mensagens_fale_conosco");
      if (error) throw error;
      return (data ?? []) as MinhaMensagemFaleConosco[];
    },
  });
}

