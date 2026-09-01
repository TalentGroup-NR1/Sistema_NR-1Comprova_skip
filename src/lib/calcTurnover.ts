/**
 * Calcula a Taxa de Rotatividade para um período.
 *
 * Fórmula:
 *   Taxa (%) = ((Admissões + Desligamentos) / 2) / Total de Funcionários × 100
 *
 * Retorna o valor com 1 casa decimal.
 */
export function calcTurnoverRate(params: {
  admissoes: number;
  desligamentos: number;
  totalFuncionarios: number;
}): number {
  const { admissoes, desligamentos, totalFuncionarios } = params;

  if (totalFuncionarios <= 0) return 0;

  const media = (admissoes + desligamentos) / 2;
  return Number(((media / totalFuncionarios) * 100).toFixed(1));
}
