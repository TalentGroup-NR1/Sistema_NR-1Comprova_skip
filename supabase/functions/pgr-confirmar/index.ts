import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.3";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const RequestSchema = z.object({
  importacao_id: z.string().uuid(),
  dados_revisados: z.any().optional(), // opcional se o frontend mandar o JSON atualizado antes
});

function maskName(emailOrId: string): string {
  if (!emailOrId) return "";
  const [name, domain] = emailOrId.split("@");
  if (!domain) return name.slice(0, 3) + "***";
  return `${name.slice(0, 3)}***@${domain}`;
}

const buildCorsHeaders = (req: Request) => {
  const origin = req.headers.get("origin") || "";
  const allowedOrigins = [
    "https://nr1pronto.com.br",
    "https://www.nr1pronto.com.br"
  ];
  const isLocalhost = /^https?:\/\/localhost(:\d+)?$/.test(origin);
  const allowOrigin = (isLocalhost || allowedOrigins.includes(origin)) ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
};

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const corsHeaders = buildCorsHeaders(req);
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

    // ── Role check
    const { data: roleRows } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", caller.id);
    
    const dbRoles = roleRows?.map((r: any) => r.role) || [];
    const jwtRole = caller.user_metadata?.role || caller.app_metadata?.role;
    if (jwtRole) dbRoles.push(jwtRole);

    const allowedRoles = ["admin_master", "admin_empresa", "analista_rh"];
    if (!dbRoles.some((r: string) => allowedRoles.includes(r))) {
      return new Response(JSON.stringify({ error: "Forbidden: insufficient permissions" }), { status: 200, headers: jsonHeaders });
    }

    // ── Payload
    const rawBody = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 200, headers: jsonHeaders });
    }
    const { importacao_id, dados_revisados } = parsed.data;

    // ── Validação e RLS Multi-tenant
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

    // Se o frontend enviou dados_revisados atualizados, salvamos antes do parse
    if (dados_revisados) {
      const { error: updateErr } = await supabaseAdmin
        .from("pgr_importacoes")
        .update({ extracao_raw: dados_revisados }) // Atualiza o JSONB com a revisão final
        .eq("id", importacao_id);
      if (updateErr) throw updateErr;
    }

    // ── Executar Parse Transacional via RPC
    const { error: rpcErr } = await supabaseAdmin.rpc("pgr_confirmar_parse", {
      p_importacao_id: importacao_id,
      p_user_id: caller.id
    });

    if (rpcErr) {
      console.error(`[pgr-confirmar][${requestId}] Erro no parse transacional:`, rpcErr);
      
      // Marcar com erro claro e reverter status se foi falha dura
      await supabaseAdmin
        .from("pgr_importacoes")
        .update({ status: "erro", erro_mensagem: `Falha no parse: ${rpcErr.message}` })
        .eq("id", importacao_id);
        
      return new Response(JSON.stringify({ error: `Erro no processamento dos dados: ${rpcErr.message}` }), { status: 200, headers: jsonHeaders });
    }

    console.log(`[pgr-confirmar][${requestId}] Parse transacional concluído para ${importacao_id}`);
    
    return new Response(JSON.stringify({ success: true, status: "confirmado" }), { status: 200, headers: jsonHeaders });

  } catch (err) {
    console.error(`[pgr-confirmar][${requestId}] Unexpected error:`, err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }), { status: 200, headers: jsonHeaders });
  }
});
