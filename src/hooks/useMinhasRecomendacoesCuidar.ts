import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface RecomendacaoRow {
  id: string;
  recomendacao: string;
  tipo: string;
  score: number | null;
  ano: number | null;
  semana_iso: number | null;
  created_at: string;
}

/** Últimas recomendações pessoais do colaborador (contexto = colaborador). */
export function useMinhasRecomendacoesCuidar(limit = 5) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["minhas-recomendacoes-cuidar", user?.id, limit],
    queryFn: async (): Promise<RecomendacaoRow[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("cuidar_recomendacoes")
        .select("id,recomendacao,tipo,score,ano,semana_iso,created_at")
        .eq("user_id", user.id)
        .eq("contexto", "colaborador")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as RecomendacaoRow[];
    },
    enabled: !!user?.id,
  });
}
