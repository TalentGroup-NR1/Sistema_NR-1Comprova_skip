import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CompanyDirectBranding {
  found: boolean;
  forbidden?: boolean;
  brandName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  faviconUrl?: string | null;
  isInternal?: boolean;
}

/**
 * Consulta direta de branding no banco via RPC get_my_company_branding(company_id).
 * Desacopla a resolução visual da lista compartilhada de companies (independente de RLS/cache).
 */
export function useCompanyBranding(companyId: string | null) {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['company_direct_branding', user?.id ?? null, companyId],
    enabled: !!user?.id && !!isAuthenticated && !!companyId,
    retry: typeof process !== 'undefined' && process.env?.NODE_ENV === 'test' ? false : 1,
    queryFn: async (): Promise<CompanyDirectBranding | null> => {
      if (!companyId) return null;

      try {
        const { data, error } = await supabase.rpc('get_my_company_branding' as never, {
          p_company_id: companyId,
        } as never);

        if (error) {
          console.debug('[useCompanyBranding] RPC get_my_company_branding erro:', error.message || error);
          throw error;
        }

        const res = data as any;
        if (!res) return { found: false };

        return {
          found: Boolean(res.found),
          forbidden: Boolean(res.forbidden),
          brandName: res.brand_name ?? null,
          logoUrl: res.logo_url ?? null,
          primaryColor: res.primary_color ?? null,
          faviconUrl: res.favicon_url ?? null,
          isInternal: Boolean(res.is_internal),
        };
      } catch (err: any) {
        console.debug('[useCompanyBranding] Exceção na busca direta de branding:', err?.message || err);
        throw err;
      }
    },
  });
}
