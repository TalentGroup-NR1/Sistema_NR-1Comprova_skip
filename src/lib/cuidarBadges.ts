/**
 * Onda 7.3 — Regras puras de badges do Cuidar+.
 * Espelha a lógica da função SQL `gerar_badges_cuidar` para testes offline e UI.
 */

export type BadgeTipo =
  | "semana_leve"
  | "semana_equilibrada"
  | "semana_desafiadora"
  | "atencao_bem_estar"
  | "resiliencia"
  | "sinal_cansaco"
  | "constancia"
  | "ciclo_bem_estar";

export interface BadgeDef {
  tipo: BadgeTipo;
  label: string;
  descricao: string;
}

export const BADGE_DEFS: Record<BadgeTipo, BadgeDef> = {
  semana_leve: {
    tipo: "semana_leve",
    label: "Semana Leve",
    descricao: "Você teve uma semana tranquila e equilibrada.",
  },
  semana_equilibrada: {
    tipo: "semana_equilibrada",
    label: "Semana Equilibrada",
    descricao: "Semana estável, com altos e baixos normais.",
  },
  semana_desafiadora: {
    tipo: "semana_desafiadora",
    label: "Semana Desafiadora",
    descricao: "Semana mais pesada — atenção ao autocuidado.",
  },
  atencao_bem_estar: {
    tipo: "atencao_bem_estar",
    label: "Atenção ao Bem-Estar",
    descricao: "Sinal de alerta. Que tal pedir apoio?",
  },
  resiliencia: {
    tipo: "resiliencia",
    label: "Resiliência",
    descricao: "Sua semana melhorou consideravelmente!",
  },
  sinal_cansaco: {
    tipo: "sinal_cansaco",
    label: "Sinal de Cansaço",
    descricao: "Queda significativa em relação à semana anterior.",
  },
  constancia: {
    tipo: "constancia",
    label: "Constância",
    descricao: "4 semanas respondendo. Que disciplina!",
  },
  ciclo_bem_estar: {
    tipo: "ciclo_bem_estar",
    label: "Ciclo de Bem-Estar",
    descricao: "12 semanas seguidas. Ciclo completo.",
  },
};

export type BadgeCategoria = "positivo" | "neutro" | "alerta" | "consistencia";

export function categoriaBadge(tipo: BadgeTipo): BadgeCategoria {
  switch (tipo) {
    case "semana_leve":
    case "resiliencia":
      return "positivo";
    case "semana_equilibrada":
      return "neutro";
    case "semana_desafiadora":
    case "atencao_bem_estar":
    case "sinal_cansaco":
      return "alerta";
    case "constancia":
    case "ciclo_bem_estar":
      return "consistencia";
  }
}

export interface EntradaBadges {
  scoreAtual: number;
  scoreAnterior: number | null;
  streakSemanal: number;
}

/** Retorna os badges aplicáveis dado o score atual, anterior e streak. */
export function calcularBadges(e: EntradaBadges): BadgeTipo[] {
  const out: BadgeTipo[] = [];

  // Faixa de score
  if (e.scoreAtual >= 80) out.push("semana_leve");
  else if (e.scoreAtual >= 60) out.push("semana_equilibrada");
  else if (e.scoreAtual >= 40) out.push("semana_desafiadora");
  else out.push("atencao_bem_estar");

  // Evolução
  if (e.scoreAnterior !== null) {
    const delta = e.scoreAtual - e.scoreAnterior;
    if (delta > 15) out.push("resiliencia");
    else if (delta < -15) out.push("sinal_cansaco");
  }

  // Consistência
  if (e.streakSemanal >= 4) out.push("constancia");
  if (e.streakSemanal >= 12) out.push("ciclo_bem_estar");

  return out;
}
