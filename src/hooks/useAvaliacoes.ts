import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { Json } from "@/integrations/supabase/types";

export type CicloAvaliacaoStatus = 'configuracao' | 'ativo' | 'finalizado';
export type TipoMetrica = 'numerica' | 'descritiva';

export interface ValorEscala {
  valor: number | string;
  label: string;
}

export interface CicloAvaliacao {
  id: string;
  company_id: string;
  nome_ciclo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string;
  status: CicloAvaliacaoStatus;
  created_at: string;
  updated_at: string;
}

export interface MetricaAvaliacao {
  id: string;
  ciclo_id: string;
  nome_metrica: string;
  tipo_metrica: TipoMetrica;
  valores_escala: ValorEscala[];
  created_at: string;
  updated_at: string;
}

export interface CompetenciaCiclo {
  id: string;
  ciclo_id: string;
  metrica_id: string | null;
  nome_competencia: string;
  conceito_competencia: string | null;
  texto_pergunta_autoavaliacao: string;
  texto_pergunta_gestor: string;
  ordem: number;
  created_at: string;
  updated_at: string;
  metrica?: MetricaAvaliacao | null;
}

export interface ObjetivoCiclo {
  id: string;
  ciclo_id: string;
  metrica_id: string | null;
  nome_objetivo: string;
  descricao_objetivo: string | null;
  texto_pergunta_autoavaliacao: string;
  texto_pergunta_gestor: string;
  ordem: number;
  created_at: string;
  updated_at: string;
  metrica?: MetricaAvaliacao | null;
}

// Helper to parse valores_escala from Json
function parseValoresEscala(json: Json): ValorEscala[] {
  if (Array.isArray(json)) {
    return json.map((item: unknown) => {
      const obj = item as { valor?: number | string; label?: string };
      return {
        valor: obj.valor ?? 0,
        label: obj.label ?? '',
      };
    });
  }
  return [];
}

// Helper to transform metrica from DB format
function transformMetrica(dbMetrica: any): MetricaAvaliacao | null {
  if (!dbMetrica) return null;
  return {
    ...dbMetrica,
    valores_escala: parseValoresEscala(dbMetrica.valores_escala),
  };
}

// Hook para listar ciclos de avaliação
export function useCiclosAvaliacao() {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ['ciclos-avaliacao', effectiveCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('ciclos_avaliacao')
        .select('*')
        .order('created_at', { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq('company_id', effectiveCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CicloAvaliacao[];
    },
    enabled: !!effectiveCompanyId,
  });
}

// Hook para buscar um ciclo específico com seus dados relacionados
export function useCicloAvaliacao(cicloId: string | null) {
  return useQuery({
    queryKey: ['ciclo-avaliacao', cicloId],
    queryFn: async () => {
      if (!cicloId) return null;

      const { data, error } = await supabase
        .from('ciclos_avaliacao')
        .select('*')
        .eq('id', cicloId)
        .single();

      if (error) throw error;
      return data as CicloAvaliacao;
    },
    enabled: !!cicloId,
  });
}

// Hook para métricas de um ciclo
export function useMetricasCiclo(cicloId: string | null) {
  return useQuery({
    queryKey: ['metricas-ciclo', cicloId],
    queryFn: async () => {
      if (!cicloId) return [];

      const { data, error } = await supabase
        .from('metricas_avaliacao')
        .select('*')
        .eq('ciclo_id', cicloId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data.map((m) => ({
        ...m,
        valores_escala: parseValoresEscala(m.valores_escala),
      })) as MetricaAvaliacao[];
    },
    enabled: !!cicloId,
  });
}

// Hook para competências de um ciclo
export function useCompetenciasCiclo(cicloId: string | null) {
  return useQuery({
    queryKey: ['competencias-ciclo', cicloId],
    queryFn: async () => {
      if (!cicloId) return [];

      const { data, error } = await supabase
        .from('competencias_ciclo')
        .select('*, metrica:metricas_avaliacao(*)')
        .eq('ciclo_id', cicloId)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data.map((c) => ({
        ...c,
        metrica: transformMetrica(c.metrica),
      })) as CompetenciaCiclo[];
    },
    enabled: !!cicloId,
  });
}

// Hook para objetivos de um ciclo
export function useObjetivosCiclo(cicloId: string | null) {
  return useQuery({
    queryKey: ['objetivos-ciclo', cicloId],
    queryFn: async () => {
      if (!cicloId) return [];

      const { data, error } = await supabase
        .from('objetivos_ciclo')
        .select('*, metrica:metricas_avaliacao(*)')
        .eq('ciclo_id', cicloId)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data.map((o) => ({
        ...o,
        metrica: transformMetrica(o.metrica),
      })) as ObjetivoCiclo[];
    },
    enabled: !!cicloId,
  });
}

// Input types for mutations
export interface CicloInput {
  nome_ciclo: string;
  descricao?: string | null;
  data_inicio: string;
  data_fim: string;
  status: CicloAvaliacaoStatus;
}

export interface MetricaInput {
  nome_metrica: string;
  tipo_metrica: TipoMetrica;
  valores_escala: ValorEscala[];
}

export interface CompetenciaInput {
  nome_competencia: string;
  conceito_competencia?: string | null;
  texto_pergunta_autoavaliacao: string;
  texto_pergunta_gestor: string;
  metrica_id?: string | null;
  ordem?: number;
}

export interface ObjetivoInput {
  nome_objetivo: string;
  descricao_objetivo?: string | null;
  texto_pergunta_autoavaliacao: string;
  texto_pergunta_gestor: string;
  metrica_id?: string | null;
  ordem?: number;
}

// Mutations para Ciclos
export function useCicloMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const effectiveCompanyId = useEffectiveCompanyId();

  const createCiclo = useMutation({
    mutationFn: async (data: CicloInput) => {
      if (!effectiveCompanyId) throw new Error('Empresa não selecionada');

      const { data: result, error } = await supabase
        .from('ciclos_avaliacao')
        .insert({ ...data, company_id: effectiveCompanyId })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ciclos-avaliacao'] });
      toast({ title: "Ciclo criado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar ciclo", description: error.message, variant: "destructive" });
    },
  });

  const updateCiclo = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CicloInput> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('ciclos_avaliacao')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ciclos-avaliacao'] });
      queryClient.invalidateQueries({ queryKey: ['ciclo-avaliacao'] });
      toast({ title: "Ciclo atualizado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar ciclo", description: error.message, variant: "destructive" });
    },
  });

  const deleteCiclo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ciclos_avaliacao')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ciclos-avaliacao'] });
      toast({ title: "Ciclo excluído com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir ciclo", description: error.message, variant: "destructive" });
    },
  });

  return { createCiclo, updateCiclo, deleteCiclo };
}

