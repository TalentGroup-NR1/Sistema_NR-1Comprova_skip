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

export function useUsers() {
  const { role, isAdminMaster } = useAuth();
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ['users', role, effectiveCompanyId],
    queryFn: async (): Promise<UserProfile[]> => {
      let query = supabase
        .from('profiles')
        .select(`
          *,
          companies:company_id (name)
        `)
        .order('created_at', { ascending: false });

      // Filter by company if there's an effective company selected
      // For admin_master with no selection (null), show all
      // For non-admin_master, effectiveCompanyId is always their own company
      if (effectiveCompanyId) {
        query = query.eq('company_id', effectiveCompanyId);
      }

      const { data: profiles, error: profilesError } = await query;

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Fetch roles for all users
      const userIds = profiles?.map(p => p.user_id) || [];
      
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      // Map roles to profiles
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

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
    roles: 5,
  };

  return stats;
}
