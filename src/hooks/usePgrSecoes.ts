import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeRichText } from "@/lib/sanitize";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface PgrSecao {
  id: string;
  documento_id: string;
  numero: string | null;
  titulo: string;
  conteudo: string | null;
  tipo: string; // 'texto' | 'automatico'
  chave_automatica: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PgrAlteracao {
  id: string;
  documento_id: string;
  numero: string | null;
  data: string;
  historico: string;
  updated_at: string;
}

export interface PgrDocumentoCompleto {
  documento: any;
  empresa: { id: string; nome: string; cnpj: string | null; logo_url: string | null };
  secoes: PgrSecao[];
  alteracoes: PgrAlteracao[];
}

/** Carrega e salva as seções do documento PGR (com checagem otimista de updated_at). */
export function usePgrSecoes(documentoId: string | null | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["pgr-secoes", documentoId],
    enabled: !!documentoId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("pgr_get_documento", {
        p_documento_id: documentoId!,
      });
      if (error) throw error;
      return data as unknown as PgrDocumentoCompleto;
    },
  });

  const salvar = useMutation({
    mutationFn: async (secoes: Array<Partial<PgrSecao>>) => {
      if (!documentoId) throw new Error("Documento não carregado");
      const payload = secoes.map((s) => ({
        id: s.id ?? null,
        numero: s.numero ?? null,
        titulo: s.titulo ?? "Nova seção",
        conteudo: s.tipo === "automatico" ? (s.conteudo ?? "") : sanitizeRichText(s.conteudo ?? ""),
        tipo: s.tipo ?? "texto",
        chave_automatica: s.chave_automatica ?? null,
        ordem: s.ordem ?? 0,
        ativo: s.ativo ?? true,
        updated_at: s.updated_at ?? null,
      }));
      const { data, error } = await supabase.rpc("pgr_save_secoes", {
        p_documento_id: documentoId,
        p_secoes: payload as unknown as Json,
      });
      if (error) throw error;
      return data as unknown as PgrSecao[];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pgr-secoes", documentoId] });
      toast.success("Seções salvas");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar seções"),
  });

  const salvarAlteracoes = useMutation({
    mutationFn: async (linhas: Array<Partial<PgrAlteracao>>) => {
      if (!documentoId) throw new Error("Documento não carregado");
      const atuais = query.data?.alteracoes ?? [];
      const manter = new Set(linhas.map((l) => l.id).filter(Boolean) as string[]);
      const remover = atuais.filter((a) => !manter.has(a.id)).map((a) => a.id);

      if (remover.length) {
        const { error } = await supabase.from("pgr_alteracoes").delete().in("id", remover);
        if (error) throw error;
      }
      for (const l of linhas) {
        const row = {
          documento_id: documentoId,
          numero: l.numero ?? null,
          data: l.data || new Date().toISOString().slice(0, 10),
          historico: l.historico ?? "",
        };
        if (l.id) {
          const { error } = await supabase.from("pgr_alteracoes").update(row).eq("id", l.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("pgr_alteracoes").insert(row);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pgr-secoes", documentoId] });
      toast.success("Quadro de alterações salvo");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar alterações"),
  });

  return {
    data: query.data,
    secoes: query.data?.secoes ?? [],
    alteracoes: query.data?.alteracoes ?? [],
    empresa: query.data?.empresa ?? null,
    isLoading: query.isLoading,
    refetch: query.refetch,
    salvar,
    salvarAlteracoes,
  };
}
