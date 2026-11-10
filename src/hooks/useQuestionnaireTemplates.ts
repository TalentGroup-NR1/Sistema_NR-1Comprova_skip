import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffectiveCompanyId } from './useEffectiveCompanyId';
import type { Database } from '@/integrations/supabase/types';

type QuestionnaireTemplate = Database['public']['Tables']['questionnaire_templates']['Row'];
type Question = Database['public']['Tables']['questions']['Row'];

export type QuestionnaireTemplateWithQuestions = QuestionnaireTemplate & {
  questions: Question[];
};

export interface TemplateUsageInfo {
  totalCycles: number;
  hasResponses: boolean;
  canDelete: boolean;
}

export type QuestionnaireTemplateWithCompany = QuestionnaireTemplate & {
  companies: { name: string } | null;
};

export function useQuestionnaireTemplates() {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ['questionnaire_templates', effectiveCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('questionnaire_templates')
        .select('*, companies(name)')
        .eq('is_active', true);

      // Filter by company: global templates (null) or company-specific
      if (effectiveCompanyId) {
        query = query.or(`company_id.is.null,company_id.eq.${effectiveCompanyId}`);
      }
      // If no company selected (admin_master viewing all), show ALL templates

      const { data, error } = await query
        .order('milestone_type', { ascending: true })
        .order('template_name', { ascending: true });

      if (error) throw error;
      return data as QuestionnaireTemplateWithCompany[];
    },
  });
}

export function useCheckTemplateUsage(templateId: string | null) {
  return useQuery({
    queryKey: ['template_usage', templateId],
    queryFn: async (): Promise<TemplateUsageInfo | null> => {
      if (!templateId) return null;

      // Verificar ciclos vinculados
      const { data: cycles, error: cyclesError } = await supabase
        .from('feedback_cycles')
        .select('id')
        .or(`questionnaire_template_id.eq.${templateId},collaborator_questionnaire_template_id.eq.${templateId},gestor_questionnaire_template_id.eq.${templateId}`);

      if (cyclesError) throw cyclesError;

      const cycleIds = cycles?.map(c => c.id) || [];
      let hasResponses = false;

      if (cycleIds.length > 0) {
        const { count, error: responsesError } = await supabase
          .from('feedback_responses')
          .select('id', { count: 'exact', head: true })
          .in('feedback_cycle_id', cycleIds);

        if (responsesError) throw responsesError;
        hasResponses = (count || 0) > 0;
      }

      return {
        totalCycles: cycles?.length || 0,
        hasResponses,
        canDelete: !hasResponses,
      };
    },
    enabled: !!templateId,
  });
}

export function useQuestionnaireTemplate(id: string | null) {
  return useQuery({
    queryKey: ['questionnaire_template', id],
    queryFn: async () => {
      if (!id) return null;

      const { data: template, error: templateError } = await supabase
        .from('questionnaire_templates')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (templateError) throw templateError;
      if (!template) return null;

      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('questionnaire_template_id', id)
        .order('order_index', { ascending: true });

      if (questionsError) throw questionsError;

      return {
        ...template,
        questions: questions || [],
      } as QuestionnaireTemplateWithQuestions;
    },
    enabled: !!id,
  });
}

export function useCreateQuestionnaireTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      template_name: string;
      description?: string;
      milestone_type?: Database['public']['Enums']['milestone_type'];
      target_audience?: Database['public']['Enums']['target_audience_type'];
      company_id?: string | null;
    }) => {
      const { data: result, error } = await supabase
        .from('questionnaire_templates')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaire_templates'] });
      toast.success('Template criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar template: ${error.message}`);
    },
  });
}

export function useUpdateQuestionnaireTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      template_name?: string;
      description?: string;
      milestone_type?: Database['public']['Enums']['milestone_type'];
      target_audience?: Database['public']['Enums']['target_audience_type'];
      is_active?: boolean;
    }) => {
      const { data: result, error } = await supabase
        .from('questionnaire_templates')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['questionnaire_templates'] });
      queryClient.invalidateQueries({ queryKey: ['questionnaire_template', variables.id] });
      toast.success('Template atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar template: ${error.message}`);
    },
  });
}

export function useDeleteQuestionnaireTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('questionnaire_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaire_templates'] });
      toast.success('Template excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir template: ${error.message}`);
    },
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      questionnaire_template_id: string;
      question_text: string;
      question_type: Database['public']['Enums']['question_type'];
      respondent_type: Database['public']['Enums']['respondent_type'];
      scale_min?: number;
      scale_max?: number;
      order_index: number;
    }) => {
      const { data: result, error } = await supabase
        .from('questions')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['questionnaire_template', variables.questionnaire_template_id] });
      toast.success('Pergunta adicionada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar pergunta: ${error.message}`);
    },
  });
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      templateId,
      ...data
    }: {
      id: string;
      templateId: string;
      question_text?: string;
      question_type?: Database['public']['Enums']['question_type'];
      respondent_type?: Database['public']['Enums']['respondent_type'];
      scale_min?: number;
      scale_max?: number;
      order_index?: number;
    }) => {
      const { data: result, error } = await supabase
        .from('questions')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['questionnaire_template', variables.templateId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar pergunta: ${error.message}`);
    },
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, templateId }: { id: string; templateId: string }) => {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return templateId;
    },
    onSuccess: (templateId) => {
      queryClient.invalidateQueries({ queryKey: ['questionnaire_template', templateId] });
      toast.success('Pergunta removida com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover pergunta: ${error.message}`);
    },
  });
}
