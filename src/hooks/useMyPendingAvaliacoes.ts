import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyColaborador } from './useMyFeedbackCycles';
import { differenceInDays, parseISO } from 'date-fns';
import { AvaliacaoStatus } from './useAvaliacoesAplicadas';

export interface PendingAvaliacao {
  id: string;
  ciclo_id: string;
  ciclo_nome: string;
  prazo_autoavaliacao: string | null;
  status_autoavaliacao: AvaliacaoStatus;
  token: string;
  daysUntil: number;
  isOverdue: boolean;
  avaliacaoUrl: string;
}

export interface MinhaAvaliacao extends PendingAvaliacao {
  data_conclusao: string | null;
}

/**
 * Hook to fetch pending self-evaluations for the current collaborator.
 * Only returns evaluations where status_autoavaliacao is not 'concluida' 
 * and the cycle is active.
 */
export function useMyPendingAvaliacoes() {
  const { data: colaborador, isLoading: isLoadingColaborador } = useMyColaborador();

  const query = useQuery({
    queryKey: ['my-pending-avaliacoes', colaborador?.id],
    queryFn: async (): Promise<PendingAvaliacao[]> => {
      console.log('[useMyPendingAvaliacoes] Colaborador recebido:', colaborador);
      
      if (!colaborador?.id) {
        console.log('[useMyPendingAvaliacoes] Nenhum colaborador vinculado ao usuário');
        return [];
      }

      console.log('[useMyPendingAvaliacoes] Buscando avaliações para colaborador_id:', colaborador.id);

      // Fetch evaluations where:
      // - colaborador_id = my colaborador
      // - status_autoavaliacao != 'concluida'
      // - ciclo is 'ativo'
      const { data, error } = await supabase
        .from('avaliacoes')
        .select(`
          id,
          ciclo_id,
          prazo_autoavaliacao,
          status_autoavaliacao,
          ciclo:ciclos_avaliacao!avaliacoes_ciclo_id_fkey(
            id, nome_ciclo, status
          ),
          links:avaliacao_links!inner(
            token, tipo
          )
        `)
        .eq('colaborador_id', colaborador.id)
        .neq('status_autoavaliacao', 'concluida')
        .eq('links.tipo', 'autoavaliacao');

      if (error) {
        console.error('[useMyPendingAvaliacoes] Erro ao buscar avaliações:', error);
        throw error;
      }

      console.log('[useMyPendingAvaliacoes] Resultados encontrados:', data?.length || 0, data);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filter only active cycles and map the data
      return (data || [])
        .filter(a => a.ciclo?.status === 'ativo')
        .map(a => {
          const prazo = a.prazo_autoavaliacao 
            ? parseISO(a.prazo_autoavaliacao) 
            : null;
          const daysUntil = prazo 
            ? differenceInDays(prazo, today) 
            : 999;

          // Get the most recent valid token (not expired)
          const validLink = Array.isArray(a.links) ? a.links[0] : null;

          return {
            id: a.id,
            ciclo_id: a.ciclo_id,
            ciclo_nome: a.ciclo?.nome_ciclo || '',
            prazo_autoavaliacao: a.prazo_autoavaliacao,
            status_autoavaliacao: a.status_autoavaliacao as AvaliacaoStatus,
            token: validLink?.token || '',
            daysUntil,
            isOverdue: prazo ? daysUntil < 0 : false,
            avaliacaoUrl: `/avaliacao/preencher/${validLink?.token || ''}`,
          };
        })
        .filter(a => a.token); // Only include evaluations with valid tokens
    },
    enabled: !!colaborador?.id,
  });

  return {
    ...query,
    isLoading: isLoadingColaborador || query.isLoading,
    colaborador,
  };
}

/**
 * Hook to fetch all evaluations (pending and concluded) for the current collaborator.
 * Used in the full evaluations page.
 */
