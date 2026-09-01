// Onda 6.13 — Detecta paridade ímpar de batidas no dia (marcação faltante).
// Marcações automáticas (is_auto, midnight-split) contam normalmente.

export interface RegistroParidade {
  data_hora: string; // ISO
}

/**
 * Retorna true se a quantidade de registros for ímpar (existe batida sem par).
 */
export function detectarParidadeImpar(registros: RegistroParidade[]): boolean {
  if (!registros || registros.length === 0) return false;
  return registros.length % 2 !== 0;
}
