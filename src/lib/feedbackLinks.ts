/**
 * Helpers para gerar links amigáveis do Diário de Bordo.
 * Em vez de expor apenas o UUID do token, incluímos um "vanity slug"
 * com o nome do colaborador no caminho da URL. A rota original
 * (/feedback/:token) continua funcionando; adicionamos também
 * /feedback/:slug/:token apenas para que a URL fique legível.
 */

import { getShareBaseUrl } from '@/lib/appUrl';

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function buildFeedbackLabel(
  colaboradorNome: string,
  kind: 'colaborador' | 'gestor' = 'colaborador',
): string {
  const base = `Diário de Bordo - ${colaboradorNome}`;
  return kind === 'gestor' ? `${base} (Gestor)` : base;
}

export function buildFeedbackUrl(
  token: string,
  colaboradorNome: string,
  kind: 'colaborador' | 'gestor' = 'colaborador',
  baseUrl: string = getShareBaseUrl(),
): string {
  const slug = slugify(buildFeedbackLabel(colaboradorNome, kind));
  return `${baseUrl}/feedback/${slug}/${token}`;
}

/**
 * Copia para a área de transferência um hyperlink com rótulo amigável.
 * Quando o usuário cola no Gmail/Outlook/Word, o e-mail mostra o texto
 * "Diário de Bordo - Nome" em vez do URL cru.
 */
export async function copyFeedbackLinkRich(
  token: string,
  colaboradorNome: string,
  kind: 'colaborador' | 'gestor' = 'colaborador',
): Promise<void> {
  const url = buildFeedbackUrl(token, colaboradorNome, kind);
  const label = buildFeedbackLabel(colaboradorNome, kind);
  const html = `<a href="${url}">${label}</a>`;
  // Texto puro = apenas a URL, para colar direto no navegador/WhatsApp sem virar busca
  const text = url;


  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      });
      await navigator.clipboard.write([item]);
      return;
    }
  } catch {
    // fallback abaixo
  }
  await navigator.clipboard.writeText(text);
}
