import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type TipoExposicao = 'continua' | 'intermitente' | 'eventual';
export type EntidadeTabela =
  | 'departamentos'
  | 'cargos'
  | 'ghes'
  | 'niveis_maturidade';

export interface Departamento {
  id: string;
  nome: string;
  codigo: string | null;
  ativo: boolean;
}

export interface Cargo {
  id: string;
  nome: string;
  cbo_codigo: string | null;
  cbo_descricao: string | null;
  ativo: boolean;
}

export interface Ghe {
  id: string;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  tipo_exposicao: TipoExposicao;
  ativo: boolean;
}

export interface NivelMaturidade {
  id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
}



function useEntidade<T>(tabela: EntidadeTabela, companyId: string | null, colunas: string, order: string) {
  return useQuery({
    queryKey: [tabela, companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<T[]> => {
      const { data, error } = await supabase
        .from(tabela)
        .select(colunas)
        .eq('company_id', companyId as string)
        .order(order);
      if (error) throw error;
      return (data as unknown as T[]) ?? [];
    },
  });
}

export const useDepartamentos = (companyId: string | null) =>
  useEntidade<Departamento>('departamentos', companyId, 'id,nome,codigo,ativo', 'nome');

export const useCargos = (companyId: string | null) =>
  useEntidade<Cargo>('cargos', companyId, 'id,nome,cbo_codigo,cbo_descricao,ativo', 'nome');

export const useGhes = (companyId: string | null) =>
  useEntidade<Ghe>('ghes', companyId, 'id,codigo,nome,descricao,tipo_exposicao,ativo', 'codigo');

export const useNiveisMaturidade = (companyId: string | null) =>
  useEntidade<NivelMaturidade>(
    'niveis_maturidade',
    companyId,
    'id,nome,descricao,ordem,ativo',
    'ordem'
  );




export function useEntidadeMutations(tabela: EntidadeTabela, companyId: string | null) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [tabela] });

  const salvar = useMutation({
    mutationFn: async ({ id, values }: { id?: string | null; values: Record<string, unknown> }) => {
      if (id) {
        const { error } = await supabase.from(tabela).update(values as never).eq('id', id);
        if (error) throw error;
      } else {
        if (!companyId) throw new Error('Selecione uma empresa antes de cadastrar.');
        const { error } = await supabase
          .from(tabela)
          .insert({ ...values, company_id: companyId } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Registro salvo com sucesso' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' }),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(tabela).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Registro excluído' });
    },
    onError: (e: Error) =>
      toast({
        title: 'Não foi possível excluir',
        description: /violates foreign key|restrict/i.test(e.message)
          ? 'Existem registros vinculados a este item.'
          : e.message,
        variant: 'destructive',
      }),
  });

  return { salvar, excluir };
}

export function useCboSearch(termo: string) {
  return useQuery({
    queryKey: ['cbo-search', termo],
    enabled: termo.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_cbo', { p_termo: termo });
      if (error) throw error;
      return data ?? [];
    },
  });
}
