import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type FeedbackCycle = Database['public']['Tables']['feedback_cycles']['Row'];
type QuestionnaireTemplate = Database['public']['Tables']['questionnaire_templates']['Row'];
type Colaborador = Database['public']['Tables']['colaboradores']['Row'];

export type MyFeedbackCycle = FeedbackCycle & {
  collaborator_template: Pick<QuestionnaireTemplate, 'id' | 'template_name'> | null;
};

export type MyColaboradorInfo = Pick<Colaborador, 'id' | 'full_name' | 'admission_date' | 'birth_date' | 'company_id' | 'job_title' | 'department'> | null;

/**
 * Hook to fetch the colaborador record linked to the current user
 */
export function useMyColaborador() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-colaborador', user?.id],
    queryFn: async (): Promise<MyColaboradorInfo> => {
      console.log('[useMyColaborador] Buscando colaborador para user_id:', user?.id);
      
      if (!user?.id) {
        console.log('[useMyColaborador] Usuário não autenticado');
        return null;
      }

      const { data: colaborador, error } = await supabase
        .from('colaboradores')
        .select('id, full_name, admission_date, birth_date, company_id, job_title, department')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[useMyColaborador] Erro ao buscar colaborador:', error);
        throw error;
      }

      console.log('[useMyColaborador] Colaborador encontrado:', colaborador);
      return colaborador;
    },
    enabled: !!user?.id,
  });
}

/**
 * Hook to fetch feedback cycles for the currently logged-in user (as a colaborador)
 * Uses the colaboradores.user_id link to find the user's colaborador record
 */
export function useMyFeedbackCycles() {
  const { data: colaborador, isLoading: isLoadingColaborador } = useMyColaborador();

  const query = useQuery({
    queryKey: ['my-feedback-cycles', colaborador?.id],
    queryFn: async () => {
      if (!colaborador?.id) return [];

      // Fetch feedback cycles for this colaborador
      const { data: cycles, error: cyclesError } = await supabase
        .from('feedback_cycles')
        .select(`
          *,
          collaborator_template:questionnaire_templates!collaborator_questionnaire_template_id(id, template_name)
        `)
        .eq('colaborador_id', colaborador.id)
        .order('due_date', { ascending: false });

      if (cyclesError) {
        console.error('Error fetching feedback cycles:', cyclesError);
        throw cyclesError;
      }

      return cycles as MyFeedbackCycle[];
    },
    enabled: !!colaborador?.id,
  });

  return {
    ...query,
    isLoading: isLoadingColaborador || query.isLoading,
    colaborador,
    isColaboradorLinked: colaborador !== null && colaborador !== undefined,
  };
}
