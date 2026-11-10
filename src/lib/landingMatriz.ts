/**
 * Conteúdo da Matriz de Risco 5x5 interativa da landing page.
 * Eixo X = Probabilidade (1 a 5), Eixo Y = Severidade (1 a 5).
 */

export type NivelRisco = "baixo" | "moderado" | "substancial" | "alto" | "critico";

export interface CelulaMatriz {
  probabilidade: number;
  severidade: number;
  nivel: NivelRisco;
  label: string;
  significado: string;
  acao: string;
}

export const NIVEL_LABEL: Record<NivelRisco, string> = {
  baixo: "Risco Baixo",
  moderado: "Risco Moderado",
  substancial: "Risco Substancial",
  alto: "Risco Alto",
  critico: "Risco Crítico",
};

export const NIVEL_CELULA: Record<NivelRisco, string> = {
  baixo: "bg-risk-low text-white",
  moderado: "bg-risk-moderate text-brand-gray-dark",
  substancial: "bg-risk-substantial text-white",
  alto: "bg-risk-high text-white",
  critico: "bg-risk-high text-white",
};

export const NIVEL_TEXTO: Record<NivelRisco, string> = {
  baixo: "text-risk-low",
  moderado: "text-risk-moderate",
  substancial: "text-risk-substantial",
  alto: "text-risk-high",
  critico: "text-risk-high",
};

function nivelDoProduto(produto: number): NivelRisco {
  if (produto <= 4) return "baixo";
  if (produto <= 9) return "moderado";
  if (produto <= 14) return "substancial";
  if (produto <= 19) return "alto";
  return "critico";
}

const ACOES: Record<NivelRisco, string> = {
  baixo: "Risco monitorado: o sistema registra o perigo no Inventário de Riscos e mantém acompanhamento periódico, sem plano de ação obrigatório.",
  moderado:
    "O sistema sugere medidas administrativas e de organização do trabalho, com prazo recomendado e responsável indicado no cronograma.",
  substancial:
    "Plano de Ação 5W2H aberto automaticamente, com prazo curto, responsável designado e verificação de eficácia agendada.",
  alto: "Plano de Ação 5W2H gerado automaticamente com cronograma e responsáveis, além de alerta imediato ao RH e ao SESMT.",
  critico:
    "Ação imediata: o sistema prioriza o risco no topo do PGR, exige medida de controle antes da continuidade da atividade e notifica a alta gestão.",
};

const SEVERIDADE_TEXTO: Record<number, string> = {
  1: "consequência insignificante",
  2: "consequência leve",
  3: "consequência moderada",
  4: "consequência grave",
  5: "consequência catastrófica",
};

const PROBABILIDADE_TEXTO: Record<number, string> = {
  1: "ocorrência rara",
  2: "ocorrência pouco provável",
  3: "ocorrência possível",
  4: "ocorrência provável",
  5: "ocorrência quase certa",
};

export const PROBABILIDADE_LABEL: Record<number, string> = {
  1: "Muito baixa",
  2: "Baixa",
  3: "Média",
  4: "Alta",
  5: "Muito alta",
};

export const SEVERIDADE_LABEL: Record<number, string> = {
  1: "Insignificante",
  2: "Leve",
  3: "Moderada",
  4: "Grave",
  5: "Catastrófica",
};

export function celula(probabilidade: number, severidade: number): CelulaMatriz {
  const produto = probabilidade * severidade;
  const nivel = nivelDoProduto(produto);
  return {
    probabilidade,
    severidade,
    nivel,
    label: NIVEL_LABEL[nivel],
    significado: `Probabilidade ${probabilidade} × Severidade ${severidade} = nível ${produto} — ${PROBABILIDADE_TEXTO[probabilidade]} com ${SEVERIDADE_TEXTO[severidade]}.`,
    acao: ACOES[nivel],
  };
}

/** Todas as 25 combinações, pré-calculadas. */
export const MATRIZ_CELULAS: CelulaMatriz[] = [1, 2, 3, 4, 5].flatMap((s) =>
  [1, 2, 3, 4, 5].map((p) => celula(p, s))
);

export const CELULA_DESTAQUE = { probabilidade: 4, severidade: 4 };

export const EXEMPLOS_RISCO = [
  {
    risco: "Ritmo de trabalho acelerado",
    calculo: "Probabilidade 4 × Severidade 4",
    nivel: "alto" as NivelRisco,
    acao: "Implantar micro-pausas cognitivas de 10 min",
  },
  {
    risco: "Sistemas lentos gerando conflito com clientes",
    calculo: "Probabilidade 3 × Severidade 3",
    nivel: "moderado" as NivelRisco,
    acao: "Otimizar fluxo de atendimento",
  },
  {
    risco: "Metas inatingíveis",
    calculo: "Probabilidade 4 × Severidade 5",
    nivel: "critico" as NivelRisco,
    acao: "Revisar sistema de metas com participação dos colaboradores",
  },
];
