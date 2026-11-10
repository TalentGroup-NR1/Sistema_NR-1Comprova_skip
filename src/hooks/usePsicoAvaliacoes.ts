import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type TipoDimensao = 'positiva' | 'negativa';
export type PsicoStatus = 'pendente' | 'em_andamento' | 'preenchido';
export type CampanhaStatus = 'rascunho' | 'em_execucao' | 'finalizada';

export interface PsicoInstrumentoResumo {
  id: string;
  company_id: string | null;
  nome: string;
  versao: string;
  descricao: string | null;
  referencia_cientifica: string | null;
  editavel: boolean;
  ativo: boolean;
  total_dimensoes: number;
  total_perguntas: number;
  em_uso: boolean;
  created_at: string;
}

export interface PsicoPergunta {
  id: string;
  ordem: number;
  texto_pergunta: string;
  tipo_escala: string;
  inverter_pontuacao: boolean;
  ativa: boolean;
}

export interface PsicoDimensao {
  id: string;
  nome: string;
  tipo_dimensao: TipoDimensao;
  descricao: string | null;
  ordem: number;
  perguntas: PsicoPergunta[];
}

export interface PsicoInstrumentoCompleto {
  id: string;
  company_id: string | null;
  nome: string;
  versao: string;
  descricao: string | null;
  referencia_cientifica: string | null;
  editavel: boolean;
  ativo: boolean;
  em_uso: boolean;
  dimensoes: PsicoDimensao[];
}

export interface PsicoAvaliacao {
  id: string;
  titulo: string;
  status: CampanhaStatus;
  data_inicio: string;
  data_fim: string;
  modo_anonimato: boolean;
  instrumento_id: string;
  instrumento_nome: string;
  total_atribuidos: number;
  total_respondidos: number;
  ghe_ids: string[];
  created_at: string;
}

export interface PsicoAcompanhamentoItem {
  atribuicao_id: string;
  colaborador_id: string;
  colaborador_nome: string;
  ghe_id: string | null;
  ghe_nome: string | null;
  status: PsicoStatus;
  data_atribuicao: string;
  data_resposta: string | null;
}

export interface PsicoResultadoDimensao {
  dimensao: string;
  tipo_dimensao: TipoDimensao;
  media: number;
  indice: number;
}

export interface PsicoResultados {
  total_atribuidos: number;
  total_respondidos: number;
  ghes_omitidos: number;
  dimensoes: PsicoResultadoDimensao[];
  por_ghe: {
    ghe_id: string;
    ghe_nome: string;
    respondentes: number;
    media_geral: number;
    dimensoes: PsicoResultadoDimensao[];
  }[];
}

export interface PsicoMinhaAvaliacao {
  atribuicao_id: string;
  avaliacao_id: string;
  titulo: string;
  status: PsicoStatus;
  data_inicio: string;
  data_fim: string;
  instrumento_nome: string;
  total_perguntas: number;
  data_atribuicao: string;
  data_resposta: string | null;
}

export interface PsicoQuestionario {
  atribuicao_id: string;
  avaliacao_id: string;
  titulo: string;
  data_fim: string;
  status: PsicoStatus;
  rascunho: Record<string, number>;
  instrumento: PsicoInstrumentoCompleto;
}

function erro(e: unknown, fallback: string) {
  const msg = e instanceof Error ? e.message : fallback;
  toast({ title: 'Erro', description: msg, variant: 'destructive' });
}

/* ------------------------- Instrumentos ------------------------- */

export function useInstrumentosPsico() {
  return useQuery({
    queryKey: ['psico-instrumentos'],
    queryFn: async (): Promise<PsicoInstrumentoResumo[]> => {
      const { data, error } = await supabase.rpc('psico_get_instrumentos');
      if (error) throw error;
      return (data ?? []) as unknown as PsicoInstrumentoResumo[];
    },
  });
}

