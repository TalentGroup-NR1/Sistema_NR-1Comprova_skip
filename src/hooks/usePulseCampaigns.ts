import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";
import { toast } from "sonner";

export const MINIMO_RESPONDENTES_ANONIMATO = 5;

// Types
export interface PulseCampaign {
  id: string;
  company_id: string;
  titulo: string;
  descricao: string | null;
  ativo: boolean;
  data_inicio: string;
  data_fim: string;
  audiencia_tipo: 'todos' | 'departamentos';
  alvos?: string[]; // departamentos alvos populados via join
  created_at: string;
  updated_at: string;
}

export interface PulseQuestion {
  id: string;
  campaign_id: string;
  pergunta: string;
  tipo: 'escala_0_5' | 'sim_nao' | 'texto_livre';
  ordem: number;
  obrigatoria: boolean;
  created_at: string;
}

export interface ActiveCampaign {
  campaign_id: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string;
  has_responded: boolean;
  questions: PulseQuestion[];
}

export interface CampaignStats {
  total_responses: number;
  avg_score: number | null;
  participation_rate: number | null;
  score_distribution: Record<string, number> | null;
  department_breakdown: Record<string, number> | null;
}

export interface CampaignResult {
  response_id: string;
  question_id: string;
  pergunta: string;
  tipo: string;
  resposta: string;
  resposta_numerica: number | null;
  comentario: string | null;
  employee_id: string;
  colaborador_nome: string;
  departamento: string;
  created_at: string;
}

export interface TrendData {
  campaign_id: string;
  campaign_title: string;
  campaign_date: string;
  avg_score: number | null;
  total_responses: number;
}

export interface CampaignHistoryItem {
  campaign_id: string;
  titulo: string;
  data_inicio: string;
  data_fim: string;
  responded_at: string;
  responses: Array<{
    pergunta: string;
    tipo: string;
    resposta: string;
    comentario: string | null;
  }>;
}

export interface EmployeePulseHistory {
  campaign_id: string;
  campaign_title: string;
  campaign_date: string;
  question_id: string;
  pergunta: string;
  tipo: string;
  resposta: string;
  resposta_numerica: number | null;
  comentario: string | null;
  created_at: string;
}

export interface PulseColaborador {
  employee_id: string;
  nome: string;
  departamento: string | null;
  cargo: string | null;
  foto_url: string | null;
  total_respostas: number;
  esferas_identificadas: string[];
  media_geral: number | null;
  ultima_resposta: string | null;
}

// Constantes para emojis (compartilhadas)
export const EMOJI_SCALE = [
  { score: 0, emoji: '😢', label: 'Muito Mal', color: 'bg-red-100 border-red-400 hover:bg-red-200', textColor: 'text-red-700' },
  { score: 1, emoji: '😟', label: 'Mal', color: 'bg-orange-100 border-orange-400 hover:bg-orange-200', textColor: 'text-orange-700' },
  { score: 2, emoji: '😐', label: 'Regular', color: 'bg-yellow-100 border-yellow-400 hover:bg-yellow-200', textColor: 'text-yellow-700' },
  { score: 3, emoji: '🙂', label: 'Bem', color: 'bg-lime-100 border-lime-400 hover:bg-lime-200', textColor: 'text-lime-700' },
  { score: 4, emoji: '😊', label: 'Muito Bem', color: 'bg-green-100 border-green-400 hover:bg-green-200', textColor: 'text-green-700' },
  { score: 5, emoji: '🤩', label: 'Excelente', color: 'bg-emerald-100 border-emerald-400 hover:bg-emerald-200', textColor: 'text-emerald-700' },
] as const;

// Hook: Listar todas as campanhas (admin)
export function usePulseCampaigns() {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ["pulse-campaigns", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];

      const { data, error } = await supabase
        .from("pulse_campaigns")
        .select("*")
        .eq("company_id", effectiveCompanyId)
        .order("data_inicio", { ascending: true });

      if (error) throw error;
      return data as PulseCampaign[];
    },
    enabled: !!effectiveCompanyId,
  });
}

