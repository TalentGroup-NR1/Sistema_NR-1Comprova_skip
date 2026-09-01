import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

export type PDIStatus = Database['public']['Enums']['pdi_status'];
export type PDIItemTipoAlvo = Database['public']['Enums']['pdi_item_tipo_alvo'];
export type PDIItemTipoAcao = Database['public']['Enums']['pdi_item_tipo_acao'];
export type PDIItemResponsavel = Database['public']['Enums']['pdi_item_responsavel'];
export type PDIItemStatus = Database['public']['Enums']['pdi_item_status'];

export interface PDI {
  id: string;
  avaliacao_id: string;
  ciclo_id: string;
  colaborador_id: string;
  gestor_id: string;
  status: PDIStatus;
  data_inicio: string;
  data_fim_prevista: string | null;
  observacoes_gerais: string | null;
  created_at: string;
  updated_at: string;
  colaborador?: { full_name: string; job_title: string; department: string };
  gestor?: { full_name: string };
  ciclo?: { nome_ciclo: string };
  _count_itens?: number;
  _progresso_medio?: number;
}

export interface PDIItem {
  id: string;
  pdi_id: string;
  tipo_alvo: PDIItemTipoAlvo;
  competencia_id: string | null;
  objetivo_id: string | null;
  titulo: string;
  descricao: string | null;
  tipo_acao: PDIItemTipoAcao;
  responsavel: PDIItemResponsavel;
  prazo: string | null;
  status: PDIItemStatus;
  progresso_percentual: number;
  evidencias: string | null;
  created_at: string;
  updated_at: string;
  competencia?: { nome_competencia: string } | null;
  objetivo?: { nome_objetivo: string } | null;
}

export interface PDICheckin {
  id: string;
  pdi_item_id: string;
  autor_id: string;
  comentario: string;
  progresso_percentual: number | null;
  created_at: string;
  autor?: { full_name: string };
}

export interface CreatePDIData {
  avaliacao_id: string;
  ciclo_id: string;
  colaborador_id: string;
  gestor_id: string;
  data_fim_prevista?: string | null;
  observacoes_gerais?: string | null;
  itens_sugeridos?: Omit<CreatePDIItemData, 'pdi_id'>[];
}

export interface UpdatePDIData {
  id: string;
  status?: PDIStatus;
  data_fim_prevista?: string | null;
  observacoes_gerais?: string | null;
}

export interface CreatePDIItemData {
  pdi_id: string;
  tipo_alvo: PDIItemTipoAlvo;
  competencia_id?: string | null;
  objetivo_id?: string | null;
  titulo: string;
  descricao?: string | null;
  tipo_acao: PDIItemTipoAcao;
  responsavel: PDIItemResponsavel;
  prazo?: string | null;
}

export interface UpdatePDIItemData {
  id: string;
  titulo?: string;
  descricao?: string | null;
  tipo_acao?: PDIItemTipoAcao;
  responsavel?: PDIItemResponsavel;
  prazo?: string | null;
  status?: PDIItemStatus;
  progresso_percentual?: number;
  evidencias?: string | null;
}

export interface CreateCheckinData {
  pdi_item_id: string;
  autor_id: string;
  comentario: string;
  progresso_percentual?: number | null;
}

