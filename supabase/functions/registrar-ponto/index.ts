import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TIPOS = ["ENTRADA", "SAIDA"] as const;
type Tipo = typeof TIPOS[number];
// Compat: aceita tipos legados enviados por builds antigos do client e
// normaliza para o padrão atual ENTRADA/SAIDA (idem trigger normalizar_tipo_ponto_registro).
const LEGACY_MAP: Record<string, Tipo> = {
  INTERVALO_SAIDA: "SAIDA",
  INTERVALO_RETORNO: "ENTRADA",
};

// Retorna a data local (YYYY-MM-DD) em America/Sao_Paulo de um ISO UTC.
function dataLocalBR(iso: string): string {
  // pt-BR Intl format: "dd/mm/aaaa"
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date(iso));
  const d = parts.find((p) => p.type === "day")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const y = parts.find((p) => p.type === "year")!.value;
  return `${y}-${m}-${d}`;
}

// Constrói um ISO UTC correspondente a uma hora local BR (UTC-3, sem DST atual).
function brLocalToISO(dateYYYYMMDD: string, hhmm: string): string {
  // BRT = UTC-3 → adicionar 3h para obter UTC
  // Ex.: 2025-05-15 23:59 BRT = 2025-05-16 02:59 UTC
  return new Date(`${dateYYYYMMDD}T${hhmm}:00-03:00`).toISOString();
}

