import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useEffectiveCompanyId } from './useEffectiveCompanyId';

export interface ColaboradorPendente {
  id: string;
  full_name: string;
  email_pessoal: string;
  job_title: string;
  department: string;
  admission_date: string;
  company_id: string;
  company_name?: string;
  contract_type?: string | null;
}

export function useColaboradoresPendentes() {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ['colaboradores-pendentes', effectiveCompanyId],
    queryFn: async (): Promise<ColaboradorPendente[]> => {
      let query = supabase
        .from('colaboradores')
        .select(`
          id,
          full_name,
          email_pessoal,
          job_title,
          department,
          admission_date,
          company_id,
          contract_type,
          companies:company_id (name)
        `)
        .is('user_id', null)
        .not('email_pessoal', 'is', null)
        .neq('email_pessoal', '')
        .eq('status', 'ATIVO')
        .order('created_at', { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq('company_id', effectiveCompanyId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching pending colaboradores:', error);
        throw error;
      }

      return (data || []).map(colab => ({
        ...colab,
        company_name: (colab.companies as { name: string } | null)?.name,
      }));
    },
  });
}

interface FinalizeColaboradorData {
  colaborador_id: string;
  contract_type?: string;
}

export function useFinalizeColaborador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: FinalizeColaboradorData) => {
      console.log('[FinalizeColaborador] Calling edge function with:', { colaborador_id: data.colaborador_id });

      const { data: sessionData } = await supabase.auth.getSession();
      console.log('[FinalizeColaborador] Session exists:', !!sessionData.session?.user?.id);

      if (!sessionData.session) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      const response = await supabase.functions.invoke('finalize-colaborador-user', {
        body: data,
      });

      console.log('[FinalizeColaborador] Response:', response);

      if (response.error) {
        console.error('[FinalizeColaborador] Function error:', response.error);
        const errorMessage = response.error.message || 'Erro ao chamar função';
        throw new Error(errorMessage);
      }

      if (response.data?.error) {
        console.error('[FinalizeColaborador] Data error:', response.data.error);
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores-pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      if (data?.invite_url) {
        toast({
          title: 'Acesso liberado (Modo Dev)',
          description: 'Ambiente de dev: link de convite gerado — copie ou abra para definir a senha.',
        });
      } else {
        toast({
          title: 'Acesso liberado',
          description: data?.email_sent
            ? 'E-mail de boas-vindas enviado com link para definição de senha.'
            : 'Acesso criado, mas houve uma falha ao enviar o e-mail. Use o botão de reenvio.',
        });
      }
    },
    onError: (error: Error) => {
      console.error('[FinalizeColaborador] Mutation error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao liberar acesso',
        description: error.message || 'Erro desconhecido',
      });
    },
  });
}

interface ResendAcessoColaboradorData {
  colaborador_id: string;
}

export function useResendAcessoColaborador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ResendAcessoColaboradorData) => {
      console.log('[ResendAcessoColaborador] Calling edge function with:', { colaborador_id: data.colaborador_id });

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      const response = await supabase.functions.invoke('reenviar-acesso-colaborador', {
        body: data,
      });

      if (response.error) {
        const errorMessage = response.error.message || 'Erro ao chamar função';
        throw new Error(errorMessage);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores-pendentes'] });
      if (data?.invite_url) {
        toast({
          title: 'Link de acesso gerado (Modo Dev)',
          description: 'Ambiente de dev: link de convite gerado — copie ou abra para definir a senha.',
        });
      } else {
        toast({
          title: 'E-mail reenviado',
          description: 'O colaborador receberá um novo link para definir a senha.',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao reenviar',
        description: error.message || 'Erro desconhecido',
      });
    },
  });
}

/**
 * Reenvia o convite de definição de senha a partir do user_id (usuários já liberados).
 */
export function useResendAcessoByUserId() {
  return useMutation({
    mutationFn: async ({ user_id }: { user_id: string }) => {
      const { data: colaborador, error } = await supabase
        .from('colaboradores')
        .select('id')
        .eq('user_id', user_id)
        .maybeSingle();

      if (error) throw error;
      if (!colaborador) {
        throw new Error('Nenhum colaborador vinculado a este usuário.');
      }

      const response = await supabase.functions.invoke('reenviar-acesso-colaborador', {
        body: { colaborador_id: colaborador.id },
      });

      if (response.error) throw new Error(response.error.message || 'Erro ao chamar função');
      if (response.data?.error) throw new Error(response.data.error);

      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Convite reenviado',
        description: 'Um novo link de definição de senha foi enviado por e-mail.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao reenviar convite',
        description: error.message || 'Erro desconhecido',
      });
    },
  });
}

