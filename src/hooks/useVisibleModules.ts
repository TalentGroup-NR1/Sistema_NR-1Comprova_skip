import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useAuth } from './useAuth';
import { MAPA_ROTA_MODULO } from '@/lib/modulosContrataveis';

export interface ModuleVisibility {
  module_key: string;
  visible: boolean;
}

export function useVisibleModules() {
  const { selectedCompanyId } = useCompanyContext();
  const { role, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['module_visibility', selectedCompanyId, role],
    queryFn: async () => {
      if (!selectedCompanyId || !isAuthenticated) return [];
      
      const { data, error } = await supabase.rpc('get_visible_modules', {
        p_company_id: selectedCompanyId
      });

      if (error) {
        console.error('Error fetching module visibility:', error);
        return [];
      }

      return (data as ModuleVisibility[]) || [];
    },
    enabled: !!selectedCompanyId && !!isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para verificar se um módulo específico (ou sub-rota) está visível/contratado
 * para o tenant e o perfil do usuário logado.
 */
export function useIsModuleVisible(moduleKey?: string) {
  const { isSuperAdmin } = useAuth();
  const { data: visibleModules, isLoading } = useVisibleModules();

  if (!moduleKey) {
    return { isVisible: true, isLoading: false, isSuperAdminBypass: false };
  }

  // Super Admin da plataforma sempre tem visão irrestrita (com flag de bypass)
  if (isSuperAdmin) {
    // Verifica se para a empresa estaria desativado para exibir o banner
    const moduloPai = MAPA_ROTA_MODULO[moduleKey] || moduleKey;
    const config = visibleModules?.find(
      (v) => v.module_key === moduleKey || v.module_key === moduloPai
    );
    const estariaDesativado = config ? config.visible === false : false;

    return { 
      isVisible: true, 
      isLoading: false, 
      isSuperAdminBypass: estariaDesativado 
    };
  }

  if (isLoading || !visibleModules || visibleModules.length === 0) {
    return { isVisible: true, isLoading, isSuperAdminBypass: false };
  }

  const moduloPai = MAPA_ROTA_MODULO[moduleKey] || moduleKey;
  
  const config = visibleModules.find(
    (v) => v.module_key === moduleKey || v.module_key === moduloPai
  );

  const isVisible = config ? config.visible !== false : true;

  return { isVisible, isLoading, isSuperAdminBypass: false };
}

/**
 * Hook para invalidar caches de visibilidade após mutações pelo Admin Super
 */
export function useInvalidateModuleVisibility() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['module_visibility'] });
    queryClient.invalidateQueries({ queryKey: ['company_modules'] });
  };
}
