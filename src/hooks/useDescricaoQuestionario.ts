import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { parseCustomizacao, type QSecao } from '@/lib/questionarioCargo';

export interface DescricaoQuestionario {
  id: string;
  descricao_cargo_id: string;
  modelo_base_id: string | null;
  instrucoes: string | null;
  ativo: boolean;
  secoes: QSecao[];
}

export function useDescricaoQuestionario(descricaoCargoId: string | null) {
  return useQuery({
    queryKey: ['descricao-questionario', descricaoCargoId],
    enabled: !!descricaoCargoId,
    queryFn: async (): Promise<DescricaoQuestionario | null> => {
      const { data, error } = await supabase
        .from('descricao_questionario')
        .select('id,descricao_cargo_id,modelo_base_id,instrucoes,ativo,customizacao')
        .eq('descricao_cargo_id', descricaoCargoId as string)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        descricao_cargo_id: data.descricao_cargo_id,
        modelo_base_id: data.modelo_base_id,
        instrucoes: data.instrucoes,
        ativo: data.ativo,
        secoes: parseCustomizacao(data.customizacao).secoes,
      };
    },
  });
}

export function useDescricaoQuestionarioMutations(descricaoCargoId: string | null) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['descricao-questionario'] });
    qc.invalidateQueries({ queryKey: ['descricoes-questionario-andamento'] });
  };

  const salvar = useMutation({
    mutationFn: async (values: {
      modelo_base_id?: string | null;
      instrucoes?: string | null;
      secoes: QSecao[];
      ativo?: boolean;
    }) => {
      if (!descricaoCargoId) throw new Error('Salve a descrição de cargo antes.');
      const payload = {
        descricao_cargo_id: descricaoCargoId,
        modelo_base_id: values.modelo_base_id ?? null,
        instrucoes: values.instrucoes ?? null,
        customizacao: { secoes: values.secoes } as unknown as never,
        ativo: values.ativo ?? true,
      };
      const { data, error } = await supabase
        .from('descricao_questionario')
        .upsert(payload, { onConflict: 'descricao_cargo_id' })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Questionário do colaborador salvo' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao salvar questionário', description: e.message, variant: 'destructive' }),
  });

  return { salvar };
}

export interface DescricaoEmAndamento {
  id: string;
  titulo: string;
  cargo_id: string | null;
  departamento_id: string | null;
  descricao_questionario_id: string | null;
  total: number;
  preenchidos: number;
}

/** Descrições da empresa com o resumo das atribuições do questionário. */
export function useDescricoesComQuestionario(companyId: string | null) {
  return useQuery({
    queryKey: ['descricoes-questionario-andamento', companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<DescricaoEmAndamento[]> => {
      const { data: descricoes, error } = await supabase
        .from('descricoes_cargo')
        .select('id,titulo,cargo_id,departamento_id')
        .eq('company_id', companyId as string)
        .order('titulo');
      if (error) throw error;

      const ids = (descricoes ?? []).map((d) => d.id);
      if (ids.length === 0) return [];

      const { data: vinculos, error: e2 } = await supabase
        .from('descricao_questionario')
        .select('id,descricao_cargo_id')
        .in('descricao_cargo_id', ids);
      if (e2) throw e2;

      const vIds = (vinculos ?? []).map((v) => v.id);
      let atribs: { descricao_questionario_id: string; status: string }[] = [];
      if (vIds.length > 0) {
        const { data: a, error: e3 } = await supabase
          .from('questionario_atribuicoes')
          .select('descricao_questionario_id,status')
          .in('descricao_questionario_id', vIds);
        if (e3) throw e3;
        atribs = (a ?? []) as { descricao_questionario_id: string; status: string }[];
      }

      return (descricoes ?? []).map((d) => {
        const v = (vinculos ?? []).find((x) => x.descricao_cargo_id === d.id);
        const list = v ? atribs.filter((a) => a.descricao_questionario_id === v.id) : [];
        return {
          ...d,
          descricao_questionario_id: v?.id ?? null,
          total: list.length,
          preenchidos: list.filter((a) => a.status === 'preenchido').length,
        };
      });
    },
  });
}