// Hook: Buscar campanha ativa (colaborador)
export function useActivePulseCampaign() {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ["active-pulse-campaign", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;

      const { data, error } = await supabase.rpc("get_active_pulse_campaign", {
        p_company_id: effectiveCompanyId,
      });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const item = data[0];
      return {
        campaign_id: item.campaign_id,
        titulo: item.titulo,
        descricao: item.descricao,
        data_inicio: item.data_inicio,
        data_fim: item.data_fim,
        has_responded: item.has_responded,
        questions: (item.questions as unknown as PulseQuestion[]) || [],
      } as ActiveCampaign;
    },
    enabled: !!effectiveCompanyId,
  });
}

// Hook: Perguntas de uma campanha
export function useCampaignQuestions(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign-questions", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from("pulse_questions")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data as PulseQuestion[];
    },
    enabled: !!campaignId,
  });
}

// Hook: Estatísticas da campanha
export function useCampaignStats(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign-stats", campaignId],
    queryFn: async () => {
      if (!campaignId) return null;

      const { data, error } = await supabase.rpc("get_pulse_campaign_stats", {
        p_campaign_id: campaignId,
      });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      return data[0] as CampaignStats;
    },
    enabled: !!campaignId,
  });
}

// Hook: Resultados da campanha (com filtros e paginação no servidor)
export function useCampaignResults(
  campaignId: string | undefined,
  filters?: {
    department?: string;
    minScore?: number;
    maxScore?: number;
  },
  pagination?: {
    page: number;
    pageSize: number;
  }
) {
  return useQuery({
    queryKey: ["campaign-results", campaignId, filters, pagination],
    queryFn: async () => {
      if (!campaignId) return [];

      const limit = pagination?.pageSize || 100;
      const offset = ((pagination?.page || 1) - 1) * limit;

      const { data, error } = await supabase.rpc("get_pulse_campaign_results", {
        p_campaign_id: campaignId,
        p_department: filters?.department || null,
        p_min_score: filters?.minScore ?? null,
        p_max_score: filters?.maxScore ?? null,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) throw error;
      return data as CampaignResult[];
    },
    enabled: !!campaignId,
    staleTime: 30000,
  });
}

// Hook: Dados de tendência
export function usePulseTrendData(monthsBack: number = 6) {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ["pulse-trend-data", effectiveCompanyId, monthsBack],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];

      const { data, error } = await supabase.rpc("get_pulse_trend_data", {
        p_company_id: effectiveCompanyId,
        p_months_back: monthsBack,
      });

      if (error) throw error;
      return data as TrendData[];
    },
    enabled: !!effectiveCompanyId,
  });
}

// Hook: Histórico de campanhas do colaborador
export function useMyCampaignHistory() {
  return useQuery({
    queryKey: ["my-campaign-history"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_pulse_campaign_history");

      if (error) throw error;
      return data as CampaignHistoryItem[];
    },
  });
}

// Hook: Lista de colaboradores com métricas de pulso (admin)
export function usePulseColaboradoresList(department?: string) {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ["pulse-colaboradores-list", effectiveCompanyId, department],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];

      const { data, error } = await supabase.rpc("get_pulse_colaboradores_list", {
        p_company_id: effectiveCompanyId,
        p_department: department || null,
      });

      if (error) throw error;
      return data as PulseColaborador[];
    },
    enabled: !!effectiveCompanyId,
  });
}

// Hook: Histórico de pulso de um colaborador (admin)
export function useEmployeePulseHistory(employeeId: string | null) {
  return useQuery({
    queryKey: ["employee-pulse-history", employeeId],
    queryFn: async () => {
      if (!employeeId) return [];

      const { data, error } = await supabase.rpc("get_employee_pulse_history", {
        p_employee_id: employeeId,
      });

      if (error) throw error;
      return data as EmployeePulseHistory[];
    },
    enabled: !!employeeId,
  });
}

