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
    enabled: Boolean(effectiveCompanyId),
    queryFn: async () => {
      if (!effectiveCompanyId) {
        return { nascimentos: [], empresa: [] };
      }

      const { data, error } = await supabase.rpc("get_aniversariantes_globais_mes", {
        p_company_id: effectiveCompanyId,
      });

      if (error) throw error;
      const rows = (data ?? []) as AniversarianteGlobal[];

      // Deduplicação estrita por id
      const uniqueRows = rows.filter((item, index, self) =>
        index === self.findIndex((r) => r.id === item.id)
      );

      return {
        nascimentos: uniqueRows.filter((r) => r.tipo === "nascimento").sort((a, b) => a.dia - b.dia),
        empresa: uniqueRows.filter((r) => r.tipo === "empresa").sort((a, b) => a.dia - b.dia),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
