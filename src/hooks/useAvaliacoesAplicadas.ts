import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGestorFilter } from "./useGestorFilter";

export type AvaliacaoStatus = 'nao_iniciada' | 'em_andamento' | 'concluida';
export type AvaliacaoLinkTipo = 'autoavaliacao' | 'gestor';
export type RespondenteAvaliacaoTipo = 'colaborador' | 'gestor';

export interface Avaliacao {
  id: string;
  ciclo_id: string;
  colaborador_id: string;
  gestor_id: string;
  prazo_autoavaliacao: string | null;
  prazo_avaliacao_gestor: string | null;
  status_autoavaliacao: AvaliacaoStatus;
  status_avaliacao_gestor: AvaliacaoStatus;
  created_at: string;
  updated_at: string;
  colaborador?: {
    id: string;
    full_name: string;
    department: string;
    job_title: string;
    manager_name: string | null;
  };
  gestor?: {
    id: string;
    full_name: string;
  };
  links?: AvaliacaoLink[];
}

export interface AvaliacaoLink {
  id: string;
  avaliacao_id: string;
  tipo: AvaliacaoLinkTipo;
  token: string;
  expires_at: string | null;
  used_at: string | null;
  created_at: string;
}

export interface ColaboradorParaAvaliacao {
  id: string;
  full_name: string;
  department: string;
  job_title: string;
  manager_name: string | null;
  gestor_id: string | null;
}

