import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useEffectiveCompanyId } from './useEffectiveCompanyId';

export function useEvolutionReport(colaboradorId: string | null) {
  return useQuery({
    queryKey: ['evolution_report', colaboradorId],
    queryFn: async () => {
      if (!colaboradorId) return null;

      const { data, error } = await supabase
        .from('evolution_reports')
        .select('*')
        .eq('colaborador_id', colaboradorId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!colaboradorId,
  });
}

export function useSaveEvolutionReport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const effectiveCompanyId = useEffectiveCompanyId();

  return useMutation({
    mutationFn: async (data: {
      colaborador_id: string;
      report_text: string;
      period_start?: string;
      period_end?: string;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');
      if (!effectiveCompanyId) throw new Error('Empresa não selecionada');

      // Check if report already exists
      const { data: existing } = await supabase
        .from('evolution_reports')
        .select('id')
        .eq('colaborador_id', data.colaborador_id)
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data: result, error } = await supabase
          .from('evolution_reports')
          .update({
            report_text: data.report_text,
            period_start: data.period_start,
            period_end: data.period_end,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return result;
      } else {
        // Create new
        const { data: result, error } = await supabase
          .from('evolution_reports')
          .insert({
            colaborador_id: data.colaborador_id,
            company_id: effectiveCompanyId,
            created_by_user_id: user.id,
            report_text: data.report_text,
            period_start: data.period_start,
            period_end: data.period_end,
          })
          .select()
          .single();

        if (error) throw error;
        return result;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evolution_report', variables.colaborador_id] });
      toast.success('Parecer evolutivo salvo com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar parecer: ${error.message}`);
    },
  });
}
