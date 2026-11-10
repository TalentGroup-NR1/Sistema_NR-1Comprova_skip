// Onda 7.0 — Cuidar+ ativação diária
// Cron diário: ativa campanhas que entram hoje, desativa expiradas, recalcula insights.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Cron auth guard
  const expectedSecret = Deno.env.get("CRON_SECRET");
  const receivedSecret = req.headers.get("x-cron-secret");
  if (!expectedSecret || !receivedSecret || receivedSecret !== expectedSecret) {
    return new Response(
      JSON.stringify({ ok: false, error: "unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRole);

    const hoje = new Date().toISOString().slice(0, 10);

    // Ativar campanhas que iniciam hoje ou já em janela e ainda inativas
    const { data: ativadas, error: errAtivar } = await supabase
      .from("pulse_campaigns")
      .update({ ativo: true })
      .lte("data_inicio", hoje)
      .gte("data_fim", hoje)
      .eq("ativo", false)
      .in("origem", ["auto_semanal", "auto_mensal"])
      .select("id, company_id, origem, ano, semana_iso, mes");

    if (errAtivar) throw errAtivar;

    // Desativar campanhas expiradas
    const { data: desativadas, error: errDesativar } = await supabase
      .from("pulse_campaigns")
      .update({ ativo: false })
      .lt("data_fim", hoje)
      .eq("ativo", true)
      .in("origem", ["auto_semanal", "auto_mensal"])
      .select("id, company_id, origem, ano, semana_iso, mes");

    if (errDesativar) throw errDesativar;

    // Recalcular insights para período atual de cada empresa afetada
    const periodos = new Map<string, { company_id: string; escopo: "semana" | "mes"; ano: number; semana?: number; mes?: number }>();
    for (const c of [...(ativadas ?? []), ...(desativadas ?? [])]) {
      if (c.origem === "auto_semanal" && c.ano && c.semana_iso) {
        periodos.set(`${c.company_id}-s-${c.ano}-${c.semana_iso}`, {
          company_id: c.company_id, escopo: "semana", ano: c.ano, semana: c.semana_iso,
        });
      }
      if (c.origem === "auto_mensal" && c.ano && c.mes) {
        periodos.set(`${c.company_id}-m-${c.ano}-${c.mes}`, {
          company_id: c.company_id, escopo: "mes", ano: c.ano, mes: c.mes,
        });
      }
    }

    for (const p of periodos.values()) {
      await supabase.rpc("recalcular_insights_cuidar", {
        p_company_id: p.company_id,
        p_escopo: p.escopo,
        p_ano: p.ano,
        p_semana: p.semana ?? null,
        p_mes: p.mes ?? null,
      });
    }

    // Onda 7.2: notificações personalizadas por streak ao ativar campanhas semanais (Query única em lote)
    let notificacoesCriadas = 0;
    const campanhasSemanaisAtivadas = (ativadas ?? []).filter(
      (c) => c.origem === "auto_semanal",
    );

    if (campanhasSemanaisAtivadas.length > 0) {
      const companyIds = campanhasSemanaisAtivadas.map((c) => c.company_id);
      const campByCompany = new Map(campanhasSemanaisAtivadas.map((c) => [c.company_id, c.id]));

      // 1. Busca todos os colaboradores ativos das empresas afetadas de uma só vez
      const { data: colabs } = await supabase
        .from("colaboradores")
        .select("id, user_id, company_id")
        .in("company_id", companyIds)
        .eq("is_active", true);

      const activeColabsWithUser = (colabs ?? []).filter((c) => !!c.user_id);
      const userIds = activeColabsWithUser.map((c) => c.user_id!);

      if (userIds.length > 0) {
        // 2. Busca todas as progressões de uma só vez
        const { data: progressoes } = await supabase
          .from("cuidar_progressao")
          .select("user_id, streak_semanal")
          .in("user_id", userIds);

        const streakByUser = new Map(
          (progressoes ?? []).map((p) => [p.user_id, p.streak_semanal]),
        );

        const linhas = activeColabsWithUser.map((c) => {
          const streak = streakByUser.get(c.user_id) ?? 0;
          const campId = campByCompany.get(c.company_id);
          const title =
            streak >= 1
              ? `Sua sequência: ${streak} ${streak === 1 ? "semana" : "semanas"}`
              : "Nova campanha de bem-estar disponível";
          const message =
            streak >= 1
              ? `Mantenha o ritmo! Responda a pesquisa Cuidar+ desta semana.`
              : `Reserve 1 minuto para nos contar como você está se sentindo.`;
          return {
            company_id: c.company_id,
            user_id: c.user_id,
            type: "cuidar_campanha_ativa",
            title,
            message,
            action_url: "/cuidar-mais",
            entity_type: "pulse_campaign",
            entity_id: campId,
            priority: streak >= 4 ? "high" : "normal",
          };
        });

        if (linhas.length > 0) {
          const { error: errIns } = await supabase.from("notifications").insert(linhas);
          if (!errIns) notificacoesCriadas += linhas.length;
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        ativadas: ativadas?.length ?? 0,
        desativadas: desativadas?.length ?? 0,
        insights_recalculados: periodos.size,
        notificacoes_criadas: notificacoesCriadas,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("cuidar-ativar-campanhas error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
