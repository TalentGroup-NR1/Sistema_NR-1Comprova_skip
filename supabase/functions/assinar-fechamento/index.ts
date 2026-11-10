// Onda 6 — Assinatura Digital do Colaborador
// Recebe { fechamento_id }, valida JWT, chama RPC assinar_periodo_ponto,
// força regeneração do PDF (vN+1) e retorna signed URL.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const fechamento_id = body?.fechamento_id as string;
    if (!fechamento_id) return json({ error: "fechamento_id obrigatório" }, 400);

    // 1. Chama a RPC de assinatura
    const { data: rpcData, error: rpcErr } = await supabase.rpc("assinar_periodo_ponto", {
      p_fechamento_id: fechamento_id,
    });
    if (rpcErr) {
      const msg = rpcErr.message || "Falha ao assinar";
      const status = msg.includes("PERMISSION_DENIED") ? 403 : msg.includes("NOT_FOUND") ? 404 : 400;
      return json({ error: msg }, status);
    }

    // 2. Força regeneração do PDF (versão nova) via edge exportar-fechamento
    let pdf_url: string | null = null;
    try {
      const { data: exp, error: expErr } = await supabase.functions.invoke("exportar-fechamento", {
        body: { fechamento_id, tipo: "pdf" },
      });
      if (!expErr && exp?.url) pdf_url = exp.url as string;
    } catch (_e) {
      // não falha a assinatura caso o export falhe; UI pode tentar baixar depois
    }

    return json({ ...(rpcData as object), pdf_url }, 200);
  } catch (e: any) {
    return json({ error: e?.message || "Erro inesperado" }, 500);
  }
});
