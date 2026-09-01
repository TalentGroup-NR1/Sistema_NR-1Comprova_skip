import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const company_id = body?.company_id as string;
    const periodo_inicio = body?.periodo_inicio as string;
    const periodo_fim = body?.periodo_fim as string;
    const colaboradores_ids: string[] | null = Array.isArray(body?.colaboradores_ids)
      ? body.colaboradores_ids : null;

    if (!company_id || !periodo_inicio || !periodo_fim) {
      return json({ error: "Parâmetros obrigatórios: company_id, periodo_inicio, periodo_fim" }, 400);
    }

    // 1. Executa fechamento via RPC (já valida role/escopo)
    const { data: rpcData, error: rpcErr } = await supabase.rpc("fechar_periodo_ponto", {
      p_company_id: company_id,
      p_periodo_inicio: periodo_inicio,
      p_periodo_fim: periodo_fim,
      p_colaboradores_ids: colaboradores_ids,
    });
    if (rpcErr) return json({ error: rpcErr.message }, 400);

    // 2. Para cada fechamento criado/atualizado, gera CSV e faz upload
    const { data: fechamentos } = await supabase
      .from("banco_horas_fechamentos")
      .select("id, colaborador_id, snapshot_jsonb, saldo_minutos, horas_trabalhadas_minutos, horas_extras_minutos, horas_noturnas_minutos, horas_abonadas_minutos, dias_falta, dias_abonados, hash_assinatura, tratativa_acao, tratativa_observacao, colaboradores(full_name, registration_number, department)")
      .eq("company_id", company_id)
      .eq("periodo_inicio", periodo_inicio)
      .eq("periodo_fim", periodo_fim)
      .eq("status", "fechado");

    const tratativaLabel: Record<string, string> = {
      pagar: "Pago em folha",
      descontar: "Descontado em folha",
      transferir: "Transferido p/ proximo ciclo",
      perdoar: "Perdoado",
    };

    // CSV consolidado (1 arquivo por período)
    const header = [
      "matricula","nome","departamento",
      "h_trabalhadas_min","h_extras_min","h_noturnas_min","h_abonadas_min",
      "dias_falta","dias_abonados","saldo_min","tratativa","observacao","hash"
    ].join(";");
    const lines: string[] = [header];
    for (const f of fechamentos || []) {
      const c: any = (f as any).colaboradores ?? {};
      const tratLabel = (f as any).tratativa_acao ? (tratativaLabel[(f as any).tratativa_acao] ?? (f as any).tratativa_acao) : "";
      lines.push([
        sanitize(c.registration_number ?? ""),
        sanitize(c.full_name ?? ""),
        sanitize(c.department ?? ""),
        f.horas_trabalhadas_minutos, f.horas_extras_minutos,
        f.horas_noturnas_minutos, f.horas_abonadas_minutos,
        f.dias_falta, f.dias_abonados, f.saldo_minutos,
        sanitize(tratLabel),
        sanitize((f as any).tratativa_observacao ?? ""),
        f.hash_assinatura ?? ""
      ].join(";"));
    }
    const csv = "\uFEFF" + lines.join("\n");
    const csvPath = `${company_id}/consolidado_${periodo_inicio}_${periodo_fim}.csv`;
    const { error: upErr } = await supabase.storage
      .from("fechamentos-ponto")
      .upload(csvPath, new Blob([csv], { type: "text/csv;charset=utf-8" }), { upsert: true });
    if (upErr) console.warn("CSV upload error:", upErr.message);

    // Atualiza csv_url em todos os fechamentos do período
    if (!upErr) {
      await supabase
        .from("banco_horas_fechamentos")
        .update({ csv_url: csvPath })
        .eq("company_id", company_id)
        .eq("periodo_inicio", periodo_inicio)
        .eq("periodo_fim", periodo_fim);
    }

    // Signed URL 1h
    let csvSignedUrl: string | null = null;
    if (!upErr) {
      const { data: signed } = await supabase.storage
        .from("fechamentos-ponto").createSignedUrl(csvPath, 3600);
      csvSignedUrl = signed?.signedUrl ?? null;
    }

    return json({
      ...rpcData,
      csv_path: upErr ? null : csvPath,
      csv_signed_url: csvSignedUrl,
      csv_error: upErr?.message ?? null,
    }, 200);
  } catch (e: any) {
    return json({ error: e?.message || "Erro inesperado" }, 500);
  }
});

function sanitize(v: string) {
  const s = String(v).replace(/[\r\n;]/g, " ").trim();
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
