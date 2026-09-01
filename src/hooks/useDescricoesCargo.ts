import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface DescricaoCargo {
  id: string;
  company_id: string;
  titulo: string;
  cargo_id: string | null;
  departamento_id: string | null;
  ghe_id: string | null;
  cbo_codigo: string | null;
  cbo_descricao: string | null;
  maturidade: string | null;
  reporte: string | null;
  alocacao: string | null;
  descricao_sumaria: string | null;
  grupo_organizacional: string | null;
  nivel_maturidade: string | null;
  responsabilidades: string[];
  formacao_academica: string | null;
  cursos_necessarios: string | null;
  cursos_desejaveis: string | null;
  habilidades_comportamentais: string | null;
  fator_experiencia: string | null;
  fator_complexidade: string | null;
  fator_responsabilidade_erros: string | null;
  fator_responsabilidade_sigilo: string | null;
  modelo_id: string | null;
  /** Valores dos campos personalizados do modelo, indexados por id do campo. */
  valores: Record<string, unknown>;
  ativo: boolean;
}


export function useDescricoesCargo(companyId: string | null) {
  return useQuery({
    queryKey: ['descricoes-cargo', companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<DescricaoCargo[]> => {
      const { data, error } = await supabase
        .from('descricoes_cargo')
        .select('*')
        .eq('company_id', companyId as string)
        .order('titulo');
      if (error) throw error;
      return ((data ?? []) as unknown[]).map((d) => {
        const row = d as Record<string, unknown>;
        return {
          ...(row as unknown as DescricaoCargo),
          responsabilidades: Array.isArray(row.responsabilidades)
            ? (row.responsabilidades as string[])
            : [],
          modelo_id: (row.modelo_id as string | null) ?? null,
          valores:
            row.valores && typeof row.valores === 'object' && !Array.isArray(row.valores)
              ? (row.valores as Record<string, unknown>)
              : {},
        };

      });
    },
  });
}

export function useDescricaoCargoMutations(companyId: string | null) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['descricoes-cargo'] });

  const salvar = useMutation({
    mutationFn: async ({ id, values }: { id?: string | null; values: Record<string, unknown> }) => {
      if (id) {
        const { error } = await supabase.from('descricoes_cargo').update(values as never).eq('id', id);
        if (error) throw error;
      } else {
        if (!companyId) throw new Error('Selecione uma empresa antes de cadastrar.');
        const { error } = await supabase
          .from('descricoes_cargo')
          .insert({ ...values, company_id: companyId } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Descrição de cargo salva' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' }),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('descricoes_cargo').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Descrição excluída' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' }),
  });

  return { salvar, excluir };
}
