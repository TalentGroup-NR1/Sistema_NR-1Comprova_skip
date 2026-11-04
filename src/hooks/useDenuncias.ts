import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export type DenunciaStatus = "novo" | "em_analise" | "concluido";
export type FaleConoscoTipo = "denuncia" | "sugestao" | "duvida";

export interface DenunciaAdmin {
  id: string;
  titulo: string;
  mensagem: string;
  status: DenunciaStatus;
  criado_em: string;
  anonimo: boolean;
  user_id: string | null;
  autor_nome: string | null;
  tipo: FaleConoscoTipo;
  categoria_comportamento: string | null;
  origem_ofensa: string | null;
  ciencia_cipa_em?: string | null;
  ciencia_cipa_por?: string | null;
  responsavel_id?: string | null;
  transferido_de?: string | null;
  atribuido_em?: string | null;
}

export interface HistoricoDenunciaItem {
  id: string;
  status_anterior: string | null;
  status_novo: string;
  justificativa: string | null;
  alterado_por: string;
  alterado_por_nome: string;
  created_at: string;
}

export interface ResponsavelDenunciaItem {
  user_id: string;
  nome: string;
  email: string;
  ativo: boolean;
  created_at: string;
  designado_por_nome: string;
}

export interface ContagemSemResponsavel {
  total_sem_responsavel: number;
  total_em_aberto: number;
  tem_designados: boolean;
}

export function useCriarDenuncia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      titulo: string;
      mensagem: string;
      anonimo: boolean;
      tipo: FaleConoscoTipo;
      categoria?: string | null;
      origem?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("criar_denuncia", {
        p_titulo: input.titulo,
        p_mensagem: input.mensagem,
        p_anonimo: input.anonimo,
        p_tipo: input.tipo,
        p_categoria: input.categoria ?? null,
        p_origem: input.origem ?? null,
      } as any);
      if (error) {
        if (error.message?.includes("rate_limit_exceeded")) {
          throw new Error("Muitos envios em pouco tempo. Tente novamente mais tarde.");
        }
        throw error;
      }
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["denuncias-admin"] });
    },
  });
}

export function useDenunciasAdmin(enabled = true) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["denuncias-admin", user?.id ?? "guest"],
    enabled: enabled && !!user?.id,
    refetchInterval: enabled ? 10000 : false,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("listar_denuncias_admin");
      if (error) throw error;
      return (data ?? []) as DenunciaAdmin[];
    },
  });
}

const LS_LAST_SEEN_KEY = "denuncias:last-seen-id";

/**
 * Hook global para responsáveis designados: monitora novas denúncias, dispara toast e
 * retorna a contagem de denúncias com status "novo" (para badge no menu).
 * Restrito estritamente a quem for responsável designado (Lei 14.457/2022).
 */
export function useDenunciasMonitor() {
  const { isAuthenticated, user } = useAuth();
  const { data: isResponsavel } = useIsResponsavelDenuncia();
  const shouldMonitor = !!isAuthenticated && !!isResponsavel;

  const query = useDenunciasAdmin(shouldMonitor);
  const initializedRef = useRef(false);
  const storageKey = useMemo(
    () => (user?.id ? `${LS_LAST_SEEN_KEY}:${user.id}` : LS_LAST_SEEN_KEY),
    [user?.id]
  );

  useEffect(() => {
    if (!shouldMonitor) {
      initializedRef.current = false;
      return;
    }

    const data = query.data;
    if (!data) {
      return;
    }

    const lastSeen = localStorage.getItem(storageKey);
    const newest = data[0];

    if (!initializedRef.current) {
      initializedRef.current = true;

      if (!newest) {
        return;
      }

      if (!lastSeen) {
        const novoCount = data.filter((d) => d.status === "novo").length;
        toast.info(
          novoCount <= 1 ? "Nova denúncia recebida" : `${novoCount} denúncias aguardando análise`,
          {
            description: data[0]?.titulo,
            duration: 8000,
          }
        );
        localStorage.setItem(storageKey, newest.id);
      }

      return;
    }

    if (!newest) {
      return;
    }

    if (!lastSeen) {
      toast.info("Nova denúncia recebida", {
        description: newest.titulo,
        duration: 8000,
      });
      localStorage.setItem(storageKey, newest.id);
      return;
    }

    if (newest.id !== lastSeen) {
      const novas = [];
      for (const d of data) {
        if (d.id === lastSeen) break;
        novas.push(d);
      }
      if (novas.length > 0) {
        toast.info(
          novas.length === 1
            ? "Nova denúncia recebida"
            : `${novas.length} novas denúncias recebidas`,
          {
            description: novas[0].titulo,
            duration: 8000,
          }
        );
      }
      localStorage.setItem(storageKey, newest.id);
    }
  }, [query.data, shouldMonitor, storageKey]);

  const denunciasNovas = (query.data ?? []).filter(
    (d) => d.status === "novo" && d.tipo === "denuncia"
  ).length;
  const faleConoscoNovos = (query.data ?? []).filter(
    (d) => d.status === "novo" && d.tipo !== "denuncia"
  ).length;
  const novoCount = (query.data ?? []).filter((d) => d.status === "novo").length;

  return { novoCount, denunciasNovas, faleConoscoNovos, enabled: shouldMonitor };
}

