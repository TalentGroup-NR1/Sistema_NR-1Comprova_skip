import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AppRole } from './useAuth';
import { extractFunctionError } from '@/lib/functionsError';

interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  role: AppRole;
  company_id?: string;
}

interface UpdateUserData {
  user_id: string;
  email?: string;
  password?: string;
  full_name?: string;
  role?: AppRole;
  is_active?: boolean;
}

export function useUserMutations() {
  const queryClient = useQueryClient();

  const createUser = useMutation({
    mutationFn: async (data: CreateUserData) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('create-user', {
        body: data,
      });

      if (response.error) {
        const errorMsg = await extractFunctionError(response.error, 'Erro ao criar usuário');
        throw new Error(errorMsg);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Usuário criado',
        description: 'O usuário foi criado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar usuário',
        description: error.message,
      });
    },
  });

  const updateUser = useMutation({
    mutationFn: async (data: UpdateUserData) => {
      const response = await supabase.functions.invoke('update-user', {
        body: data,
      });

      if (response.error) {
        const errorMsg = await extractFunctionError(response.error, 'Erro ao atualizar usuário');
        throw new Error(errorMsg);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Usuário atualizado',
        description: 'O usuário foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar usuário',
        description: error.message,
      });
    },
  });

  const toggleUserStatus = useMutation({
    mutationFn: async ({ user_id, is_active }: { user_id: string; is_active: boolean }) => {
      const response = await supabase.functions.invoke('update-user', {
        body: { user_id, is_active },
      });

      if (response.error) {
        const errorMsg = await extractFunctionError(response.error, 'Erro ao alterar status do usuário');
        throw new Error(errorMsg);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: variables.is_active ? 'Usuário ativado' : 'Usuário desativado',
        description: `O usuário foi ${variables.is_active ? 'ativado' : 'desativado'} com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar status',
        description: error.message,
      });
    },
  });

  return {
    createUser,
    updateUser,
    toggleUserStatus,
  };
}