// Hook to check if PDI exists for an avaliacao
export function usePDIByAvaliacao(avaliacaoId: string | undefined) {
  return useQuery({
    queryKey: ['pdi-by-avaliacao', avaliacaoId],
    queryFn: async () => {
      if (!avaliacaoId) return null;
      
      const { data, error } = await supabase
        .from('pdis')
        .select('id, status')
        .eq('avaliacao_id', avaliacaoId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!avaliacaoId,
  });
}

// Hook to fetch full PDI with items
export function usePDI(pdiId: string | undefined) {
  return useQuery({
    queryKey: ['pdi', pdiId],
    queryFn: async () => {
      if (!pdiId) return null;
      
      const { data: pdi, error } = await supabase
        .from('pdis')
        .select(`
          *,
          colaborador:colaboradores!pdis_colaborador_id_fkey(id, full_name, job_title, department),
          gestor:colaboradores!pdis_gestor_id_fkey(id, full_name),
          ciclo:ciclos_avaliacao(id, nome_ciclo, status)
        `)
        .eq('id', pdiId)
        .single();
      
      if (error) throw error;
      
      // Fetch items
      const { data: itens, error: itensError } = await supabase
        .from('pdi_itens')
        .select(`
          *,
          competencia:competencias_ciclo(nome_competencia),
          objetivo:objetivos_ciclo(nome_objetivo)
        `)
        .eq('pdi_id', pdiId)
        .order('created_at');
      
      if (itensError) throw itensError;
      
      return {
        ...pdi,
        itens: itens || [],
      } as PDI & { itens: PDIItem[] };
    },
    enabled: !!pdiId,
  });
}

// Hook to fetch checkins for an item
export function usePDICheckins(itemId: string | undefined) {
  return useQuery({
    queryKey: ['pdi-checkins', itemId],
    queryFn: async () => {
      if (!itemId) return [];
      
      const { data, error } = await supabase
        .from('pdi_checkins')
        .select(`
          *,
          autor:colaboradores!pdi_checkins_autor_id_fkey(full_name)
        `)
        .eq('pdi_item_id', itemId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PDICheckin[];
    },
    enabled: !!itemId,
  });
}

// Hook to fetch all PDIs for a cycle
export function usePDIsByCiclo(cicloId: string | null) {
  return useQuery({
    queryKey: ['pdis-by-ciclo', cicloId],
    queryFn: async () => {
      if (!cicloId) return [];
      
      const { data: pdis, error } = await supabase
        .from('pdis')
        .select(`
          *,
          colaborador:colaboradores!pdis_colaborador_id_fkey(full_name, job_title, department),
          gestor:colaboradores!pdis_gestor_id_fkey(full_name)
        `)
        .eq('ciclo_id', cicloId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get item counts and average progress for each PDI
      const pdiIds = pdis.map(p => p.id);
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
      
      return pdis.map(pdi => {
        const stat = itemStats.get(pdi.id);
        return {
          ...pdi,
          _count_itens: stat?.count || 0,
          _progresso_medio: stat ? Math.round(stat.totalProgress / stat.count) : 0,
        } as PDI;
      });
    },
    enabled: !!cicloId,
  });
}

// Hook to get count of PDIs created for a cycle
export function usePDICountByCiclo(cicloId: string | null, totalAvaliacoes: number) {
  const { data: pdis } = usePDIsByCiclo(cicloId);
  
  return {
    count: pdis?.length || 0,
    total: totalAvaliacoes,
    percentage: totalAvaliacoes > 0 ? Math.round(((pdis?.length || 0) / totalAvaliacoes) * 100) : 0,
  };
}

// Mutation to create PDI
export function useCreatePDI() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreatePDIData) => {
      const { itens_sugeridos, ...pdiData } = data;
      
      // Create PDI
      const { data: pdi, error } = await supabase
        .from('pdis')
        .insert(pdiData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Create suggested items if any
      if (itens_sugeridos && itens_sugeridos.length > 0) {
        const itensToInsert = itens_sugeridos.map(item => ({
          ...item,
          pdi_id: pdi.id,
        }));
        
        const { error: itensError } = await supabase
          .from('pdi_itens')
          .insert(itensToInsert);
        
        if (itensError) {
          console.error('Error creating suggested items:', itensError);
        }
      }
      
      return pdi;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pdi-by-avaliacao', data.avaliacao_id] });
      queryClient.invalidateQueries({ queryKey: ['pdis-by-ciclo', data.ciclo_id] });
      toast.success('PDI criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating PDI:', error);
      toast.error('Erro ao criar PDI');
    },
  });
}

// Mutation to update PDI
export function useUpdatePDI() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: UpdatePDIData) => {
      const { id, ...updateData } = data;
      
      const { data: pdi, error } = await supabase
        .from('pdis')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return pdi;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pdi', data.id] });
      queryClient.invalidateQueries({ queryKey: ['pdis-by-ciclo', data.ciclo_id] });
      toast.success('PDI atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating PDI:', error);
      toast.error('Erro ao atualizar PDI');
    },
  });
}

// Mutation to create PDI item
export function useCreatePDIItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreatePDIItemData) => {
      const { data: item, error } = await supabase
        .from('pdi_itens')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return item;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pdi', data.pdi_id] });
      toast.success('Ação adicionada ao PDI!');
    },
    onError: (error) => {
      console.error('Error creating PDI item:', error);
      toast.error('Erro ao adicionar ação');
    },
  });
}

