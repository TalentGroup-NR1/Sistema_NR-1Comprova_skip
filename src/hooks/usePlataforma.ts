import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlataformaEmpresa {
  id: string;
  name: string;
  brand_name: string | null;
  cnpj: string | null;
  status: string;
  is_internal: boolean;
  created_at: string;
  total_colaboradores: number;
}

export interface PlataformaMetrics {
  empresas_ativas: number;
  empresas_internas: number;
  empresas_externas: number;
  empresas_suspensas: number;
  total_usuarios: number;
  novos_30_dias: number;
}

export interface PlatformAuditLog {
  id: string;
  user_email: string | null;
  action: string;
  target_company_name: string | null;
  ip_address: string | null;
  created_at: string;
}

/** Métricas agregadas da plataforma (apenas contagens). */
export function usePlataformaMetrics(enabled = true) {
  return useQuery({
    queryKey: ['plataforma', 'metrics'],
    enabled,
    queryFn: async (): Promise<PlataformaMetrics> => {
      const { data, error } = await supabase.rpc('get_plataforma_metrics' as never);
      if (error) throw error;
      return data as unknown as PlataformaMetrics;
    },
  });
}

/** Lista de empresas cadastradas na plataforma. */
export function usePlataformaEmpresas(enabled = true) {
  return useQuery({
    queryKey: ['plataforma', 'empresas'],
    enabled,
    queryFn: async (): Promise<PlataformaEmpresa[]> => {
      const { data, error } = await supabase.rpc('get_plataforma_empresas' as never);
      if (error) throw error;
      return (data ?? []) as unknown as PlataformaEmpresa[];
    },
  });
}

/** Últimas ações administrativas registradas. */
export function usePlataformaAuditLogs(enabled = true) {
  return useQuery({
    queryKey: ['plataforma', 'audit'],
    enabled,
    queryFn: async (): Promise<PlatformAuditLog[]> => {
      const { data, error } = await supabase
        .from('platform_audit_logs' as never)
        .select('id, user_email, action, target_company_name, ip_address, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as PlatformAuditLog[];
    },
  });
}

/** Suspende ou reativa uma empresa (bloqueado para empresas internas). */
export function useToggleEmpresaStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      companyId,
      ativar,
      motivo,
    }: { companyId: string; ativar: boolean; motivo?: string }) => {
      const { data, error } = await supabase.rpc('suspender_empresa' as never, {
        _company_id: companyId,
        _ativar: ativar,
      } as never);
      if (error) throw error;

      // Notificação por e-mail (falha não invalida a ação)
      try {
        const { data: company } = await supabase
          .from('companies')
          .select('email, name, brand_name')
          .eq('id', companyId)
          .maybeSingle();

        if (company?.email) {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: ativar ? 'empresa-reativada' : 'empresa-suspensa',
              recipientEmail: company.email,
              companyId,
              idempotencyKey: `empresa-${ativar ? 'reativada' : 'suspensa'}-${companyId}-${new Date()
                .toISOString()
                .slice(0, 10)}`,
              templateData: {
                companyName: company.brand_name || company.name,
                ...(ativar
                  ? { loginUrl: `${window.location.origin}/auth` }
                  : motivo
                    ? { reason: motivo }
                    : {}),
              },
            },
          });
        }
      } catch (e) {
        console.error('Falha ao enviar e-mail de status da empresa', e);
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plataforma'] });
    },
  });
}

