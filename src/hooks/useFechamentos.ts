import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";
import { toast } from "sonner";

export interface Fechamento {
  id: string;
  company_id: string;
  colaborador_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  saldo_minutos: number;
  status: string; // 'aberto' | 'fechado' | 'reaberto' | 'assinado'
  fechado_por: string | null;
  fechado_em: string | null;
  reaberto_por: string | null;
  reaberto_em: string | null;
  motivo_reabertura: string | null;
  hash_assinatura: string | null;
  assinatura_por: string | null;
  assinatura_em: string | null;
  assinatura_hash: string | null;
  pdf_url: string | null;
  csv_url: string | null;
  horas_trabalhadas_minutos: number;
  horas_extras_minutos: number;
  horas_noturnas_minutos: number;
  horas_abonadas_minutos: number;
  dias_falta: number;
  dias_abonados: number;
  versao: number;
  snapshot_jsonb: any;
  tratativa_acao: "pagar" | "descontar" | "transferir" | "perdoar" | null;
  tratativa_observacao: string | null;
  colaboradores?: { full_name: string; matricula: string | null; department: string | null } | null;
}

/** Lista fechamentos da empresa para um período (range que intercepta). */
export function useFechamentos(periodoInicio: string, periodoFim: string) {
  const companyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ["fechamentos", companyId, periodoInicio, periodoFim],
    queryFn: async (): Promise<Fechamento[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("banco_horas_fechamentos")
        .select("*, colaboradores!inner(full_name, matricula, department, contract_type)")
        .eq("company_id", companyId)
        .in("colaboradores.contract_type", ["CLT", "Estágio", "Aprendiz", "Temporário"])
        .lte("periodo_inicio", periodoFim)
        .gte("periodo_fim", periodoInicio)
        .order("periodo_fim", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Fechamento[];
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });
}

export function useFecharPeriodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      company_id: string;
      periodo_inicio: string;
      periodo_fim: string;
      colaboradores_ids?: string[] | null;
    }) => {
      const { data, error } = await supabase.functions.invoke("fechar-periodo", {
        body: params,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (data: any) => {
      const sucesso = data?.sucesso ?? 0;
      const total = data?.total ?? 0;
      const erros = (data?.erros ?? []).length;
      toast.success(`Fechamento concluído: ${sucesso}/${total} colaboradores${erros ? ` (${erros} erros)` : ""}`);
      qc.invalidateQueries({ queryKey: ["fechamentos"] });
      qc.invalidateQueries({ queryKey: ["ponto-resumo-db"] });
      qc.invalidateQueries({ queryKey: ["ranking-banco-resumo-db"] });
    },
    onError: (e: any) => toast.error("Erro ao fechar período: " + e.message),
  });
}

export function useReabrirPeriodoMassa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { company_id: string; periodo_inicio: string; periodo_fim: string; motivo: string }) => {
      const { data, error } = await supabase.functions.invoke("reabrir-periodo-massa", { body: params });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (data: any) => {
      const reabertos = data?.reabertos ?? 0;
      const total = data?.total ?? 0;
      toast.success(`Período reaberto: ${reabertos}/${total} colaboradores`);
      qc.invalidateQueries({ queryKey: ["fechamentos"] });
      qc.invalidateQueries({ queryKey: ["fechamento-status-colab"] });
      qc.invalidateQueries({ queryKey: ["my-fechamento-status"] });
      qc.invalidateQueries({ queryKey: ["ponto-resumo-db"] });
      qc.invalidateQueries({ queryKey: ["ranking-banco-resumo-db"] });
    },
    onError: (e: any) => toast.error("Erro ao reabrir período: " + e.message),
  });
}

export function useReabrirPeriodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { fechamento_id: string; motivo: string }) => {
      const { data, error } = await supabase.functions.invoke("reabrir-periodo", { body: params });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      toast.success("Período reaberto");
      qc.invalidateQueries({ queryKey: ["fechamentos"] });
      qc.invalidateQueries({ queryKey: ["ponto-resumo-db"] });
    },
    onError: (e: any) => toast.error("Erro ao reabrir período: " + e.message),
  });
}

