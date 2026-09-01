import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface PgrResponsavelTecnico {
  nome?: string;
  cpf?: string;
  nit?: string;
  conselho?: string;
  uf?: string;
  especialidade?: string;
}

export interface PgrDocumento {
  id: string;
  company_id: string;
  titulo: string;
  status: string;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  cnae: string | null;
  grau_risco: string | null;
  endereco: string | null;
  anexo_art_path: string | null;
  responsavel_tecnico: PgrResponsavelTecnico;
  created_at: string;
  updated_at: string;
}

/**
 * Carrega o documento PGR mais recente da empresa.
 * Expõe `criar` para gerar um novo documento (com seções padrão) via RPC.
 */
export function usePgrDocumento(companyId: string | null | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["pgr-documento", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pgr_documentos")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as PgrDocumento) ?? null;
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Selecione uma empresa");
      const { data, error } = await supabase.rpc("pgr_criar_documento", {
        p_company_id: companyId,
      });
      if (error) throw error;
      const doc = Array.isArray(data) ? data[0] : data;
      return doc as unknown as PgrDocumento;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pgr-documento", companyId] });
      toast.success("Documento PGR criado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar documento"),
  });

  const salvar = useMutation({
    mutationFn: async (payload: {
      documentoId: string;
      updated_at: string;
      titulo: string;
      vigencia_inicio: string | null;
      vigencia_fim: string | null;
      cnae: string | null;
      grau_risco: string | null;
      endereco: string | null;
      responsavel_tecnico: PgrResponsavelTecnico;
      anexo_art_path: string | null;
    }) => {
      const { data, error } = await supabase.rpc("pgr_save_documento", {
        p_documento_id: payload.documentoId,
        p_updated_at: payload.updated_at,
        p_titulo: payload.titulo,
        p_vigencia_inicio: payload.vigencia_inicio as unknown as string,
        p_vigencia_fim: payload.vigencia_fim as unknown as string,
        p_cnae: payload.cnae as unknown as string,
        p_grau_risco: payload.grau_risco as unknown as string,
        p_endereco: payload.endereco as unknown as string,
        p_responsavel_tecnico: payload.responsavel_tecnico as unknown as Json,
        p_anexo_art_path: payload.anexo_art_path as unknown as string,
      });
      if (error) throw error;
      return data as unknown as PgrDocumento;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pgr-documento", companyId] });
      qc.invalidateQueries({ queryKey: ["pgr-secoes"] });
      toast.success("Identificação salva");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar documento"),
  });

  return { documento: query.data ?? null, ...query, criar, salvar };
}
