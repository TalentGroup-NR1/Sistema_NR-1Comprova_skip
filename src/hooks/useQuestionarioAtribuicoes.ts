import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type AtribuicaoStatus = 'pendente' | 'em_andamento' | 'preenchido';

export interface Atribuicao {
  id: string;
  colaborador_id: string;
  status: AtribuicaoStatus;
  data_atribuicao: string;
  data_resposta: string | null;
  colaborador_nome: string;
  colaborador_cargo: string | null;
  colaborador_departamento: string | null;
  colaborador_empresa_cliente: string | null;
}

export function useQuestionarioAtribuicoes(descricaoQuestionarioId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!descricaoQuestionarioId) return;
    const channel = supabase
      .channel(`atrib-${descricaoQuestionarioId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'questionario_atribuicoes' },
        () => qc.invalidateQueries({ queryKey: ['questionario-atribuicoes'] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [descricaoQuestionarioId, qc]);

  return useQuery({
    queryKey: ['questionario-atribuicoes', descricaoQuestionarioId],
    enabled: !!descricaoQuestionarioId,
    queryFn: async (): Promise<Atribuicao[]> => {
      const { data, error } = await supabase
        .from('questionario_atribuicoes')
        .select(
          'id,colaborador_id,status,data_atribuicao,data_resposta,colaboradores(full_name,job_title,department,empresa_cliente)',
        )
        .eq('descricao_questionario_id', descricaoQuestionarioId as string)
        .order('data_atribuicao');
      if (error) throw error;
      return ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>;
        const c = (r.colaboradores ?? {}) as Record<string, string | null>;
        return {
          id: r.id as string,
          colaborador_id: r.colaborador_id as string,
          status: r.status as AtribuicaoStatus,
          data_atribuicao: r.data_atribuicao as string,
          data_resposta: (r.data_resposta as string | null) ?? null,
          colaborador_nome: c.full_name ?? 'Colaborador',
          colaborador_cargo: c.job_title ?? null,
          colaborador_departamento: c.department ?? null,
          colaborador_empresa_cliente: c.empresa_cliente ?? null,
        };
      });
    },
  });
}

export function useAtribuicaoMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['questionario-atribuicoes'] });
    qc.invalidateQueries({ queryKey: ['descricoes-questionario-andamento'] });
  };

  const atribuir = useMutation({
    mutationFn: async ({
      descricaoQuestionarioId,
      colaboradorIds,
    }: {
      descricaoQuestionarioId: string;
      colaboradorIds: string[];
    }) => {
      if (colaboradorIds.length === 0) return 0;
      const { error } = await supabase.from('questionario_atribuicoes').upsert(
        colaboradorIds.map((colaborador_id) => ({
          descricao_questionario_id: descricaoQuestionarioId,
          colaborador_id,
        })),
        { onConflict: 'descricao_questionario_id,colaborador_id', ignoreDuplicates: true },
      );
      if (error) throw error;
      return colaboradorIds.length;
    },
    onSuccess: (n) => {
      invalidate();
      if (n) toast({ title: `${n} colaborador(es) habilitado(s)` });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao habilitar', description: e.message, variant: 'destructive' }),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('questionario_atribuicoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Atribuição removida' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao remover', description: e.message, variant: 'destructive' }),
  });

  const reabrir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('reabrir_questionario', { p_atribuicao_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Questionário reaberto para o colaborador' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao reabrir', description: e.message, variant: 'destructive' }),
  });

  return { atribuir, remover, reabrir };
}

/** Respostas de uma atribuição (visão admin/RH). */
export function useRespostasAtribuicao(atribuicaoId: string | null) {
  return useQuery({
    queryKey: ['questionario-respostas', atribuicaoId],
    enabled: !!atribuicaoId,
    queryFn: async (): Promise<Record<string, unknown>> => {
      const { data, error } = await supabase
        .from('questionario_respostas')
        .select('pergunta_id,valor')
        .eq('atribuicao_id', atribuicaoId as string);
      if (error) throw error;
      const out: Record<string, unknown> = {};
      (data ?? []).forEach((r) => {
        out[r.pergunta_id] = r.valor;
      });
      return out;
    },
  });
}

/** Respostas de várias atribuições de uma vez: atribuicao_id -> (pergunta_id -> valor). */
export function useRespostasMultiplas(atribuicaoIds: string[]) {
  const key = [...atribuicaoIds].sort().join(',');
  return useQuery({
    queryKey: ['questionario-respostas-multiplas', key],
    enabled: atribuicaoIds.length > 0,
    queryFn: async (): Promise<Record<string, Record<string, unknown>>> => {
      const { data, error } = await supabase
        .from('questionario_respostas')
        .select('atribuicao_id,pergunta_id,valor')
        .in('atribuicao_id', atribuicaoIds);
      if (error) throw error;
      const out: Record<string, Record<string, unknown>> = {};
      (data ?? []).forEach((r) => {
        const aid = r.atribuicao_id as string;
        out[aid] = out[aid] ?? {};
        out[aid][r.pergunta_id as string] = r.valor;
      });
      return out;
    },
  });
}

