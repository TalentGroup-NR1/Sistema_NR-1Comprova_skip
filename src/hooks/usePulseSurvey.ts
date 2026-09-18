import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";
import { toast } from "sonner";

// Tipos
export interface PulseSurvey {
  id: string;
  company_id: string;
  employee_id: string;
  score: number;
  comment: string | null;
  week_number: number;
  year: number;
  created_at: string;
}

export interface PulseWeekData {
  week_number: number;
  year: number;
  total_responses: number;
  avg_score: number;
  score_0: number;
  score_1: number;
  score_2: number;
  score_3: number;
  score_4: number;
  score_5: number;
  comments_count: number;
}

export interface PulseComment {
  score: number;
  comment: string;
  created_at: string;
}

export interface PendingRespondent {
  colaborador_id: string;
  full_name: string;
  corporate_email: string;
}

// Constantes
export const EMOJI_SCALE = [
  { score: 0, emoji: '😢', label: 'Muito Mal', color: 'bg-red-100 border-red-400 hover:bg-red-200', textColor: 'text-red-700' },
  { score: 1, emoji: '😟', label: 'Mal', color: 'bg-orange-100 border-orange-400 hover:bg-orange-200', textColor: 'text-orange-700' },
  { score: 2, emoji: '😐', label: 'Regular', color: 'bg-yellow-100 border-yellow-400 hover:bg-yellow-200', textColor: 'text-yellow-700' },
  { score: 3, emoji: '🙂', label: 'Bem', color: 'bg-lime-100 border-lime-400 hover:bg-lime-200', textColor: 'text-lime-700' },
  { score: 4, emoji: '😊', label: 'Muito Bem', color: 'bg-green-100 border-green-400 hover:bg-green-200', textColor: 'text-green-700' },
  { score: 5, emoji: '🤩', label: 'Excelente', color: 'bg-emerald-100 border-emerald-400 hover:bg-emerald-200', textColor: 'text-emerald-700' },
] as const;

// Helpers
export function getCurrentWeekInfo() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return {
    weekNumber,
    year: now.getFullYear(),
    isFriday: now.getDay() === 5,
  };
}

// Hook: Status do pulso do colaborador atual
export function useMyPulseStatus() {
  return useQuery({
    queryKey: ["my-pulse-status"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Buscar colaborador do usuário
      const { data: colaborador } = await supabase
        .from("colaboradores")
        .select("id, company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!colaborador) return null;

      const { weekNumber, year } = getCurrentWeekInfo();

      // Verificar se já respondeu esta semana
      const { data: pulse } = await supabase
        .from("pulse_surveys")
        .select("*")
        .eq("employee_id", colaborador.id)
        .eq("week_number", weekNumber)
        .eq("year", year)
        .maybeSingle();

      return {
        colaboradorId: colaborador.id,
        companyId: colaborador.company_id,
        hasResponded: !!pulse,
        lastResponse: pulse,
        currentWeek: weekNumber,
        currentYear: year,
      };
    },
  });
}

// Hook: Dashboard de pulso (admin)
export function usePulseDashboard(year?: number, weeksBack: number = 8) {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ["pulse-dashboard", effectiveCompanyId, year, weeksBack],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;

      const { data, error } = await supabase.rpc("get_pulse_dashboard", {
        p_company_id: effectiveCompanyId,
        p_year: year || new Date().getFullYear(),
        p_weeks_back: weeksBack,
      });

      if (error) throw error;
      return data as PulseWeekData[];
    },
    enabled: !!effectiveCompanyId,
  });
}

// Hook: Comentários anônimos
export function usePulseComments(year?: number, weekNumber?: number) {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ["pulse-comments", effectiveCompanyId, year, weekNumber],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];

      const { data, error } = await supabase.rpc("get_pulse_comments", {
        p_company_id: effectiveCompanyId,
        p_year: year || new Date().getFullYear(),
        p_week_number: weekNumber || null,
      });

      if (error) throw error;
      return data as PulseComment[];
    },
    enabled: !!effectiveCompanyId,
  });
}

// Hook: Colaboradores pendentes (para lembrete)
export function usePendingPulseRespondents() {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ["pending-pulse-respondents", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];

      const { data, error } = await supabase.rpc("get_pending_pulse_respondents", {
        p_company_id: effectiveCompanyId,
      });

      if (error) throw error;
      return data as PendingRespondent[];
    },
    enabled: !!effectiveCompanyId,
  });
}

// Hook: Total de colaboradores ativos
export function useTotalColaboradores() {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ["total-colaboradores-ativos", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return 0;

      const { count, error } = await supabase
        .from("colaboradores")
        .select("*", { count: "exact", head: true })
        .eq("company_id", effectiveCompanyId)
        .eq("status", "ATIVO");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!effectiveCompanyId,
  });
}

// Mutation: Submeter pulso
export function useSubmitPulse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      colaboradorId,
      companyId,
      score,
      comment,
      // esfera é aceita na assinatura (consistência com PulsoSemanaModal)
      // mas não gravada — pulse_surveys é fluxo legado sem a coluna
      esfera: _esfera,
    }: {
      colaboradorId: string;
      companyId: string;
      score: number;
      comment?: string;
      esfera?: "pessoal" | "trabalho" | null;
    }) => {
      const { weekNumber, year } = getCurrentWeekInfo();

      const { data, error } = await supabase
        .from("pulse_surveys")
        .insert({
          company_id: companyId,
          employee_id: colaboradorId,
          score,
          comment: comment || null,
          week_number: weekNumber,
          year,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Você já respondeu o pulso desta semana.");
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Obrigado por compartilhar seu sentimento!");
      queryClient.invalidateQueries({ queryKey: ["my-pulse-status"] });
      queryClient.invalidateQueries({ queryKey: ["pulse-dashboard"] });
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao enviar resposta");
    },
  });
}

// Hook: Histórico de pulsos do colaborador atual
export function useMyPulseHistory() {
  return useQuery({
    queryKey: ["my-pulse-history"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: colaborador } = await supabase
        .from("colaboradores")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!colaborador) return [];

      const { data, error } = await supabase
        .from("pulse_surveys")
        .select("score, week_number, year, created_at")
        .eq("employee_id", colaborador.id)
        .order("year", { ascending: false })
        .order("week_number", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });
}
