import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyColaborador } from './useMyFeedbackCycles';
import type { PDIStatus } from './usePDI';

export interface MinhaPDI {
  id: string;
  avaliacao_id: string;
  ciclo_id: string;
  status: PDIStatus;
  data_inicio: string;
  data_fim_prevista: string | null;
  observacoes_gerais: string | null;
  created_at: string;
  ciclo_nome: string;
  count_itens: number;
  progresso_medio: number;
}

export function useMinhasPDIs() {
  const { data: colaborador, isLoading: isLoadingColaborador } = useMyColaborador();

  const query = useQuery({
    queryKey: ['minhas-pdis', colaborador?.id],
    queryFn: async (): Promise<MinhaPDI[]> => {
      if (!colaborador?.id) return [];

      const { data: pdis, error } = await supabase
        .from('pdis')
        .select(`
          id, avaliacao_id, ciclo_id, status, data_inicio, data_fim_prevista,
          observacoes_gerais, created_at,
          ciclo:ciclos_avaliacao!pdis_ciclo_id_fkey(nome_ciclo)
        `)
        .eq('colaborador_id', colaborador.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const pdiIds = (pdis || []).map(p => p.id);
      if (pdiIds.length === 0) return [];

      const { data: itens } = await supabase
        .from('pdi_itens')
        .select('pdi_id, progresso_percentual')
        .in('pdi_id', pdiIds);

      const itemStats = new Map<string, { count: number; totalProgress: number }>();
      (itens || []).forEach(item => {
        const stat = itemStats.get(item.pdi_id) || { count: 0, totalProgress: 0 };
        stat.count++;
        stat.totalProgress += item.progresso_percentual;
        itemStats.set(item.pdi_id, stat);
      });

      return (pdis || []).map(pdi => {
        const stat = itemStats.get(pdi.id);
        return {
          id: pdi.id,
          avaliacao_id: pdi.avaliacao_id,
          ciclo_id: pdi.ciclo_id,
          status: pdi.status as PDIStatus,
          data_inicio: pdi.data_inicio,
          data_fim_prevista: pdi.data_fim_prevista,
          observacoes_gerais: pdi.observacoes_gerais,
          created_at: pdi.created_at,
          ciclo_nome: (pdi.ciclo as any)?.nome_ciclo || '',
          count_itens: stat?.count || 0,
          progresso_medio: stat ? Math.round(stat.totalProgress / stat.count) : 0,
        };
      });
    },
    enabled: !!colaborador?.id,
  });

  return {
    ...query,
    isLoading: isLoadingColaborador || query.isLoading,
    colaborador,
  };
}
