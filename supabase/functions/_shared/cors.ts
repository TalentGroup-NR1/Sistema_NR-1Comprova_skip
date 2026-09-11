export const ALLOWED_ORIGINS = [
  "https://nr1pronto.com.br",
  "https://www.nr1pronto.com.br",
  "https://nr-1pronto.com.br",
  "https://www.nr-1pronto.com.br",
  "http://localhost:5173", // dev
];

export function buildCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}
