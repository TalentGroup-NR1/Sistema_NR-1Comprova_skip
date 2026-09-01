import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";

export type ResponsavelRH = {
  user_id: string;
  full_name: string;
  role: string;
};

/**
 * Lista usuários elegíveis a serem "Responsáveis pela Execução" de um plano de ação NR-1.
 * Apenas admin_empresa e analista_rh da empresa atual (conforme decisão do produto).
 */
export function useResponsaveisRH() {
  const companyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ["planos-acao-nr1", "responsaveis", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<ResponsavelRH[]> => {
      const { data: profs, error: e1 } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("company_id", companyId!)
        .eq("is_active", true);
      if (e1) throw e1;
      const userIds = (profs ?? []).map((p: any) => p.user_id);
      if (userIds.length === 0) return [];

      const { data: roles, error: e2 } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds)
        .in("role", ["admin_empresa", "analista_rh"]);
      if (e2) throw e2;

      const profMap = new Map((profs ?? []).map((p: any) => [p.user_id, p.full_name]));
      const seen = new Set<string>();
      const out: ResponsavelRH[] = [];
      for (const r of roles ?? []) {
        if (seen.has(r.user_id)) continue;
        seen.add(r.user_id);
        out.push({
          user_id: r.user_id,
          full_name: (profMap.get(r.user_id) as string) || "Usuário",
          role: r.role,
        });
      }
      out.sort((a, b) => a.full_name.localeCompare(b.full_name));
      return out;
    },
  });
}
