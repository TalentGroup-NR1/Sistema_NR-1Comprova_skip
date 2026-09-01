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
  gestao_tecnica: Array<{ gestor: string; total: number }>;
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
    gestao_tecnica: string;
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

export function useExecutiveReport(companyId: string | null, year: number | null, gestaoTecnica?: string | null, empresaCliente?: string | null) {
  return useQuery({
    queryKey: ["executive-report", companyId, year, gestaoTecnica, empresaCliente],
    queryFn: async () => {
      if (!companyId || year === null || year === undefined) throw new Error("Missing params");
      
      const params: Record<string, unknown> = {
        p_company_id: companyId,
        p_year: year,
      };
      if (gestaoTecnica) {
        params.p_gestao_tecnica = gestaoTecnica;
      }
      if (empresaCliente) {
        params.p_empresa_cliente = empresaCliente;
      }

      const { data, error } = await supabase.rpc("get_executive_report_data", params as any);

      if (error) throw error;
      return data as unknown as ExecutiveReportData;
    },
    enabled: !!companyId && year !== null && year !== undefined,
  });
}

export function useGestaoTecnicaOptions(companyId: string | null) {
  return useQuery({
    queryKey: ["gestao-tecnica-options", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("colaboradores")
        .select("gestao_tecnica")
        .eq("company_id", companyId)
        .not("gestao_tecnica", "is", null)
        .not("gestao_tecnica", "eq", "");
      if (error) throw error;
      const unique = [...new Set(data.map(d => d.gestao_tecnica).filter(Boolean))] as string[];
      return unique.sort();
    },
    enabled: !!companyId,
  });
}

export function useEmpresasClienteOptions(companyId: string | null) {
  return useQuery({
    queryKey: ["empresas-cliente-options", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("colaboradores")
        .select("empresa_cliente")
        .eq("company_id", companyId)
        .not("empresa_cliente", "is", null)
        .not("empresa_cliente", "eq", "");
      if (error) throw error;
      const unique = [...new Set(data.map((d: any) => d.empresa_cliente).filter(Boolean))] as string[];
      return unique.sort();
    },
    enabled: !!companyId,
  });
}

