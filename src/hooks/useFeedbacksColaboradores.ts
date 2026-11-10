import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useGestorFilter } from '@/hooks/useGestorFilter';

export interface FeedbackColaborador {
  id: string;
  company_id: string;
  colaborador_id: string;
  registrado_por_user_id: string;
  registrado_por_nome: string;
  data_feedback: string;
  assunto: string;
  detalhes_conversa: string;
  prazo_retorno: string | null;
  alerta: boolean;
  created_at: string;
  updated_at: string;
}

export interface ColaboradorParaFeedback {
  id: string;
  full_name: string;
  job_title: string;
  department: string;
  manager_name: string | null;
  status: string;
  feedbacks_count?: number;
  ultimo_feedback?: string | null;
}

export type StatusFilter = 'ATIVO' | 'DESLIGADO' | 'all';

export function useColaboradoresParaFeedback(statusFilter: StatusFilter = 'ATIVO') {
  const { isAdminMaster } = useAuth();
  const effectiveCompanyId = useEffectiveCompanyId();
  const { gestorColaboradorId, shouldFilterByGestor } = useGestorFilter();

  return useQuery({
    queryKey: ['colaboradores-para-feedback', effectiveCompanyId, isAdminMaster, statusFilter, gestorColaboradorId],
    queryFn: async () => {
      let query = supabase
        .from('colaboradores')
        .select(`
          id,
          full_name,
          job_title,
          department,
          manager_name,
          status
        `)
        .order('full_name');

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (!isAdminMaster && effectiveCompanyId) {
        query = query.eq('company_id', effectiveCompanyId);
      }

      // Gestor departamento: only see their direct reports
      if (shouldFilterByGestor && gestorColaboradorId) {
        query = query.eq('gestor_id', gestorColaboradorId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch feedback counts for each colaborador
      const colaboradoresWithFeedbacks = await Promise.all(
        (data || []).map(async (colab) => {
          const { count, data: feedbacks } = await supabase
            .from('feedbacks_colaboradores')
            .select('id, data_feedback', { count: 'exact' })
            .eq('colaborador_id', colab.id)
            .order('data_feedback', { ascending: false })
            .limit(1);

          return {
            ...colab,
            feedbacks_count: count || 0,
            ultimo_feedback: feedbacks?.[0]?.data_feedback || null,
          };
        })
      );

      return colaboradoresWithFeedbacks as ColaboradorParaFeedback[];
    },
    enabled: isAdminMaster || !!effectiveCompanyId,
  });
}

export function useFeedbacksColaborador(colaboradorId: string | null) {
  return useQuery({
    queryKey: ['feedbacks-colaborador', colaboradorId],
    queryFn: async () => {
      if (!colaboradorId) return [];

      const { data, error } = await supabase
        .from('feedbacks_colaboradores')
        .select('*')
        .eq('colaborador_id', colaboradorId)
        .order('data_feedback', { ascending: false });

      if (error) throw error;
      return data as FeedbackColaborador[];
    },
    enabled: !!colaboradorId,
  });
}

export function useColaboradorDetalhe(colaboradorId: string | null) {
  return useQuery({
    queryKey: ['colaborador-detalhe-feedback', colaboradorId],
    queryFn: async () => {
      if (!colaboradorId) return null;

      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, full_name, job_title, department, manager_name, company_id, status')
        .eq('id', colaboradorId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!colaboradorId,
  });
}

export function useCreateFeedback() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (feedback: {
      company_id: string;
      colaborador_id: string;
      registrado_por_user_id: string;
      registrado_por_nome: string;
      data_feedback: string;
      assunto: string;
      detalhes_conversa: string;
      prazo_retorno?: string | null;
      alerta?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('feedbacks_colaboradores')
        .insert(feedback)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks-colaborador', variables.colaborador_id] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores-para-feedback'] });
      toast({
        title: 'Sucesso',
        description: 'Feedback registrado com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao registrar feedback: ' + error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateFeedback() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      colaborador_id,
      ...updates
    }: {
      id: string;
      colaborador_id: string;
      data_feedback?: string;
      assunto?: string;
      detalhes_conversa?: string;
      prazo_retorno?: string | null;
      alerta?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('feedbacks_colaboradores')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, colaborador_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks-colaborador', result.colaborador_id] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores-para-feedback'] });
      toast({
        title: 'Sucesso',
        description: 'Feedback atualizado com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar feedback: ' + error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteFeedback() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, colaborador_id }: { id: string; colaborador_id: string }) => {
      const { error } = await supabase
        .from('feedbacks_colaboradores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return colaborador_id;
    },
    onSuccess: (colaborador_id) => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks-colaborador', colaborador_id] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores-para-feedback'] });
      toast({
        title: 'Sucesso',
        description: 'Feedback excluído com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir feedback: ' + error.message,
        variant: 'destructive',
      });
    },
  });
}
