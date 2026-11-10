import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AdminQuizPergunta {
  id: string;
  treinamento_id: string;
  enunciado: string;
  alternativas: string[] | { id: string; texto: string }[];
  resposta_correta: string;
  explicacao: string | null;
  ordem: number;
  created_at?: string;
}

export interface TreinamentoStats {
  tentativasCount: number;
  certificadosCount: number;
}

const db = supabase as any;

/**
 * Busca todas as perguntas cadastradas com resposta_correta e explicacao (Apenas Admin/Gestor)
 */
export function useAdminQuizPerguntas(treinamentoId: string | undefined) {
  return useQuery({
    queryKey: ["admin-quiz-perguntas", treinamentoId],
    queryFn: async (): Promise<AdminQuizPergunta[]> => {
      if (!treinamentoId) return [];

      const { data, error } = await db
        .from("quiz_perguntas")
        .select("id, treinamento_id, enunciado, alternativas, resposta_correta, explicacao, ordem, created_at")
        .eq("treinamento_id", treinamentoId)
        .order("ordem", { ascending: true });

      if (error) {
        console.error("Erro ao carregar perguntas do quiz:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!treinamentoId,
  });
}

/**
 * Busca métricas de impacto para regras de negócio (Passo 6: tentativas e certificados emitidos)
 */
export function useTreinamentoStats(treinamentoId: string | undefined) {
  return useQuery({
    queryKey: ["treinamento-stats", treinamentoId],
    queryFn: async (): Promise<TreinamentoStats> => {
      if (!treinamentoId) return { tentativasCount: 0, certificadosCount: 0 };

      // Contar tentativas de quiz
      const { count: tentCount, error: tentErr } = await db
        .from("quiz_tentativas")
        .select("id", { count: "exact", head: true })
        .eq("treinamento_id", treinamentoId);

      if (tentErr) console.warn("Erro ao buscar tentativas:", tentErr);

      // Contar certificados emitidos
      const { count: certCount, error: certErr } = await db
        .from("certificates")
        .select("id", { count: "exact", head: true })
        .eq("treinamento_id", treinamentoId)
        .neq("status", "revogado");

      if (certErr) console.warn("Erro ao buscar certificados:", certErr);

      return {
        tentativasCount: tentCount || 0,
        certificadosCount: certCount || 0,
      };
    },
    enabled: !!treinamentoId,
  });
}

/**
 * Criação de pergunta do quiz
 */
export function useCreateQuizPergunta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      treinamento_id: string;
      enunciado: string;
      alternativas: string[] | { id: string; texto: string }[];
      resposta_correta: string;
      explicacao?: string | null;
      ordem: number;
    }) => {
      const { data, error } = await db
        .from("quiz_perguntas")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-quiz-perguntas", variables.treinamento_id] });
      queryClient.invalidateQueries({ queryKey: ["quiz-perguntas", variables.treinamento_id] });
      toast.success("Pergunta adicionada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar pergunta: ${error.message}`);
    },
  });
}

/**
 * Atualização de pergunta do quiz
 */
export function useUpdateQuizPergunta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      treinamento_id,
      ...data
    }: Partial<AdminQuizPergunta> & { id: string; treinamento_id: string }) => {
      const { data: result, error } = await db
        .from("quiz_perguntas")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-quiz-perguntas", variables.treinamento_id] });
      queryClient.invalidateQueries({ queryKey: ["quiz-perguntas", variables.treinamento_id] });
      toast.success("Pergunta atualizada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar pergunta: ${error.message}`);
    },
  });
}

/**
 * Exclusão de pergunta do quiz
 */
export function useDeleteQuizPergunta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, treinamentoId }: { id: string; treinamentoId: string }) => {
      const { error } = await db.from("quiz_perguntas").delete().eq("id", id);
      if (error) throw error;
      return { treinamentoId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-quiz-perguntas", result.treinamentoId] });
      queryClient.invalidateQueries({ queryKey: ["quiz-perguntas", result.treinamentoId] });
      toast.success("Pergunta removida!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover pergunta: ${error.message}`);
    },
  });
}

/**
 * Reordenação consecutiva de perguntas (0, 1, 2...)
 */
export function useReordenarQuizPerguntas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      treinamento_id,
      itens,
    }: {
      treinamento_id: string;
      itens: { id: string; ordem: number }[];
    }) => {
      for (const item of itens) {
        const { error } = await db
          .from("quiz_perguntas")
          .update({ ordem: item.ordem })
          .eq("id", item.id);
        if (error) throw error;
      }
      return { treinamento_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-quiz-perguntas", result.treinamento_id] });
      queryClient.invalidateQueries({ queryKey: ["quiz-perguntas", result.treinamento_id] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reordenar perguntas: ${error.message}`);
    },
  });
}

/**
 * Salvar configurações do Quiz no treinamento (Passo 5.1)
 */
export function useUpdateQuizConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      treinamentoId,
      quiz_obrigatorio,
      nota_minima,
      tentativas_maximas,
    }: {
      treinamentoId: string;
      quiz_obrigatorio: boolean;
      nota_minima: number;
      tentativas_maximas: number;
    }) => {
      const { data, error } = await db
        .from("treinamentos")
        .update({
          quiz_obrigatorio,
          nota_minima,
          tentativas_maximas,
        })
        .eq("id", treinamentoId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["treinamento", variables.treinamentoId] });
      queryClient.invalidateQueries({ queryKey: ["treinamentos"] });
      queryClient.invalidateQueries({ queryKey: ["treinamentos-globais"] });
      toast.success("Configuração da avaliação salva com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar configuração: ${error.message}`);
    },
  });
}
