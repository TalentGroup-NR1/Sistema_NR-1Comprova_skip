import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePontoConfig } from "./usePontoConfig";

export interface CicloConfigResolvido {
  periodo_fechamento_banco: string;
  banco_horas_inicio: string | null;
  origem: "colaborador" | "empresa_padrao" | "empresa_config" | "fallback";
  perfil_nome?: string | null;
}

/**
 * Resolve a configuração de ciclo de banco de horas para um colaborador:
 * 1) Perfil vinculado ao colaborador (banco_horas_perfil_id)
 * 2) Perfil "padrão" da empresa
 * 3) Fallback: ponto_configuracoes (retrocompatível)
 */
export function useBancoHorasCicloResolvido(colaboradorId: string | undefined | null) {
  const { config } = usePontoConfig();

  const query = useQuery({
    queryKey: ["banco-horas-ciclo-resolvido", colaboradorId],
    queryFn: async (): Promise<CicloConfigResolvido | null> => {
      if (!colaboradorId) return null;
      const { data: colab, error } = await supabase
        .from("colaboradores")
        .select("banco_horas_perfil_id, company_id")
        .eq("id", colaboradorId)
        .maybeSingle();
      if (error) throw error;
      if (!colab) return null;

      const perfilId = (colab as any).banco_horas_perfil_id as string | null;

      // 1) Perfil do colaborador
      if (perfilId) {
        const { data: perfil } = await supabase
          .from("banco_horas_perfis" as any)
          .select("nome, periodo_fechamento_banco, banco_horas_inicio")
          .eq("id", perfilId)
          .maybeSingle();
        if (perfil) {
          const p = perfil as any;
          return {
            periodo_fechamento_banco: p.periodo_fechamento_banco,
            banco_horas_inicio: p.banco_horas_inicio,
            origem: "colaborador",
            perfil_nome: p.nome,
          };
        }
      }

      // 2) Padrão da empresa
      const { data: padrao } = await supabase
        .from("banco_horas_perfis" as any)
        .select("nome, periodo_fechamento_banco, banco_horas_inicio")
        .eq("company_id", (colab as any).company_id)
        .eq("is_padrao", true)
        .maybeSingle();
      if (padrao) {
        const p = padrao as any;
        return {
          periodo_fechamento_banco: p.periodo_fechamento_banco,
          banco_horas_inicio: p.banco_horas_inicio,
          origem: "empresa_padrao",
          perfil_nome: p.nome,
        };
      }

      // 3) Fallback ponto_configuracoes
      return null;
    },
    enabled: !!colaboradorId,
    staleTime: 60_000,
  });

  // Fallback final: config da empresa em ponto_configuracoes
  const resolvido: { periodo_fechamento_banco: string; banco_horas_inicio: string | null; perfil_nome?: string | null } =
    query.data
      ? query.data
      : {
          periodo_fechamento_banco:
            (config as any)?.periodo_fechamento_banco || "quadrimestral",
          banco_horas_inicio: (config as any)?.banco_horas_inicio ?? null,
          perfil_nome: null,
        };

  return {
    ciclo: resolvido,
    isLoading: query.isLoading,
  };
}
