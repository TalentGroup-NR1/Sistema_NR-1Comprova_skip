/**
 * Onda 7.0 — Engine Cuidar+
 * Funções puras para geração de campanhas, score, tendência e alertas.
 */

export interface OcorrenciaCampanha {
  data: Date;           // segunda-feira (início da semana)
  dataFim: Date;        // sexta-feira (encerramento da semana)
  semanaIso: number;
  mes: number;
  ano: number;
  tipo: "pulso" | "completo";
  ultimaSextaDoMes: boolean;
}

/** Retorna todas as semanas (seg–sex) do ano, ancoradas na sexta-feira de encerramento. */
export function gerarDatasSemanais(ano: number): OcorrenciaCampanha[] {
  const out: OcorrenciaCampanha[] = [];
  const sexta = new Date(Date.UTC(ano, 0, 1));
  while (((sexta.getUTCDay() + 6) % 7) + 1 !== 5) {
    sexta.setUTCDate(sexta.getUTCDate() + 1);
  }
  while (sexta.getUTCFullYear() === ano) {
    const proximaSexta = new Date(sexta);
    proximaSexta.setUTCDate(proximaSexta.getUTCDate() + 7);
    const ultimaSextaDoMes = proximaSexta.getUTCMonth() !== sexta.getUTCMonth();
    const inicio = new Date(sexta);
    inicio.setUTCDate(inicio.getUTCDate() - 4); // segunda-feira
    out.push({
      data: inicio,
      dataFim: new Date(sexta),
      semanaIso: getIsoWeek(sexta),
      mes: sexta.getUTCMonth() + 1,
      ano: sexta.getUTCFullYear(),
      tipo: ultimaSextaDoMes ? "completo" : "pulso",
      ultimaSextaDoMes,
    });
    sexta.setUTCDate(sexta.getUTCDate() + 7);
  }
  return out;
}

/** Calcula ISO week number (1..53) usando UTC para evitar TZ. */
export function getIsoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export type TipoPergunta = "escala_0_5" | "emoji_5" | "texto" | string;

/** Calcula score 0-100 a partir de uma resposta. Retorna null se não for numérica. */
export function calcularScore(input: { tipo: TipoPergunta; resposta: string }): number | null {
  if (input.tipo === "escala_0_5" || input.tipo === "emoji_5") {
    const v = Number(input.resposta);
    if (!Number.isFinite(v)) return null;
    const clamped = Math.max(0, Math.min(5, v));
    return Math.round((clamped / 5) * 10000) / 100;
  }
  return null;
}

/** Tendência = atual - anterior. Trata nulls como 0. */
export function calcularTendencia(atual: number | null, anterior: number | null): number {
  return Math.round(((atual ?? 0) - (anterior ?? 0)) * 100) / 100;
}

export type Alerta =
  | { tipo: "individual"; employee_id: string; score: number }
  | { tipo: "queda_grupo"; delta: number }
  | { tipo: "participacao_baixa"; taxa: number };

export interface EntradaAlertas {
  humorMedio: number | null;
  humorMedioAnterior: number | null;
  scoresPorColaborador: Array<{ employee_id: string; score: number }>;
  totalColaboradoresAtivos: number;
  totalRespondentesUnicos: number;
}

/** Gera lista de alertas: score <30 individual, queda >15pts grupo, participação <30%. */
export function calcularAlertas(e: EntradaAlertas): Alerta[] {
  const alertas: Alerta[] = [];
  for (const r of e.scoresPorColaborador) {
    if (r.score < 30) {
      alertas.push({ tipo: "individual", employee_id: r.employee_id, score: r.score });
    }
  }
  if (e.humorMedio !== null && e.humorMedioAnterior !== null) {
    const delta = calcularTendencia(e.humorMedio, e.humorMedioAnterior);
    if (delta < -15) {
      alertas.push({ tipo: "queda_grupo", delta });
    }
  }
  if (e.totalColaboradoresAtivos > 0) {
    const taxa = (e.totalRespondentesUnicos / e.totalColaboradoresAtivos) * 100;
    if (taxa < 30) {
      alertas.push({ tipo: "participacao_baixa", taxa: Math.round(taxa * 10) / 10 });
    }
  }
  return alertas;
}
