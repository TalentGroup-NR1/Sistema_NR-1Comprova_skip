import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, AppRole } from './useAuth';
import { useEffectiveCompanyId } from './useEffectiveCompanyId';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  company_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  role?: AppRole;
  company_name?: string;
}

const ROLE_PRIORITY: Record<string, number> = {
  admin_master: 100,
  super_admin: 100,
  admin_empresa: 50,
  gestor: 40,
  analista_rh: 30,
  colaborador: 10,
};

export function useUsers() {
  const { role, isAdminMaster } = useAuth();
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ['users', role, effectiveCompanyId],
    queryFn: async (): Promise<UserProfile[]> => {
      // 1. Quando há uma empresa efetiva (contexto da empresa ativa):
      // Buscar membros canônicos a partir de user_companies com role contextual via RPC segura
      if (effectiveCompanyId) {
        const { data: companyUsers, error: rpcError } = await supabase.rpc(
          'get_company_users' as any,
          { p_company_id: effectiveCompanyId }
        );

        if (rpcError) {
          console.error('[useUsers] Erro na RPC get_company_users:', rpcError);
          throw rpcError;
        }

        return (companyUsers || []).map((u: any) => ({
          id: u.id,
          user_id: u.user_id,
          full_name: u.full_name,
          email: u.email,
          phone: u.phone,
          avatar_url: u.avatar_url,
          company_id: u.company_id,
          is_active: u.is_active,
          created_at: u.created_at,
          updated_at: u.updated_at,
          role: u.role as AppRole,
          company_name: u.company_name,
        }));
      }

      // 2. Para admin_master/super_admin sem empresa selecionada (effectiveCompanyId === null):
      // Manter listagem global de todos os perfis
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          companies:company_id (name)
        `)
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('[useUsers] Erro ao buscar profiles:', profilesError);
        throw profilesError;
      }

      // Fetch roles for all users
      const userIds = profiles?.map(p => p.user_id) || [];
      
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) {
        console.error('[useUsers] Erro ao buscar roles:', rolesError);
      }

      // Previne que papéis inferiores (ex: colaborador) sobrescrevam papéis superiores (ex: admin_empresa)
      const roleMap = new Map<string, AppRole>();
      for (const r of roles || []) {
        const current = roleMap.get(r.user_id);
        if (!current || (ROLE_PRIORITY[r.role] || 0) > (ROLE_PRIORITY[current] || 0)) {
          roleMap.set(r.user_id, r.role as AppRole);
        }
      }

      return (profiles || []).map(profile => ({
        ...profile,
        role: roleMap.get(profile.user_id) as AppRole | undefined,
        company_name: (profile.companies as { name: string } | null)?.name,
      }));
    },
    enabled: !!role && (role === 'admin_master' || role === 'admin_empresa'),
  });
}

export function useUserStats() {
  const { data: users } = useUsers();

  const stats = {
    total: users?.length || 0,
    active: users?.filter(u => u.is_active).length || 0,
    inactive: users?.filter(u => !u.is_active).length || 0,
  };

  return stats;
}