// Soma N dias em data YYYY-MM-DD (sem timezone shift).
function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const rawTipo = String(body?.tipo || "").toUpperCase();
    const tipo = (LEGACY_MAP[rawTipo] ?? rawTipo) as Tipo;
    if (!TIPOS.includes(tipo)) {
      return json({ error: "Tipo inválido" }, 400);
    }
    const observacao = typeof body?.observacao === "string" ? body.observacao.slice(0, 500) : null;
    const latitude = typeof body?.latitude === "number" ? body.latitude : null;
    const longitude = typeof body?.longitude === "number" ? body.longitude : null;

    // Resolve colaborador (gate por vínculo: somente CLT/Estágio/Aprendiz/Temporário)
    const { data: colab, error: colabErr } = await supabase
      .from("colaboradores")
      .select("id, company_id, contract_type")
      .eq("user_id", userId)
      .eq("status", "ATIVO")
      .in("contract_type", ["CLT", "Estágio", "Aprendiz", "Temporário"])
      .maybeSingle();

    if (colabErr) return json({ error: colabErr.message }, 500);
    if (!colab) return json({ error: "PERMISSION_DENIED: vínculo não permite registro de ponto", code: "PERMISSION_DENIED" }, 403);

    // Server-side timestamp (edge function runs server-side, immune to client clock)
    const dataHora = new Date().toISOString();
    const dataLocalNova = dataLocalBR(dataHora);

    // === Bloqueio assimétrico + prevenção de cascata ===
    // Última marcação (aprovada ou pendente) para avaliar pendências.
    const { data: ultima } = await supabase
      .from("ponto_registros")
      .select("tipo, data_hora, is_auto")
      .eq("colaborador_id", colab.id)
      .neq("status_aprovacao", "rejeitado")
      .order("data_hora", { ascending: false })
      .limit(1)
      .maybeSingle();

    // diffDias em dias LOCAIS BR entre última ENTRADA aberta e hoje.
    const diffDiasLocais = (isoA: string, isoB: string): number => {
      const a = dataLocalBR(isoA);
      const b = dataLocalBR(isoB);
      const [ay, am, ad] = a.split("-").map(Number);
      const [by, bm, bd] = b.split("-").map(Number);
      const ta = Date.UTC(ay, am - 1, ad);
      const tb = Date.UTC(by, bm - 1, bd);
      return Math.round((tb - ta) / 86400000);
    };

    let pendingWarning: any = null;
    const autoCriados: any[] = [];

    const temEntradaAbertaDiaAnterior =
      ultima && ultima.tipo === "ENTRADA" && dataLocalBR(ultima.data_hora) < dataLocalNova;

    if (temEntradaAbertaDiaAnterior) {
      const diff = diffDiasLocais(ultima!.data_hora, dataHora);
      const isAuto = !!(ultima as any).is_auto;

      if (tipo === "SAIDA") {
        // Bloqueia se: entrada aberta é auto_bridge OU diffDias >= 2.
        // Só faz split (uma única vez) se: manual E diffDias === 1.
        if (isAuto || diff >= 2) {
          const [y, m, d] = dataLocalBR(ultima!.data_hora).split("-");
          return json(
            {
              error: `Existe uma entrada em aberto de ${d}/${m}/${y}. Regularize no Histórico antes de registrar a saída.`,
              code: "OPEN_SHIFT_TOO_OLD",
              pendingDay: dataLocalBR(ultima!.data_hora),
              pendingEntradaAt: ultima!.data_hora,
            },
            409
          );
        }

        // diff === 1 e manual: split único fechando D 23:59 e reabrindo D+1 00:00.
        const dataLocalUltima = dataLocalBR(ultima!.data_hora);
        const proxima = addDays(dataLocalUltima, 1);
        const isoSaida = brLocalToISO(dataLocalUltima, "23:59");
        const isoEntrada = brLocalToISO(proxima, "00:00");

        const { error: e1 } = await supabase.from("ponto_registros").insert({
          colaborador_id: colab.id,
          company_id: colab.company_id,
          tipo: "SAIDA",
          data_hora: isoSaida,
          ajuste_manual: false,
          is_auto: true,
          auto_reason: "midnight-split",
          status_aprovacao: "aprovado",
        });
        if (e1 && !/unique|ux_ponto_registros/i.test(e1.message)) {
          return json({ error: `Falha no split (saída auto): ${e1.message}` }, 500);
        }
        const { error: e2 } = await supabase.from("ponto_registros").insert({
          colaborador_id: colab.id,
          company_id: colab.company_id,
          tipo: "ENTRADA",
          data_hora: isoEntrada,
          ajuste_manual: false,
          is_auto: true,
          auto_reason: "midnight-split",
          status_aprovacao: "aprovado",
        });
        if (e2 && !/unique|ux_ponto_registros/i.test(e2.message)) {
          return json({ error: `Falha no split (entrada auto): ${e2.message}` }, 500);
        }
        autoCriados.push({ saida: isoSaida, entrada: isoEntrada });
      } else {
        // tipo === "ENTRADA": nunca bloqueia por pendência antiga; apenas avisa.
        const pendingDay = dataLocalBR(ultima!.data_hora);
        const [y, m, d] = pendingDay.split("-");
        pendingWarning = {
          code: "PENDING_SAIDA_PREVIOUS_DAY",
          message: `Atenção: você tem uma saída pendente do dia ${d}/${m}/${y}. Regularize no Histórico.`,
          pendingDay,
          pendingEntradaAt: ultima!.data_hora,
        };
      }
    }

    const { data: inserted, error: insErr } = await supabase
      .from("ponto_registros")
      .insert({
        colaborador_id: colab.id,
        company_id: colab.company_id,
        tipo,
        data_hora: dataHora,
        observacao,
        latitude,
        longitude,
        ajuste_manual: false,
      })
      .select("*")
      .single();

    if (insErr) {
      const msg = insErr.message || "Erro ao registrar ponto";
      const isDup = msg.toLowerCase().includes("unique") || msg.includes("ux_ponto_registros");
      const isSeq = msg.toLowerCase().includes("sequencia") || msg.toLowerCase().includes("sequência");
      return json(
        { error: msg, code: isDup ? "DUPLICATE" : isSeq ? "SEQUENCE" : "DB_ERROR" },
        isDup || isSeq ? 409 : 500
      );
    }

    // === Onda 6.13: validação preventiva de marcação faltante ===
    // Verificamos os últimos 14 dias (excluindo HOJE, que ainda está em
    // andamento e pode ter paridade ímpar legítima durante o expediente).
    // Para cada dia FECHADO com nº ímpar de batidas, registramos como
    // potencial marcação faltante e reportamos o dia mais recente.
    let warning: any = null;
    try {
      const inicioJanelaISO = brLocalToISO(addDays(dataLocalNova, -14), "00:00");
      const fimOntemISO = new Date(
        new Date(brLocalToISO(addDays(dataLocalNova, -1), "23:59")).getTime() + 59_000
      ).toISOString();

      const { data: registrosJanela } = await supabase
        .from("ponto_registros")
        .select("data_hora, tipo")
        .eq("colaborador_id", colab.id)
        .eq("status_aprovacao", "aprovado")
        .gte("data_hora", inicioJanelaISO)
        .lte("data_hora", fimOntemISO)
        .order("data_hora", { ascending: true });

      // Agrupa por dia local BR
      const porDia = new Map<string, { data_hora: string; tipo: string }[]>();
      for (const r of registrosJanela || []) {
        const dia = dataLocalBR((r as any).data_hora);
        const arr = porDia.get(dia) || [];
        arr.push(r as any);
        porDia.set(dia, arr);
      }

      // Coleta dias com paridade ímpar (mais recente primeiro)
      const diasImpares: { dia: string; ultimo: string; total: number }[] = [];
      const diasOrdenados = Array.from(porDia.keys()).sort().reverse();
      for (const dia of diasOrdenados) {
        const lista = porDia.get(dia)!;
        if (lista.length > 0 && lista.length % 2 !== 0) {
          diasImpares.push({
            dia,
            ultimo: lista[lista.length - 1].data_hora,
            total: lista.length,
          });
        }
      }

      if (diasImpares.length > 0) {
        const maisRecente = diasImpares[0];
        const [y, m, d] = maisRecente.dia.split("-");
        const diaFmt = `${d}/${m}/${y}`;
        const extras = diasImpares.length - 1;
        const sufixo = extras > 0
          ? ` (e mais ${extras} dia${extras > 1 ? "s" : ""} pendente${extras > 1 ? "s" : ""})`
          : "";
        warning = {
          warning: true,
          code: "ODD_PUNCHES",
          message: `Falta uma marcação no dia ${diaFmt}${sufixo}. Recomendamos corrigir no Histórico.`,
          missingAt: maisRecente.ultimo,
          missingDay: maisRecente.dia,
          totalBatidas: maisRecente.total,
          diasPendentes: diasImpares.map((x) => x.dia),
        };
      }
    } catch (_) {
      // Nunca bloqueia a batida por falha na contagem
    }

    return json({ ok: true, registro: inserted, auto_split: autoCriados, warning: pendingWarning || warning }, 200);
  } catch (e: any) {
    return json({ error: e?.message || "Erro inesperado" }, 500);
  }
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
