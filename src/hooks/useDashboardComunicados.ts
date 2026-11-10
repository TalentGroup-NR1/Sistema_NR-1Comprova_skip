import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface DashboardComunicado {
  id: string;
  company_id: string;
  titulo: string;
  resumo: string;
  autor_nome: string;
  data_publicacao: string;
  is_pinned: boolean;
  is_read: boolean;
}

export function useDashboardComunicados(limit = 5) {
  return useQuery({
    queryKey: ['dashboard-comunicados', limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_comunicados', {
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as DashboardComunicado[];
    },
  });
}

export function useMarkComunicadoAsRead() {
  const queryClient = useQueryClient();
  const { user, companyId } = useAuth();

  return useMutation({
    mutationFn: async (comunicadoId: string) => {
      if (!user?.id || !companyId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('comunicado_leituras')
        .upsert(
          {
            company_id: companyId,
            comunicado_id: comunicadoId,
            user_id: user.id,
            read_at: new Date().toISOString(),
          },
          { onConflict: 'company_id,comunicado_id,user_id' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-comunicados'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useUnreadCount(comunicados?: DashboardComunicado[]) {
  return comunicados?.filter((c) => !c.is_read).length ?? 0;
}