// Hook para buscar avaliações de um ciclo
export function useAvaliacoesCiclo(cicloId: string | null) {
  const { gestorColaboradorId, shouldFilterByGestor } = useGestorFilter();

  return useQuery({
    queryKey: ['avaliacoes-ciclo', cicloId, gestorColaboradorId],
    queryFn: async () => {
      if (!cicloId) return [];

      let query = supabase
        .from('avaliacoes')
        .select(`
          *,
          colaborador:colaboradores!avaliacoes_colaborador_id_fkey(id, full_name, department, job_title, manager_name),
          gestor:colaboradores!avaliacoes_gestor_id_fkey(id, full_name),
          links:avaliacao_links(*)
        `)
        .eq('ciclo_id', cicloId)
        .order('created_at', { ascending: false });

      // Gestor departamento: only see evaluations where they are the gestor
      if (shouldFilterByGestor && gestorColaboradorId) {
        query = query.eq('gestor_id', gestorColaboradorId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Avaliacao[];
    },
    enabled: !!cicloId,
  });
}

// Hook para buscar colaboradores ativos para aplicar avaliação
export function useColaboradoresParaAvaliacao(cicloId: string | null, companyId: string | null) {
  return useQuery({
    queryKey: ['colaboradores-para-avaliacao', cicloId, companyId],
    queryFn: async () => {
      if (!companyId) return [];

      // Buscar colaboradores ativos
      const { data: colaboradores, error: colabError } = await supabase
        .from('colaboradores')
        .select('id, full_name, department, job_title, manager_name, gestor_id')
        .eq('company_id', companyId)
        .eq('status', 'ATIVO')
        .order('full_name');

      if (colabError) throw colabError;

      // Se tiver cicloId, buscar quais já têm avaliação
      if (cicloId) {
        const { data: avaliacoes, error: avalError } = await supabase
          .from('avaliacoes')
          .select('colaborador_id')
          .eq('ciclo_id', cicloId);

        if (avalError) throw avalError;

        const jaAplicados = new Set(avaliacoes.map(a => a.colaborador_id));
        return colaboradores.filter(c => !jaAplicados.has(c.id)) as ColaboradorParaAvaliacao[];
      }

      return colaboradores as ColaboradorParaAvaliacao[];
    },
    enabled: !!companyId,
  });
}

// Hook para buscar todos colaboradores como potenciais gestores
export function useColaboradoresComoGestores(companyId: string | null) {
  return useQuery({
    queryKey: ['colaboradores-gestores', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, full_name, department, job_title')
        .eq('company_id', companyId)
        .eq('status', 'ATIVO')
        .order('full_name');

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export interface AplicarAvaliacaoInput {
  cicloId: string;
  colaboradores: {
    colaboradorId: string;
    gestorId: string;
  }[];
  prazoAutoavaliacao: string | null;
  prazoAvaliacaoGestor: string | null;
}

// Mutations para Avaliações Aplicadas
export function useAvaliacaoMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const aplicarCiclo = useMutation({
    mutationFn: async (input: AplicarAvaliacaoInput) => {
      const results = [];

      for (const item of input.colaboradores) {
        // Criar avaliação
        const { data: avaliacao, error: avalError } = await supabase
          .from('avaliacoes')
          .insert({
            ciclo_id: input.cicloId,
            colaborador_id: item.colaboradorId,
            gestor_id: item.gestorId,
            prazo_autoavaliacao: input.prazoAutoavaliacao,
            prazo_avaliacao_gestor: input.prazoAvaliacaoGestor,
          })
          .select()
          .single();

        if (avalError) throw avalError;

        // Criar links (autoavaliacao e gestor)
        const { error: linksError } = await supabase
          .from('avaliacao_links')
          .insert([
            { avaliacao_id: avaliacao.id, tipo: 'autoavaliacao' as const },
            { avaliacao_id: avaliacao.id, tipo: 'gestor' as const },
          ]);

        if (linksError) throw linksError;

        results.push(avaliacao);
      }

      // Activate cycle automatically when evaluations are applied
      const { error: statusError } = await supabase
        .from('ciclos_avaliacao')
        .update({ status: 'ativo' })
        .eq('id', input.cicloId)
        .in('status', ['configuracao'] as const);

      if (statusError) {
        console.warn('Erro ao ativar ciclo:', statusError);
      }

      return results;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['avaliacoes-ciclo', variables.cicloId] });
      queryClient.invalidateQueries({ queryKey: ['ciclos-avaliacao'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores-para-avaliacao'] });
      queryClient.invalidateQueries({ queryKey: ['my-pending-avaliacoes'] });
      queryClient.invalidateQueries({ queryKey: ['minhas-avaliacoes'] });
      toast({ title: "Avaliações geradas com sucesso!" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao gerar avaliações", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const deleteAvaliacao = useMutation({
    mutationFn: async ({ id, cicloId }: { id: string; cicloId: string }) => {
      const { error } = await supabase
        .from('avaliacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return cicloId;
    },
    onSuccess: (cicloId) => {
      queryClient.invalidateQueries({ queryKey: ['avaliacoes-ciclo', cicloId] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores-para-avaliacao'] });
      toast({ title: "Avaliação excluída com sucesso!" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao excluir avaliação", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  return { aplicarCiclo, deleteAvaliacao };
}

// Hook para regenerar link de avaliação
export function useRegenerateLinkMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      avaliacaoId, 
      tipo, 
      cicloId 
    }: { 
      avaliacaoId: string; 
      tipo: 'autoavaliacao' | 'gestor'; 
      cicloId: string 
    }) => {
      // Marcar link antigo como expirado
      const { error: expireError } = await supabase
        .from('avaliacao_links')
        .update({ expires_at: new Date().toISOString() })
        .eq('avaliacao_id', avaliacaoId)
        .eq('tipo', tipo);

      if (expireError) throw expireError;

      // Criar novo link
      const { data, error } = await supabase
        .from('avaliacao_links')
        .insert({ avaliacao_id: avaliacaoId, tipo })
        .select()
        .single();

      if (error) throw error;
      return { ...data, cicloId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['avaliacoes-ciclo', data.cicloId] });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao regenerar link", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });
}

// Interface para dados retornados pela function get_avaliacao_by_token
export interface AvaliacaoByToken {
  avaliacao_id: string;
  ciclo_id: string;
  ciclo_nome: string;
  colaborador_id: string;
  colaborador_nome: string;
  gestor_nome: string;
  link_tipo: AvaliacaoLinkTipo;
  status: AvaliacaoStatus;
  already_completed: boolean;
  expired: boolean;
  competencias: CompetenciaFormData[] | null;
  objetivos: ObjetivoFormData[] | null;
  metricas: MetricaFormData[] | null;
  respostas_competencias: RespostaCompetencia[] | null;
  respostas_objetivos: RespostaObjetivo[] | null;
}

export interface CompetenciaFormData {
  id: string;
  nome_competencia: string;
  conceito_competencia: string | null;
  texto_pergunta: string;
  metrica_id: string | null;
  ordem: number;
}

export interface ObjetivoFormData {
  id: string;
  nome_objetivo: string;
  descricao_objetivo: string | null;
  texto_pergunta: string;
  metrica_id: string | null;
  ordem: number;
}

export interface MetricaFormData {
  id: string;
  nome_metrica: string;
  tipo_metrica: 'numerica' | 'descritiva';
  valores_escala: { valor: number | string; label: string }[];
}

export interface RespostaCompetencia {
  competencia_id: string;
  nota_valor: string;
  comentario: string | null;
}

export interface RespostaObjetivo {
  objetivo_id: string;
  nota_valor: string;
  comentario: string | null;
}

// Hook para buscar avaliação por token (para preenchimento público)
export function useAvaliacaoByToken(token: string | undefined) {
  return useQuery({
    queryKey: ['avaliacao-by-token', token],
    queryFn: async () => {
      if (!token) return null;

      const { data, error } = await supabase
        .rpc('get_avaliacao_by_token', { p_token: token });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const raw = data[0];
      return {
        avaliacao_id: raw.avaliacao_id,
        ciclo_id: raw.ciclo_id,
        ciclo_nome: raw.ciclo_nome,
        colaborador_id: raw.colaborador_id,
        colaborador_nome: raw.colaborador_nome,
        gestor_nome: raw.gestor_nome,
        link_tipo: raw.link_tipo as AvaliacaoLinkTipo,
        status: raw.status as AvaliacaoStatus,
        already_completed: raw.already_completed,
        expired: raw.expired,
        competencias: (raw.competencias as unknown) as CompetenciaFormData[] | null,
        objetivos: (raw.objetivos as unknown) as ObjetivoFormData[] | null,
        metricas: (raw.metricas as unknown) as MetricaFormData[] | null,
        respostas_competencias: (raw.respostas_competencias as unknown) as RespostaCompetencia[] | null,
        respostas_objetivos: (raw.respostas_objetivos as unknown) as RespostaObjetivo[] | null,
      } as AvaliacaoByToken;
    },
    enabled: !!token,
  });
}

// Mutation para submeter respostas de avaliação
export function useSubmitAvaliacaoResponses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      token,
      respostasCompetencias,
      respostasObjetivos,
      finalizar,
    }: {
      token: string;
      respostasCompetencias: { competencia_id: string; nota_valor: string; comentario: string | null }[];
      respostasObjetivos: { objetivo_id: string; nota_valor: string; comentario: string | null }[];
      finalizar: boolean;
    }) => {
      const { data, error } = await supabase.rpc('submit_avaliacao_responses', {
        p_token: token,
        p_respostas_competencias: respostasCompetencias,
        p_respostas_objetivos: respostasObjetivos,
        p_finalizar: finalizar,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['avaliacao-by-token', variables.token] });
      toast({ 
        title: variables.finalizar 
          ? "Avaliação finalizada com sucesso!" 
          : "Rascunho salvo com sucesso!" 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao salvar avaliação", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });
}
