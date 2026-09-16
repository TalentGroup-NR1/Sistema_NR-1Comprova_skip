/**
 * URL pública de produção do sistema.
 * Todos os links compartilháveis (Diário de Bordo, Cuidar+, Comunicados,
 * Avaliações, Certificados) devem usar esta base — nunca window.location.origin,
 * que pode apontar para o preview e gerar "Access denied" para quem recebe.
 */
export const PRODUCTION_URL = 'https://www.nr-1pronto.com.br';

export function getShareBaseUrl(): string {
  return PRODUCTION_URL;
}

