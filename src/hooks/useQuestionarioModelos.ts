import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  novoId,
  type QSecao,
  type QPergunta,
  type QPerguntaTipo,
  type QMapeamento,
} from '@/lib/questionarioCargo';

export interface QuestionarioModelo {
  id: string;
  company_id: string;
  nome: string;
  descricao: string | null;
  instrucoes: string | null;
  ativo: boolean;
  created_at: string;
}

export function useQuestionarioModelos(companyId: string | null) {
  return useQuery({
    queryKey: ['questionario-modelos', companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<QuestionarioModelo[]> => {
      const { data, error } = await supabase
        .from('questionario_modelos')
        .select('id,company_id,nome,descricao,instrucoes,ativo,created_at')
        .eq('company_id', companyId as string)
        .order('nome');
      if (error) throw error;
      return (data ?? []) as QuestionarioModelo[];
    },
  });
}

/** Carrega seções/perguntas/opções de um modelo no formato JSON do editor. */
export function useModeloEstrutura(modeloId: string | null) {
  return useQuery({
    queryKey: ['questionario-modelo-estrutura', modeloId],
    enabled: !!modeloId,
    queryFn: async (): Promise<QSecao[]> => {
      const { data: secoes, error } = await supabase
        .from('questionario_secoes')
        .select('id,titulo,descricao,tipo,ordem')
        .eq('modelo_id', modeloId as string)
        .order('ordem');
      if (error) throw error;
      const ids = (secoes ?? []).map((s) => s.id);
      if (ids.length === 0) return [];

      const { data: perguntas, error: e2 } = await supabase
        .from('questionario_perguntas')
        .select('id,secao_id,tipo,titulo,texto_ajuda,obrigatorio,ordem')
        .in('secao_id', ids)
        .order('ordem');
      if (e2) throw e2;

      const pIds = (perguntas ?? []).map((p) => p.id);
      let opcoes: { pergunta_id: string; valor: string }[] = [];
      if (pIds.length > 0) {
        const { data: ops, error: e3 } = await supabase
          .from('questionario_opcoes')
          .select('pergunta_id,valor,ordem')
          .in('pergunta_id', pIds)
          .order('ordem');
        if (e3) throw e3;
        opcoes = (ops ?? []) as { pergunta_id: string; valor: string }[];
      }

      return (secoes ?? []).map((s) => ({
        id: s.id,
        titulo: s.titulo,
        descricao: s.descricao,
        tipo: s.tipo,
        perguntas: (perguntas ?? [])
          .filter((p) => p.secao_id === s.id)
          .map((p): QPergunta => {
            const ajuda = p.texto_ajuda ?? '';
            const [texto, mapeamento] = ajuda.includes('::map:')
              ? [ajuda.split('::map:')[0], ajuda.split('::map:')[1] as QMapeamento]
              : [ajuda, null];
            return {
              id: p.id,
              tipo: p.tipo as QPerguntaTipo,
              titulo: p.titulo,
              texto_ajuda: texto || null,
              obrigatorio: p.obrigatorio,
              opcoes: opcoes.filter((o) => o.pergunta_id === p.id).map((o) => o.valor),
              mapeamento,
            };
          }),
      }));
    },
  });
}

export function useModeloMutations(companyId: string | null) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['questionario-modelos'] });
    qc.invalidateQueries({ queryKey: ['questionario-modelo-estrutura'] });
  };

  const salvarModelo = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string | null;
      values: { nome: string; descricao?: string | null; instrucoes?: string | null; ativo?: boolean };
    }) => {
      if (id) {
        const { error } = await supabase.from('questionario_modelos').update(values).eq('id', id);
        if (error) throw error;
        return id;
      }
      if (!companyId) throw new Error('Selecione uma empresa.');
      const { data, error } = await supabase
        .from('questionario_modelos')
        .insert({ ...values, company_id: companyId })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Modelo salvo' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao salvar modelo', description: e.message, variant: 'destructive' }),
  });

  const excluirModelo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('questionario_modelos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Modelo excluído' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' }),
  });

  /** Substitui toda a estrutura (seções, perguntas e opções) do modelo. */
  const salvarEstrutura = useMutation({
    mutationFn: async ({ modeloId, secoes }: { modeloId: string; secoes: QSecao[] }) => {
      const { error: delErr } = await supabase
        .from('questionario_secoes')
        .delete()
        .eq('modelo_id', modeloId);
      if (delErr) throw delErr;

      for (let i = 0; i < secoes.length; i++) {
        const s = secoes[i];
        const { data: secao, error } = await supabase
          .from('questionario_secoes')
          .insert({
            modelo_id: modeloId,
            titulo: s.titulo,
            descricao: s.descricao ?? null,
            tipo: s.tipo || 'padrao',
            ordem: i,
          })
          .select('id')
          .single();
        if (error) throw error;

        for (let j = 0; j < s.perguntas.length; j++) {
          const p = s.perguntas[j];
          const ajuda = p.mapeamento
            ? `${p.texto_ajuda ?? ''}::map:${p.mapeamento}`
            : p.texto_ajuda ?? null;
          const { data: pergunta, error: pe } = await supabase
            .from('questionario_perguntas')
            .insert({
              secao_id: secao.id,
              tipo: p.tipo,
              titulo: p.titulo,
              texto_ajuda: ajuda,
              obrigatorio: p.obrigatorio,
              ordem: j,
            })
            .select('id')
            .single();
          if (pe) throw pe;

          if (p.opcoes.length > 0) {
            const { error: oe } = await supabase.from('questionario_opcoes').insert(
              p.opcoes.map((valor, k) => ({ pergunta_id: pergunta.id, valor, ordem: k })),
            );
            if (oe) throw oe;
          }
        }
      }
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Perguntas salvas' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao salvar perguntas', description: e.message, variant: 'destructive' }),
  });

  const duplicarModelo = useMutation({
    mutationFn: async ({ modelo, secoes }: { modelo: QuestionarioModelo; secoes: QSecao[] }) => {
      if (!companyId) throw new Error('Selecione uma empresa.');
      const { data, error } = await supabase
        .from('questionario_modelos')
        .insert({
          company_id: companyId,
          nome: `${modelo.nome} (cópia)`,
          descricao: modelo.descricao,
          instrucoes: modelo.instrucoes,
          ativo: modelo.ativo,
        })
        .select('id')
        .single();
      if (error) throw error;
      await salvarEstrutura.mutateAsync({
        modeloId: data.id,
        secoes: secoes.map((s) => ({ ...s, id: novoId() })),
      });
      return data.id as string;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) =>
      toast({ title: 'Erro ao duplicar', description: e.message, variant: 'destructive' }),
  });

  return { salvarModelo, excluirModelo, salvarEstrutura, duplicarModelo };
}
