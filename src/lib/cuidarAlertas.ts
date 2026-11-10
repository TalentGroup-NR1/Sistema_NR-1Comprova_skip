/**
 * Onda 7.5 — Regras puras de alertas preventivos do Cuidar+.
 * Espelha a lógica das funções SQL `gerar_alertas_individuais_cuidar`
 * e `gerar_alertas_coletivos_cuidar` para testes/UI offline.
 */

export type AlertaGatilho =
  | "score_critico"
  | "queda_individual"
  | "padrao_recorrente"
  | "silencio"
  | "humor_baixo_time"
  | "queda_coletiva"
  | "alta_carga_time";

export type AlertaSeveridade = "baixo" | "moderado" | "alto";
export type AlertaTipo = "individual" | "coletivo";

export interface Alerta {
  gatilho: AlertaGatilho;
  severidade: AlertaSeveridade;
  tipo: AlertaTipo;
  mensagem: string;
}

export const ALERTA_MENSAGENS: Record<AlertaGatilho, Alerta> = {
  score_critico: {
    gatilho: "score_critico",
    severidade: "alto",
    tipo: "individual",
    mensagem: "Baixo bem-estar detectado — recomendado check-in individual.",
  },
  queda_individual: {
    gatilho: "queda_individual",
    severidade: "moderado",
    tipo: "individual",
    mensagem: "Variação significativa no humor — avaliar condições da semana.",
  },
  padrao_recorrente: {
    gatilho: "padrao_recorrente",
    severidade: "alto",
    tipo: "individual",
    mensagem: "Padrão crítico recorrente — ação preventiva necessária.",
  },
  silencio: {
    gatilho: "silencio",
    severidade: "moderado",
    tipo: "individual",
    mensagem: "Ausência de respostas — possível desengajamento.",
  },
  humor_baixo_time: {
    gatilho: "humor_baixo_time",
    severidade: "moderado",
    tipo: "coletivo",
    mensagem: "Queda de humor no time — revisar carga e prioridades.",
  },
  queda_coletiva: {
    gatilho: "queda_coletiva",
    severidade: "alto",
    tipo: "coletivo",
    mensagem: "Alerta coletivo — risco de sobrecarga na equipe.",
  },
  alta_carga_time: {
    gatilho: "alta_carga_time",
    severidade: "alto",
    tipo: "coletivo",
    mensagem: "Sinal de burnout — intervir em redistribuição imediata.",
  },
};

export interface EntradaIndividual {
  scoreAtual: number;
  scoreAnterior: number | null;
  /** Scores das últimas 3 campanhas auto, da mais recente para a mais antiga */
  historicoUltimas3: number[];
  semanasSemResposta?: number;
}

export function calcularAlertasIndividuais(e: EntradaIndividual): Alerta[] {
  const out: Alerta[] = [];

  if (e.scoreAtual < 30) out.push(ALERTA_MENSAGENS.score_critico);

  if (e.scoreAnterior !== null && e.scoreAtual - e.scoreAnterior < -20) {
    out.push(ALERTA_MENSAGENS.queda_individual);
  }

  if (e.historicoUltimas3.length >= 3 && e.historicoUltimas3.every((s) => s < 50)) {
    out.push(ALERTA_MENSAGENS.padrao_recorrente);
  }

  if ((e.semanasSemResposta ?? 0) >= 2) {
    out.push(ALERTA_MENSAGENS.silencio);
  }

  return out;
}

export interface EntradaColetiva {
  humorMedio: number;
  humorAnterior: number | null;
  respondentes: number;
  altaCarga: number; // contagem de badges sinal_cansaco + atencao_bem_estar
}

export function calcularAlertasColetivos(e: EntradaColetiva): Alerta[] {
  const out: Alerta[] = [];

  if (e.humorMedio < 50 && e.respondentes >= 3) {
    out.push(ALERTA_MENSAGENS.humor_baixo_time);
  }
  if (e.humorAnterior !== null && e.humorAnterior - e.humorMedio > 15) {
    out.push(ALERTA_MENSAGENS.queda_coletiva);
  }
  if (e.altaCarga >= 3) {
    out.push(ALERTA_MENSAGENS.alta_carga_time);
  }

  return out;
}
