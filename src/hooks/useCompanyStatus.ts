import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CompanyLifecycleStatus = 'ativa' | 'suspensa' | 'encerrada';

export function useCompanyStatus(companyId: string | null | undefined) {
  return useQuery({
    queryKey: ["company-lifecycle-status", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<CompanyLifecycleStatus | null> => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("status")
        .eq("id", companyId)
        .maybeSingle();

      if (error) {
        console.warn("[useCompanyStatus] Erro ao buscar status:", error.message);
        return null;
      }
      return (data?.status as CompanyLifecycleStatus) ?? null;
    },
    staleTime: 1000 * 30, // 30s
  });
}

