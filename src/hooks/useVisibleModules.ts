import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useAuth } from './useAuth';

interface ModuleVisibility {
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
