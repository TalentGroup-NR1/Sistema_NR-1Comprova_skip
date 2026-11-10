import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";

export type ResponsavelRH = {
  id: string;       // colaboradores.id — coluna referenciada pela FK pgr_plano_acao.responsavel_id
  full_name: string;
};

/**
 * Lista todos os colaboradores ATIVOS do tenant para atribuição como responsável
 * em ações do plano PGR. Usa colaboradores.id (PK) como value — alinhado com a
 * FK `pgr_plano_acao.responsavel_id REFERENCES public.colaboradores(id)`.
 * A RLS de colaboradores isola por company_id — nunca vaza dados de outros tenants.
 */
export function useResponsaveisRH() {
  const companyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ["planos-acao-nr1", "responsaveis", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<ResponsavelRH[]> => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, full_name")
        .eq("company_id", companyId!)
        .eq("status", "ATIVO")   // enum colaborador_status: ATIVO | FERIAS | DESLIGADO | LICENCA
        .order("full_name");

      if (error) throw error;

      return (data ?? []).map((c: any) => ({
        id: c.id as string,
        full_name: (c.full_name as string) || "Colaborador",
      }));
    },
  });
}
