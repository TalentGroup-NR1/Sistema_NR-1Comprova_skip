import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";

export interface AnaliseBloco {
  percentual_aderencia: number;
  convergencias: string[];
  divergencias: string[];
  pontos_atencao: string[];
  pontos_fortes: string[];
  parecer: string;
}

export interface AnalisePerfilResult {
  // New format (two cross-analyses)
  analise_alinhamento_entrevista?: AnaliseBloco;
  analise_anuncio_curriculo?: AnaliseBloco;
  percentual_aderencia_geral?: number;
  conclusao_geral?: string;
  texto_anuncio_bruto?: string;
  texto_perfil_hg?: string;

  // Legacy format (single analysis)
  percentual_aderencia?: number;
  convergencias?: string[];
  divergencias?: string[];
  pontos_atencao?: string[];
  resumo_executivo?: string;
  principais_responsabilidades?: string[];
  competencias_requeridas?: string[];

  error?: string;
}

export interface AnalisePerfil {
  id: string;
  company_id: string;
  candidato_nome: string;
  vaga: string;
  status: string;
  resultado: AnalisePerfilResult | null;
  doc_alinhamento_path: string | null;
  doc_anuncio_path: string | null;
  doc_entrevista_path: string | null;
  doc_curriculo_path: string | null;
  colaborador_id: string | null;
  colaborador_admission_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** Returns true if resultado uses the new two-analysis format */
export function isNewFormat(resultado: AnalisePerfilResult | null): boolean {
  return !!resultado?.analise_alinhamento_entrevista;
}

export function useAnalisesPerfil() {
  const { selectedCompanyId } = useCompanyContext();

  return useQuery({
    queryKey: ["analises-perfil", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from("analises_perfil")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as AnalisePerfil[];
    },
    enabled: !!selectedCompanyId,
  });
}

export function useCreateAnalise() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedCompanyId } = useCompanyContext();

  return useMutation({
    mutationFn: async (params: {
      candidato_nome: string;
      vaga: string;
      colaborador_id: string | null;
      colaborador_admission_date: string | null;
      files: { alinhamento: File; anuncio: File; entrevista: File; curriculo: File };
      perfil_hg?: string;
    }) => {
      if (!selectedCompanyId || !user?.id) throw new Error("Contexto inválido");

      const timestamp = Date.now();
      const sanitize = (name: string) =>
        name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9._-]/g, "_");

      const uploadFile = async (file: File, docType: string) => {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`Arquivo ${docType} deve ter no máximo 5MB.`);
        }
        const path = `${selectedCompanyId}/${timestamp}_${docType}_${sanitize(file.name)}`;
        const { error } = await supabase.storage
          .from("documentos_analise")
          .upload(path, file);
        if (error) throw new Error(`Erro no upload de ${docType}: ${error.message}`);
        return path;
      };

      const [alinhamentoPath, anuncioPath, entrevistaPath, curriculoPath] =
        await Promise.all([
          uploadFile(params.files.alinhamento, "alinhamento"),
          uploadFile(params.files.anuncio, "anuncio"),
          uploadFile(params.files.entrevista, "entrevista"),
          uploadFile(params.files.curriculo, "curriculo"),
        ]);

      const { data: analise, error: insertError } = await supabase
        .from("analises_perfil")
        .insert({
          company_id: selectedCompanyId,
          candidato_nome: params.candidato_nome,
          vaga: params.vaga,
          colaborador_id: params.colaborador_id,
          colaborador_admission_date: params.colaborador_admission_date,
          status: "pendente",
          doc_alinhamento_path: alinhamentoPath,
          doc_anuncio_path: anuncioPath,
          doc_entrevista_path: entrevistaPath,
          doc_curriculo_path: curriculoPath,
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (insertError) throw insertError;

      const { error: fnError } = await supabase.functions.invoke(
        "analyze-profile",
        { body: { analise_id: (analise as any).id } }
      );

      if (fnError) {
        console.error("Edge function error:", fnError);
      }

      // Merge perfil_hg into resultado if provided
      if (params.perfil_hg?.trim()) {
        const { data: updated } = await supabase
          .from("analises_perfil")
          .select("resultado")
          .eq("id", (analise as any).id)
          .single();

        const currentResultado = (updated?.resultado as Record<string, unknown>) || {};
        await supabase
          .from("analises_perfil")
          .update({ resultado: { ...currentResultado, texto_perfil_hg: params.perfil_hg.trim() } as any })
          .eq("id", (analise as any).id);
      }

      return analise as unknown as AnalisePerfil;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analises-perfil"] });
      toast({ title: "Análise iniciada", description: "A IA está processando os documentos." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteAnalise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("analises_perfil")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analises-perfil"] });
      toast({ title: "Análise excluída com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateAnaliseResultado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, resultado }: { id: string; resultado: AnalisePerfilResult }) => {
      const { error } = await supabase
        .from("analises_perfil")
        .update({ resultado: resultado as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analises-perfil"] });
      toast({ title: "Alterações salvas com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    },
  });
}
