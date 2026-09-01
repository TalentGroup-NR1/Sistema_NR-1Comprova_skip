import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Retorna o regime de ponto do colaborador logado.
 * isBancoHoras=true => regime Banco de Horas (compensável)
 * isBancoHoras=false => regime Horas Extras (positivas pagas, negativas descontadas — não se compensam)
 */
export function useMeuRegimePonto() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["meu-regime-ponto", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("colaboradores")
        .select("is_banco_horas")
        .eq("user_id", user.id)
        .eq("status", "ATIVO")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  return {
    isBancoHoras: query.data?.is_banco_horas ?? true,
    isLoading: query.isLoading,
  };
}
