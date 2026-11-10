export const ALLOWED_ORIGINS = [
  "https://nr1pronto.com.br",
  "https://www.nr1pronto.com.br",
  "https://nr-1pronto.com.br",
  "https://www.nr-1pronto.com.br",
  "https://nr1comprova.com.br",
  "https://www.nr1comprova.com.br",
  "https://nr-1comprova.com.br",
  "https://www.nr-1comprova.com.br",
  "http://localhost:5173", // dev (padrão Vite)
  "http://localhost:8081", // dev alternativo
  "http://localhost:8080", // dev alternativo
];

export function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  // Variável de ambiente APP_ORIGIN se configurada no Supabase
  try {
    const envAppOrigin = Deno.env.get("APP_ORIGIN");
    if (envAppOrigin) {
      const list = envAppOrigin.split(",").map((s) => s.trim());
      if (list.includes(origin)) return true;
    }
  } catch {
    // Deno.env pode não estar definido em ambiente de teste não-Deno
  }

  // Suporte a qualquer subdomínio da Vercel (*.vercel.app)
  try {
    const url = new URL(origin);
    if (url.hostname.endsWith(".vercel.app") && (url.protocol === "https:" || url.protocol === "http:")) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function buildCorsHeaders(requestOrOrigin: Request | string): Record<string, string> {
  const origin = typeof requestOrOrigin === "string"
    ? requestOrOrigin
    : (requestOrOrigin?.headers?.get("origin") ?? "");
  const allowed = isOriginAllowed(origin) ? origin : "";
  return {
    ...(allowed ? { "Access-Control-Allow-Origin": allowed } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}
