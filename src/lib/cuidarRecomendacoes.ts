/**
 * Onda 7.4 — Regras puras de recomendações do Cuidar+.
 * Espelha a lógica SQL de `gerar_recomendacoes_cuidar` para testes/UI offline.
 */

export type RecomendacaoTipo =
  | "leve"
  | "equilibrada"
  | "desafiadora"
  | "alerta"
  | "tendencia_positiva"
  | "tendencia_negativa"
  | "cansaco"
  | "constancia"
  | "ciclo"
  | "humor_baixo"
  | "queda_coletiva"
  | "alta_carga";

export interface RecomendacaoDef {
  tipo: RecomendacaoTipo;
  texto: string;
  contexto: "colaborador" | "gestor";
  categoria: "positivo" | "neutro" | "alerta" | "consistencia" | "organizacional";
}

export const RECOMENDACOES: Record<RecomendacaoTipo, RecomendacaoDef> = {
  leve: {
    tipo: "leve",
    contexto: "colaborador",
    categoria: "positivo",
    texto: "Mantenha o que deu certo. Repita um hábito que funcionou esta semana.",
  },
  equilibrada: {
    tipo: "equilibrada",
    contexto: "colaborador",
    categoria: "neutro",
    texto: "Continue ajustando pequenos pontos. Pergunte-se: o que posso simplificar?",
  },
  desafiadora: {
    tipo: "desafiadora",
    contexto: "colaborador",
    categoria: "alerta",
    texto: "Identifique um fator que drenou energia e reduza sua exposição a ele.",
  },
  alerta: {
    tipo: "alerta",
    contexto: "colaborador",
    categoria: "alerta",
    texto: "Considere ajustar a carga e conversar com seu líder se o padrão continuar.",
  },
  tendencia_positiva: {
    tipo: "tendencia_positiva",
    contexto: "colaborador",
    categoria: "positivo",
    texto: "Anote o que funcionou essa semana — isso ajudará a manter o ritmo.",
  },
  tendencia_negativa: {
    tipo: "tendencia_negativa",
    contexto: "colaborador",
    categoria: "alerta",
    texto: "Perceba o gatilho da queda. O que mais impactou sua energia?",
  },
  cansaco: {
    tipo: "cansaco",
    contexto: "colaborador",
    categoria: "alerta",
    texto: "Pausa programada: tire 15 minutos amanhã para recuperar foco.",
  },
  constancia: {
    tipo: "constancia",
    contexto: "colaborador",
    categoria: "consistencia",
    texto: "Sua constância está ajudando a entender seu bem-estar.",
  },
  ciclo: {
    tipo: "ciclo",
    contexto: "colaborador",
    categoria: "consistencia",
    texto: "Fechando um ciclo de consciência. Excelente consistência.",
  },
  humor_baixo: {
    tipo: "humor_baixo",
    contexto: "gestor",
    categoria: "organizacional",
    texto: "Considere um check-in rápido com o time.",
  },
  queda_coletiva: {
    tipo: "queda_coletiva",
    contexto: "gestor",
    categoria: "organizacional",
    texto: "Revisar prioridades da semana pode ajudar o time a recuperar energia.",
  },
  alta_carga: {
    tipo: "alta_carga",
    contexto: "gestor",
    categoria: "organizacional",
    texto: "Avaliar redistribuição de tarefas e prazos.",
  },
};

export interface EntradaRecomendacao {
  scoreAtual: number;
  scoreAnterior: number | null;
  streakSemanal: number;
}

/** Recomendações individuais (contexto = colaborador). */
export function calcularRecomendacoesColaborador(e: EntradaRecomendacao): RecomendacaoTipo[] {
  const out: RecomendacaoTipo[] = [];

  if (e.scoreAtual >= 80) out.push("leve");
  else if (e.scoreAtual >= 60) out.push("equilibrada");
  else if (e.scoreAtual >= 40) out.push("desafiadora");
  else out.push("alerta");

  if (e.scoreAnterior !== null) {
    const delta = e.scoreAtual - e.scoreAnterior;
    if (delta > 15) out.push("tendencia_positiva");
    else if (delta < -15) {
      out.push("cansaco");
      out.push("tendencia_negativa");
    }
  }

  if (e.streakSemanal >= 4) out.push("constancia");
  if (e.streakSemanal >= 12) out.push("ciclo");

  return out;
}

export interface EntradaRecomendacaoRH {
  humorMedio: number;
  humorMedioAnterior: number | null;
  alertasCarga: number; // contagem de badges sinal_cansaco + atencao_bem_estar
}

/** Recomendações organizacionais (contexto = gestor). */
export function calcularRecomendacoesRH(e: EntradaRecomendacaoRH): RecomendacaoTipo[] {
  const out: RecomendacaoTipo[] = [];
  if (e.humorMedio < 50) out.push("humor_baixo");
  if (e.humorMedioAnterior !== null && e.humorMedioAnterior - e.humorMedio > 10) {
    out.push("queda_coletiva");
  }
  if (e.alertasCarga >= 3) out.push("alta_carga");
  return out;
}
