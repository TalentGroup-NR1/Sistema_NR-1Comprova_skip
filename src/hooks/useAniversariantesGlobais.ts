import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useEffectiveCompanyId } from "./useEffectiveCompanyId";

export interface AniversarianteGlobal {
  id: string;
  nome: string;
  dia: number;
  tipo: "nascimento" | "empresa";
  anos_empresa: number | null;
  cliente_alocado: string | null;
  avatar_url: string | null;
}

export function useAniversariantesGlobais() {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ["aniversariantes-globais-mes", effectiveCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_aniversariantes_globais_mes", {
        p_company_id: effectiveCompanyId || null
      });
      if (error) throw error;
      const rows = (data ?? []) as AniversarianteGlobal[];
      return {
        nascimentos: rows.filter((r) => r.tipo === "nascimento").sort((a, b) => a.dia - b.dia),
        empresa: rows.filter((r) => r.tipo === "empresa").sort((a, b) => a.dia - b.dia),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
