import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BODY_BYTES = 1_048_576; // 1 MB

const ReabrirSchema = z.object({
  fechamento_id: z.string().uuid(),
  motivo: z.string().trim().min(5).max(1000),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const contentLength = Number(req.headers.get('content-length') ?? '0');
    if (contentLength > MAX_BODY_BYTES) return json({ error: 'Payload too large' }, 413);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const rawBody = await req.json().catch(() => null);
    const parsed = ReabrirSchema.safeParse(rawBody);
    if (!parsed.success) {
      return json({ error: 'Invalid payload', details: parsed.error.flatten().fieldErrors }, 400);
    }
    const { fechamento_id, motivo } = parsed.data;

    const { data, error } = await supabase.rpc("reabrir_periodo_ponto", {
      p_fechamento_id: fechamento_id,
      p_motivo: motivo,
    });
    if (error) return json({ error: error.message }, 400);
    return json(data, 200);
  } catch (e: any) {
    return json({ error: e?.message || "Erro inesperado" }, 500);
  }
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