export function useInstrumentoCompleto(id: string | null) {
  return useQuery({
    queryKey: ['psico-instrumento', id],
    enabled: !!id,
    queryFn: async (): Promise<PsicoInstrumentoCompleto> => {
      const { data, error } = await supabase.rpc('psico_get_instrumento_completo', {
        p_instrumento_id: id as string,
      });
      if (error) throw error;
      return data as unknown as PsicoInstrumentoCompleto;
    },
  });
}

export function useInstrumentoMutations() {
  const qc = useQueryClient();
  const invalidate = (id?: string | null) => {
    qc.invalidateQueries({ queryKey: ['psico-instrumentos'] });
    if (id) qc.invalidateQueries({ queryKey: ['psico-instrumento', id] });
  };

  const salvarInstrumento = useMutation({
    mutationFn: async (v: {
      id?: string | null;
      nome: string;
      versao?: string;
      descricao?: string | null;
      referencia?: string | null;
      ativo?: boolean;
    }) => {
      const { data, error } = await supabase.rpc('psico_save_instrumento', {
        p_id: v.id ?? null,
        p_nome: v.nome,
        p_versao: v.versao ?? '1.0',
        p_descricao: v.descricao ?? null,
        p_referencia: v.referencia ?? null,
        p_ativo: v.ativo ?? true,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (id) => {
      invalidate(id);
      toast({ title: 'Instrumento salvo' });
    },
    onError: (e) => erro(e, 'Não foi possível salvar o instrumento'),
  });

  const duplicar = useMutation({
    mutationFn: async (v: { id: string; nome?: string }) => {
      const { data, error } = await supabase.rpc('psico_duplicar_instrumento', {
        p_instrumento_id: v.id,
        p_novo_nome: v.nome ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Instrumento duplicado', description: 'A cópia já pode ser editada.' });
    },
    onError: (e) => erro(e, 'Não foi possível duplicar'),
  });

  const excluirInstrumento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('psico_instrumentos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Instrumento excluído' });
    },
    onError: (e) => erro(e, 'Não foi possível excluir'),
  });

  const salvarDimensao = useMutation({
    mutationFn: async (v: {
      id?: string | null;
      instrumento_id: string;
      nome: string;
      tipo_dimensao: TipoDimensao;
      descricao?: string | null;
      ordem?: number | null;
    }) => {
      const { error } = await supabase.rpc('psico_save_dimensao', {
        p_id: v.id ?? null,
        p_instrumento_id: v.instrumento_id,
        p_nome: v.nome,
        p_tipo: v.tipo_dimensao,
        p_descricao: v.descricao ?? null,
        p_ordem: v.ordem ?? null,
      });
      if (error) throw error;
      return v.instrumento_id;
    },
    onSuccess: (id) => invalidate(id),
    onError: (e) => erro(e, 'Não foi possível salvar a dimensão'),
  });

  const excluirDimensao = useMutation({
    mutationFn: async (v: { id: string; instrumento_id: string }) => {
      const { error } = await supabase.rpc('psico_delete_dimensao', { p_id: v.id });
      if (error) throw error;
      return v.instrumento_id;
    },
    onSuccess: (id) => invalidate(id),
    onError: (e) => erro(e, 'Não foi possível excluir a dimensão'),
  });

  const salvarPergunta = useMutation({
    mutationFn: async (v: {
      id?: string | null;
      instrumento_id: string;
      dimensao_id: string;
      texto: string;
      tipo_escala?: string;
      inverter?: boolean;
      ordem?: number | null;
    }) => {
      const { error } = await supabase.rpc('psico_save_pergunta', {
        p_id: v.id ?? null,
        p_instrumento_id: v.instrumento_id,
        p_dimensao_id: v.dimensao_id,
        p_texto: v.texto,
        p_tipo_escala: v.tipo_escala ?? 'likert_5',
        p_inverter: v.inverter ?? false,
        p_ordem: v.ordem ?? null,
      });
      if (error) throw error;
      return v.instrumento_id;
    },
    onSuccess: (id) => invalidate(id),
    onError: (e) => erro(e, 'Não foi possível salvar a pergunta'),
  });

  const excluirPergunta = useMutation({
    mutationFn: async (v: { id: string; instrumento_id: string }) => {
      const { error } = await supabase.rpc('psico_delete_pergunta', { p_id: v.id });
      if (error) throw error;
      return v.instrumento_id;
    },
    onSuccess: (id) => invalidate(id),
    onError: (e) => erro(e, 'Não foi possível excluir a pergunta'),
  });

  const reordenarPerguntas = useMutation({
    mutationFn: async (v: { instrumento_id: string; ids: string[] }) => {
      const { error } = await supabase.rpc('psico_reordenar_perguntas', {
        p_instrumento_id: v.instrumento_id,
        p_ids: v.ids,
      });
      if (error) throw error;
      return v.instrumento_id;
    },
    onSuccess: (id) => invalidate(id),
    onError: (e) => erro(e, 'Não foi possível reordenar'),
  });

  return {
    salvarInstrumento,
    duplicar,
    excluirInstrumento,
    salvarDimensao,
    excluirDimensao,
    salvarPergunta,
    excluirPergunta,
    reordenarPerguntas,
  };
}

/* ------------------------- Campanhas ------------------------- */

export function useAvaliacoesPsico() {
  return useQuery({
    queryKey: ['psico-avaliacoes'],
    queryFn: async (): Promise<PsicoAvaliacao[]> => {
      const { data, error } = await supabase.rpc('psico_get_avaliacoes');
      if (error) throw error;
      return (data ?? []) as unknown as PsicoAvaliacao[];
    },
  });
}

export function useAvaliacaoMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['psico-avaliacoes'] });

  const criar = useMutation({
    mutationFn: async (v: {
      titulo: string;
      instrumento_id: string;
      data_inicio: string;
      data_fim: string;
      ghe_ids: string[];
      modo_anonimato?: boolean;
    }) => {
      const { data, error } = await supabase.rpc('psico_criar_avaliacao', {
        p_titulo: v.titulo,
        p_instrumento_id: v.instrumento_id,
        p_data_inicio: v.data_inicio,
        p_data_fim: v.data_fim,
        p_ghe_ids: v.ghe_ids,
        p_modo_anonimato: v.modo_anonimato ?? true,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Campanha criada' });
    },
    onError: (e) => erro(e, 'Não foi possível criar a campanha'),
  });

  const atribuir = useMutation({
    mutationFn: async (v: { avaliacao_id: string; colaborador_ids: string[] }) => {
      const { data, error } = await supabase.rpc('psico_atribuir_colaboradores', {
        p_avaliacao_id: v.avaliacao_id,
        p_colaborador_ids: v.colaborador_ids,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n, v) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['psico-acompanhamento', v.avaliacao_id] });
      toast({ title: 'Colaboradores atribuídos', description: `${n} convite(s) enviado(s).` });
    },
    onError: (e) => erro(e, 'Não foi possível atribuir'),
  });

  const reabrir = useMutation({
    mutationFn: async (v: { atribuicao_id: string; avaliacao_id: string }) => {
      const { error } = await supabase.rpc('psico_reabrir_questionario', {
        p_atribuicao_id: v.atribuicao_id,
      });
      if (error) throw error;
      return v.avaliacao_id;
    },
    onSuccess: (avaliacaoId) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['psico-acompanhamento', avaliacaoId] });
      toast({ title: 'Questionário reaberto' });
    },
    onError: (e) => erro(e, 'Não foi possível reabrir'),
  });

  const alterarStatus = useMutation({
    mutationFn: async (v: { id: string; status: CampanhaStatus }) => {
      const { error } = await supabase
        .from('psico_avaliacoes')
        .update({ status: v.status })
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Campanha atualizada' });
    },
    onError: (e) => erro(e, 'Não foi possível atualizar a campanha'),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('psico_avaliacoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Campanha excluída' });
    },
    onError: (e) => erro(e, 'Não foi possível excluir a campanha'),
  });

  return { criar, atribuir, reabrir, alterarStatus, excluir };
}

