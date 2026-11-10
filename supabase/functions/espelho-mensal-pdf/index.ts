// Espelho Mensal de Ponto — upload/download do PDF Folha de Ponto
// Body (upload): { espelho_id: string, pdf_base64: string }  -> faz upload e devolve signed url
// Body (download): { espelho_id: string }                    -> devolve signed url do pdf_url atual
// Auth: colaborador dono OU admin/RH/gestor da empresa

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "fechamentos-ponto";

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64ToBytes(b64: string): Uint8Array {
  // remove data: prefix se vier
  const clean = b64.includes(",") ? b64.split(",")[1] : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    // Guard de tamanho (PDF base64 pode crescer; 8MB suficiente p/ mês)
    const cl = Number(req.headers.get("content-length") ?? "0");
    if (cl > 8 * 1024 * 1024) return json({ error: "Payload muito grande" }, 413);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const espelho_id = body?.espelho_id as string;
    const pdf_base64 = body?.pdf_base64 as string | undefined;
    if (!espelho_id) return json({ error: "espelho_id obrigatório" }, 400);

    const { data: row, error: e1 } = await supabase
      .from("espelhos_ponto_mensais")
      .select(`id, company_id, colaborador_id, ano, mes, versao, pdf_url, status,
               colaboradores(user_id)`)
      .eq("id", espelho_id)
      .maybeSingle();
    if (e1) return json({ error: e1.message }, 400);
    if (!row) return json({ error: "Espelho não encontrado" }, 404);

    const colab: any = (row as any).colaboradores ?? {};
    const isOwner = colab?.user_id && colab.user_id === userData.user.id;
    let isAdmin = false;
    if (!isOwner) {
      const { data: myRole } = await supabase.rpc("get_my_role");
      const role = String(myRole ?? "");
      isAdmin = ["admin_master","admin_empresa","analista_rh","gestor_departamento"].includes(role);
      if (!isAdmin) return json({ error: "PERMISSION_DENIED" }, 403);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const v = (row as any).versao ?? 1;
    const path = `${(row as any).company_id}/espelho-mensal/${(row as any).colaborador_id}/${(row as any).ano}-${String((row as any).mes).padStart(2,"0")}.v${v}.pdf`;

    // === Modo UPLOAD: admin sempre; owner apenas quando o espelho está assinado
    // (uso: publicar a folha de ponto já com o bloco de assinatura digital) ===
    if (pdf_base64) {
      const isSignedOwner = isOwner && (row as any).status === "assinado";
      if (!isAdmin && !isSignedOwner) {
        return json({ error: "Somente admin pode publicar o PDF oficial" }, 403);
      }
      const bytes = base64ToBytes(pdf_base64);
      const { error: upErr } = await admin.storage
        .from(BUCKET)
        .upload(path, new Blob([bytes], { type: "application/pdf" }), {
          upsert: true, contentType: "application/pdf",
        });
      if (upErr) return json({ error: "Falha no upload: " + upErr.message }, 500);

      await admin.from("espelhos_ponto_mensais")
        .update({ pdf_url: path })
        .eq("id", espelho_id);

      const { data: signed, error: e3 } = await admin.storage
        .from(BUCKET).createSignedUrl(path, 3600);
      if (e3) return json({ error: e3.message }, 400);
      return json({ url: signed?.signedUrl, path }, 200);
    }

    // === Modo DOWNLOAD: devolve signed URL do pdf_url atual ===
    const currentPath = (row as any).pdf_url || path;
    const { data: signed, error: e3 } = await admin.storage
      .from(BUCKET).createSignedUrl(currentPath, 3600);
    if (e3) return json({ error: "PDF ainda não disponível: " + e3.message }, 404);
    return json({ url: signed?.signedUrl, path: currentPath }, 200);
  } catch (e: any) {
    return json({ error: e?.message || "Erro inesperado" }, 500);
  }
});
