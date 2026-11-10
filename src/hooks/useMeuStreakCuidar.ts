import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface MeuStreakRow {
  user_id: string;
  streak_semanal: number;
  best_streak: number;
  ultima_semana_respondida: number | null;
  ultimo_ano_respondido: number | null;
}

export function useMeuStreakCuidar() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["cuidar-progressao", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<MeuStreakRow | null> => {
      const { data, error } = await supabase
        .from("cuidar_progressao")
        .select("user_id, streak_semanal, best_streak, ultima_semana_respondida, ultimo_ano_respondido")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as MeuStreakRow | null;
    },
  });
}
