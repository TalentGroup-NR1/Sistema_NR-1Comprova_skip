import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface DesligamentoFormData {
  colaboradorId: string;
  dataDesligamento: string;
  tipoDesligamento: string;
  motivoDesligamento: string;
  motivoDetalhado?: string;
}

export interface ReativacaoFormData {
  colaboradorId: string;
  observacao?: string;
}

export interface DesligamentoAuditoria {
  id: string;
  colaborador_id: string;
  acao: 'desligar' | 'reativar';
  data_desligamento: string | null;
  tipo_desligamento: string | null;
  motivo: string | null;
  observacao: string | null;
  criado_por_user_id: string | null;
  criado_em: string;
  colaborador?: {
    full_name: string;
    department: string;
  };
}

export function useColaboradoresAtivos(companyId: string | null) {
  return useQuery({
    queryKey: ['colaboradores-ativos', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, full_name, department, job_title, admission_date, corporate_email, user_id')
        .eq('company_id', companyId)
        .neq('status', 'DESLIGADO')
        .order('full_name');

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useColaboradoresDesligados(companyId: string | null) {
  return useQuery({
    queryKey: ['colaboradores-desligados', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, full_name, department, job_title, admission_date, termination_date, tipo_desligamento, motivo_desligamento, motivo_detalhado, desligado_em')
        .eq('company_id', companyId)
        .eq('status', 'DESLIGADO')
        .order('desligado_em', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useAuditoriaDesligamentos(companyId: string | null) {
  return useQuery({
    queryKey: ['auditoria-desligamentos', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('desligamentos_colaborador')
        .select(`
          id,
          colaborador_id,
          acao,
          data_desligamento,
          tipo_desligamento,
          motivo,
          observacao,
          criado_por_user_id,
          criado_em,
          colaboradores:colaborador_id (
            full_name,
            department
          )
        `)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      
      // Filter by company through colaboradores relation
      const filteredData = data?.filter((item: any) => {
        return item.colaboradores !== null;
      });
      
      return filteredData as unknown as DesligamentoAuditoria[];
    },
    enabled: !!companyId,
  });
}

export function useDesligarColaborador() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: DesligamentoFormData) => {
      // Update colaborador status and termination details
      const { error: updateError } = await supabase
        .from('colaboradores')
        .update({
          status: 'DESLIGADO',
          termination_date: data.dataDesligamento,
          tipo_desligamento: data.tipoDesligamento,
          motivo_desligamento: data.motivoDesligamento,
          motivo_detalhado: data.motivoDetalhado || null,
          desligado_por_user_id: user?.id,
          desligado_em: new Date().toISOString(),
        })
        .eq('id', data.colaboradorId);

      if (updateError) throw updateError;

      // Log to audit table
      const { error: auditError } = await supabase
        .from('desligamentos_colaborador')
        .insert({
          colaborador_id: data.colaboradorId,
          acao: 'desligar',
          data_desligamento: data.dataDesligamento,
          tipo_desligamento: data.tipoDesligamento,
          motivo: data.motivoDesligamento,
          observacao: data.motivoDetalhado || null,
          criado_por_user_id: user?.id,
        });

      if (auditError) throw auditError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores-ativos'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores-desligados'] });
      queryClient.invalidateQueries({ queryKey: ['auditoria-desligamentos'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast({
        title: 'Colaborador desligado',
        description: 'O colaborador foi desligado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao desligar colaborador',
        description: error.message,
      });
    },
  });
}

export interface EditarDesligamentoFormData {
  colaboradorId: string;
  dataDesligamento: string;
  tipoDesligamento: string;
  motivoDesligamento: string;
  motivoDetalhado?: string;
}

export function useEditarDesligamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: EditarDesligamentoFormData) => {
      const { error } = await supabase
        .from('colaboradores')
        .update({
          termination_date: data.dataDesligamento,
          tipo_desligamento: data.tipoDesligamento,
          motivo_desligamento: data.motivoDesligamento,
          motivo_detalhado: data.motivoDetalhado || null,
        })
        .eq('id', data.colaboradorId);

      if (error) throw error;

      // Also update the audit record in desligamentos_colaborador
      const { error: auditError } = await supabase
        .from('desligamentos_colaborador')
        .update({
          data_desligamento: data.dataDesligamento,
          tipo_desligamento: data.tipoDesligamento,
          motivo: data.motivoDesligamento,
          observacao: data.motivoDetalhado || null,
        })
        .eq('colaborador_id', data.colaboradorId)
        .eq('acao', 'desligar');

      if (auditError) throw auditError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores-desligados'] });
      queryClient.invalidateQueries({ queryKey: ['auditoria-desligamentos'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast({
        title: 'Desligamento atualizado',
        description: 'Os dados do desligamento foram atualizados com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar desligamento',
        description: error.message,
      });
    },
  });
}

export function useReativarColaborador() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: ReativacaoFormData) => {
      // Update colaborador status back to ATIVO
      const { error: updateError } = await supabase
        .from('colaboradores')
        .update({
          status: 'ATIVO',
          termination_date: null,
          tipo_desligamento: null,
          motivo_desligamento: null,
          motivo_detalhado: null,
          desligado_por_user_id: null,
          desligado_em: null,
        })
        .eq('id', data.colaboradorId);

      if (updateError) throw updateError;

      // Log to audit table
      const { error: auditError } = await supabase
        .from('desligamentos_colaborador')
        .insert({
          colaborador_id: data.colaboradorId,
          acao: 'reativar',
          observacao: data.observacao || null,
          criado_por_user_id: user?.id,
        });

      if (auditError) throw auditError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores-ativos'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores-desligados'] });
      queryClient.invalidateQueries({ queryKey: ['auditoria-desligamentos'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast({
        title: 'Colaborador reativado',
        description: 'O colaborador foi reativado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao reativar colaborador',
        description: error.message,
      });
    },
  });
}
