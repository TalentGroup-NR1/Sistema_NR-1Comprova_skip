import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/** Vínculos que dão acesso ao módulo Ponto Eletrônico (Onda 6.3). */
export const VINCULOS_PONTO = ["CLT", "Estágio", "Aprendiz", "Temporário"] as const;

/**
 * Verifica se o usuário logado pode acessar o módulo de Ponto.
 * Admins (admin_master, admin_empresa, analista_rh, gestor_departamento) sempre podem.
 * Colaboradores só com vínculo CLT/Estágio/Aprendiz/Temporário.
 */
export function usePodeAcessarPonto() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pode-acessar-ponto", user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc("pode_acessar_modulo_ponto");
      if (error) {
        console.error("pode_acessar_modulo_ponto error", error);
        return false;
      }
      return Boolean(data);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });
}
