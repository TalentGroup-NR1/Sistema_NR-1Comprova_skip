import { addMonths, format, startOfMonth, endOfMonth, parseISO } from "date-fns";

export type PeriodoFechamento =
  | "mensal"
  | "bimestral"
  | "trimestral"
  | "quadrimestral"
  | "semestral"
  | "anual";

export interface CicloBancoHoras {
  inicio: string; // yyyy-MM-dd
  fim: string;    // yyyy-MM-dd
  label: string;
  periodo: PeriodoFechamento;
}

interface CicloConfigInput {
  periodo_fechamento_banco?: string | null;
  banco_horas_inicio?: string | null;
}

const PERIODO_LABEL: Record<PeriodoFechamento, string> = {
  mensal: "Mensal",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  quadrimestral: "Quadrimestral",
  semestral: "Semestral",
  anual: "Anual",
};

const MESES_POR_PERIODO: Record<Exclude<PeriodoFechamento, "mensal">, number> = {
  bimestral: 2,
  trimestral: 3,
  quadrimestral: 4,
  semestral: 6,
  anual: 12,
};

function normalizePeriodo(p?: string | null): PeriodoFechamento {
  const v = (p || "quadrimestral").toLowerCase();
  if (
    v === "mensal" ||
    v === "bimestral" ||
    v === "trimestral" ||
    v === "quadrimestral" ||
    v === "semestral" ||
    v === "anual"
  ) return v;
  return "quadrimestral";
}


function parseDateOnly(s: string): Date {
  // safe: avoid UTC shift
  return new Date(s + "T12:00:00");
}

function fmt(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/**
 * Determina o ciclo de banco de horas vigente para uma data de referência,
 * conforme a configuração da empresa.
 */
export function getCicloVigente(
  config: CicloConfigInput | null | undefined,
  refDate: Date = new Date(),
): CicloBancoHoras {
  const periodo = normalizePeriodo(config?.periodo_fechamento_banco);

  if (periodo === "mensal") {
    const ini = startOfMonth(refDate);
    const fim = endOfMonth(refDate);
    return {
      inicio: fmt(ini),
      fim: fmt(fim),
      label: format(ini, "MM/yyyy"),
      periodo,
    };
  }

  const meses = MESES_POR_PERIODO[periodo];
  // Âncora: banco_horas_inicio ou 01/01 do ano corrente
  const ancoraStr = config?.banco_horas_inicio;
  const ancora = ancoraStr ? parseISO(ancoraStr) : new Date(refDate.getFullYear(), 0, 1);

  // Calcular quantos ciclos completos cabem entre âncora e refDate
  const monthsDiff =
    (refDate.getFullYear() - ancora.getFullYear()) * 12 +
    (refDate.getMonth() - ancora.getMonth()) +
    (refDate.getDate() < ancora.getDate() ? -1 : 0);

  const ciclosPassados = Math.floor(monthsDiff / meses);
  const inicio = addMonths(ancora, ciclosPassados * meses);
  // fim = início + meses, menos 1 dia
  const fimExclusive = addMonths(inicio, meses);
  const fim = new Date(fimExclusive.getFullYear(), fimExclusive.getMonth(), fimExclusive.getDate() - 1);

  return {
    inicio: fmt(inicio),
    fim: fmt(fim),
    label: `${format(inicio, "dd/MM/yyyy")} – ${format(fim, "dd/MM/yyyy")}`,
    periodo,
  };
}

/** Retorna o ciclo deslocado N posições (ex.: -1 = anterior, +1 = próximo). */
export function getCicloOffset(
  config: CicloConfigInput | null | undefined,
  baseInicio: string,
  offset: number,
): CicloBancoHoras {
  const periodo = normalizePeriodo(config?.periodo_fechamento_banco);
  const baseDate = parseDateOnly(baseInicio);
  if (periodo === "mensal") {
    const ref = addMonths(baseDate, offset);
    return getCicloVigente(config, ref);
  }
  const meses = MESES_POR_PERIODO[periodo];
  const novaRef = addMonths(baseDate, offset * meses + 1); // +1 garante cair dentro do próximo
  return getCicloVigente(config, novaRef);
}

export function getPeriodoLabel(p?: string | null): string {
  return PERIODO_LABEL[normalizePeriodo(p)];
}
