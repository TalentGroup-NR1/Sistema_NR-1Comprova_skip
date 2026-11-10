// Onda 7.2 — Lembrete de streak Cuidar+
// Roda toda quinta-feira 15:00 BRT. Notifica usuários com streak >= 1
// que ainda não responderam a campanha pulso ativa da semana corrente.
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

    // Campanhas semanais ativas hoje (auto_semanal)
    const { data: campanhas, error: errCamp } = await supabase
      .from("pulse_campaigns")
      .select("id, company_id")
      .eq("origem", "auto_semanal")
      .lte("data_inicio", hoje)
      .gte("data_fim", hoje);

    if (errCamp) throw errCamp;

    let notificacoesCriadas = 0;

    for (const camp of campanhas ?? []) {
      // Colaboradores da empresa com streak >= 1 e user_id
      const { data: progressoes } = await supabase
        .from("cuidar_progressao")
        .select("user_id, streak_semanal")
        .eq("company_id", camp.company_id)
        .gte("streak_semanal", 1);

      if (!progressoes || progressoes.length === 0) continue;

      const userIds = progressoes.map((p) => p.user_id);

      // colaboradores ativos correspondentes
      const { data: colabs } = await supabase
        .from("colaboradores")
        .select("id, user_id")
        .in("user_id", userIds)
        .eq("is_active", true);

      const userByColab = new Map<string, string>();
      const colabIds: string[] = [];
      for (const c of colabs ?? []) {
        if (c.user_id) {
          userByColab.set(c.id, c.user_id);
          colabIds.push(c.id);
        }
      }
      if (colabIds.length === 0) continue;

      // Quem já respondeu esta campanha
      const { data: respondidas } = await supabase
        .from("pulse_responses")
        .select("employee_id")
        .eq("campaign_id", camp.id)
        .in("employee_id", colabIds);

      const jaResp = new Set((respondidas ?? []).map((r) => r.employee_id));

      const streakByUser = new Map(progressoes.map((p) => [p.user_id, p.streak_semanal]));

      const linhas: Array<Record<string, unknown>> = [];
      for (const [colabId, userId] of userByColab.entries()) {
        if (jaResp.has(colabId)) continue;
        const streak = streakByUser.get(userId) ?? 0;
        if (streak < 1) continue;
        linhas.push({
          company_id: camp.company_id,
          user_id: userId,
          type: "cuidar_streak_risco",
          title: "Sua sequência está em risco",
          message: `Você está com ${streak} ${streak === 1 ? "semana" : "semanas"} de bem-estar. Responda amanhã e continue seu streak!`,
          action_url: "/cuidar-mais",
          entity_type: "pulse_campaign",
          entity_id: camp.id,
          priority: "high",
        });
      }

      if (linhas.length > 0) {
        const { error: errIns } = await supabase.from("notifications").insert(linhas);
        if (errIns) {
          console.error("erro inserindo notificacoes", errIns);
        } else {
          notificacoesCriadas += linhas.length;
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, notificacoes_criadas: notificacoesCriadas }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("cuidar-lembrete-streak error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
