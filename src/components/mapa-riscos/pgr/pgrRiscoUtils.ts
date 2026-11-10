/** Utilitários visuais e textos padrão das fichas de risco do PGR. */

export function nivelRiscoLabel(nivel: number | null | undefined): string {
  if (nivel == null) return "—";
  if (nivel <= 2) return "Irrelevante";
  if (nivel <= 4) return "Baixo";
  if (nivel <= 9) return "Moderado";
  if (nivel <= 14) return "Alto";
  return "Crítico";
}

export function nivelRiscoClasse(nivel: number | null | undefined): string {
  const label = nivelRiscoLabel(nivel);
  return classificacaoClasse(label);
}

export function classificacaoClasse(label: string | null | undefined): string {
  switch ((label ?? "").toLowerCase()) {
    case "irrelevante":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "baixo":
      return "bg-sky-100 text-sky-800 border-sky-200";
    case "moderado":
      return "bg-amber-100 text-amber-900 border-amber-200";
    case "alto":
      return "bg-orange-100 text-orange-900 border-orange-200";
    case "critico":
    case "crítico":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

type CampoFicha =
  | "fundamentacao_legal"
  | "lesoes_agravos"
  | "fontes_circunstancias"
  | "meio_propagacao"
  | "acoes_necessarias"
  | "observacao";

const PADRAO_GERAL: Record<CampoFicha, string> = {
  fundamentacao_legal: "NR-01 item 1.5 (GRO/PGR); Lei 8.213/91; Portaria MTP 1.419/2022.",
  lesoes_agravos: "Descreva as lesões ou agravos à saúde possíveis pela exposição ao fator de risco.",
  fontes_circunstancias: "Descreva as fontes geradoras e as circunstâncias de exposição (atividade, frequência, duração).",
  meio_propagacao: "Descreva o meio de propagação/contato do agente (ar, contato direto, superfície, organização do trabalho).",
  acoes_necessarias: "Medidas administrativas, de engenharia, EPC/EPI, treinamento e monitoramento necessários.",
  observacao: "Observações complementares da equipe técnica.",
};

const PADRAO_POR_CATEGORIA: Record<string, Partial<Record<CampoFicha, string>>> = {
  fisico: {
    fundamentacao_legal: "NR-01, NR-09 e NR-15 (Anexos 1 a 3) — agentes físicos.",
    lesoes_agravos: "Perda auditiva induzida por ruído, fadiga, estresse térmico, lesões por vibração.",
    meio_propagacao: "Propagação pelo ar/estruturas (ruído, calor, vibração, radiação).",
  },
  quimico: {
    fundamentacao_legal: "NR-01, NR-09 e NR-15 (Anexos 11 a 13) — agentes químicos.",
    lesoes_agravos: "Intoxicações, dermatoses, irritação de vias aéreas, queimaduras químicas.",
    meio_propagacao: "Inalação de vapores/poeiras, contato dérmico e ingestão acidental.",
  },
  biologico: {
    fundamentacao_legal: "NR-01, NR-09, NR-32 e NR-15 (Anexo 14) — agentes biológicos.",
    lesoes_agravos: "Doenças infectocontagiosas, parasitoses e reações alérgicas.",
    meio_propagacao: "Contato direto, aerossóis, perfurocortantes e fluidos biológicos.",
  },
  ergonomico: {
    fundamentacao_legal: "NR-01 e NR-17 — ergonomia e organização do trabalho.",
    lesoes_agravos: "LER/DORT, lombalgias, fadiga muscular e visual.",
    meio_propagacao: "Posturas inadequadas, repetitividade, levantamento de cargas e mobiliário.",
  },
  acidente: {
    fundamentacao_legal: "NR-01, NR-06, NR-10, NR-11, NR-12 e NR-35, conforme aplicável.",
    lesoes_agravos: "Cortes, fraturas, quedas, choque elétrico, esmagamento e queimaduras.",
    meio_propagacao: "Contato direto com máquinas, superfícies, energia ou desníveis.",
  },
  psicossocial: {
    fundamentacao_legal: "NR-01 item 1.5.3.2 (riscos psicossociais) e Portaria MTE 1.419/2024.",
    lesoes_agravos: "Ansiedade, burnout, depressão, transtornos do sono e adoecimento mental.",
    meio_propagacao: "Organização do trabalho, demandas, relações interpessoais e gestão.",
  },
};

function normalizar(cat?: string | null) {
  return (cat ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function textoPadraoFicha(campo: CampoFicha, categoria?: string | null): string {
  const chave = normalizar(categoria);
  const match = Object.keys(PADRAO_POR_CATEGORIA).find((k) => chave.includes(k));
  return (match && PADRAO_POR_CATEGORIA[match][campo]) || PADRAO_GERAL[campo];
}
