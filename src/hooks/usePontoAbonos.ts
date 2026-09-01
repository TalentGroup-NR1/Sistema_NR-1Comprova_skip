import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface TipoAbono {
  id: string;
  company_id: string;
  codigo: string;
  nome: string;
  dias_maximos_sugeridos: number | null;
  base_legal: string | null;
  exige_anexo: boolean;
  abona_horas: boolean;
  ativo: boolean;
  categoria?: "falta_injustificada" | "atestado_medico" | "atraso" | "saida_antecipada" | "folga" | "ferias" | "outros";
}

export interface Abono {
  id: string;
  company_id: string;
  colaborador_id: string;
  tipo_abono_id: string;
  modalidade: "dia" | "horas";
  data_inicio: string;
  data_fim: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  minutos_abonados: number | null;
  justificativa: string;
  anexo_url: string | null;
  anexo_nome: string | null;
  status: "ativo" | "cancelado";
  motivo_cancelamento: string | null;
  lancado_por: string | null;
  lancado_em: string;
  tipo?: TipoAbono;
  colaborador?: { full_name: string; department: string | null };
}

const sanitize = (n: string) =>
  n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");

export function useTiposAbono() {
  const companyId = useEffectiveCompanyId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["ponto-tipos-abono", companyId],
    queryFn: async (): Promise<TipoAbono[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("ponto_tipos_abono" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("nome");
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: !!companyId,
  });

  const upsert = useMutation({
    mutationFn: async (tipo: Partial<TipoAbono> & { id?: string }) => {
      if (!companyId) throw new Error("Empresa não selecionada");
      const payload: any = { ...tipo, company_id: companyId };
      if (tipo.id) {
        const { error } = await supabase.from("ponto_tipos_abono" as any).update(payload).eq("id", tipo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ponto_tipos_abono" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ponto-tipos-abono"] });
      toast.success("Tipo de abono salvo");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ponto_tipos_abono" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ponto-tipos-abono"] });
      toast.success("Tipo removido");
    },
    onError: (e: any) => toast.error("Erro ao remover: " + e.message),
  });

  return { tipos: query.data || [], isLoading: query.isLoading, upsert, remove };
}

export function useAbonos() {
  const companyId = useEffectiveCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["ponto-abonos", companyId],
    queryFn: async (): Promise<Abono[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("ponto_abonos" as any)
        .select(
          "*, tipo:ponto_tipos_abono!ponto_abonos_tipo_abono_id_fkey(*), colaborador:colaboradores!ponto_abonos_colaborador_id_fkey(full_name, department)"
        )
        .eq("company_id", companyId)
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: !!companyId,
  });

  const create = useMutation({
    mutationFn: async (input: {
      colaborador_id: string;
      tipo_abono_id: string;
      modalidade?: "dia" | "horas";
      data_inicio: string;
      data_fim: string;
      hora_inicio?: string | null;
      hora_fim?: string | null;
      minutos_abonados?: number | null;
      justificativa: string;
      anexo_file?: File | null;
    }) => {
      if (!companyId) throw new Error("Empresa não selecionada");
      let anexo_url: string | null = null;
      let anexo_nome: string | null = null;
      if (input.anexo_file) {
        const safe = sanitize(input.anexo_file.name);
        const path = `${input.colaborador_id}/${Date.now()}_${safe}`;
        const { error: upErr } = await supabase.storage
          .from("abonos-anexos")
          .upload(path, input.anexo_file, { upsert: false });
        if (upErr) throw upErr;
        anexo_url = path;
        anexo_nome = input.anexo_file.name;
      }

      const { error } = await supabase.from("ponto_abonos" as any).insert({
        company_id: companyId,
        colaborador_id: input.colaborador_id,
        tipo_abono_id: input.tipo_abono_id,
        modalidade: input.modalidade || "dia",
        data_inicio: input.data_inicio,
        data_fim: input.data_fim,
        hora_inicio: input.hora_inicio ?? null,
        hora_fim: input.hora_fim ?? null,
        minutos_abonados: input.minutos_abonados ?? null,
        justificativa: input.justificativa,
        anexo_url,
        anexo_nome,
        lancado_por: user?.id,
      });
      if (error) {
        if (anexo_url) await supabase.storage.from("abonos-anexos").remove([anexo_url]);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ponto-abonos"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-resumo"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-registros"] });
      toast.success("Abono lançado com sucesso");
    },
    onError: (e: any) => toast.error("Erro ao lançar: " + e.message),
  });

  const createBatch = useMutation({
    mutationFn: async (input: {
      colaborador_ids: string[];
      tipo_abono_id: string;
      modalidade?: "dia" | "horas";
      data_inicio: string;
      data_fim: string;
      hora_inicio?: string | null;
      hora_fim?: string | null;
      minutos_abonados?: number | null;
      justificativa: string;
      anexo_file?: File | null;
    }) => {
      if (!companyId) throw new Error("Empresa não selecionada");
      if (!input.colaborador_ids.length) throw new Error("Selecione ao menos um colaborador");

      // Buscar company_id de cada colaborador (multi-tenant seguro)
      const { data: colabs, error: cErr } = await supabase
        .from("colaboradores")
        .select("id, company_id")
        .in("id", input.colaborador_ids);
      if (cErr) throw cErr;

      let anexo_url: string | null = null;
      let anexo_nome: string | null = null;
      if (input.anexo_file) {
        const safe = sanitize(input.anexo_file.name);
        const path = `_lote/${Date.now()}_${safe}`;
        const { error: upErr } = await supabase.storage
          .from("abonos-anexos")
          .upload(path, input.anexo_file, { upsert: false });
        if (upErr) throw upErr;
        anexo_url = path;
        anexo_nome = input.anexo_file.name;
      }

      const rows = (colabs || []).map((c: any) => ({
        company_id: c.company_id,
        colaborador_id: c.id,
        tipo_abono_id: input.tipo_abono_id,
        modalidade: input.modalidade || "dia",
        data_inicio: input.data_inicio,
        data_fim: input.data_fim,
        hora_inicio: input.hora_inicio ?? null,
        hora_fim: input.hora_fim ?? null,
        minutos_abonados: input.minutos_abonados ?? null,
        justificativa: input.justificativa,
        anexo_url,
        anexo_nome,
        lancado_por: user?.id,
      }));

      const { error } = await supabase.from("ponto_abonos" as any).insert(rows);
      if (error) {
        if (anexo_url) await supabase.storage.from("abonos-anexos").remove([anexo_url]);
        throw error;
      }
      return rows.length;
    },
    onSuccess: (n) => {
      queryClient.invalidateQueries({ queryKey: ["ponto-abonos"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-resumo"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-registros"] });
      toast.success(`Abono lançado para ${n} colaborador${n > 1 ? "es" : ""}`);
    },
    onError: (e: any) => toast.error("Erro ao lançar em lote: " + e.message),
  });

  const cancel = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await supabase
        .from("ponto_abonos" as any)
        .update({ status: "cancelado", motivo_cancelamento: motivo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ponto-abonos"] });
      queryClient.invalidateQueries({ queryKey: ["ponto-resumo"] });
      toast.success("Abono cancelado");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const downloadAnexo = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("abonos-anexos")
      .createSignedUrl(path, 60 * 5);
    if (error) throw error;
    window.open(data.signedUrl, "_blank");
  };

  return { abonos: query.data || [], isLoading: query.isLoading, create, createBatch, cancel, downloadAnexo };
}
