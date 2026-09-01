import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  return useQuery({
    queryKey: ["aniversariantes-globais-mes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_aniversariantes_globais_mes");
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
