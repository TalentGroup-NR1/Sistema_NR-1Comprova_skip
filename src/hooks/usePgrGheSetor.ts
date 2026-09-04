import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { toast } from "sonner";

export interface PgrGheSetor {
  id: string;
  company_id: string;
  ghe_id: string;
  departamento: string;
}

export function usePgrGheSetorMapping() {
  const companyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ["pgr-ghe-setor", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pgr_ghe_setor")
        .select("*")
        .eq("company_id", companyId);
      
      if (error) {
        console.error("Erro ao buscar mapeamento GHE vs Setor:", error);
        throw error;
      }
      return (data || []) as PgrGheSetor[];
    },
  });
}

export function useSavePgrGheSetorMapping() {
  const qc = useQueryClient();
  const companyId = useEffectiveCompanyId();

  return useMutation({
    mutationFn: async ({ gheId, departamento }: { gheId: string; departamento: string }) => {
      if (!companyId) throw new Error("Empresa não selecionada");

      // Check if mapping exists
      const { data: existing } = await supabase
        .from("pgr_ghe_setor")
        .select("id")
        .eq("company_id", companyId)
        .eq("ghe_id", gheId)
        .maybeSingle();

      if (existing) {
        // Update
        const { error } = await supabase
          .from("pgr_ghe_setor")
          .update({ departamento })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from("pgr_ghe_setor")
          .insert({
            company_id: companyId,
            ghe_id: gheId,
            departamento,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pgr-ghe-setor"] });
      toast.success("Mapeamento GHE x Setor salvo com sucesso!");
    },
    onError: (e: any) => {
      toast.error(e?.message || "Erro ao salvar mapeamento");
    }
  });
}

export function useDeletePgrGheSetorMapping() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pgr_ghe_setor")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pgr-ghe-setor"] });
      toast.success("Mapeamento removido!");
    }
  });
}
