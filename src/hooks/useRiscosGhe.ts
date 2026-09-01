import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import type { CategoriaRisco } from "@/lib/matrizRisco";

export interface RiscoGhe {
  id: string;
  ghe_id: string;
  risco_id: string | null;
  nome_risco: string;
  categoria: CategoriaRisco;
  probabilidade: number;
  severidade: number;
  nivel_risco: number;
  fonte: "manual" | "automatico" | "psicossocial";
  origem_dados: string | null;
  descricao: string | null;
  controles_existentes: string | null;
  ghe_nome?: string;
  ghe_codigo?: string | null;
  created_at?: string;
}

export interface RiscoInput {
  id?: string;
  risco_id?: string | null;
  nome_risco: string;
  categoria: CategoriaRisco;
  probabilidade: number;
  severidade: number;
  fonte?: string;
  origem_dados?: string | null;
  descricao?: string | null;
  controles_existentes?: string | null;
}

export function useRiscosGhe(gheId: string | null) {
  return useQuery({
    queryKey: ["nr1-riscos-ghe", gheId],
    enabled: !!gheId,
    queryFn: async (): Promise<RiscoGhe[]> => {
      const { data, error } = await supabase.rpc("nr1_get_matriz_por_ghe" as never, {
        p_ghe_id: gheId as string,
      } as never);
      if (error) throw error;
      return (data ?? []) as unknown as RiscoGhe[];
    },
  });
}

export function useMatrizEmpresa() {
  const companyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ["nr1-matriz", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("nr1_get_matriz" as never, {
        p_company_id: companyId,
      } as never);
      if (error) throw error;
      return (data ?? []) as unknown as {
        ghe_id: string;
        ghe_nome: string;
        ghe_codigo: string | null;
        riscos: RiscoGhe[];
      }[];
    },
  });
}

export function useSalvarRiscoGhe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ gheId, risco }: { gheId: string; risco: RiscoInput }) => {
      const { data, error } = await supabase.rpc("nr1_save_risco_ghe" as never, {
        p_ghe_id: gheId,
        p_risco_data: risco,
      } as never);
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nr1-riscos-ghe"] });
      qc.invalidateQueries({ queryKey: ["nr1-matriz"] });
    },
  });
}

export function useExcluirRiscoGhe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (riscoId: string) => {
      const { error } = await supabase.rpc("nr1_delete_risco_ghe" as never, {
        p_risco_id: riscoId,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nr1-riscos-ghe"] });
      qc.invalidateQueries({ queryKey: ["nr1-matriz"] });
    },
  });
}

export interface CatalogoRisco {
  id: string;
  nome: string;
  categoria: CategoriaRisco;
  descricao: string | null;
  medidas_controle: string | null;
}

/** Catálogo de riscos (fábrica + da empresa) para autocomplete no formulário. */
export function useCatalogoRiscos() {
  return useQuery({
    queryKey: ["nr1-catalogo-riscos"],
    queryFn: async (): Promise<CatalogoRisco[]> => {
      const { data, error } = await (supabase as any)
        .from("nr1_riscos_catalogo")
        .select("id,nome,categoria,descricao,medidas_controle")
        .eq("ativo", true)
        .order("categoria");
      if (error) throw error;
      return (data ?? []) as CatalogoRisco[];
    },
  });
}
