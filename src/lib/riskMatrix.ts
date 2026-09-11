export interface RiskClassification {
  nivel: number | null;
  classificacao: string;
  cor: string;
  probLabel: string;
  sevLabel: string;
  bgClasse: string;
  textClasse: string;
}

export function classifyRisk(probabilidade: number | null, severidade: number | null, escala_matriz?: string | null): RiskClassification {
  if (probabilidade === null || severidade === null) {
    return {
      nivel: null,
      classificacao: "Sem classificação",
      cor: "#9CA3AF",
      probLabel: "-",
      sevLabel: "-",
      bgClasse: "bg-gray-100",
      textClasse: "text-gray-800"
    };
  }

  const p = Number(probabilidade);
  const s = Number(severidade);

  if (isNaN(p) || isNaN(s) || p <= 0 || s <= 0) {
    return {
      nivel: null,
      classificacao: "Sem classificação",
      cor: "#9CA3AF",
      probLabel: "-",
      sevLabel: "-",
      bgClasse: "bg-gray-100",
      textClasse: "text-gray-800"
    };
  }

  const nivel = p * s;
  
  let classificacao = "Escala não identificada";
  let cor = "#9CA3AF"; // Gray
  let bgClasse = "bg-gray-100";
  let textClasse = "text-gray-800";
  let probLabel = `P${p}`;
  let sevLabel = `S${s}`;

  const is5x5 = escala_matriz === "5x5";
  const is3x3 = escala_matriz === "3x3";
  const is4x4 = escala_matriz === "4x4";

  if (is5x5) {
    const probLabels = ["", "Muito Baixa", "Baixa", "Média", "Alta", "Muito Alta"];
    const sevLabels = ["", "Insignificante", "Leve", "Moderada", "Crítica", "Catastrófica"];
    probLabel = probLabels[p] || `P${p}`;
    sevLabel = sevLabels[s] || `S${s}`;

    if (nivel <= 4) {
      classificacao = "Baixo";
      cor = "#10B981"; // Emerald
      bgClasse = "bg-emerald-100";
      textClasse = "text-emerald-800";
    } else if (nivel <= 9) {
      classificacao = "Moderado";
      cor = "#F59E0B"; // Amber
      bgClasse = "bg-amber-100";
      textClasse = "text-amber-800";
    } else if (nivel <= 15) {
      classificacao = "Alto";
      cor = "#F97316"; // Orange
      bgClasse = "bg-orange-100";
      textClasse = "text-orange-800";
    } else {
      classificacao = "Crítico";
      cor = "#EF4444"; // Red
      bgClasse = "bg-red-100";
      textClasse = "text-red-800";
    }
  } else if (is4x4) {
    // Escala 4x4
    const probLabels = ["", "Rara", "Improvável", "Provável", "Frequente"];
    const sevLabels = ["", "Leve", "Moderada", "Grave", "Crítica"];
    probLabel = probLabels[p] || `P${p}`;
    sevLabel = sevLabels[s] || `S${s}`;

    if (nivel <= 4) {
      classificacao = "Baixo";
      cor = "#10B981"; // Emerald
      bgClasse = "bg-emerald-100";
      textClasse = "text-emerald-800";
    } else if (nivel <= 9) {
      classificacao = "Moderado";
      cor = "#F59E0B"; // Amber
      bgClasse = "bg-amber-100";
      textClasse = "text-amber-800";
    } else if (nivel <= 12) {
      classificacao = "Alto";
      cor = "#F97316"; // Orange
      bgClasse = "bg-orange-100";
      textClasse = "text-orange-800";
    } else {
      classificacao = "Crítico";
      cor = "#EF4444"; // Red
      bgClasse = "bg-red-100";
      textClasse = "text-red-800";
    }
  } else if (is3x3) {
    // Escala 3x3 (padrão)
    const probLabels = ["", "Baixa", "Média", "Alta"];
    const sevLabels = ["", "Leve", "Moderada", "Grave"];
    probLabel = probLabels[p] || `P${p}`;
    sevLabel = sevLabels[s] || `S${s}`;

    if (nivel <= 2) {
      classificacao = "Baixo";
      cor = "#10B981"; // Emerald
      bgClasse = "bg-emerald-100";
      textClasse = "text-emerald-800";
    } else if (nivel <= 4) {
      classificacao = "Moderado";
      cor = "#F59E0B"; // Amber
      bgClasse = "bg-amber-100";
      textClasse = "text-amber-800";
    } else if (nivel <= 6) {
      classificacao = "Alto";
      cor = "#F97316"; // Orange
      bgClasse = "bg-orange-100";
      textClasse = "text-orange-800";
    } else {
      classificacao = "Crítico";
      cor = "#EF4444"; // Red
      bgClasse = "bg-red-100";
      textClasse = "text-red-800";
    }
  } else {
    // Escala não suportada ou desconhecida, fica com os neutros configurados no inicio do metodo
  }

  return { nivel, classificacao, cor, probLabel, sevLabel, bgClasse, textClasse };
}