export function useAcompanhamentoPsico(avaliacaoId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!avaliacaoId) return;
    const channel = supabase
      .channel(`psico-atribuicoes-${avaliacaoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'psico_atribuicoes' },
        () => {
          qc.invalidateQueries({ queryKey: ['psico-acompanhamento', avaliacaoId] });
          qc.invalidateQueries({ queryKey: ['psico-avaliacoes'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [avaliacaoId, qc]);

  return useQuery({
    queryKey: ['psico-acompanhamento', avaliacaoId],
    enabled: !!avaliacaoId,
    queryFn: async (): Promise<PsicoAcompanhamentoItem[]> => {
      const { data, error } = await supabase.rpc('psico_get_acompanhamento', {
        p_avaliacao_id: avaliacaoId as string,
      });
      if (error) throw error;
      return (data ?? []) as unknown as PsicoAcompanhamentoItem[];
    },
  });
}

export function useResultadosPsico(avaliacaoId: string | null) {
  return useQuery({
    queryKey: ['psico-resultados', avaliacaoId],
    enabled: !!avaliacaoId,
    queryFn: async (): Promise<PsicoResultados> => {
      const { data, error } = await supabase.rpc('psico_get_resultados_gerais', {
        p_avaliacao_id: avaliacaoId as string,
      });
      if (error) throw error;
      return data as unknown as PsicoResultados;
    },
  });
}

/* ------------------------- Colaborador ------------------------- */

export function useMinhasAvaliacoesPsico() {
  return useQuery({
    queryKey: ['psico-minhas-avaliacoes'],
    queryFn: async (): Promise<PsicoMinhaAvaliacao[]> => {
      const { data, error } = await supabase.rpc('psico_minhas_avaliacoes');
      if (error) throw error;
      return (data ?? []) as unknown as PsicoMinhaAvaliacao[];
    },
  });
}

export function usePsicoQuestionario(atribuicaoId: string | null) {
  return useQuery({
    queryKey: ['psico-questionario', atribuicaoId],
    enabled: !!atribuicaoId,
    queryFn: async (): Promise<PsicoQuestionario> => {
      const { data, error } = await supabase.rpc('psico_get_questionario', {
        p_atribuicao_id: atribuicaoId as string,
      });
      if (error) throw error;
      return data as unknown as PsicoQuestionario;
    },
  });
}

export function usePsicoRespostasMutations(atribuicaoId: string | null) {
  const qc = useQueryClient();

  const salvarRascunho = useMutation({
    mutationFn: async (respostas: Record<string, number>) => {
      if (!atribuicaoId) throw new Error('Questionário inválido');
      const { error } = await supabase.rpc('psico_save_rascunho', {
        p_atribuicao_id: atribuicaoId,
        p_rascunho: respostas,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['psico-minhas-avaliacoes'] });
      toast({ title: 'Rascunho salvo' });
    },
    onError: (e) => erro(e, 'Não foi possível salvar o rascunho'),
  });

  const enviar = useMutation({
    mutationFn: async (respostas: Record<string, number>) => {
      if (!atribuicaoId) throw new Error('Questionário inválido');
      const { error } = await supabase.rpc('psico_save_respostas', {
        p_atribuicao_id: atribuicaoId,
        p_respostas: respostas,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['psico-minhas-avaliacoes'] });
      qc.invalidateQueries({ queryKey: ['psico-questionario', atribuicaoId] });
      toast({ title: 'Respostas enviadas', description: 'Obrigado por participar!' });
    },
    onError: (e) => erro(e, 'Não foi possível enviar as respostas'),
  });

  return { salvarRascunho, enviar };
}