export function useAtualizarStatusDenuncia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: DenunciaStatus;
      justificativa?: string | null;
    }) => {
      const { error } = await supabase.rpc("atualizar_status_denuncia", {
        p_id: input.id,
        p_novo_status: input.status,
        p_justificativa: input.justificativa ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["denuncias-admin"] });
      qc.invalidateQueries({ queryKey: ["denuncia-historico"] });
    },
  });
}

export function useRegistrarCienciaCipa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (denunciaId: string) => {
      const { error } = await supabase.rpc("registrar_ciencia_cipa", {
        p_denuncia_id: denunciaId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["denuncias-admin"] });
      qc.invalidateQueries({ queryKey: ["denuncia-historico"] });
    },
  });
}

export function useHistoricoDenuncia(denunciaId: string | null) {
  return useQuery({
    queryKey: ["denuncia-historico", denunciaId],
    enabled: !!denunciaId,
    queryFn: async () => {
      if (!denunciaId) return [];
      const { data, error } = await supabase.rpc("listar_historico_denuncia", {
        p_denuncia_id: denunciaId,
      } as any);
      if (error) throw error;
      return (data ?? []) as HistoricoDenunciaItem[];
    },
  });
}

export function useIsResponsavelDenuncia() {
  const { user, isAuthenticated } = useAuth();
  const query = useQuery({
    queryKey: ["is-responsavel-denuncia", user?.id ?? "guest"],
    enabled: !!isAuthenticated && !!user?.id,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("sou_responsavel_denuncia");
      if (error) {
        return false;
      }
      return !!data;
    },
  });

  return {
    ...query,
    data: query.data ?? false,
  };
}

export function useResponsaveisDenuncias() {
  const { user, role } = useAuth();
  const canList = role === "admin_empresa" || role === "admin_master";
  return useQuery({
    queryKey: ["denuncias-responsaveis", user?.id],
    enabled: !!user && canList,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("listar_responsaveis_denuncias");
      if (error) throw error;
      return (data ?? []) as ResponsavelDenunciaItem[];
    },
  });
}

export function useDesignarResponsavelDenuncia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("designar_responsavel_denuncia", {
        p_user_id: userId,
      } as any);
      if (error) {
        if (error.message?.includes("limite_designados_atingido")) {
          throw new Error("Limite de 3 responsáveis ativos por empresa atingido.");
        }
        if (error.message?.includes("forbidden")) {
          throw new Error("Apenas o Administrador da Empresa pode designar responsáveis.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["denuncias-responsaveis"] });
      qc.invalidateQueries({ queryKey: ["is-responsavel-denuncia"] });
      qc.invalidateQueries({ queryKey: ["denuncias-contagem-sem-resp"] });
      qc.invalidateQueries({ queryKey: ["denuncias-admin"] });
      toast.success("Responsável pelo Canal de Denúncias designado com sucesso.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao designar responsável.");
    },
  });
}

export function useRemoverResponsavelDenuncia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      transferirPara,
    }: {
      userId: string;
      transferirPara?: string;
    }) => {
      const { error } = await supabase.rpc("remover_responsavel_denuncia", {
        p_user_id: userId,
        p_transferir_para: transferirPara ?? null,
      } as any);
      if (error) {
        if (error.message?.includes("nenhum_designado_restante")) {
          throw new Error("Não há outro responsável ativo para receber as denúncias abertas. Designe outro membro antes de remover.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["denuncias-responsaveis"] });
      qc.invalidateQueries({ queryKey: ["is-responsavel-denuncia"] });
      qc.invalidateQueries({ queryKey: ["denuncias-contagem-sem-resp"] });
      qc.invalidateQueries({ queryKey: ["denuncias-admin"] });
      toast.success("Responsável removido com sucesso.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao remover responsável.");
    },
  });
}

export function useContagemDenunciasSemResponsavel() {
  const { user, role } = useAuth();
  const canView = role === "admin_empresa" || role === "admin_master";
  return useQuery({
    queryKey: ["denuncias-contagem-sem-resp", user?.id],
    enabled: !!user && canView,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("contagem_denuncias_sem_responsavel");
      if (error) throw error;
      return data as ContagemSemResponsavel;
    },
  });
}
