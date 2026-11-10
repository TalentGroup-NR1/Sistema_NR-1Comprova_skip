import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffectiveCompanyId } from './useEffectiveCompanyId';

export interface DiarioBordoHoje {
  id: string;
  milestone_type: string;
  due_date: string;
  status: string;
  colaborador: { id: string; full_name: string; avatar_url?: string | null } | null;
  company: { id: string; name: string } | null;
}

/**
 * Lista ciclos de Diário de Bordo cujo due_date é HOJE e ainda estão pendentes.
 * Usado pelo aviso automático no Dashboard admin.
 */
export function useDiariosBordoHoje() {
  const { role, isAdminMaster, isAdminEmpresa } = useAuth();
  const effectiveCompanyId = useEffectiveCompanyId();

  const isAdmin = isAdminMaster || isAdminEmpresa || role === 'analista_rh';

  return useQuery({
    queryKey: ['diarios-bordo-hoje', effectiveCompanyId],
    queryFn: async (): Promise<DiarioBordoHoje[]> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().slice(0, 10);

      let query = supabase
        .from('feedback_cycles')
        .select(`
          id,
          milestone_type,
          due_date,
          status,
          colaborador:colaboradores!inner(id, full_name, avatar_url, status),
          company:companies(id, name)
        `)
        .eq('due_date', todayStr)
        .neq('status', 'CONCLUIDO')
        .eq('colaboradores.status', 'ATIVO')
        .order('milestone_type', { ascending: true });

      if (effectiveCompanyId) {
        query = query.eq('company_id', effectiveCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      // Defensive: drop any cycle whose colaborador is not ATIVO
      return (data || []).filter((c: any) => c.colaborador?.status === 'ATIVO') as unknown as DiarioBordoHoje[];
    },
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });
}
