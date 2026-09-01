import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffectiveCompanyId } from './useEffectiveCompanyId';
import { useAuth } from './useAuth';
import { useGestorFilter } from './useGestorFilter';
import type { Database } from '@/integrations/supabase/types';

type FeedbackCycle = Database['public']['Tables']['feedback_cycles']['Row'];
type FeedbackResponse = Database['public']['Tables']['feedback_responses']['Row'];
type Colaborador = Database['public']['Tables']['colaboradores']['Row'];
type QuestionnaireTemplate = Database['public']['Tables']['questionnaire_templates']['Row'];

export type FeedbackCycleWithRelations = FeedbackCycle & {
  colaborador: Pick<Colaborador, 'id' | 'full_name' | 'corporate_email' | 'job_title' | 'admission_date'>;
  collaborator_template: Pick<QuestionnaireTemplate, 'id' | 'template_name'> | null;
  gestor_template: Pick<QuestionnaireTemplate, 'id' | 'template_name'> | null;
};

export function useFeedbackCycles(filters?: {
  status?: string;
  milestoneType?: string;
  colaboradorName?: string;
}) {
  const effectiveCompanyId = useEffectiveCompanyId();
  const { gestorColaboradorId, shouldFilterByGestor } = useGestorFilter();

  return useQuery({
    queryKey: ['feedback_cycles', effectiveCompanyId, filters, gestorColaboradorId],
    queryFn: async () => {
      let query = supabase
        .from('feedback_cycles')
        .select(`
          *,
          colaborador:colaboradores(id, full_name, corporate_email, job_title, admission_date, gestor_id),
          collaborator_template:questionnaire_templates!collaborator_questionnaire_template_id(id, template_name),
          gestor_template:questionnaire_templates!gestor_questionnaire_template_id(id, template_name)
        `)
        .order('created_at', { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq('company_id', effectiveCompanyId);
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as Database['public']['Enums']['feedback_cycle_status']);
      }

      if (filters?.milestoneType && filters.milestoneType !== 'all') {
        query = query.eq('milestone_type', filters.milestoneType as Database['public']['Enums']['milestone_type']);
      }

      const { data, error } = await query;

      if (error) throw error;

      let result = data as FeedbackCycleWithRelations[];

      // Gestor departamento: only show cycles for their direct reports
      if (shouldFilterByGestor && gestorColaboradorId) {
        result = result.filter(cycle =>
          (cycle.colaborador as any)?.gestor_id === gestorColaboradorId
        );
      }

      // Filter by colaborador name in memory
      if (filters?.colaboradorName) {
        result = result.filter(cycle =>
          cycle.colaborador?.full_name?.toLowerCase().includes(filters.colaboradorName!.toLowerCase())
        );
      }

      return result;
    },
    enabled: !!effectiveCompanyId,
  });
}

export function useFeedbackCycle(id: string | null) {
  return useQuery({
    queryKey: ['feedback_cycle', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('feedback_cycles')
        .select(`
          *,
          colaborador:colaboradores(id, full_name, corporate_email, job_title, admission_date, department),
          collaborator_template:questionnaire_templates!collaborator_questionnaire_template_id(id, template_name, description),
          gestor_template:questionnaire_templates!gestor_questionnaire_template_id(id, template_name, description)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as FeedbackCycleWithRelations | null;
    },
    enabled: !!id,
  });
}

export function useCreateFeedbackCycle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      company_id: string;
      colaborador_id: string;
      allocation_id?: string;
      milestone_type: Database['public']['Enums']['milestone_type'];
      due_date: string;
      questionnaire_template_id: string;
      gestor_name?: string;
      gestor_email?: string;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data: result, error } = await supabase
        .from('feedback_cycles')
        .insert({
          ...data,
          status: 'LINKS_GERADOS',
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback_cycles'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores_milestones'] });
      toast.success('Ciclo de feedback criado com sucesso! Links gerados.');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar ciclo: ${error.message}`);
    },
  });
}

