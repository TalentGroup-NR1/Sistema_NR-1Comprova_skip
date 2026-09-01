import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";

export interface FiltrosRelatorio {
  data_inicio: string; // YYYY-MM-DD
  data_fim: string;
  departamento?: string | null;
  empresa_cliente?: string | null;
}

export interface AbsenteismoData {
  periodo: { inicio: string; fim: string };
  kpis: {
    ia_pct: number;
    ia_pct_anterior: number;
    horas_extras_min: number;
    horas_extras_min_anterior: number;
    atrasos_min: number;
    atrasos_colabs: number;
    custo_absenteismo: number;
    custo_horas_extras: number;
    divisor_medio: number;
    colabs_sem_salario: number;
    total_colabs: number;
  };
  serie_mensal: { mes: string; ia_pct: number; extras_min: number }[];
  breakdown_categorias: { categoria: string; minutos: number }[];
  ranking_departamentos: {
    departamento: string;
    colabs: number;
    ia_pct: number;
    perdidas_min: number;
    prev_min: number;
  }[];
  detalhado: {
    colaborador_id: string;
    nome: string;
    departamento: string | null;
    empresa_cliente: string | null;
    horas_mensais: number;
    valor_hora: number | null;
    base_salary: number | null;
    prev_min: number;
    trab_min: number;
    extras_min: number;
    falta_implicita_min: number;
    perdidas_abonadas_min: number;
    perdidas_min: number;
    dias_falta_implicita: number;
    ia_pct: number;
    custo_absent: number | null;
    custo_extras: number | null;
  }[];
}

export interface JornadaData {
  serie_mensal: {
    mes: string;
    normais_min: number;
    extras_min: number;
    faltantes_min: number;
    saldo_min: number;
  }[];
}

export interface AlertasNR1Data {
  faltas_recorrentes: {
    colaborador_id: string;
    nome: string;
    departamento: string | null;
    mes: string;
    qtd_faltas: number;
  }[];
  atestados_frequentes: {
    colaborador_id: string;
    nome: string;
    departamento: string | null;
    qtd_atestados: number;
  }[];
}

export function useRelatorioAbsenteismo(f: FiltrosRelatorio) {
  const companyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ["relatorio-absenteismo", companyId, f],
    queryFn: async (): Promise<AbsenteismoData> => {
      const { data, error } = await supabase.rpc("get_relatorio_absenteismo_v1" as any, {
        p_company_id: companyId,
        p_data_inicio: f.data_inicio,
        p_data_fim: f.data_fim,
        p_departamento: f.departamento || null,
        p_empresa_cliente: f.empresa_cliente || null,
      });
      if (error) throw error;
      return data as AbsenteismoData;
    },
    enabled: !!f.data_inicio && !!f.data_fim,
  });
}

export function useRelatorioJornada(f: FiltrosRelatorio) {
  const companyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ["relatorio-jornada", companyId, f],
    queryFn: async (): Promise<JornadaData> => {
      const { data, error } = await supabase.rpc("get_relatorio_jornada_v1" as any, {
        p_company_id: companyId,
        p_data_inicio: f.data_inicio,
        p_data_fim: f.data_fim,
        p_departamento: f.departamento || null,
        p_empresa_cliente: f.empresa_cliente || null,
      });
      if (error) throw error;
      return data as JornadaData;
    },
    enabled: !!f.data_inicio && !!f.data_fim,
  });
}

export function useAlertasNR1(f: FiltrosRelatorio) {
  const companyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ["alertas-nr1", companyId, f],
    queryFn: async (): Promise<AlertasNR1Data> => {
      const { data, error } = await supabase.rpc("get_alertas_nr1_v1" as any, {
        p_company_id: companyId,
        p_data_inicio: f.data_inicio,
        p_data_fim: f.data_fim,
      });
      if (error) throw error;
      return data as AlertasNR1Data;
    },
    enabled: !!f.data_inicio && !!f.data_fim,
  });
}
