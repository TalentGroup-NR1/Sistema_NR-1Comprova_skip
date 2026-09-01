import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";
import { toast } from "sonner";
import { getHojeBR, getDataBR } from "@/lib/dateBR";

export type PontoRegistroTipo = "ENTRADA" | "SAIDA";

export interface PontoRegistro {
  id: string;
  colaborador_id: string;
  company_id: string;
  tipo: PontoRegistroTipo;
  data_hora: string;
  observacao: string | null;
  latitude: number | null;
  longitude: number | null;
  ajuste_manual: boolean;
  ajuste_motivo: string | null;
  ajustado_por: string | null;
  status_aprovacao: string;
  aprovado_por: string | null;
  aprovado_em: string | null;
  justificativa: string | null;
  created_at: string;
}

export function usePontoRegistros(colaboradorId?: string) {
  const { user } = useAuth();
  const companyId = useEffectiveCompanyId();
  const queryClient = useQueryClient();

  const colaboradorQuery = useQuery({
    queryKey: ["meu-colaborador-ponto", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, company_id")
        .eq("user_id", user.id)
        .eq("status", "ATIVO")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const effectiveColaboradorId = colaboradorId || colaboradorQuery.data?.id;
  const effectiveCompanyId = companyId || colaboradorQuery.data?.company_id;

  const today = getHojeBR();
  const todayRegistros = useQuery({
    queryKey: ["ponto-registros-hoje", effectiveColaboradorId, today],
    queryFn: async () => {
      if (!effectiveColaboradorId) return [];
      const startOfDay = `${today}T00:00:00`;
      const endOfDay = `${today}T23:59:59`;
      const { data, error } = await supabase
        .from("ponto_registros")
        .select("*")
        .eq("colaborador_id", effectiveColaboradorId)
        .gte("data_hora", startOfDay)
        .lte("data_hora", endOfDay)
        .order("data_hora", { ascending: true });
      if (error) throw error;
      return (data || []) as PontoRegistro[];
    },
    enabled: !!effectiveColaboradorId,
    refetchInterval: 30000,
  });

  const registrarPonto = useMutation({
    mutationFn: async (params: {
      tipo: PontoRegistroTipo;
      observacao?: string;
      latitude?: number;
      longitude?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("registrar-ponto", {
        body: {
          tipo: params.tipo,
          observacao: params.observacao,
          latitude: params.latitude,
          longitude: params.longitude,
        },
      });
      if (error) {
        // Try to extract structured error from the function response
        const ctx: any = (error as any).context;
        let parsed: any = null;
        try {
          if (ctx && typeof ctx.json === "function") parsed = await ctx.json();
        } catch (_) {}
        const msg = parsed?.error || error.message || "Erro ao registrar ponto";
        const code = parsed?.code;
        const err: any = new Error(msg);
        err.code = code;
        throw err;
      }
      if (data && (data as any).error) {
        throw new Error((data as any).error);
      }
      return data;
    },
    onSuccess: (data: any, vars) => {
      queryClient.invalidateQueries({ queryKey: ["ponto-registros-hoje"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-ultimo-registro"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-resumo"] });
      const labels: Record<string, string> = {
        ENTRADA: "Entrada registrada",
        SAIDA: "Saída registrada",
      };
      toast.success(labels[vars.tipo] || "Ponto registrado");
      const w = data?.warning;
      if (w?.code === "PENDING_SAIDA_PREVIOUS_DAY") {
        toast.warning(w.message, { duration: 8000 });
      } else if (w?.code === "ODD_PUNCHES") {
        toast.warning(w.message, { duration: 8000 });
      }
    },
    onError: (err: any) => {
      if (err?.code === "DUPLICATE") {
        toast.error("Batida duplicada: aguarde 1 minuto entre registros do mesmo tipo");
      } else if (err?.code === "SEQUENCE") {
        toast.error("Sequência inválida: " + err.message);
      } else if (err?.code === "OPEN_SHIFT_TOO_OLD") {
        toast.error(err.message || "Existe uma entrada em aberto antiga. Regularize no Histórico antes de registrar a saída.", { duration: 10000 });
      } else {
        toast.error("Erro ao registrar ponto: " + err.message);
      }
    },
  });

  const ajustarPonto = useMutation({
    mutationFn: async (params: {
      colaborador_id: string;
      company_id: string;
      tipo: PontoRegistroTipo;
      data_hora: string;
      ajuste_motivo: string;
      observacao?: string;
    }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { error } = await supabase.from("ponto_registros").insert({
        colaborador_id: params.colaborador_id,
        company_id: params.company_id,
        tipo: params.tipo,
        data_hora: params.data_hora,
        observacao: params.observacao || null,
        ajuste_manual: true,
        ajuste_motivo: params.ajuste_motivo,
        ajustado_por: user.id,
        status_aprovacao: "aprovado",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ponto-registros"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-ultimo-registro"] });
      queryClient.invalidateQueries({ queryKey: ["espelho-ponto"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-resumo-db"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-registros-historico"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-resumo"] });
      toast.success("Ajuste de ponto registrado");
    },
    onError: (err: any) => {
      const msg = String(err?.message || "");
      if (msg.includes("ux_ponto_registros_unico_minuto") || err?.code === "23505") {
        toast.error("Já existe uma marcação do mesmo tipo neste mesmo minuto para este colaborador. Altere o horário ou edite a marcação existente.");
        return;
      }
      toast.error("Erro ao ajustar ponto: " + (err?.message || "desconhecido"));
    },
  });

  const lancarPontoManual = useMutation({
    mutationFn: async (params: {
      tipo: PontoRegistroTipo;
      data_hora: string;
      justificativa: string;
      observacao?: string;
    }) => {
      if (!effectiveColaboradorId || !effectiveCompanyId) {
        throw new Error("Colaborador não encontrado");
      }
      const { error } = await supabase.from("ponto_registros").insert({
        colaborador_id: effectiveColaboradorId,
        company_id: effectiveCompanyId,
        tipo: params.tipo,
        data_hora: params.data_hora,
        observacao: params.observacao || null,
        ajuste_manual: true,
        justificativa: params.justificativa,
        status_aprovacao: "pendente",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ponto-registros-hoje"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-ultimo-registro"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-registros-historico"] });
      queryClient.invalidateQueries({ queryKey: ["espelho-ponto"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-resumo-db"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-resumo"] });
      toast.success("Marcação manual enviada para aprovação");
    },
    onError: (err: any) => {
      toast.error("Erro ao lançar ponto manual: " + err.message);
    },
  });

  const solicitarExclusao = useMutation({
    mutationFn: async (params: { registroId: string; motivo: string }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      // Bloqueia exclusão de batidas automáticas (midnight-split) pelo colaborador
      const { data: reg } = await supabase
        .from("ponto_registros")
        .select("is_auto")
        .eq("id", params.registroId)
        .maybeSingle();
      if ((reg as any)?.is_auto) {
        throw new Error("Marcação automática (divisão de meia-noite) só pode ser alterada pelo admin");
      }
      const { error } = await supabase
        .from("ponto_registros")
        .update({
          exclusao_pendente: true,
          exclusao_motivo: params.motivo,
          exclusao_solicitada_em: new Date().toISOString(),
        })
        .eq("id", params.registroId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ponto-registros-hoje"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-ultimo-registro"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-registros-historico"] });
      toast.success("Solicitação de exclusão enviada para aprovação");
    },
    onError: (err: any) => {
      toast.error("Erro ao solicitar exclusão: " + err.message);
    },
  });

  return {
    colaboradorId: effectiveColaboradorId,
    companyId: effectiveCompanyId,
    todayRegistros: todayRegistros.data || [],
    isLoadingToday: todayRegistros.isLoading,
    registrarPonto,
    ajustarPonto,
    lancarPontoManual,
    solicitarExclusao,
    isLoadingColaborador: colaboradorQuery.isLoading,
  };
}

// Onda 6.11: último registro do colaborador (qualquer dia), fonte de verdade
// para decidir o estado dos botões ENTRADA/SAÍDA. Considera marcações
// automáticas (midnight-split) como normais.
export function useUltimoRegistro(colaboradorId: string | undefined) {
  return useQuery({
    queryKey: ["ponto-ultimo-registro", colaboradorId],
    queryFn: async () => {
      if (!colaboradorId) return null;
      // Ignora registros no futuro (ex.: lançamentos manuais com ano digitado
      // errado). Um registro futuro como "SAIDA" não pode dominar a decisão
      // de habilitar/desabilitar os botões de ENTRADA/SAÍDA de hoje.
      // Damos 5 min de folga para tolerar pequenas dessincronizações de relógio.
      const nowPlus5 = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("ponto_registros")
        .select("id, tipo, data_hora, status_aprovacao, is_auto")
        .eq("colaborador_id", colaboradorId)
        .neq("status_aprovacao", "rejeitado")
        .lte("data_hora", nowPlus5)
        .order("data_hora", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; tipo: PontoRegistroTipo; data_hora: string; status_aprovacao: string; is_auto: boolean } | null;
    },
    enabled: !!colaboradorId,
    refetchInterval: 30000,
  });
}

// Hook to detect missing punches on the most recent day with records (excluding today)
export function useUltimoDiaComBatidas(colaboradorId: string | undefined) {
  return useQuery({
    queryKey: ["ponto-ultimo-dia-batidas", colaboradorId],
    queryFn: async () => {
      if (!colaboradorId) return null;
      const today = getHojeBR();
      const startISO = getDataBR(7);
      // Não filtramos por upper bound em UTC: registros de fim de noite BRT
      // (ex.: 23:59 = 02:59 UTC do dia seguinte) ficariam de fora. Buscamos
      // a janela completa e filtramos por data LOCAL abaixo.
      const { data, error } = await supabase
        .from("ponto_registros")
        .select("data_hora, tipo")
        .eq("colaborador_id", colaboradorId)
        .gte("data_hora", `${startISO}T00:00:00`)
        .order("data_hora", { ascending: false })
        .limit(80);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      // Group by LOCAL date (BRT), não UTC — evita que a saída automática
      // de 23:59 (≈ 02:59 UTC do dia seguinte) seja contada no dia errado
      // e dispare falso aviso de "saída pendente" no dia anterior.
      const localDateOf = (iso: string) => {
        const d = new Date(iso);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      };
      const byDate = new Map<string, { tipo: string; data_hora: string }[]>();
      for (const r of data) {
        const d = localDateOf(r.data_hora as string);
        if (d >= today) continue; // ignora registros já do dia de hoje (BRT)
        if (!byDate.has(d)) byDate.set(d, []);
        byDate.get(d)!.push(r as any);
      }
      if (byDate.size === 0) return null;
      const lastDate = Array.from(byDate.keys()).sort().reverse()[0];
      const regs = byDate.get(lastDate)!.sort((a, b) => a.data_hora.localeCompare(b.data_hora));
      const isOdd = regs.length % 2 !== 0;
      if (!isOdd) return null;
      const ultima = regs[regs.length - 1];
      return {
        data: lastDate,
        totalBatidas: regs.length,
        ultimaTipo: ultima.tipo,
        ultimaHora: ultima.data_hora,
      };
    },
    enabled: !!colaboradorId,
    staleTime: 60_000,
  });
}

// Separate hook for history queries
export function usePontoHistorico(colaboradorId: string | undefined, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["ponto-registros-historico", colaboradorId, startDate, endDate],
    queryFn: async () => {
      if (!colaboradorId) return [];
      const { data, error } = await supabase
        .from("ponto_registros")
        .select("*")
        .eq("colaborador_id", colaboradorId)
        .gte("data_hora", `${startDate}T00:00:00`)
        .lte("data_hora", `${endDate}T23:59:59`)
        .order("data_hora", { ascending: true });
      if (error) throw error;
      return (data || []) as PontoRegistro[];
    },
    enabled: !!colaboradorId && !!startDate && !!endDate,
  });
}
