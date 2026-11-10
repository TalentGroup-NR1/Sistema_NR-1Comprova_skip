import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AppRole } from './useAuth';

export interface UpdateUserRoleParams {
  userId: string;
  companyId: string;
  newRole: AppRole;
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, companyId, newRole }: UpdateUserRoleParams) => {
      const { data, error } = await supabase.rpc('admin_update_user_role' as any, {
        p_user_id: userId,
        p_company_id: companyId,
        p_new_role: newRole,
      });

      if (error) {
        throw new Error(error.message || 'Erro ao alterar perfil do usuário');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user_companies'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast({
        title: 'Perfil alterado',
        description: 'O perfil do usuário foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar perfil',
        description: error.message,
      });
    },
  });
}
