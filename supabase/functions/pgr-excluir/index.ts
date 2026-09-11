import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.3";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

const RequestSchema = z.object({
  importacao_id: z.string().uuid(),
});

function maskName(emailOrId: string): string {
  if (!emailOrId) return "";
  const [name, domain] = emailOrId.split("@");
  if (!domain) return name.slice(0, 3) + "***";
  return `${name.slice(0, 3)}***@${domain}`;
}

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing header" }), { status: 200, headers: jsonHeaders });
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: `Unauthorized: ${userErr?.message}` }), { status: 200, headers: jsonHeaders });
    }
    const caller = userData.user;

    const { data: roleRows } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", caller.id);
    
    const dbRoles = roleRows?.map((r: any) => r.role) || [];
    const jwtRole = caller.user_metadata?.role || caller.app_metadata?.role;
    if (jwtRole) dbRoles.push(jwtRole);

    const allowedRoles = ["admin_master", "admin_empresa", "analista_rh"];
    if (!dbRoles.some((r: string) => allowedRoles.includes(r))) {
      return new Response(JSON.stringify({ error: "Forbidden: insufficient permissions" }), { status: 200, headers: jsonHeaders });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 200, headers: jsonHeaders });
    }
    const { importacao_id } = parsed.data;

    const { data: importacao, error: fetchErr } = await supabaseAdmin
      .from("pgr_importacoes").select("*").eq("id", importacao_id).single();
    if (fetchErr || !importacao) {
      return new Response(JSON.stringify({ error: "Importação não encontrada" }), { status: 200, headers: jsonHeaders });
    }

    const callerRole = dbRoles.find((r: string) => allowedRoles.includes(r)) || dbRoles[0];
    if (callerRole !== "admin_master") {
      const { data: profileRow } = await supabaseAdmin
        .from("profiles").select("company_id").eq("user_id", caller.id).maybeSingle();
      if (!profileRow?.company_id || profileRow.company_id !== importacao.company_id) {
        return new Response(JSON.stringify({ error: "Forbidden: Tenant mismatch" }), { status: 200, headers: jsonHeaders });
      }
    }

    const { error: deleteErr } = await supabaseAdmin
      .from("pgr_importacoes")
      .delete()
      .eq("id", importacao_id);

    if (deleteErr) {
      console.error(`[pgr-excluir][${requestId}] Failed to delete:`, deleteErr);
      return new Response(JSON.stringify({ error: "Falha ao excluir." }), { status: 200, headers: jsonHeaders });
    }

    console.log(`[pgr-excluir][${requestId}] Deleted ${importacao_id} by ${maskName(caller.email ?? caller.id)}`);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });

  } catch (err) {
    console.error(`[pgr-excluir][${requestId}] Unexpected error:`, err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }), { status: 200, headers: jsonHeaders });
  }
});
