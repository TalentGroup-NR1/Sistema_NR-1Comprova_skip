import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from './useEffectiveCompanyId';
import { useMyColaborador } from './useMyFeedbackCycles';

/**
 * Hook to fetch feedback cycles for the gestor's direct reports.
 * Returns cycles where colaborador.gestor_id matches the logged-in gestor's colaborador ID.
 */
export function useGestorFeedbackCycles() {
  const effectiveCompanyId = useEffectiveCompanyId();
  const { data: myColaborador } = useMyColaborador();

  return useQuery({
    queryKey: ['gestor_feedback_cycles', effectiveCompanyId, myColaborador?.id],
    queryFn: async () => {
      if (!effectiveCompanyId || !myColaborador?.id) return [];

      const { data, error } = await supabase
        .from('feedback_cycles')
        .select(`
          id,
          milestone_type,
          due_date,
          status,
          gestor_token,
          colaborador:colaboradores!inner(id, full_name, job_title, department, gestor_id)
        `)
        .eq('company_id', effectiveCompanyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter to only cycles where the colaborador's gestor_id matches the logged-in gestor
      return (data || []).filter(
        (cycle: any) => cycle.colaborador?.gestor_id === myColaborador.id
      );
    },
    enabled: !!effectiveCompanyId && !!myColaborador?.id,
  });
}
