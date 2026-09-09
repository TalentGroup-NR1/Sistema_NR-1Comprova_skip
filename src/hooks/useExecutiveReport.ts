import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ExecutiveReportData } from "@/types/executiveReport";

// Re-exporta para manter compatibilidade com imports existentes nos componentes
export type { ExecutiveReportData } from "@/types/executiveReport";



/** Normaliza o JSON bruto da RPC em ExecutiveReportData seguro contra null/undefined */
function normalizeRpcData(raw: any): ExecutiveReportData {
  // Arrays defensivos
  const toArray = (v: any): any[] => (Array.isArray(v) ? v : []);

  // feedback: a RPC retorna array de {gestor, total_feedbacks, total_alertas}
  // Reduzimos para o objeto escalar esperado pelos componentes
  const feedbackArr = toArray(raw.feedback);
  const totalFeedbacks = feedbackArr.reduce((s: number, r: any) => s + (r.total_feedbacks ?? 0), 0);
  const totalAlertas = feedbackArr.reduce((s: number, r: any) => s + (r.total_alertas ?? 0), 0);

  // avaliacoes: a RPC retorna array de {nome_ciclo, total_avaliacoes, concluidas_colab, concluidas_gestor}
  const avalArr = toArray(raw.avaliacoes);
  const ciclosTotal = avalArr.length;
  const avaliacoesTotal = avalArr.reduce((s: number, r: any) => s + (r.total_avaliacoes ?? 0), 0);
  const autoavConcluidas = avalArr.reduce((s: number, r: any) => s + (r.concluidas_colab ?? 0), 0);
  const gestorConcluidas = avalArr.reduce((s: number, r: any) => s + (r.concluidas_gestor ?? 0), 0);

  // pdis: a RPC retorna array de {status, total}
  const pdisArr = toArray(raw.pdis);
  const pdisTotal = pdisArr.reduce((s: number, r: any) => s + (r.total ?? 0), 0);
  const pdisAndamento = pdisArr.find((r: any) => r.status === 'em_andamento')?.total ?? 0;
  const pdisConcluidos = pdisArr.find((r: any) => r.status === 'concluido')?.total ?? 0;
  const pdisRascunho = pdisArr.find((r: any) => r.status === 'rascunho')?.total ?? 0;

  // treinamentos: a RPC retorna array de {status, total}
  const treinArr = toArray(raw.treinamentos);
  const treinConcluidos = treinArr.find((r: any) => r.status === 'concluido')?.total ?? 0;
  const treinCertificados = treinArr.find((r: any) => r.status === 'certificado')?.total ?? 0;

  // promocoes: a RPC retorna array de {ano, total}
  const promArr = toArray(raw.promocoes);
  const promocoesTotal = promArr.reduce((s: number, r: any) => s + (r.total ?? 0), 0);

  // headcount com fallback seguro
  const hc = raw.headcount ?? {};

  return {
    headcount: {
      ativos: hc.ativos ?? 0,
      desligados: hc.desligados ?? 0,
      ferias: hc.ferias ?? 0,
      licenca: hc.licenca ?? 0,
      total: hc.total ?? 0,
    },
    admissoes_mes: toArray(raw.admissoes_mes),
    desligamentos_mes: toArray(raw.desligamentos_mes),
    departamentos: toArray(raw.departamentos),
    gestor_interno: toArray(raw.gestor_interno),
    demografia_sexo: toArray(raw.demografia_sexo),
    demografia_raca: toArray(raw.demografia_raca),
    faixas_etarias: toArray(raw.faixas_etarias),
    geografia: toArray(raw.geografia),
    tempo_casa: toArray(raw.tempo_casa),
    cargos_niveis: toArray(raw.cargos_niveis),
    escolaridade: toArray(raw.escolaridade),
    feedback: {
      total: totalFeedbacks,
      concluidos: totalAlertas, // proxy: alertas resolvidos como "concluídos"
      por_milestone: null,
    },
    avaliacoes: {
      ciclos_total: ciclosTotal,
      avaliacoes_total: avaliacoesTotal,
      autoavaliacoes_concluidas: autoavConcluidas,
      avaliacoes_gestor_concluidas: gestorConcluidas,
    },
    pdis: {
      total: pdisTotal,
      em_andamento: pdisAndamento,
      concluidos: pdisConcluidos,
      rascunho: pdisRascunho,
    },
    treinamentos: {
      concluidos: treinConcluidos,
      certificados: treinCertificados,
    },
    promocoes: {
      total: promocoesTotal,
    },
    promocoes_detalhadas: toArray(raw.promocoes_detalhadas),
    desligamentos_detalhados: toArray(raw.desligamentos_detalhados),
    diario_bordo_resultados: toArray(raw.diario_bordo_resultados),
    feedbacks_alertas: toArray(raw.feedbacks_alertas).map((g: any) => ({
      ...g,
      colaboradores: Array.isArray(g.colaboradores) ? g.colaboradores : [],
    })),
    feedbacks_detalhados: toArray(raw.feedbacks_detalhados),
  };
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

      const { data, error } = await supabase.rpc("get_executive_report_data", params as any);

      if (error) throw error;
      return normalizeRpcData(data);
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

