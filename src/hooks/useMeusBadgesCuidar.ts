import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface BadgeRow {
  id: string;
  badge_tipo: string;
  badge_label: string;
  badge_descricao: string;
  score: number | null;
  ano: number | null;
  semana_iso: number | null;
  created_at: string;
}

/** Últimos 4 badges do usuário corrente. */
export function useMeusBadgesCuidar(limit = 4) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["meus-badges-cuidar", user?.id, limit],
    queryFn: async (): Promise<BadgeRow[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("cuidar_badges")
        .select("id,badge_tipo,badge_label,badge_descricao,score,ano,semana_iso,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as BadgeRow[];
    },
    enabled: !!user?.id,
  });
}