// Mutation to update PDI item
export function useUpdatePDIItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: UpdatePDIItemData) => {
      const { id, ...updateData } = data;
      
      const { data: item, error } = await supabase
        .from('pdi_itens')
        .update(updateData)
        .eq('id', id)
        .select('*, pdi:pdis(id)')
        .single();
      
      if (error) throw error;
      return item;
    },
    onSuccess: (data) => {
      const pdiId = (data.pdi as { id: string } | null)?.id;
      if (pdiId) {
        queryClient.invalidateQueries({ queryKey: ['pdi', pdiId] });
      }
      toast.success('Ação atualizada!');
    },
    onError: (error) => {
      console.error('Error updating PDI item:', error);
      toast.error('Erro ao atualizar ação');
    },
  });
}

// Mutation to delete PDI item
export function useDeletePDIItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ itemId, pdiId }: { itemId: string; pdiId: string }) => {
      const { error } = await supabase
        .from('pdi_itens')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
      return { pdiId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pdi', data.pdiId] });
      toast.success('Ação removida!');
    },
    onError: (error) => {
      console.error('Error deleting PDI item:', error);
      toast.error('Erro ao remover ação');
    },
  });
}

// Mutation to create checkin
export function useCreateCheckin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateCheckinData) => {
      const { data: checkin, error } = await supabase
        .from('pdi_checkins')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update item progress if provided
      if (data.progresso_percentual != null) {
        await supabase
          .from('pdi_itens')
          .update({ progresso_percentual: data.progresso_percentual })
          .eq('id', data.pdi_item_id);
      }
      
      return checkin;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pdi-checkins', data.pdi_item_id] });
      queryClient.invalidateQueries({ queryKey: ['pdi'] });
      toast.success('Check-in registrado!');
    },
    onError: (error) => {
      console.error('Error creating checkin:', error);
      toast.error('Erro ao registrar check-in');
    },
  });
}

// Helper to generate suggested items from evaluation results
export function generateSuggestedItems(
  competencias: { id: string; nome_competencia: string; discrepancia: number | null; peso_colab?: number | null; peso_gestor?: number | null }[],
  objetivos: { id: string; nome_objetivo: string; discrepancia: number | null; peso_colab?: number | null; peso_gestor?: number | null }[]
): Omit<CreatePDIItemData, 'pdi_id'>[] {
  const items: Omit<CreatePDIItemData, 'pdi_id'>[] = [];
  
  // Get competencias with lowest gestor score or highest negative discrepancy
  const sortedComps = [...competencias]
    .filter(c => c.peso_gestor != null || c.discrepancia != null)
    .sort((a, b) => {
      // Prioritize items where gestor score is lowest
      if (a.peso_gestor != null && b.peso_gestor != null) {
        return a.peso_gestor - b.peso_gestor;
      }
      // Or highest negative discrepancy (colab thinks they're better than gestor does)
      if (a.discrepancia != null && b.discrepancia != null) {
        return b.discrepancia - a.discrepancia;
      }
      return 0;
    })
    .slice(0, 3);
  
  sortedComps.forEach(comp => {
    items.push({
      tipo_alvo: 'competencia',
      competencia_id: comp.id,
      titulo: `Desenvolver: ${comp.nome_competencia}`,
      descricao: `Ação de desenvolvimento para a competência "${comp.nome_competencia}"`,
      tipo_acao: 'treinamento',
      responsavel: 'colaborador',
    });
  });
  
  // Get objetivos with lowest gestor score or highest negative discrepancy
  const sortedObjs = [...objetivos]
    .filter(o => o.peso_gestor != null || o.discrepancia != null)
    .sort((a, b) => {
      if (a.peso_gestor != null && b.peso_gestor != null) {
        return a.peso_gestor - b.peso_gestor;
      }
      if (a.discrepancia != null && b.discrepancia != null) {
        return b.discrepancia - a.discrepancia;
      }
      return 0;
    })
    .slice(0, 2);
  
  sortedObjs.forEach(obj => {
    items.push({
      tipo_alvo: 'objetivo',
      objetivo_id: obj.id,
      titulo: `Melhorar: ${obj.nome_objetivo}`,
      descricao: `Ação de melhoria para o objetivo "${obj.nome_objetivo}"`,
      tipo_acao: 'projeto_pratico',
      responsavel: 'colaborador',
    });
  });
  
  return items;
}
