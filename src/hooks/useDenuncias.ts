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
  assumido_por?: string | null;
  assumido_por_nome?: string | null;
  assumido_em?: string | null;
  parecer_atual?: string | null;
  parecer_em?: string | null;
  parecer_por?: string | null;
  prazo_primeira_resposta?: string | null;
  prazo_conclusao?: string | null;
  primeira_resposta_em?: string | null;
  protocolo?: string;
  data_fato?: string | null;
  resumo_publico?: string | null;
  ultima_mensagem_denunciante_em?: string | null;
  mensagens_nao_lidas_comite?: number;
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
      data_fato?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("criar_denuncia", {
        p_titulo: input.titulo,
        p_mensagem: input.mensagem,
        p_anonimo: input.anonimo,
        p_tipo: input.tipo,
        p_categoria: input.categoria ?? null,
        p_origem: input.origem ?? null,
        p_data_fato: input.data_fato ?? null,
      } as any);
      if (error) {
        if (error.message?.includes("rate_limit_exceeded")) {
          throw new Error("Muitos envios em pouco tempo. Tente novamente mais tarde.");
        }
        throw error;
      }
      return data as string; // Retorna o protocolo gerado (ex: DEN-2026-XXXXXXXX)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["denuncias-admin"] });
      qc.invalidateQueries({ queryKey: ["denuncias-alertas-contagem"] });
      qc.invalidateQueries({ queryKey: ["denuncias-alertas-lista"] });
      supabase.functions
        .invoke("notify-denuncia-designados", {
          body: { mode: "nova_denuncia" },
        })
        .catch((err) => {
          console.warn("[notify-denuncia-designados] Envio em background:", err?.message);
        });
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
      parecer?: string | null;
      justificativa?: string | null;
      resumo_publico?: string | null;
    }) => {
      const parecerTexto = input.parecer ?? input.justificativa ?? null;
      const { error } = await supabase.rpc("atualizar_status_denuncia", {
        p_id: input.id,
        p_novo_status: input.status,
        p_parecer: parecerTexto,
        p_resumo_publico: input.resumo_publico ?? null,
      } as any);
      if (error) {
        if (error.message?.includes("assuma_a_denuncia_primeiro")) {
          throw new Error("Você precisa assumir a denúncia antes de tratá-la.");
        }
        if (error.message?.includes("parecer_obrigatorio_para_conclusao")) {
          throw new Error("O parecer de apuração é obrigatório para conclusão (mínimo de 30 caracteres).");
        }
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["denuncias-admin"] });
      qc.invalidateQueries({ queryKey: ["denuncia-historico"] });
      qc.invalidateQueries({ queryKey: ["denuncias-vencidas"] });
      qc.invalidateQueries({ queryKey: ["denuncias-contagem-sem-resp"] });
      qc.invalidateQueries({ queryKey: ["denuncia-mensagens-comite"] });
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

export function useAssumirDenuncia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (denunciaId: string) => {
      const { error } = await supabase.rpc("assumir_denuncia", {
        p_id: denunciaId,
      } as any);
      if (error) {
        if (error.message?.includes("denuncia_ja_assumida")) {
          throw new Error("Esta denúncia já foi assumida por outro responsável.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["denuncias-admin"] });
      qc.invalidateQueries({ queryKey: ["denuncia-historico"] });
      qc.invalidateQueries({ queryKey: ["denuncias-vencidas"] });
      qc.invalidateQueries({ queryKey: ["denuncias-contagem-sem-resp"] });
      toast.success("Você assumiu a denúncia para apuração.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao assumir denúncia.");
    },
  });
}

export function useLiberarDenuncia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (denunciaId: string) => {
      const { error } = await supabase.rpc("liberar_denuncia", {
        p_id: denunciaId,
      } as any);
      if (error) {
        if (error.message?.includes("apenas_quem_assumiu_pode_liberar")) {
          throw new Error("Apenas o responsável que assumiu pode liberar a denúncia ao comitê.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["denuncias-admin"] });
      qc.invalidateQueries({ queryKey: ["denuncia-historico"] });
      qc.invalidateQueries({ queryKey: ["denuncias-vencidas"] });
      qc.invalidateQueries({ queryKey: ["denuncias-contagem-sem-resp"] });
      toast.success("Denúncia liberada de volta ao comitê.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao liberar denúncia.");
    },
  });
}

export interface DenunciaVencidaItem {
  id: string;
  titulo: string;
  status: string;
  criado_em: string;
  assumido_por: string | null;
  dias_vencidos: number;
}

export function useListarDenunciasVencidas() {
  const { user, isAuthenticated } = useAuth();
  const { data: isResponsavel } = useIsResponsavelDenuncia();

  return useQuery({
    queryKey: ["denuncias-vencidas", user?.id],
    enabled: !!isAuthenticated && !!isResponsavel,
    refetchInterval: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("listar_denuncias_vencidas");
      if (error) throw error;
      const row = (data as any)?.[0];
      return {
        total_vencidas: (row?.total_vencidas as number) ?? 0,
        denuncias_vencidas: (row?.denuncias_vencidas as DenunciaVencidaItem[]) ?? [],
      };
    },
  });
}

