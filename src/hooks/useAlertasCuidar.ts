import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";

export interface AlertaRow {
  id: string;
  user_id: string | null;
  company_id: string | null;
  departamento: string | null;
  ano: number | null;
  semana_iso: number | null;
  severidade: "baixo" | "moderado" | "alto";
  tipo: "individual" | "coletivo";
  gatilho: string;
  mensagem: string;
  status: "aberto" | "em_acao" | "resolvido" | "descartado";
  acao_registrada: string | null;
  acao_em: string | null;
  created_at: string;
  colaborador_nome?: string | null;
}

export interface AlertaFiltros {
  severidade?: AlertaRow["severidade"];
  status?: AlertaRow["status"];
}

export function useAlertasCuidar(filtros: AlertaFiltros = {}) {
  const companyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ["cuidar-alertas", companyId, filtros],
    queryFn: async (): Promise<AlertaRow[]> => {
      let q = supabase
        .from("cuidar_alertas")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (companyId) q = q.eq("company_id", companyId);
      if (filtros.severidade) q = q.eq("severidade", filtros.severidade);
      if (filtros.status) q = q.eq("status", filtros.status);

      const { data, error } = await q;
      if (error) throw error;
      const rows = (data || []) as AlertaRow[];

      // Hidrata nome do colaborador para alertas individuais
      const userIds = Array.from(
        new Set(rows.filter((r) => r.user_id).map((r) => r.user_id as string))
      );
      if (userIds.length) {
        const { data: colabs } = await supabase
          .from("colaboradores")
          .select("user_id, nome_completo")
          .in("user_id", userIds);
        const map = new Map((colabs || []).map((c: any) => [c.user_id, c.nome_completo]));
        rows.forEach((r) => {
          if (r.user_id) r.colaborador_nome = map.get(r.user_id) ?? null;
        });
      }
      return rows;
    },
    enabled: !!companyId,
  });
}
