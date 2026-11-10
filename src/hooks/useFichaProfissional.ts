import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FichaProfissional {
  id: string;
  colaborador_id: string;
  company_id: string;
  formacao_academica: string | null;
  cursos_realizados: string | null;
  breve_resumo: string | null;
  career_grid_stars: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export function useFichaProfissional(colaboradorId: string | null) {
  return useQuery({
    queryKey: ['ficha_profissional', colaboradorId],
    queryFn: async () => {
      if (!colaboradorId) return null;

      const { data, error } = await supabase
        .from('ficha_profissional')
        .select('*')
        .eq('colaborador_id', colaboradorId)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as FichaProfissional | null;
    },
    enabled: !!colaboradorId,
  });
}

export function useSaveFichaProfissional() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      colaborador_id: string;
      company_id: string;
      formacao_academica?: string | null;
      cursos_realizados?: string | null;
      breve_resumo?: string | null;
      career_grid_stars?: Record<string, string | null> | null;
    }) => {
      const { data: existing } = await supabase
        .from('ficha_profissional')
        .select('id')
        .eq('colaborador_id', data.colaborador_id)
        .maybeSingle();

      const payload: any = {
        formacao_academica: data.formacao_academica,
        cursos_realizados: data.cursos_realizados,
        breve_resumo: data.breve_resumo,
        career_grid_stars: data.career_grid_stars || {},
      };

      if (existing) {
        const { error } = await supabase
          .from('ficha_profissional')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ficha_profissional')
          .insert({
            colaborador_id: data.colaborador_id,
            company_id: data.company_id,
            ...payload,
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ficha_profissional', variables.colaborador_id] });
      toast.success('Ficha salva com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar ficha: ' + error.message);
    },
  });
}
