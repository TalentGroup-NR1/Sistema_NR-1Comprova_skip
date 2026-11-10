/**
 * Matriz de Risco 5x5 (Probabilidade x Severidade) — NR-1.
 * Nível de risco = probabilidade * severidade (1 a 25).
 */

export type CategoriaRisco =
  | "fisico"
  | "quimico"
  | "biologico"
  | "ergonomico"
  | "psicossocial"
  | "acidente";

export type FaixaMatriz = "verde" | "amarelo" | "laranja" | "vermelho";

export interface MatrizConfig {
  id?: string;
  company_id?: string;
  corte_verde: number;
  corte_amarelo: number;
  corte_laranja: number;
  corte_vermelho: number;
}

export const CONFIG_PADRAO: MatrizConfig = {
  corte_verde: 4,
  corte_amarelo: 9,
  corte_laranja: 14,
  corte_vermelho: 25,
};

export function faixaDoNivel(nivel: number, cfg: MatrizConfig = CONFIG_PADRAO): FaixaMatriz {
  if (nivel <= cfg.corte_verde) return "verde";
  if (nivel <= cfg.corte_amarelo) return "amarelo";
  if (nivel <= cfg.corte_laranja) return "laranja";
  return "vermelho";
}

export const FAIXA_LABEL: Record<FaixaMatriz, string> = {
  verde: "Aceitável",
  amarelo: "Tolerável",
  laranja: "Importante",
  vermelho: "Crítico",
};

export const FAIXA_CELULA: Record<FaixaMatriz, string> = {
  verde: "bg-emerald-500/85 text-white",
  amarelo: "bg-amber-400/90 text-amber-950",
  laranja: "bg-orange-500/90 text-white",
  vermelho: "bg-red-600/90 text-white",
};

export const FAIXA_SUAVE: Record<FaixaMatriz, string> = {
  verde: "bg-emerald-100 text-emerald-800 border-emerald-300",
  amarelo: "bg-amber-100 text-amber-800 border-amber-300",
  laranja: "bg-orange-100 text-orange-800 border-orange-300",
  vermelho: "bg-red-100 text-red-800 border-red-300",
};

export const CATEGORIAS: { value: CategoriaRisco; label: string; classe: string }[] = [
  { value: "fisico", label: "Físico", classe: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "quimico", label: "Químico", classe: "bg-purple-100 text-purple-800 border-purple-300" },
  { value: "biologico", label: "Biológico", classe: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { value: "ergonomico", label: "Ergonômico", classe: "bg-orange-100 text-orange-800 border-orange-300" },
  { value: "psicossocial", label: "Psicossocial", classe: "bg-red-100 text-red-800 border-red-300" },
  { value: "acidente", label: "Acidente", classe: "bg-amber-100 text-amber-900 border-amber-300" },
];

export function categoriaLabel(c: string): string {
  return CATEGORIAS.find((x) => x.value === c)?.label ?? c;
}

export function categoriaClasse(c: string): string {
  return CATEGORIAS.find((x) => x.value === c)?.classe ?? "bg-muted text-muted-foreground border-border";
}

export const PROBABILIDADE_LABEL: Record<number, string> = {
  1: "Muito Baixa",
  2: "Baixa",
  3: "Média",
  4: "Alta",
  5: "Muito Alta",
};

export const SEVERIDADE_LABEL: Record<number, string> = {
  1: "Insignificante",
  2: "Leve",
  3: "Moderada",
  4: "Grave",
  5: "Catastrófica",
};

export const FONTE_LABEL: Record<string, string> = {
  manual: "Manual",
  automatico: "Automático",
  psicossocial: "Psicossocial",
};
