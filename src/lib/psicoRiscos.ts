/**
 * Classificação de risco psicossocial genérica (multi-instrumento).
 *
 * O índice é normalizado de 0 a 100 a partir da média Likert (1 a 5):
 *   indice = (media - 1) * 25
 *
 * A direção depende do tipo da dimensão:
 *   - negativa: quanto MAIOR o índice, pior (ex.: exigências, sofrimento)
 *   - positiva: quanto MAIOR o índice, melhor (ex.: apoio social, autonomia)
 *
 * Os cortes (corte_medio / corte_alto) são configuráveis por dimensão no
 * editor de instrumentos. Padrão: 40 e 60.
 */

export type TipoDimensaoRisco = "positiva" | "negativa";
export type NivelRisco = "Vermelho" | "Laranja" | "Verde";

export const CORTE_MEDIO_PADRAO = 40;
export const CORTE_ALTO_PADRAO = 60;
export const MIN_RESPONDENTES = 3;

export function indiceFromMedia(media: number | null | undefined): number | null {
  if (media == null || Number.isNaN(Number(media))) return null;
  return Math.round((Number(media) - 1) * 25 * 10) / 10;
}

export function classificarRisco(
  tipo: TipoDimensaoRisco,
  indice: number | null | undefined,
  corteMedio: number | null | undefined = CORTE_MEDIO_PADRAO,
  corteAlto: number | null | undefined = CORTE_ALTO_PADRAO
): NivelRisco | null {
  if (indice == null || Number.isNaN(Number(indice))) return null;
  const cm = Number(corteMedio ?? CORTE_MEDIO_PADRAO);
  const ca = Number(corteAlto ?? CORTE_ALTO_PADRAO);
  const v = Number(indice);
  if (tipo === "positiva") {
    if (v < cm) return "Vermelho";
    if (v < ca) return "Laranja";
    return "Verde";
  }
  if (v >= ca) return "Vermelho";
  if (v >= cm) return "Laranja";
  return "Verde";
}

export const CORES_RISCO: Record<NivelRisco, string> = {
  Vermelho: "bg-red-600 text-white",
  Laranja: "bg-orange-500 text-white",
  Verde: "bg-emerald-600 text-white",
};

export const CORES_RISCO_SUAVE: Record<NivelRisco, string> = {
  Vermelho: "bg-red-100 text-red-700 border-red-300",
  Laranja: "bg-orange-100 text-orange-700 border-orange-300",
  Verde: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

export const RGB_RISCO: Record<NivelRisco, [number, number, number]> = {
  Vermelho: [220, 38, 38],
  Laranja: [249, 115, 22],
  Verde: [22, 163, 74],
};

export const ROTULO_RISCO: Record<NivelRisco, string> = {
  Vermelho: "Risco Alto — intervenção imediata",
  Laranja: "Risco Médio — situação limite",
  Verde: "Risco Baixo — consolidar práticas",
};

export function faixasTexto(
  tipo: TipoDimensaoRisco,
  corteMedio: number | null | undefined = CORTE_MEDIO_PADRAO,
  corteAlto: number | null | undefined = CORTE_ALTO_PADRAO
): { nivel: NivelRisco; texto: string }[] {
  const cm = Number(corteMedio ?? CORTE_MEDIO_PADRAO);
  const ca = Number(corteAlto ?? CORTE_ALTO_PADRAO);
  if (tipo === "positiva") {
    return [
      { nivel: "Vermelho", texto: `índice < ${cm}` },
      { nivel: "Laranja", texto: `${cm} a ${ca}` },
      { nivel: "Verde", texto: `índice ≥ ${ca}` },
    ];
  }
  return [
    { nivel: "Verde", texto: `índice < ${cm}` },
    { nivel: "Laranja", texto: `${cm} a ${ca}` },
    { nivel: "Vermelho", texto: `índice ≥ ${ca}` },
  ];
}
