import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DimensaoQuestionario {
  id: string;
  questionario_id: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// Hook para listar dimensões de um questionário
export const useDimensoesQuestionario = (questionarioId: string | null) => {
  return useQuery({
    queryKey: ['dimensoes-questionario', questionarioId],
    queryFn: async () => {
      if (!questionarioId) return [];
      
      const { data, error } = await supabase
        .from('dimensoes_questionario_cuidar_plus')
        .select('*')
        .eq('questionario_id', questionarioId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as DimensaoQuestionario[];
    },
    enabled: !!questionarioId,
  });
};

// Hook para criar dimensão
export const useCreateDimensao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      questionario_id: string;
      codigo: string;
      titulo: string;
      descricao?: string | null;
      order_index: number;
    }) => {
      const { data: result, error } = await supabase
        .from('dimensoes_questionario_cuidar_plus')
        .insert({
          questionario_id: data.questionario_id,
          codigo: data.codigo,
          titulo: data.titulo,
          descricao: data.descricao || null,
          order_index: data.order_index,
        })
        .select()
        .single();

      if (error) throw error;
      return result as DimensaoQuestionario;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dimensoes-questionario', variables.questionario_id] });
    },
    onError: (error) => {
      toast.error('Erro ao criar dimensão: ' + error.message);
    },
  });
};

// Hook para atualizar dimensão
export const useUpdateDimensao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      questionario_id: string;
      codigo?: string;
      titulo?: string;
      descricao?: string | null;
      order_index?: number;
    }) => {
      const { id, questionario_id, ...updateData } = data;
      
      const { data: result, error } = await supabase
        .from('dimensoes_questionario_cuidar_plus')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as DimensaoQuestionario;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dimensoes-questionario', variables.questionario_id] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar dimensão: ' + error.message);
    },
  });
};

// Hook para deletar dimensão
export const useDeleteDimensao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; questionario_id: string }) => {
      const { error } = await supabase
        .from('dimensoes_questionario_cuidar_plus')
        .delete()
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dimensoes-questionario', variables.questionario_id] });
    },
    onError: (error) => {
      toast.error('Erro ao excluir dimensão: ' + error.message);
    },
  });
};

// Hook para atualizar ordem das dimensões em lote
export const useReorderDimensoes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      questionario_id: string;
      dimensoes: { id: string; order_index: number }[];
    }) => {
      // Update each dimension's order_index
      const updates = data.dimensoes.map(d =>
        supabase
          .from('dimensoes_questionario_cuidar_plus')
          .update({ order_index: d.order_index })
          .eq('id', d.id)
      );

      const results = await Promise.all(updates);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;

      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dimensoes-questionario', variables.questionario_id] });
    },
    onError: (error) => {
      toast.error('Erro ao reordenar dimensões: ' + error.message);
    },
  });
};
