import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const ONBOARDING_STEPS = ['branding', 'estrutura', 'equipe', 'nr1'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export interface OnboardingProgress {
  id: string;
  company_id: string;
  current_step: number;
  completed_steps: string[];
  dismissed: boolean;
  completed_at: string | null;
}

/** Progresso do Welcome Wizard da empresa do usuário logado. */
export function useOnboardingProgress(enabled = true) {
  const { companyId } = useAuth();

  return useQuery({
    queryKey: ['onboarding-progress', companyId],
    enabled: enabled && !!companyId,
    queryFn: async (): Promise<OnboardingProgress | null> => {
      const { data, error } = await supabase
        .from('onboarding_progress' as never)
        .select('id, company_id, current_step, completed_steps, dismissed, completed_at')
        .eq('company_id', companyId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as OnboardingProgress | null;
    },
  });
}

/** Cria/atualiza o progresso do onboarding da empresa. */
export function useSaveOnboardingProgress() {
  const qc = useQueryClient();
  const { companyId } = useAuth();

  return useMutation({
    mutationFn: async (patch: Partial<Omit<OnboardingProgress, 'id' | 'company_id'>>) => {
      if (!companyId) throw new Error('Empresa não identificada');
      const { error } = await supabase
        .from('onboarding_progress' as never)
        .upsert(
          { company_id: companyId, ...patch } as never,
          { onConflict: 'company_id' } as never,
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['onboarding-progress'] });
    },
  });
}