// Hook to activate an existing NAO_INICIADO cycle
export function useActivateFeedbackCycle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      cycle_id: string;
      collaborator_questionnaire_template_id: string;
      gestor_questionnaire_template_id: string;
      gestor_name?: string;
      gestor_email?: string;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data: result, error } = await supabase
        .from('feedback_cycles')
        .update({
          collaborator_questionnaire_template_id: data.collaborator_questionnaire_template_id,
          gestor_questionnaire_template_id: data.gestor_questionnaire_template_id,
          gestor_name: data.gestor_name,
          gestor_email: data.gestor_email,
          status: 'LINKS_GERADOS',
          created_by_user_id: user.id,
        })
        .eq('id', data.cycle_id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!result) throw new Error('Ciclo não encontrado ou sem permissão para atualizar');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback_cycles'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores_milestones'] });
      toast.success('Ciclo de feedback iniciado com sucesso! Links gerados.');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao iniciar ciclo: ${error.message}`);
    },
  });
}

export function useUpdateFeedbackCycleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: Database['public']['Enums']['feedback_cycle_status'];
    }) => {
      const { data, error } = await supabase
        .from('feedback_cycles')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feedback_cycles'] });
      queryClient.invalidateQueries({ queryKey: ['feedback_cycle', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores_milestones'] });
      toast.success('Status atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });
}

export function useFeedbackResponses(cycleId: string | null) {
  return useQuery({
    queryKey: ['feedback_responses', cycleId],
    queryFn: async () => {
      if (!cycleId) return [];

      const { data, error } = await supabase
        .from('feedback_responses')
        .select(`
          *,
          question:questions(*)
        `)
        .eq('feedback_cycle_id', cycleId)
        .order('submitted_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!cycleId,
  });
}

export type MilestoneInfo = {
  cycle_id: string;
  type: Database['public']['Enums']['milestone_type'];
  dueDate: string;
  daysUntil: number;
  status: Database['public']['Enums']['feedback_cycle_status'];
  questionnaire_template_id: string | null;
  collaborator_token: string | null;
  gestor_token: string | null;
  isOverdue: boolean;
  isUpcoming: boolean;
  isNotStarted: boolean;
};

export type ColaboradorWithMilestones = {
  id: string;
  full_name: string;
  admission_date: string;
  job_title: string;
  department: string;
  corporate_email: string;
  status: string;
  empresa_cliente: string | null;
  gestao_tecnica: string | null;
  milestones: MilestoneInfo[];
  hasOverdueMilestone: boolean;
  hasUpcomingMilestone: boolean;
  hasNotStartedMilestone: boolean;
  hasInProgressMilestone: boolean;
};

// Hook for milestone dashboard - get all cycles grouped by colaborador
// Now accepts optional statusFilter: 'ATIVO' | 'DESLIGADO' | 'all'
export function useColaboradoresMilestones(statusFilter: 'ATIVO' | 'DESLIGADO' | 'all' = 'all') {
  const effectiveCompanyId = useEffectiveCompanyId();
  const { gestorColaboradorId, shouldFilterByGestor } = useGestorFilter();

  return useQuery({
    queryKey: ['colaboradores_milestones', effectiveCompanyId, statusFilter, gestorColaboradorId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];

      // Get all feedback cycles with colaborador info
      const { data: cycles, error: cyclesError } = await supabase
        .from('feedback_cycles')
        .select(`
          id,
          colaborador_id,
          milestone_type,
          due_date,
          status,
          questionnaire_template_id,
          collaborator_token,
          gestor_token,
          colaborador:colaboradores(id, full_name, admission_date, job_title, department, corporate_email, status, gestor_id, empresa_cliente, gestao_tecnica)
        `)
        .eq('company_id', effectiveCompanyId)
        .order('due_date', { ascending: true });

      if (cyclesError) throw cyclesError;

      // Group cycles by colaborador
      const today = new Date();
      const colaboradoresMap = new Map<string, ColaboradorWithMilestones>();

      cycles.forEach(cycle => {
        const colab = cycle.colaborador as any;
        if (!colab) return;

        // Apply status filter
        if (statusFilter !== 'all' && colab.status !== statusFilter) return;

        // Gestor departamento: only show their direct reports
        if (shouldFilterByGestor && gestorColaboradorId && colab.gestor_id !== gestorColaboradorId) return;

        const dueDate = new Date(cycle.due_date);
        const daysUntil = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        const isNotStarted = cycle.status === 'NAO_INICIADO';
        const isOverdue = daysUntil < 0 && isNotStarted;
        const isUpcoming = daysUntil >= 0 && daysUntil <= 7 && isNotStarted;

        const milestone: MilestoneInfo = {
          cycle_id: cycle.id,
          type: cycle.milestone_type,
          dueDate: cycle.due_date,
          daysUntil,
          status: cycle.status,
          questionnaire_template_id: cycle.questionnaire_template_id,
          collaborator_token: cycle.collaborator_token,
          gestor_token: cycle.gestor_token,
          isOverdue,
          isUpcoming,
          isNotStarted,
        };

        if (!colaboradoresMap.has(colab.id)) {
          colaboradoresMap.set(colab.id, {
            id: colab.id,
            full_name: colab.full_name,
            admission_date: colab.admission_date,
            job_title: colab.job_title,
            department: colab.department,
            corporate_email: colab.corporate_email,
            status: colab.status,
            empresa_cliente: colab.empresa_cliente ?? null,
            gestao_tecnica: colab.gestao_tecnica ?? null,
            milestones: [],
            hasOverdueMilestone: false,
            hasUpcomingMilestone: false,
            hasNotStartedMilestone: false,
            hasInProgressMilestone: false,
          });
        }

        const colabData = colaboradoresMap.get(colab.id)!;
        colabData.milestones.push(milestone);
        
        if (isOverdue) colabData.hasOverdueMilestone = true;
        if (isUpcoming) colabData.hasUpcomingMilestone = true;
        if (isNotStarted) colabData.hasNotStartedMilestone = true;
        if (['LINKS_GERADOS', 'COLAB_RESPONDIDO', 'GESTOR_RESPONDIDO'].includes(cycle.status)) {
          colabData.hasInProgressMilestone = true;
        }
      });

      return Array.from(colaboradoresMap.values()).sort((a, b) => {
        const da = a.admission_date ? new Date(a.admission_date).getTime() : 0;
        const db = b.admission_date ? new Date(b.admission_date).getTime() : 0;
        if (db !== da) return db - da;
        return a.full_name.localeCompare(b.full_name, 'pt-BR');
      });
    },
    enabled: !!effectiveCompanyId,
  });
}
