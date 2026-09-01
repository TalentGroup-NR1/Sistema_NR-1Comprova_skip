import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type ConsentType = 'rh_data' | 'feedback' | 'training' | 'communications';

export const CONSENT_LABELS: Record<ConsentType, string> = {
  rh_data: 'Consentimento para processamento de dados de RH',
  feedback: 'Consentimento para feedback e avaliações',
  training: 'Consentimento para treinamentos',
  communications: 'Consentimento para comunicados internos',
};

export interface CollaboratorConsent {
  id: string;
  collaborator_id: string;
  consent_type: ConsentType;
  consent_given: boolean;
  consent_date: string;
  revoked_date: string | null;
  revoked_by: string | null;
}

export interface LgpdAuditLog {
  id: string;
  action: string;
  collaborator_name: string | null;
  created_at: string;
  details: Record<string, unknown> | null;
}

/** Consentimentos LGPD de um colaborador. */
export function useConsentimentos(colaboradorId?: string | null) {
  return useQuery({
    queryKey: ['lgpd', 'consents', colaboradorId],
    enabled: !!colaboradorId,
    queryFn: async (): Promise<CollaboratorConsent[]> => {
      const { data, error } = await supabase
        .from('collaborator_consents' as never)
        .select('id, collaborator_id, consent_type, consent_given, consent_date, revoked_date, revoked_by')
        .eq('collaborator_id', colaboradorId as string);
      if (error) throw error;
      return (data ?? []) as unknown as CollaboratorConsent[];
    },
  });
}

/** Concede ou revoga um consentimento. */
export function useToggleConsentimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      colaboradorId,
      tipo,
      conceder,
    }: {
      colaboradorId: string;
      tipo: ConsentType;
      conceder: boolean;
    }) => {
      const { error } = await supabase.rpc('revoke_consent' as never, {
        p_collaborator_id: colaboradorId,
        p_consent_type: tipo,
        p_grant: conceder,
      } as never);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['lgpd'] });
      toast({
        title: vars.conceder ? 'Consentimento concedido' : 'Consentimento revogado',
        description: CONSENT_LABELS[vars.tipo],
      });
    },
    onError: (e: Error) => {
      toast({ title: 'Não foi possível alterar', description: e.message, variant: 'destructive' });
    },
  });
}

/** Exporta todos os dados pessoais do colaborador (portabilidade LGPD). */
export function useExportarDadosLgpd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (colaboradorId: string) => {
      const { data, error } = await supabase.rpc('export_collaborator_data' as never, {
        p_collaborator_id: colaboradorId,
      } as never);
      if (error) throw error;
      return data as unknown as Record<string, unknown>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lgpd', 'audit'] });
    },
    onError: (e: Error) => {
      toast({ title: 'Falha ao exportar dados', description: e.message, variant: 'destructive' });
    },
  });
}

/** Exclusão permanente e irreversível dos dados do colaborador. */
export function useExcluirDadosLgpd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (colaboradorId: string) => {
      const { data, error } = await supabase.rpc('delete_collaborator_data' as never, {
        p_collaborator_id: colaboradorId,
      } as never);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['colaboradores'] });
      qc.invalidateQueries({ queryKey: ['lgpd'] });
      toast({ title: 'Dados excluídos', description: 'Todos os dados do colaborador foram removidos permanentemente.' });
    },
    onError: (e: Error) => {
      toast({ title: 'Falha ao excluir dados', description: e.message, variant: 'destructive' });
    },
  });
}

/** Histórico de ações LGPD de um colaborador. */
export function useLgpdAuditLogs(colaboradorId?: string | null) {
  return useQuery({
    queryKey: ['lgpd', 'audit', colaboradorId],
    enabled: !!colaboradorId,
    queryFn: async (): Promise<LgpdAuditLog[]> => {
      const { data, error } = await supabase
        .from('lgpd_audit_logs' as never)
        .select('id, action, collaborator_name, created_at, details')
        .eq('collaborator_id', colaboradorId as string)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as LgpdAuditLog[];
    },
  });
}
