import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from './useEffectiveCompanyId';
import { toast } from 'sonner';

export interface Beneficio {
  id: string;
  company_id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  valor_mensal: number | null;
  operadora_fornecedor: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface BeneficioDepartamento {
  id: string;
  beneficio_id: string;
  departamento: string;
  company_id: string;
  created_at: string;
}

export interface ColaboradorBeneficio {
  id: string;
  colaborador_id: string;
  beneficio_id: string;
  numero_cartao: string | null;
  data_inicio: string;
  data_fim: string | null;
  status: string;
  valor: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  beneficio?: Beneficio;
  colaborador?: {
    id: string;
    full_name: string;
    department: string;
  };
}

export interface BeneficioTipoContrato {
  id: string;
  beneficio_id: string;
  tipo_contrato: string;
  company_id: string;
  created_at: string;
}

export interface BeneficioEmpresaCliente {
  id: string;
  beneficio_id: string;
  empresa_cliente: string;
  company_id: string;
  created_at: string;
}


export interface BeneficioFormData {
  nome: string;
  descricao?: string;
  categoria: string;
  valor_mensal?: number;
  operadora_fornecedor?: string;
  ativo?: boolean;
}

// Fetch all beneficios for the company
export function useBeneficios() {
  const effectiveCompanyId = useEffectiveCompanyId();
  
  return useQuery({
    queryKey: ['beneficios', effectiveCompanyId],
    queryFn: async () => {
      let query = supabase.from('beneficios' as any).select('*').order('nome');
      
      if (effectiveCompanyId) {
        query = query.eq('company_id', effectiveCompanyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Beneficio[];
    },
  });
}

// Fetch beneficio departamentos
export function useBeneficioDepartamentos(beneficioId: string | null) {
  return useQuery({
    queryKey: ['beneficio-departamentos', beneficioId],
    queryFn: async () => {
      if (!beneficioId) return [];
      
      const { data, error } = await supabase
        .from('beneficios_departamento' as any)
        .select('*')
        .eq('beneficio_id', beneficioId);
      
      if (error) throw error;
      return (data || []) as unknown as BeneficioDepartamento[];
    },
    enabled: !!beneficioId,
  });
}

// Fetch all departamentos from colaboradores for the company
export function useDepartamentos() {
  const effectiveCompanyId = useEffectiveCompanyId();
  
  return useQuery({
    queryKey: ['departamentos', effectiveCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('colaboradores')
        .select('department')
        .eq('status', 'ATIVO');
      
      if (effectiveCompanyId) {
        query = query.eq('company_id', effectiveCompanyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Get unique departments
      const departments = [...new Set(data.map(c => c.department).filter(Boolean))];
      return departments.sort();
    },
  });
}

// Fetch colaborador beneficios with details
export function useColaboradorBeneficios(colaboradorId?: string) {
  const effectiveCompanyId = useEffectiveCompanyId();
  
  return useQuery({
    queryKey: ['colaborador-beneficios', colaboradorId, effectiveCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaborador_beneficios' as any)
        .select(`
          *,
          beneficio:beneficios(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      let result = (data || []) as unknown as ColaboradorBeneficio[];
      
      if (colaboradorId) {
        result = result.filter(r => r.colaborador_id === colaboradorId);
      }
      
      return result;
    },
  });
}

// Fetch beneficio tipos contrato
export function useBeneficioTiposContrato(beneficioId: string | null) {
  return useQuery({
    queryKey: ['beneficio-tipos-contrato', beneficioId],
    queryFn: async () => {
      if (!beneficioId) return [];
      
      const { data, error } = await supabase
        .from('beneficios_tipo_contrato' as any)
        .select('*')
        .eq('beneficio_id', beneficioId);
      
      if (error) throw error;
      return (data || []) as unknown as BeneficioTipoContrato[];
    },
    enabled: !!beneficioId,
  });
}

// Update beneficio tipos contrato
export function useUpdateBeneficioTiposContrato() {
  const queryClient = useQueryClient();
  const effectiveCompanyId = useEffectiveCompanyId();
  
  return useMutation({
    mutationFn: async ({ beneficioId, tiposContrato }: { beneficioId: string; tiposContrato: string[] }) => {
      if (!effectiveCompanyId) throw new Error('Empresa não selecionada');
      
      await supabase
        .from('beneficios_tipo_contrato' as any)
        .delete()
        .eq('beneficio_id', beneficioId);
      
      if (tiposContrato.length > 0) {
        const { error } = await supabase
          .from('beneficios_tipo_contrato' as any)
          .insert(
            tiposContrato.map(tipo => ({
              beneficio_id: beneficioId,
              tipo_contrato: tipo,
              company_id: effectiveCompanyId,
            })) as any
          );
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficio-tipos-contrato'] });
      toast.success('Tipos de contrato atualizados com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar tipos de contrato: ' + error.message);
    },
  });
}

// Fixed list of contract types
export const TIPOS_CONTRATO = [
  'CLT',
  'Estágio',
  'Aprendiz',
  'PJ',
  'Temporário',
  'Voluntário',
  'Outros',
];

// Fetch beneficio empresa clientes
export function useBeneficioEmpresasCliente(beneficioId: string | null) {
  return useQuery({
    queryKey: ['beneficio-empresas-cliente', beneficioId],
    queryFn: async () => {
      if (!beneficioId) return [];
      const { data, error } = await supabase
        .from('beneficios_empresa_cliente' as any)
        .select('*')
        .eq('beneficio_id', beneficioId);
      if (error) throw error;
      return (data || []) as unknown as BeneficioEmpresaCliente[];
    },
    enabled: !!beneficioId,
  });
}

// Fetch all empresas cliente from colaboradores for the company
export function useEmpresasCliente() {
  const effectiveCompanyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ['empresas-cliente-beneficios', effectiveCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('colaboradores')
        .select('empresa_cliente')
        .eq('status', 'ATIVO');
      if (effectiveCompanyId) query = query.eq('company_id', effectiveCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      const empresas = [...new Set((data as any[]).map(c => c.empresa_cliente).filter(Boolean))] as string[];
      return empresas.sort();
    },
  });
}

// Update beneficio empresas cliente
export function useUpdateBeneficioEmpresasCliente() {
  const queryClient = useQueryClient();
  const effectiveCompanyId = useEffectiveCompanyId();

  return useMutation({
    mutationFn: async ({ beneficioId, empresasCliente }: { beneficioId: string; empresasCliente: string[] }) => {
      if (!effectiveCompanyId) throw new Error('Empresa não selecionada');

      await supabase
        .from('beneficios_empresa_cliente' as any)
        .delete()
        .eq('beneficio_id', beneficioId);

      if (empresasCliente.length > 0) {
        const { error } = await supabase
          .from('beneficios_empresa_cliente' as any)
          .insert(
            empresasCliente.map(ec => ({
              beneficio_id: beneficioId,
              empresa_cliente: ec,
              company_id: effectiveCompanyId,
            })) as any
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficio-empresas-cliente'] });
      toast.success('Empresas cliente atualizadas com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar empresas cliente: ' + error.message);
    },
  });
}

// Fetch my benefits (for colaborador view)
export function useMeusBeneficios() {
  return useQuery({
    queryKey: ['meus-beneficios'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      
      const { data: colaborador, error: colabError } = await supabase
        .from('colaboradores')
        .select('id, department, company_id, contract_type, empresa_cliente')
        .eq('user_id', user.id)
        .single();
      
      if (colabError || !colaborador) {
        return { individual: [], departamento: [], tipoContrato: [], empresaCliente: [] };
      }
      
      // Get individual benefits
      const { data: individualBeneficios, error: indError } = await supabase
        .from('colaborador_beneficios' as any)
        .select(`*, beneficio:beneficios(*)`)
        .eq('colaborador_id', colaborador.id)
        .eq('status', 'ativo');
      
      if (indError) throw indError;
      
      const individualIds = new Set((individualBeneficios as any[])?.map(b => b.beneficio_id) || []);
      
      // Get department benefits
      const { data: deptBeneficios, error: deptError } = await supabase
        .from('beneficios_departamento' as any)
        .select(`*, beneficio:beneficios(*)`)
        .eq('departamento', colaborador.department)
        .eq('company_id', colaborador.company_id);
      
      if (deptError) throw deptError;
      
      const departmentBenefits = ((deptBeneficios as any[]) || [])
        .filter((db: any) => db.beneficio?.ativo && !individualIds.has(db.beneficio_id))
        .map((db: any) => ({ ...db, tipo_atribuicao: 'departamento' }));
      
      const deptIds = new Set(departmentBenefits.map((b: any) => b.beneficio_id));
      
      // Get contract type benefits
      const { data: ctBeneficios, error: ctError } = await supabase
        .from('beneficios_tipo_contrato' as any)
        .select(`*, beneficio:beneficios(*)`)
        .eq('tipo_contrato', colaborador.contract_type)
        .eq('company_id', colaborador.company_id);
      
      if (ctError) throw ctError;
      
      const contractTypeBenefits = ((ctBeneficios as any[]) || [])
        .filter((ct: any) => ct.beneficio?.ativo && !individualIds.has(ct.beneficio_id) && !deptIds.has(ct.beneficio_id))
        .map((ct: any) => ({ ...ct, tipo_atribuicao: 'tipo_contrato' }));
      
      const ctIds = new Set(contractTypeBenefits.map((b: any) => b.beneficio_id));

      // Get empresa cliente benefits
      let empresaClienteBenefits: any[] = [];
      if ((colaborador as any).empresa_cliente) {
        const { data: ecBeneficios, error: ecError } = await supabase
          .from('beneficios_empresa_cliente' as any)
          .select(`*, beneficio:beneficios(*)`)
          .eq('empresa_cliente', (colaborador as any).empresa_cliente)
          .eq('company_id', colaborador.company_id);
        if (ecError) throw ecError;
        empresaClienteBenefits = ((ecBeneficios as any[]) || [])
          .filter((ec: any) => ec.beneficio?.ativo && !individualIds.has(ec.beneficio_id) && !deptIds.has(ec.beneficio_id) && !ctIds.has(ec.beneficio_id))
          .map((ec: any) => ({ ...ec, tipo_atribuicao: 'empresa_cliente' }));
      }

      return {
        individual: ((individualBeneficios as any[]) || []).map(b => ({ ...b, tipo_atribuicao: 'individual' })),
        departamento: departmentBenefits,
        tipoContrato: contractTypeBenefits,
        empresaCliente: empresaClienteBenefits,
      };
    },
  });
}


// Bulk upsert colaborador beneficios
export function useBulkUpdateColaboradorBeneficios() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ colaboradorId, beneficios }: {
      colaboradorId: string;
      beneficios: {
        beneficio_id: string;
        ativo: boolean;
        data_inicio: string;
        valor: number | null;
        existing_id?: string;
      }[];
    }) => {
      // Delete removed (previously active, now inactive)
      const toDelete = beneficios.filter(b => !b.ativo && b.existing_id);
      for (const b of toDelete) {
        await supabase.from('colaborador_beneficios' as any).delete().eq('id', b.existing_id);
      }
      
      // Upsert active ones
      const toUpsert = beneficios.filter(b => b.ativo);
      for (const b of toUpsert) {
        if (b.existing_id) {
          // Update
          await supabase
            .from('colaborador_beneficios' as any)
            .update({
              data_inicio: b.data_inicio,
              valor: b.valor,
              status: 'ativo',
            } as any)
            .eq('id', b.existing_id);
        } else {
          // Insert
          await supabase
            .from('colaborador_beneficios' as any)
            .insert({
              colaborador_id: colaboradorId,
              beneficio_id: b.beneficio_id,
              data_inicio: b.data_inicio,
              valor: b.valor,
              status: 'ativo',
            } as any);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaborador-beneficios'] });
      queryClient.invalidateQueries({ queryKey: ['meus-beneficios'] });
      toast.success('Benefícios atualizados com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar benefícios: ' + error.message);
    },
  });
}

// Create beneficio
export function useCreateBeneficio() {
  const queryClient = useQueryClient();
  const effectiveCompanyId = useEffectiveCompanyId();
  
  return useMutation({
    mutationFn: async (data: BeneficioFormData) => {
      if (!effectiveCompanyId) throw new Error('Empresa não selecionada');
      
      const { data: result, error } = await supabase
        .from('beneficios' as any)
        .insert({
          ...data,
          company_id: effectiveCompanyId,
        } as any)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficios'] });
      toast.success('Benefício criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar benefício: ' + error.message);
    },
  });
}

// Update beneficio
export function useUpdateBeneficio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BeneficioFormData> }) => {
      const { data: result, error } = await supabase
        .from('beneficios' as any)
        .update(data as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficios'] });
      toast.success('Benefício atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar benefício: ' + error.message);
    },
  });
}

// Delete beneficio
export function useDeleteBeneficio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('beneficios' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficios'] });
      toast.success('Benefício removido com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao remover benefício: ' + error.message);
    },
  });
}

// Update beneficio departamentos
export function useUpdateBeneficioDepartamentos() {
  const queryClient = useQueryClient();
  const effectiveCompanyId = useEffectiveCompanyId();
  
  return useMutation({
    mutationFn: async ({ beneficioId, departamentos }: { beneficioId: string; departamentos: string[] }) => {
      if (!effectiveCompanyId) throw new Error('Empresa não selecionada');
      
      // Delete existing
      await supabase
        .from('beneficios_departamento' as any)
        .delete()
        .eq('beneficio_id', beneficioId);
      
      // Insert new
      if (departamentos.length > 0) {
        const { error } = await supabase
          .from('beneficios_departamento' as any)
          .insert(
            departamentos.map(dept => ({
              beneficio_id: beneficioId,
              departamento: dept,
              company_id: effectiveCompanyId,
            })) as any
          );
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficio-departamentos'] });
      toast.success('Departamentos atualizados com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar departamentos: ' + error.message);
    },
  });
}

// Assign beneficio to colaborador
export function useAssignBeneficioColaborador() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      colaborador_id: string;
      beneficio_id: string;
      numero_cartao?: string;
      data_inicio?: string;
      observacoes?: string;
    }) => {
      const { data: result, error } = await supabase
        .from('colaborador_beneficios' as any)
        .insert({
          ...data,
          data_inicio: data.data_inicio || new Date().toISOString().split('T')[0],
        } as any)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaborador-beneficios'] });
      toast.success('Benefício atribuído com sucesso!');
    },
    onError: (error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Este colaborador já possui este benefício atribuído.');
      } else {
        toast.error('Erro ao atribuir benefício: ' + error.message);
      }
    },
  });
}

// Update colaborador beneficio
export function useUpdateColaboradorBeneficio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{
      numero_cartao: string;
      status: string;
      data_fim: string;
      observacoes: string;
    }> }) => {
      const { data: result, error } = await supabase
        .from('colaborador_beneficios' as any)
        .update(data as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaborador-beneficios'] });
      queryClient.invalidateQueries({ queryKey: ['meus-beneficios'] });
      toast.success('Benefício atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar benefício: ' + error.message);
    },
  });
}

// Remove colaborador beneficio
export function useRemoveColaboradorBeneficio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('colaborador_beneficios' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaborador-beneficios'] });
      toast.success('Benefício removido do colaborador!');
    },
    onError: (error) => {
      toast.error('Erro ao remover benefício: ' + error.message);
    },
  });
}

// ===== Inverted scope assignment (select scope -> toggle benefits) =====

export type BeneficioEscopo = 'departamento' | 'tipo_contrato' | 'empresa_cliente';

const ESCOPO_CONFIG: Record<BeneficioEscopo, { table: string; column: string; queryKey: string }> = {
  departamento: { table: 'beneficios_departamento', column: 'departamento', queryKey: 'beneficio-departamentos' },
  tipo_contrato: { table: 'beneficios_tipo_contrato', column: 'tipo_contrato', queryKey: 'beneficio-tipos-contrato' },
  empresa_cliente: { table: 'beneficios_empresa_cliente', column: 'empresa_cliente', queryKey: 'beneficio-empresas-cliente' },
};

export interface EscopoAtribuicao {
  beneficio_id: string;
  data_inicio: string | null;
  valor: number | null;
}

// Fetch benefit assignments linked to a given scope value
export function useBeneficiosPorEscopo(escopo: BeneficioEscopo, valor: string | null) {
  const effectiveCompanyId = useEffectiveCompanyId();
  const cfg = ESCOPO_CONFIG[escopo];

  return useQuery({
    queryKey: ['beneficios-por-escopo', escopo, valor, effectiveCompanyId],
    queryFn: async () => {
      if (!valor) return [] as EscopoAtribuicao[];
      let query = supabase
        .from(cfg.table as any)
        .select('beneficio_id, data_inicio, valor')
        .eq(cfg.column, valor);
      if (effectiveCompanyId) query = query.eq('company_id', effectiveCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return ((data as any[]) || []).map(r => ({
        beneficio_id: r.beneficio_id as string,
        data_inicio: (r.data_inicio as string) ?? null,
        valor: r.valor != null ? Number(r.valor) : null,
      })) as EscopoAtribuicao[];
    },
    enabled: !!valor,
  });
}

// Replace the set of benefits linked to a given scope value
export function useUpdateBeneficiosPorEscopo(escopo: BeneficioEscopo) {
  const queryClient = useQueryClient();
  const effectiveCompanyId = useEffectiveCompanyId();
  const cfg = ESCOPO_CONFIG[escopo];

  return useMutation({
    mutationFn: async ({ valor, atribuicoes }: { valor: string; atribuicoes: EscopoAtribuicao[] }) => {
      if (!effectiveCompanyId) throw new Error('Empresa não selecionada');

      let del = supabase.from(cfg.table as any).delete().eq(cfg.column, valor);
      del = del.eq('company_id', effectiveCompanyId);
      const { error: delError } = await del;
      if (delError) throw delError;

      if (atribuicoes.length > 0) {
        const { error } = await supabase.from(cfg.table as any).insert(
          atribuicoes.map(a => ({
            beneficio_id: a.beneficio_id,
            data_inicio: a.data_inicio || null,
            valor: a.valor,
            [cfg.column]: valor,
            company_id: effectiveCompanyId,
          })) as any
        );
        if (error) throw error;
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficios-por-escopo'] });
      queryClient.invalidateQueries({ queryKey: [cfg.queryKey] });
      queryClient.invalidateQueries({ queryKey: ['meus-beneficios'] });
      toast.success('Benefícios atualizados com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar benefícios: ' + error.message);
    },
  });
}
