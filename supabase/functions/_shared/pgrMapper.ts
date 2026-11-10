export function mapGeminiRiscos(rawGeminiRiscos: any[]) {
  return (rawGeminiRiscos || []).map((r: any) => ({
    categoria: r.categoria ?? "outros",
    nome: r.perigo ?? "Risco não especificado",
    descricao: r.descricao ?? null,
    grupo_exposto: r.grupo_exposto ?? null,
    probabilidade: r.probabilidade ?? null,
    severidade: r.severidade ?? null,
    nivel: r.nivel ?? null,
    classificacao: r.classificacao ?? null,
    escala_matriz: r.escala_matriz ?? null,
    local_exposicao: r.fonte ?? null,
    medidas_existentes: r.medidas_existentes ?? null,
    fonte: r.fonte ?? null,
    confianca: r.confianca ?? null,
  }));
}
