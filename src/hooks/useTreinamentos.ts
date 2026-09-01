import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";

export type TreinamentoTipo = 'arquivo' | 'link' | 'video' | 'pdf' | 'ppt';
export type TreinamentoStatus = 'rascunho' | 'publicado' | 'arquivado';

export interface Treinamento {
  id: string;
  company_id: string;
  categoria_id: string | null;
  titulo: string;
  descricao: string | null;
  tipo: TreinamentoTipo;
  url_conteudo: string;
  nome_arquivo: string | null;
  duracao_estimada_minutos: number | null;
  nivel: string | null;
  idioma: string | null;
  tags: string[] | null;
  tempo_minimo_minutos: number;
  quiz_obrigatorio: boolean;
  termo_ciencia_obrigatorio: boolean;
  texto_termo_ciencia: string | null;
  status: TreinamentoStatus;
  publicado_em: string | null;
  publicado_por_user_id: string | null;
  obrigatorio: boolean;
  target_company_ids: string[] | null;
  target_contract_types: string[] | null;
  capa_path: string | null;
  destaque: boolean;
  created_at: string;
  updated_at: string;
  categoria?: CategoriaTreinamento | null;
}


export interface CategoriaTreinamento {
  id: string;
  company_id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface TreinamentoQuizConfig {
  id: string;
  treinamento_id: string;
  nota_minima: number;
  tentativas_maximas: number;
  created_at: string;
}

export interface TreinamentoQuizPergunta {
  id: string;
  treinamento_id: string;
  pergunta_texto: string;
  ordem: number;
  created_at: string;
  alternativas?: TreinamentoQuizAlternativa[];
}

export interface TreinamentoQuizAlternativa {
  id: string;
  pergunta_id: string;
  texto_alternativa: string;
  is_correta: boolean;
  ordem: number;
}

// Hook para categorias
export function useCategoriasTreinamento() {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ["categorias-treinamento", effectiveCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("categorias_treinamento")
        .select("*")
        .order("ordem", { ascending: true });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CategoriaTreinamento[];
    },
    enabled: !!effectiveCompanyId,
  });
}

export function useCreateCategoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<CategoriaTreinamento, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await supabase
        .from("categorias_treinamento")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-treinamento"] });
      toast({ title: "Categoria criada com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar categoria", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateCategoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CategoriaTreinamento> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("categorias_treinamento")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-treinamento"] });
      toast({ title: "Categoria atualizada" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar categoria", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteCategoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categorias_treinamento").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-treinamento"] });
      toast({ title: "Categoria excluída" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir categoria", description: error.message, variant: "destructive" });
    },
  });
}

// Hook para treinamentos
export function useTreinamentos(status?: TreinamentoStatus) {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ["treinamentos", effectiveCompanyId, status],
    queryFn: async () => {
      let query = supabase
        .from("treinamentos")
        .select(`
          *,
          categoria:categorias_treinamento(*)
        `)
        .order("created_at", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Treinamento[];
    },
    enabled: !!effectiveCompanyId,
  });
}