/** Retorna o status de fechamento (fechado/reaberto/aberto) por colaborador para um período. */
export function useFechamentoStatusByColaborador(
  colaboradoresIds: string[],
  periodoInicio: string,
  periodoFim: string,
) {
  const companyId = useEffectiveCompanyId();
  const idsKey = colaboradoresIds.slice().sort().join(",");
  return useQuery({
    queryKey: ["fechamento-status-colab", companyId, periodoInicio, periodoFim, idsKey],
    queryFn: async (): Promise<Record<string, "fechado" | "reaberto" | "aberto">> => {
      const map: Record<string, "fechado" | "reaberto" | "aberto"> = {};
      if (!companyId || colaboradoresIds.length === 0) return map;
      const { data, error } = await supabase
        .from("banco_horas_fechamentos")
        .select("colaborador_id,status,periodo_inicio,periodo_fim")
        .eq("company_id", companyId)
        .in("colaborador_id", colaboradoresIds)
        .lte("periodo_inicio", periodoFim)
        .gte("periodo_fim", periodoInicio);
      if (error) throw error;
      for (const row of data || []) {
        // Prioriza "fechado" sobre "reaberto"
        const cur = map[(row as any).colaborador_id];
        const next = (row as any).status as "fechado" | "reaberto" | "aberto";
        if (!cur || (cur !== "fechado" && next === "fechado")) {
          map[(row as any).colaborador_id] = next;
        }
      }
      return map;
    },
    enabled: !!companyId && colaboradoresIds.length > 0,
    staleTime: 30_000,
  });
}

/** Status de fechamento do colaborador logado para um período (usado em MeuBancoHoras). */
export function useMyFechamentoStatus(colaboradorId: string | null | undefined, periodoInicio: string, periodoFim: string) {
  const companyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ["my-fechamento-status", companyId, colaboradorId, periodoInicio, periodoFim],
    queryFn: async (): Promise<"assinado" | "fechado" | "reaberto" | "aberto" | null> => {
      if (!companyId || !colaboradorId) return null;
      const { data, error } = await supabase
        .from("banco_horas_fechamentos")
        .select("status")
        .eq("company_id", companyId)
        .eq("colaborador_id", colaboradorId)
        .lte("periodo_inicio", periodoFim)
        .gte("periodo_fim", periodoInicio);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      if (data.some((r: any) => r.status === "assinado")) return "assinado";
      if (data.some((r: any) => r.status === "fechado")) return "fechado";
      if (data.some((r: any) => r.status === "reaberto")) return "reaberto";
      return "aberto";
    },
    enabled: !!companyId && !!colaboradorId,
    staleTime: 30_000,
  });
}

/** Lista fechamentos MENSAIS do colaborador logado (aba "Minha Assinatura").
 * Filtra no servidor via RPC: somente períodos que cobrem exatamente um mês completo.
 * Ciclos acumulativos (quadrimestral/semestral/anual) são excluídos. */
export function useMeusFechamentos(colaboradorId: string | null | undefined) {
  return useQuery({
    queryKey: ["meus-fechamentos", colaboradorId],
    queryFn: async (): Promise<Fechamento[]> => {
      if (!colaboradorId) return [];
      const { data, error } = await supabase.rpc("get_meus_fechamentos_mensais", {
        p_colaborador_id: colaboradorId,
      });
      if (error) throw error;
      return (data || []) as unknown as Fechamento[];
    },
    enabled: !!colaboradorId,
    staleTime: 30_000,
  });
}

export function useAssinarPeriodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { fechamento_id: string }) => {
      const { data, error } = await supabase.functions.invoke("assinar-fechamento", { body: params });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { id: string; status: string; hash: string; assinado_em: string; versao: number; pdf_url: string | null };
    },
    onSuccess: () => {
      toast.success("Período assinado com sucesso");
      qc.invalidateQueries({ queryKey: ["meus-fechamentos"] });
      qc.invalidateQueries({ queryKey: ["fechamentos"] });
      qc.invalidateQueries({ queryKey: ["my-fechamento-status"] });
      qc.invalidateQueries({ queryKey: ["fechamento-status-colab"] });
    },
    onError: (e: any) => toast.error("Erro ao assinar: " + e.message),
  });
}

export async function getFechamentoDownloadUrl(
  fechamento_id: string,
  tipo: "csv" | "pdf" = "csv",
  escopo: "consolidado" | "individual" = "consolidado",
) {
  const { data, error } = await supabase.functions.invoke("exportar-fechamento", {
    body: { fechamento_id, tipo, escopo },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any)?.url as string;
}