// Mutation: Criar campanha
export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const effectiveCompanyId = useEffectiveCompanyId();

  return useMutation({
    mutationFn: async (campaignData: {
      titulo: string;
      descricao?: string;
      data_inicio: string;
      data_fim: string;
      ativo?: boolean;
      questions: Array<{
        pergunta: string;
        tipo: 'escala_0_5' | 'sim_nao' | 'texto_livre';
        ordem: number;
        obrigatoria: boolean;
      }>;
    }) => {
      if (!effectiveCompanyId) throw new Error("Empresa não selecionada");

      // Criar campanha
      const { data: campaign, error: campaignError } = await supabase
        .from("pulse_campaigns")
        .insert({
          company_id: effectiveCompanyId,
          titulo: campaignData.titulo,
          descricao: campaignData.descricao || null,
          data_inicio: campaignData.data_inicio,
          data_fim: campaignData.data_fim,
          ativo: campaignData.ativo ?? true,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Criar perguntas
      if (campaignData.questions.length > 0) {
        const questionsToInsert = campaignData.questions.map((q) => ({
          campaign_id: campaign.id,
          pergunta: q.pergunta,
          tipo: q.tipo,
          ordem: q.ordem,
          obrigatoria: q.obrigatoria,
        }));

        const { error: questionsError } = await supabase
          .from("pulse_questions")
          .insert(questionsToInsert);

        if (questionsError) throw questionsError;
      }

      return campaign;
    },
    onSuccess: () => {
      toast.success("Campanha criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["pulse-campaigns"] });
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar campanha");
    },
  });
}

// Mutation: Atualizar campanha
export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<PulseCampaign> & { id: string; questions?: PulseQuestion[] }) => {
      const { questions, ...campaignUpdates } = updates;

      // Atualizar campanha
      const { error: campaignError } = await supabase
        .from("pulse_campaigns")
        .update(campaignUpdates)
        .eq("id", id);

      if (campaignError) throw campaignError;

      // Se tiver perguntas para atualizar, deletar e reinserir
      if (questions) {
        // Deletar perguntas antigas
        await supabase.from("pulse_questions").delete().eq("campaign_id", id);

        // Inserir novas perguntas
        if (questions.length > 0) {
          const questionsToInsert = questions.map((q, index) => ({
            campaign_id: id,
            pergunta: q.pergunta,
            tipo: q.tipo,
            ordem: index,
            obrigatoria: q.obrigatoria,
          }));

          const { error: questionsError } = await supabase
            .from("pulse_questions")
            .insert(questionsToInsert);

          if (questionsError) throw questionsError;
        }
      }

      return { id };
    },
    onSuccess: () => {
      toast.success("Campanha atualizada!");
      queryClient.invalidateQueries({ queryKey: ["pulse-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-questions"] });
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar campanha");
    },
  });
}

// Mutation: Deletar campanha
export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pulse_campaigns").delete().eq("id", id);
      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      toast.success("Campanha excluída!");
      queryClient.invalidateQueries({ queryKey: ["pulse-campaigns"] });
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir campanha");
    },
  });
}

// Mutation: Toggle ativo
export function useToggleCampaignActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("pulse_campaigns")
        .update({ ativo })
        .eq("id", id);

      if (error) throw error;
      return { id, ativo };
    },
    onSuccess: (data) => {
      toast.success(data.ativo ? "Campanha ativada!" : "Campanha desativada!");
      queryClient.invalidateQueries({ queryKey: ["pulse-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["active-pulse-campaign"] });
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao alterar status");
    },
  });
}

// Mutation: Submeter respostas da campanha
export function useSubmitCampaignResponses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      responses,
      comentario,
      esfera,
    }: {
      campaignId: string;
      responses: Array<{ question_id: string; resposta: string }>;
      comentario?: string;
      esfera?: "pessoal" | "trabalho" | null;
    }) => {
      const { data, error } = await supabase.rpc("submit_pulse_campaign_response", {
        p_campaign_id: campaignId,
        p_responses: responses,
        p_comentario: comentario || null,
        p_esfera: esfera ?? null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Obrigado por compartilhar seu sentimento!");
      queryClient.invalidateQueries({ queryKey: ["active-pulse-campaign"] });
      queryClient.invalidateQueries({ queryKey: ["my-campaign-history"] });
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao enviar respostas");
    },
  });
}