export function useTreinamento(id: string | undefined) {
  return useQuery({
    queryKey: ["treinamento", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("treinamentos")
        .select(`
          *,
          categoria:categorias_treinamento(*)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Treinamento;
    },
    enabled: !!id,
  });
}

export function useCreateTreinamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Treinamento, 'id' | 'created_at' | 'updated_at' | 'categoria'>) => {
      const { data: result, error } = await supabase
        .from("treinamentos")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treinamentos"] });
      toast({ title: "Treinamento criado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar treinamento", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateTreinamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Treinamento> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("treinamentos")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["treinamentos"] });
      queryClient.invalidateQueries({ queryKey: ["treinamento", variables.id] });
      toast({ title: "Treinamento atualizado" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar treinamento", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteTreinamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("treinamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treinamentos"] });
      toast({ title: "Treinamento excluído" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir treinamento", description: error.message, variant: "destructive" });
    },
  });
}

export function usePublicarTreinamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: result, error } = await supabase
        .from("treinamentos")
        .update({
          status: 'publicado' as TreinamentoStatus,
          publicado_em: new Date().toISOString(),
          publicado_por_user_id: user?.id,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["treinamentos"] });
      queryClient.invalidateQueries({ queryKey: ["treinamento", id] });
      toast({ title: "Treinamento publicado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao publicar treinamento", description: error.message, variant: "destructive" });
    },
  });
}

// Quiz hooks
export function useQuizConfig(treinamentoId: string | undefined) {
  return useQuery({
    queryKey: ["quiz-config", treinamentoId],
    queryFn: async () => {
      if (!treinamentoId) return null;
      const { data, error } = await supabase
        .from("treinamento_quiz_config")
        .select("*")
        .eq("treinamento_id", treinamentoId)
        .maybeSingle();
      if (error) throw error;
      return data as TreinamentoQuizConfig | null;
    },
    enabled: !!treinamentoId,
  });
}

export function useUpsertQuizConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<TreinamentoQuizConfig, 'id' | 'created_at'>) => {
      const { data: result, error } = await supabase
        .from("treinamento_quiz_config")
        .upsert(data, { onConflict: 'treinamento_id' })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quiz-config", variables.treinamento_id] });
      toast({ title: "Configuração do quiz atualizada" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar configuração", description: error.message, variant: "destructive" });
    },
  });
}

export function useQuizPerguntas(treinamentoId: string | undefined) {
  return useQuery({
    queryKey: ["quiz-perguntas", treinamentoId],
    queryFn: async () => {
      if (!treinamentoId) return [];
      const { data, error } = await supabase
        .from("treinamento_quiz_perguntas")
        .select(`
          *,
          alternativas:treinamento_quiz_alternativas(*)
        `)
        .eq("treinamento_id", treinamentoId)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as TreinamentoQuizPergunta[];
    },
    enabled: !!treinamentoId,
  });
}

export function useCreateQuizPergunta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<TreinamentoQuizPergunta, 'id' | 'created_at' | 'alternativas'>) => {
      const { data: result, error } = await supabase
        .from("treinamento_quiz_perguntas")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quiz-perguntas", variables.treinamento_id] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar pergunta", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateQuizPergunta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, treinamento_id, ...data }: Partial<TreinamentoQuizPergunta> & { id: string; treinamento_id: string }) => {
      const { data: result, error } = await supabase
        .from("treinamento_quiz_perguntas")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quiz-perguntas", variables.treinamento_id] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar pergunta", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteQuizPergunta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, treinamentoId }: { id: string; treinamentoId: string }) => {
      const { error } = await supabase.from("treinamento_quiz_perguntas").delete().eq("id", id);
      if (error) throw error;
      return { treinamentoId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["quiz-perguntas", result.treinamentoId] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir pergunta", description: error.message, variant: "destructive" });
    },
  });
}

export function useCreateQuizAlternativa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ treinamentoId, ...data }: Omit<TreinamentoQuizAlternativa, 'id'> & { treinamentoId: string }) => {
      const { data: result, error } = await supabase
        .from("treinamento_quiz_alternativas")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return { ...result, treinamentoId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["quiz-perguntas", result.treinamentoId] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar alternativa", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateQuizAlternativa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, treinamentoId, ...data }: Partial<TreinamentoQuizAlternativa> & { id: string; treinamentoId: string }) => {
      const { data: result, error } = await supabase
        .from("treinamento_quiz_alternativas")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { ...result, treinamentoId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["quiz-perguntas", result.treinamentoId] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar alternativa", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteQuizAlternativa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, treinamentoId }: { id: string; treinamentoId: string }) => {
      const { error } = await supabase.from("treinamento_quiz_alternativas").delete().eq("id", id);
      if (error) throw error;
      return { treinamentoId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["quiz-perguntas", result.treinamentoId] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir alternativa", description: error.message, variant: "destructive" });
    },
  });
}

// Treinamentos publicados para catálogo
export function useTreinamentosPublicados() {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ["treinamentos-publicados", effectiveCompanyId],
    queryFn: async () => {
      // Try to load current colaborador to filter by contract_type (for non-admin viewers)
      let myContractType: string | null = null;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: colab } = await supabase
          .from("colaboradores")
          .select("contract_type")
          .eq("user_id", user.id)
          .maybeSingle();
        myContractType = (colab as any)?.contract_type ?? null;
      }

      const { data, error } = await supabase
        .from("treinamentos")
        .select(`
          *,
          categoria:categorias_treinamento(*)
        `)
        .eq("status", "publicado")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const list = (data as Treinamento[]) || [];

      const filtered = list.filter((t) => {
        // If no contract_type targeting set, available to everyone
        if (!t.target_contract_types || t.target_contract_types.length === 0) return true;
        // If viewer has no contract_type (admin sem vínculo de colaborador), don't hide
        if (!myContractType) return true;
        return t.target_contract_types.includes(myContractType);
      });

      // Obrigatórios primeiro
      filtered.sort((a, b) => Number(b.obrigatorio) - Number(a.obrigatorio));

      return filtered;
    },
    enabled: !!effectiveCompanyId,
  });
}