// Mutations para Métricas
export function useMetricaMutations(cicloId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMetrica = useMutation({
    mutationFn: async (data: MetricaInput) => {
      const { data: result, error } = await supabase
        .from('metricas_avaliacao')
        .insert({ 
          nome_metrica: data.nome_metrica,
          tipo_metrica: data.tipo_metrica,
          valores_escala: data.valores_escala as unknown as Json,
          ciclo_id: cicloId 
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metricas-ciclo', cicloId] });
      toast({ title: "Métrica criada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar métrica", description: error.message, variant: "destructive" });
    },
  });

  const updateMetrica = useMutation({
    mutationFn: async ({ id, ...data }: Partial<MetricaInput> & { id: string }) => {
      const updateData: Record<string, unknown> = {};
      if (data.nome_metrica !== undefined) updateData.nome_metrica = data.nome_metrica;
      if (data.tipo_metrica !== undefined) updateData.tipo_metrica = data.tipo_metrica;
      if (data.valores_escala !== undefined) updateData.valores_escala = data.valores_escala as unknown as Json;

      const { data: result, error } = await supabase
        .from('metricas_avaliacao')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metricas-ciclo', cicloId] });
      toast({ title: "Métrica atualizada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar métrica", description: error.message, variant: "destructive" });
    },
  });

  const deleteMetrica = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('metricas_avaliacao')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metricas-ciclo', cicloId] });
      toast({ title: "Métrica excluída com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir métrica", description: error.message, variant: "destructive" });
    },
  });

  return { createMetrica, updateMetrica, deleteMetrica };
}

// Mutations para Competências
export function useCompetenciaMutations(cicloId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createCompetencia = useMutation({
    mutationFn: async (data: CompetenciaInput) => {
      const { data: result, error } = await supabase
        .from('competencias_ciclo')
        .insert({ ...data, ciclo_id: cicloId })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competencias-ciclo', cicloId] });
      toast({ title: "Competência criada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar competência", description: error.message, variant: "destructive" });
    },
  });

  const updateCompetencia = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CompetenciaInput> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('competencias_ciclo')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competencias-ciclo', cicloId] });
      toast({ title: "Competência atualizada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar competência", description: error.message, variant: "destructive" });
    },
  });

  const deleteCompetencia = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('competencias_ciclo')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competencias-ciclo', cicloId] });
      toast({ title: "Competência excluída com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir competência", description: error.message, variant: "destructive" });
    },
  });

  return { createCompetencia, updateCompetencia, deleteCompetencia };
}

// Mutations para Objetivos
export function useObjetivoMutations(cicloId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createObjetivo = useMutation({
    mutationFn: async (data: ObjetivoInput) => {
      const { data: result, error } = await supabase
        .from('objetivos_ciclo')
        .insert({ ...data, ciclo_id: cicloId })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objetivos-ciclo', cicloId] });
      toast({ title: "Objetivo criado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar objetivo", description: error.message, variant: "destructive" });
    },
  });

  const updateObjetivo = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ObjetivoInput> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('objetivos_ciclo')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objetivos-ciclo', cicloId] });
      toast({ title: "Objetivo atualizado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar objetivo", description: error.message, variant: "destructive" });
    },
  });

  const deleteObjetivo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('objetivos_ciclo')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objetivos-ciclo', cicloId] });
      toast({ title: "Objetivo excluído com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir objetivo", description: error.message, variant: "destructive" });
    },
  });

  return { createObjetivo, updateObjetivo, deleteObjetivo };
}
