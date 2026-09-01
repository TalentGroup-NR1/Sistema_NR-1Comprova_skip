import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyColaborador } from './useMyFeedbackCycles';
import { differenceInDays, parseISO } from 'date-fns';

export interface PendingDiario {
  id: string;
  milestone_type: string;
  due_date: string;
  status: string;
  collaborator_token: string;
  daysUntil: number;
  isOverdue: boolean;
  feedbackUrl: string;
  collaborator_template: {
    id: string;
    template_name: string;
  } | null;
}

/**
 * Hook to fetch pending logbook entries (feedback cycles) for the current collaborator.
 * Only returns cycles where the collaborator needs to respond.
 */
export function useMyPendingDiarios() {
  const { data: colaborador, isLoading: isLoadingColaborador } = useMyColaborador();

  const query = useQuery({
    queryKey: ['my-pending-diarios', colaborador?.id],
    queryFn: async (): Promise<PendingDiario[]> => {
      if (!colaborador?.id) return [];

      // Fetch cycles where:
      // - LINKS_GERADOS: Collaborator hasn't responded yet
      // - GESTOR_RESPONDIDO: Manager responded, waiting for collaborator
      const { data, error } = await supabase
        .from('feedback_cycles')
        .select(`
          id,
          milestone_type,
          due_date,
          status,
          collaborator_token,
          collaborator_template:questionnaire_templates!collaborator_questionnaire_template_id(
            id, template_name
          )
        `)
        .eq('colaborador_id', colaborador.id)
        .in('status', ['LINKS_GERADOS', 'GESTOR_RESPONDIDO'])
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching pending diarios:', error);
        throw error;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return (data || []).map(cycle => {
        const dueDate = parseISO(cycle.due_date);
        const daysUntil = differenceInDays(dueDate, today);
        
        return {
          id: cycle.id,
          milestone_type: cycle.milestone_type,
          due_date: cycle.due_date,
          status: cycle.status,
          collaborator_token: cycle.collaborator_token,
          daysUntil,
          isOverdue: daysUntil < 0,
          feedbackUrl: `/feedback/${cycle.collaborator_token}`,
          collaborator_template: cycle.collaborator_template as PendingDiario['collaborator_template'],
        };
      });
    },
    enabled: !!colaborador?.id,
  });

  return {
    ...query,
    isLoading: isLoadingColaborador || query.isLoading,
    colaborador,
  };
}
