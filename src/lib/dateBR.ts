/**
 * Helpers de data no fuso horário de São Paulo (UTC-3).
 *
 * MOTIVO: `new Date().toISOString().split('T')[0]` retorna a data em UTC,
 * fazendo com que batidas após 21h (horário BR) sejam atribuídas ao dia
 * seguinte. Use estes helpers no módulo de Ponto para evitar deslocamento.
 */

const TZ = "America/Sao_Paulo";

/** Retorna a data de "hoje" em São Paulo no formato yyyy-MM-dd. */
export function getHojeBR(): string {
  return formatarDataBR(new Date());
}

/** Formata um Date arbitrário como yyyy-MM-dd no fuso de São Paulo. */
export function formatarDataBR(d: Date): string {
  // pt-CA produz "2026-05-08"
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Retorna a data N dias atrás em São Paulo no formato yyyy-MM-dd. */
export function getDataBR(diasAtras: number): string {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return formatarDataBR(d);
}
