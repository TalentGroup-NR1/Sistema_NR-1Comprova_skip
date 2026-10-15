/** Versões vigentes dos documentos legais e data da última atualização. */
export const TERMS_VERSION = "1.0";
export const PRIVACY_VERSION = "1.0";
export const LEGAL_LAST_UPDATED = "13/08/2026";

/**
 * Obtém o IP público do cliente via serviço público (api.ipify.org) com timeout de 2.5s.
 * Caso o serviço esteja inacessível ou bloqueado por adblocker, retorna null graciosamente sem travar o fluxo.
 */
export async function getClientIp(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const resp = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (resp.ok) {
      const data = await resp.json();
      return (data?.ip as string) || null;
    }
  } catch {
    // Fallback gracioso se erro de rede ou timeout
  }
  return null;
}

