import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SavedReport {
  id: string;
  company_id: string;
  ano: number;
  parecer_html: string;
  created_at: string;
  updated_at: string;
}

export function useSavedExecutiveReport(companyId: string | null, ano: number | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["saved-executive-report", companyId, ano],
    queryFn: async () => {
      if (!companyId || ano === null || ano === undefined) return null;
      const { data, error } = await supabase
        .from("relatorios_executivos_salvos")
        .select("*")
        .eq("company_id", companyId)
        .eq("ano", ano)
        .maybeSingle();
      if (error) throw error;
      return data as SavedReport | null;
    },
    enabled: !!companyId && ano !== null && ano !== undefined,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ companyId, ano, parecerHtml }: { companyId: string; ano: number; parecerHtml: string }) => {
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("relatorios_executivos_salvos")
        .upsert(
          { company_id: companyId, ano, parecer_html: parecerHtml, criado_por_user_id: user.id },
          { onConflict: "company_id,ano" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-executive-report"] });
      toast.success("Relatório salvo com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao salvar relatório.");
    },
  });

  return { savedReport: query.data, isLoadingSaved: query.isLoading, save: saveMutation.mutate, isSaving: saveMutation.isPending };
}