export interface MensagemProtocolo {
  id: string;
  autor: "denunciante" | "comite";
  autor_nome?: string;
  mensagem: string;
  created_at: string;
}

export interface ConsultaProtocoloResultado {
  protocolo: string;
  status_externo: "Recebida" | "Em análise" | "Em apuração" | "Concluída";
  criado_em: string;
  data_fato: string | null;
  mensagens: MensagemProtocolo[];
  resumo_publico: string | null;
  permite_resposta: boolean;
  erro?: string;
}

export function useConsultarProtocolo() {
  return useMutation({
    mutationFn: async ({
      protocolo,
      dataFato,
    }: {
      protocolo: string;
      dataFato?: string | null;
    }): Promise<ConsultaProtocoloResultado> => {
      const { data, error } = await supabase.rpc("consultar_denuncia_por_protocolo", {
        p_protocolo: protocolo.trim(),
        p_data_fato: dataFato ? dataFato : null,
      } as any);

      if (error) {
        if (error.message?.includes("rate_limit_exceeded")) {
          throw new Error("Muitas tentativas de consulta. Aguarde um minuto.");
        }
        throw new Error("Protocolo inválido ou não encontrado.");
      }

      const res = data as ConsultaProtocoloResultado;
      if (res?.erro) {
        throw new Error("Protocolo inválido ou não encontrado.");
      }

      return res;
    },
  });
}

export function useResponderProtocolo() {
  return useMutation({
    mutationFn: async ({
      protocolo,
      dataFato,
      mensagem,
    }: {
      protocolo: string;
      dataFato?: string | null;
      mensagem: string;
    }) => {
      const { data, error } = await supabase.rpc("responder_denuncia_por_protocolo", {
        p_protocolo: protocolo.trim(),
        p_data_fato: dataFato ? dataFato : null,
        p_mensagem: mensagem.trim(),
      } as any);

      if (error) {
        if (error.message?.includes("rate_limit_exceeded")) {
          throw new Error("Muitas tentativas de envio. Aguarde um momento.");
        }
        throw error;
      }

      const res = data as any;
      if (res?.erro) {
        throw new Error("Não foi possível enviar a mensagem.");
      }

      return res;
    },
  });
}

export function useComiteMensagens(denunciaId: string | null) {
  return useQuery({
    queryKey: ["denuncia-mensagens-comite", denunciaId],
    enabled: !!denunciaId,
    refetchInterval: 15000,
    queryFn: async () => {
      if (!denunciaId) return [];
      const { data, error } = await supabase.rpc("comite_listar_mensagens", {
        p_denuncia_id: denunciaId,
      } as any);
      if (error) throw error;
      return (data ?? []) as MensagemProtocolo[];
    },
  });
}

export function useComiteEnviarMensagem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      denunciaId,
      mensagem,
    }: {
      denunciaId: string;
      mensagem: string;
    }) => {
      const { error } = await supabase.rpc("comite_enviar_mensagem", {
        p_denuncia_id: denunciaId,
        p_mensagem: mensagem.trim(),
      } as any);
      if (error) {
        if (error.message?.includes("assuma_a_denuncia_primeiro")) {
          throw new Error("Você precisa assumir a denúncia para responder ao denunciante.");
        }
        throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["denuncia-mensagens-comite", vars.denunciaId] });
      qc.invalidateQueries({ queryKey: ["denuncias-admin"] });
      qc.invalidateQueries({ queryKey: ["denuncias-alertas-contagem"] });
      qc.invalidateQueries({ queryKey: ["denuncias-alertas-lista"] });
      toast.success("Mensagem enviada com sucesso ao denunciante.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao enviar mensagem.");
    },
  });
}

export interface ContadorDenunciasAlertas {
  total_nao_assumidas: number;
  total_vencidas: number;
  total_novas_24h: number;
}

export interface DenunciaAlertaItem {
  id: string;
  protocolo: string;
  criado_em: string;
  prazo_primeira_resposta: string | null;
  vencida: boolean;
  dias_para_vencer: number;
}

export function useContarDenunciasNaoAssumidas() {
  const { user, isAuthenticated } = useAuth();
  const { data: isResponsavel } = useIsResponsavelDenuncia();

  return useQuery({
    queryKey: ["denuncias-alertas-contagem", user?.id],
    enabled: !!isAuthenticated && !!isResponsavel,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<ContadorDenunciasAlertas> => {
      const { data, error } = await supabase.rpc("contar_denuncias_nao_assumidas");
      if (error) throw error;
      const res = (data as any) || {};
      return {
        total_nao_assumidas: Number(res.total_nao_assumidas) || 0,
        total_vencidas: Number(res.total_vencidas) || 0,
        total_novas_24h: Number(res.total_novas_24h) || 0,
      };
    },
  });
}

export function useListarDenunciasParaAlerta() {
  const { user, isAuthenticated } = useAuth();
  const { data: isResponsavel } = useIsResponsavelDenuncia();

  return useQuery({
    queryKey: ["denuncias-alertas-lista", user?.id],
    enabled: !!isAuthenticated && !!isResponsavel,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<DenunciaAlertaItem[]> => {
      const { data, error } = await supabase.rpc("listar_denuncias_para_alerta");
      if (error) throw error;
      return (data ?? []) as DenunciaAlertaItem[];
    },
  });
}
