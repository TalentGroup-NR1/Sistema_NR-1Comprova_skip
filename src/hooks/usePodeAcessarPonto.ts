import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/** Vínculos canônicos que dão acesso ao módulo Ponto Eletrônico. */
export const VINCULOS_PONTO = ["CLT", "Estágio", "Aprendiz", "Temporário"] as const;

export interface PodeAcessarPontoResult {
  podeAcessar: boolean;
  regimeNaoDefinido: boolean;
  contractType: string | null;
}

/**
 * Normaliza o tipo de contrato removendo espaços, acentos e convertendo para maiúsculo.
 */
export function normalizarTipoContrato(tipo?: string | null): string {
  if (!tipo) return "";
  return tipo
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

/**
 * Verifica se o usuário logado pode acessar o módulo de Ponto.
 * - Admins (admin_master, admin_empresa, analista_rh, gestor_departamento) sempre podem.
 * - Colaboradores só com vínculo CLT/Estágio/Aprendiz/Temporário (comparação tolerante).
 * - Retorna regimeNaoDefinido: true se o campo contract_type estiver vazio/NULL.
 */
export function usePodeAcessarPonto() {
  const { user, role } = useAuth();
  const isAdmin = role && ["admin_master", "admin_empresa", "analista_rh", "gestor_departamento"].includes(role);

  return useQuery({
    queryKey: ["pode-acessar-ponto", user?.id, role],
    queryFn: async (): Promise<PodeAcessarPontoResult> => {
      if (!user?.id) {
        return { podeAcessar: false, regimeNaoDefinido: false, contractType: null };
      }

      // Admins e gestores sempre têm acesso ao módulo de ponto
      if (isAdmin) {
        return { podeAcessar: true, regimeNaoDefinido: false, contractType: "ADMIN" };
      }

      // Consulta o cadastro do colaborador ativo vinculado ao usuário
      const { data: colab, error } = await supabase
        .from("colaboradores")
        .select("id, contract_type, status")
        .eq("user_id", user.id)
        .eq("status", "ATIVO")
        .maybeSingle();

      if (error) {
        console.error("usePodeAcessarPonto: erro ao consultar colaborador:", error);
      }

      // Se não encontrou o colaborador (RLS bloqueou, ou status != ATIVO)
      if (!colab) {
        return {
          podeAcessar: false,
          regimeNaoDefinido: false, // Falso-positivo corrigido: o colaborador não foi encontrado, não é que ele existe sem regime.
          contractType: null,
        };
      }

      const rawContractType = colab.contract_type ? String(colab.contract_type).trim() : null;

      // Se o colaborador foi encontrado, mas não possui contract_type definido no banco (NULL ou vazio)
      if (!rawContractType) {
        return {
          podeAcessar: false,
          regimeNaoDefinido: true,
          contractType: null,
        };
      }

      // Normalização tolerante (trim, maiúsculo, sem acentos)
      const normalized = normalizarTipoContrato(rawContractType);
      const VINCULOS_NORMALIZADOS = ["CLT", "ESTAGIO", "APRENDIZ", "TEMPORARIO"];
      const isElegivel = VINCULOS_NORMALIZADOS.includes(normalized);

      return {
        podeAcessar: isElegivel,
        regimeNaoDefinido: false,
        contractType: rawContractType,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });
}
