import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { AppRole } from './useAuth';
import { toast } from 'sonner';

export interface UserCompany {
  companyId: string;
  role: AppRole;
  isDefault: boolean;
  name: string;
  cnpj?: string | null;
  status?: string | null;
  brandName?: string | null;
  brandLogoUrl?: string | null;
}

export function useUserCompanies() {
  const { user, isAuthenticated, refreshUserData } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['user_companies', user?.id],
    queryFn: async (): Promise<UserCompany[]> => {
      if (!user?.id || !isAuthenticated) return [];

      const { data, error } = await supabase
        .from('user_companies' as any)
        .select(`
          company_id,
          role,
          is_default,
          companies:companies!inner (
            id,
            name,
            cnpj,
            status,
            brand_name,
            brand_logo_url
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.warn('[useUserCompanies] Vínculos multiempresa indisponíveis:', error.message || error);
        throw error;
      }

      if (!data) return [];

      return (data as any[]).map((row) => ({
        companyId: row.company_id,
        role: row.role as AppRole,
        isDefault: !!row.is_default,
        name: row.companies?.name ?? 'Empresa Sem Nome',
        cnpj: row.companies?.cnpj ?? null,
        status: row.companies?.status ?? 'active',
        brandName: row.companies?.brand_name ?? null,
        brandLogoUrl: row.companies?.brand_logo_url ?? null,
      }));
    },
    enabled: !!user?.id && !!isAuthenticated,
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const userCompanies = query.data ?? [];
  const hasMultipleCompanies = userCompanies.length > 1;

  const switchCompany = async (targetCompanyId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('set_active_company' as any, {
        p_company_id: targetCompanyId,
      });

      if (error) {
        console.error('[useUserCompanies] Erro na RPC set_active_company:', error);
        toast.error('Não foi possível alternar de empresa: ' + error.message);
        return false;
      }

      // Revalida caches do React Query
      await queryClient.invalidateQueries();
      queryClient.removeQueries({ queryKey: ['module_visibility'] });

      // Atualiza os dados do perfil autenticado
      if (refreshUserData) {
        await refreshUserData();
      }

      return true;
    } catch (err: any) {
      console.error('[useUserCompanies] Exceção na troca de empresa:', err);
      toast.error('Erro inesperado ao alternar de empresa.');
      return false;
    }
  };

  return {
    userCompanies,
    hasMultipleCompanies,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    switchCompany,
  };
}
