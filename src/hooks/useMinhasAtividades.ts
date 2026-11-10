import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { parseCustomizacao, type QSecao } from '@/lib/questionarioCargo';
import type { AtribuicaoStatus } from '@/hooks/useQuestionarioAtribuicoes';

export interface MinhaAtividade {
  id: string;
  status: AtribuicaoStatus;
  data_atribuicao: string;
  data_resposta: string | null;
  titulo: string;
}

/** Questionários atribuídos ao colaborador logado. */
export function useMinhasAtividades() {
  return useQuery({
    queryKey: ['minhas-atividades'],
    queryFn: async (): Promise<MinhaAtividade[]> => {
      const { data, error } = await supabase
        .from('questionario_atribuicoes')
        .select(
          'id,status,data_atribuicao,data_resposta,descricao_questionario(descricoes_cargo(titulo))',
        )
        .order('data_atribuicao', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>;
        const dq = (r.descricao_questionario ?? {}) as Record<string, unknown>;
        const dc = (dq.descricoes_cargo ?? {}) as Record<string, string>;
        return {
          id: r.id as string,
          status: r.status as AtribuicaoStatus,
          data_atribuicao: r.data_atribuicao as string,
          data_resposta: (r.data_resposta as string | null) ?? null,
          titulo: dc.titulo ?? 'Questionário de análise de cargo',
        };
      });
    },
  });
}

export interface QuestionarioColaborador {
  atribuicao_id: string;
  status: AtribuicaoStatus;
  titulo: string;
  instrucoes: string | null;
  secoes: QSecao[];
  identificacao: Record<string, string | null>;
  respostas: Record<string, unknown>;
}

export function useQuestionarioColaborador(atribuicaoId: string | null) {
  return useQuery({
    queryKey: ['questionario-colaborador', atribuicaoId],
    enabled: !!atribuicaoId,
    queryFn: async (): Promise<QuestionarioColaborador> => {
      const { data, error } = await supabase.rpc('get_questionario_para_colaborador', {
        p_atribuicao_id: atribuicaoId as string,
      });
      if (error) throw error;
      const d = data as Record<string, unknown>;
      return {
        atribuicao_id: d.atribuicao_id as string,
        status: d.status as AtribuicaoStatus,
        titulo: (d.titulo as string) ?? 'Questionário',
        instrucoes: (d.instrucoes as string | null) ?? null,
        secoes: parseCustomizacao(d.customizacao).secoes,
        identificacao: (d.identificacao ?? {}) as Record<string, string | null>,
        respostas: (d.respostas ?? {}) as Record<string, unknown>,
      };
    },
  });
}

export function useRespostasMutations(atribuicaoId: string | null) {
  const qc = useQueryClient();

  const salvarRascunho = useMutation({
    mutationFn: async (respostas: Record<string, unknown>) => {
      if (!atribuicaoId) return;
      const rows = Object.entries(respostas).map(([pergunta_id, valor]) => ({
        atribuicao_id: atribuicaoId,
        pergunta_id,
        valor: (valor ?? null) as never,
      }));
      if (rows.length > 0) {
        const { error } = await supabase
          .from('questionario_respostas')
          .upsert(rows, { onConflict: 'atribuicao_id,pergunta_id' });
        if (error) throw error;
      }
      const { error: e2 } = await supabase
        .from('questionario_atribuicoes')
        .update({ status: 'em_andamento' })
        .eq('id', atribuicaoId)
        .neq('status', 'preenchido');
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questionario-colaborador'] });
      qc.invalidateQueries({ queryKey: ['minhas-atividades'] });
      toast({ title: 'Rascunho salvo' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' }),
  });

  const enviar = useMutation({
    mutationFn: async (respostas: Record<string, unknown>) => {
      if (!atribuicaoId) return;
      await salvarRascunho.mutateAsync(respostas);
      const { error } = await supabase
        .from('questionario_atribuicoes')
        .update({ status: 'preenchido', data_resposta: new Date().toISOString() })
        .eq('id', atribuicaoId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questionario-colaborador'] });
      qc.invalidateQueries({ queryKey: ['minhas-atividades'] });
      toast({ title: 'Respostas enviadas', description: 'O RH foi notificado. Obrigado!' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao enviar', description: e.message, variant: 'destructive' }),
  });

  return { salvarRascunho, enviar };
}