export function useMinhasAvaliacoes() {
  const { data: colaborador, isLoading: isLoadingColaborador } = useMyColaborador();

  const query = useQuery({
    queryKey: ['minhas-avaliacoes', colaborador?.id],
    queryFn: async (): Promise<{ pendentes: MinhaAvaliacao[]; concluidas: MinhaAvaliacao[] }> => {
      if (!colaborador?.id) return { pendentes: [], concluidas: [] };

      const { data, error } = await supabase
        .from('avaliacoes')
        .select(`
          id,
          ciclo_id,
          prazo_autoavaliacao,
          status_autoavaliacao,
          updated_at,
          ciclo:ciclos_avaliacao!avaliacoes_ciclo_id_fkey(
            id, nome_ciclo, status
          ),
          links:avaliacao_links!inner(
            token, tipo, used_at
          )
        `)
        .eq('colaborador_id', colaborador.id)
        .eq('links.tipo', 'autoavaliacao')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching minhas avaliacoes:', error);
        throw error;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const mapAvaliacao = (a: any): MinhaAvaliacao => {
        const prazo = a.prazo_autoavaliacao 
          ? parseISO(a.prazo_autoavaliacao) 
          : null;
        const daysUntil = prazo 
          ? differenceInDays(prazo, today) 
          : 999;

        const validLink = Array.isArray(a.links) ? a.links[0] : null;

        return {
          id: a.id,
          ciclo_id: a.ciclo_id,
          ciclo_nome: a.ciclo?.nome_ciclo || '',
          prazo_autoavaliacao: a.prazo_autoavaliacao,
          status_autoavaliacao: a.status_autoavaliacao as AvaliacaoStatus,
          token: validLink?.token || '',
          daysUntil,
          isOverdue: prazo ? daysUntil < 0 : false,
          avaliacaoUrl: `/avaliacao/preencher/${validLink?.token || ''}`,
          data_conclusao: validLink?.used_at || a.updated_at,
        };
      };

      const allAvaliacoes = (data || []).filter(a => a.links?.[0]?.token);

      const pendentes = allAvaliacoes
        .filter(a => a.status_autoavaliacao !== 'concluida' && a.ciclo?.status === 'ativo')
        .map(mapAvaliacao);

      const concluidas = allAvaliacoes
        .filter(a => a.status_autoavaliacao === 'concluida')
        .map(mapAvaliacao);

      return { pendentes, concluidas };
    },
    enabled: !!colaborador?.id,
  });

  return {
    ...query,
    isLoading: isLoadingColaborador || query.isLoading,
    colaborador,
  };
}

// --- Gestor types and hook ---

export interface AvaliacaoGestor {
  id: string;
  ciclo_id: string;
  ciclo_nome: string;
  colaborador_nome: string;
  prazo_avaliacao_gestor: string | null;
  status_avaliacao_gestor: AvaliacaoStatus;
  token: string;
  daysUntil: number;
  isOverdue: boolean;
  avaliacaoUrl: string;
  data_conclusao: string | null;
}

/**
 * Hook to fetch evaluations where the current user is the gestor (manager).
 * Returns pending and concluded manager evaluations for their team.
 */
export function useMinhasAvaliacoesGestor() {
  const { data: colaborador, isLoading: isLoadingColaborador } = useMyColaborador();

  const query = useQuery({
    queryKey: ['minhas-avaliacoes-gestor', colaborador?.id],
    queryFn: async (): Promise<{ pendentes: AvaliacaoGestor[]; concluidas: AvaliacaoGestor[] }> => {
      if (!colaborador?.id) return { pendentes: [], concluidas: [] };

      const { data, error } = await supabase
        .from('avaliacoes')
        .select(`
          id,
          ciclo_id,
          prazo_avaliacao_gestor,
          status_avaliacao_gestor,
          updated_at,
          colaborador:colaboradores!avaliacoes_colaborador_id_fkey(
            full_name
          ),
          ciclo:ciclos_avaliacao!avaliacoes_ciclo_id_fkey(
            id, nome_ciclo, status
          ),
          links:avaliacao_links!inner(
            token, tipo, used_at
          )
        `)
        .eq('gestor_id', colaborador.id)
        .eq('links.tipo', 'gestor')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching gestor avaliacoes:', error);
        throw error;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const mapAvaliacao = (a: any): AvaliacaoGestor => {
        const prazo = a.prazo_avaliacao_gestor
          ? parseISO(a.prazo_avaliacao_gestor)
          : null;
        const daysUntil = prazo
          ? differenceInDays(prazo, today)
          : 999;

        const validLink = Array.isArray(a.links) ? a.links[0] : null;

        return {
          id: a.id,
          ciclo_id: a.ciclo_id,
          ciclo_nome: a.ciclo?.nome_ciclo || '',
          colaborador_nome: a.colaborador?.full_name || '',
          prazo_avaliacao_gestor: a.prazo_avaliacao_gestor,
          status_avaliacao_gestor: a.status_avaliacao_gestor as AvaliacaoStatus,
          token: validLink?.token || '',
          daysUntil,
          isOverdue: prazo ? daysUntil < 0 : false,
          avaliacaoUrl: `/avaliacao/preencher/${validLink?.token || ''}`,
          data_conclusao: validLink?.used_at || a.updated_at,
        };
      };

      const allAvaliacoes = (data || []).filter((a: any) => a.links?.[0]?.token);

      const pendentes = allAvaliacoes
        .filter((a: any) => a.status_avaliacao_gestor !== 'concluida' && a.ciclo?.status === 'ativo')
        .map(mapAvaliacao);

      const concluidas = allAvaliacoes
        .filter((a: any) => a.status_avaliacao_gestor === 'concluida')
        .map(mapAvaliacao);

      return { pendentes, concluidas };
    },
    enabled: !!colaborador?.id,
  });

  return {
    ...query,
    isLoading: isLoadingColaborador || query.isLoading,
    colaborador,
  };
}
