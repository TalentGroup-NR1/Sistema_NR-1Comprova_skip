import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExecutiveReportData {
  headcount: {
    ativos: number;
    desligados: number;
    ferias: number;
    licenca: number;
    total: number;
  };
  admissoes_mes: Array<{ ano?: number; mes: number; total: number }>;
  desligamentos_mes: Array<{ ano?: number; mes: number; total: number }>;
  departamentos: Array<{ departamento: string; total: number }>;
  gestor_interno: Array<{ gestor: string; total: number }>;
  demografia_sexo: Array<{ sexo: string; total: number }>;
  demografia_raca: Array<{ raca: string; total: number }>;
  faixas_etarias: Array<{ faixa: string; total: number }>;
  geografia: Array<{ estado: string; total: number }>;
  tempo_casa: Array<{ faixa: string; total: number }>;
  cargos_niveis: Array<{ cargo: string; nivel: string; total: number }>;
  escolaridade: Array<{ nivel: string; total: number }>;
  feedback: {
    total: number;
    concluidos: number;
    por_milestone: Array<{ milestone_type: string; total: number }> | null;
  };
  avaliacoes: {
    ciclos_total: number;
    avaliacoes_total: number;
    autoavaliacoes_concluidas: number;
    avaliacoes_gestor_concluidas: number;
  };
  pdis: {
    total: number;
    em_andamento: number;
    concluidos: number;
    rascunho: number;
  };
  treinamentos: {
    concluidos: number;
    certificados: number;
  };
  promocoes: {
    total: number;
  };
  promocoes_detalhadas: Array<{
    nome_colaborador: string;
    cargo_anterior: string;
    nivel_anterior: string;
    cargo_novo: string;
    nivel_novo: string;
    data_promocao: string;
  }>;
  desligamentos_detalhados: Array<{
    nome_colaborador: string;
    cargo: string;
    nivel: string;
    data_admissao: string;
    data_desligamento: string;
    tipo_desligamento: string;
    motivo_desligamento: string;
  }>;
  diario_bordo_resultados: Array<{
    nome_colaborador: string;
    milestone_type: string;
    media_colaborador: number | null;
    media_gestor: number | null;
  }>;
  feedbacks_alertas: Array<{
    departamento: string;
    total_feedbacks: number;
    total_alertas: number;
    colaboradores: Array<{
      nome: string;
      cargo: string;
      data_feedback: string;
      alerta: boolean;
    }>;
  }>;
  feedbacks_detalhados: Array<{
    nome_colaborador: string;
    data_feedback: string;
    assunto: string;
    detalhes_conversa: string;
  }>;
}

export function useExecutiveReport(companyId: string | null, year: number | null, departamento?: string | null) {
  return useQuery({
    queryKey: ["executive-report", companyId, year, departamento],
    queryFn: async () => {
      if (!companyId || year === null || year === undefined) throw new Error("Missing params");
      
      const params: Record<string, unknown> = {
        p_company_id: companyId,
        p_year: year,
      };
      if (departamento) {
        params.p_departamento = departamento;
      }

      const { data, error } = await supabase.rpc("get_executive_report_data", params as any);

      if (error) throw error;
      return data as unknown as ExecutiveReportData;
    },
    enabled: !!companyId && year !== null && year !== undefined,
  });
}

export function useDepartamentoOptions(companyId: string | null) {
  return useQuery({
    queryKey: ["departamento-options", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("colaboradores")
        .select("department")
        .eq("company_id", companyId)
        .not("department", "is", null)
        .not("department", "eq", "");
      if (error) throw error;
      const unique = [...new Set(data.map(d => d.department).filter(Boolean))] as string[];
      return unique.sort();
    },
    enabled: !!companyId,
  });
}

