/**
 * Utilitário centralizado para extrair a mensagem de erro estruturada
 * retornada pelas Edge Functions do Supabase via supabase.functions.invoke.
 * O SDK @supabase/supabase-js em respostas HTTP 4xx/5xx define data = null
 * e coloca o objeto Response da fetch API em error.context.
 */
export async function extractFunctionError(
  error: unknown,
  fallback = "Erro ao processar requisição."
): Promise<string> {
  if (!error) return fallback;

  if (typeof error === "object" && error !== null && "context" in error) {
    try {
      const ctx = (error as { context?: { json?: () => Promise<any> } }).context;
      if (typeof ctx?.json === "function") {
        const body = await ctx.json();
        if (body?.error && typeof body.error === "string") return body.error;
        if (body?.message && typeof body.message === "string") return body.message;
      }
    } catch {
      // safe ignore se o stream já foi consumido
    }
  }

  if (error instanceof Error && error.message) {
    if (error.message.includes("non-2xx status code")) {
      return fallback;
    }
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return fallback;
}
