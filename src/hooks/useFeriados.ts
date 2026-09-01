import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";
import { toast } from "sonner";

export interface Feriado {
  id: string;
  company_id: string | null;
  data: string; // yyyy-MM-dd
  nome: string;
  tipo: "NACIONAL" | "ESTADUAL" | "MUNICIPAL" | "EMPRESA";
  uf: string | null;
  recorrente: boolean;
  created_at: string;
}

/**
 * Fetch all feriados (globais + da empresa) e expande os recorrentes para o ano dado.
 * Retorna lista bruta + helper Set<yyyy-MM-dd> indexado por data efetiva.
 */
export function useFeriados(year?: number) {
  const companyId = useEffectiveCompanyId();
  const targetYear = year ?? new Date().getFullYear();

  const query = useQuery({
    queryKey: ["feriados", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feriados" as any)
        .select("*")
        .order("data", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Feriado[];
    },
  });

  // Build map: yyyy-MM-dd -> Feriado (expanding recorrentes para o ano)
  const feriadosMap = new Map<string, Feriado>();
  for (const f of query.data || []) {
    if (f.recorrente) {
      // expande para targetYear e ±2 anos para suportar relatórios
      for (const y of [targetYear - 1, targetYear, targetYear + 1]) {
        const md = f.data.substring(5); // MM-DD
        feriadosMap.set(`${y}-${md}`, f);
      }
    } else {
      feriadosMap.set(f.data, f);
    }
  }

  return {
    feriados: query.data || [],
    feriadosMap,
    isLoading: query.isLoading,
  };
}

export function useFeriadoMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async (input: Omit<Feriado, "id" | "created_at">) => {
      const { error } = await supabase.from("feriados" as any).insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feriados"] });
      toast.success("Feriado adicionado");
    },
    onError: (e: any) => toast.error("Erro ao adicionar feriado: " + e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feriados" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feriados"] });
      toast.success("Feriado removido");
    },
    onError: (e: any) => toast.error("Erro ao remover feriado: " + e.message),
  });

  return { create, remove };
}
