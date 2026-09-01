// Onda 5.2 — Exportação Correta a partir do Snapshot
// Gera CSV/PDF on-demand a partir de snapshot_jsonb (fonte da verdade assinada).
// Nunca lê ponto_resumo_diario. Versionamento via .v{n}.
//
// Escopos suportados:
//  - "consolidado" (default): 1 PDF/CSV com TODOS os colaboradores do período (uso admin)
//  - "individual": PDF apenas do colaborador do fechamento informado (colab / botão admin)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "fechamentos-ponto";

interface SnapshotDay {
  data: string;
  status: string;
  saldo_minutos: number;
  horas_extras_minutos: number;
  horas_noturnas_minutos: number;
  horas_intervalo_minutos: number;
  horas_previstas_minutos: number;
  horas_trabalhadas_minutos: number;
  horas_abonadas_minutos?: number;
}

interface FechamentoRow {
  id: string;
  company_id: string;
  colaborador_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  versao: number;
  saldo_minutos: number;
  horas_trabalhadas_minutos: number;
  horas_extras_minutos: number;
  horas_noturnas_minutos: number;
  horas_abonadas_minutos: number;
  dias_falta: number;
  dias_abonados: number;
  hash_assinatura: string | null;
  csv_url: string | null;
  pdf_url: string | null;
  snapshot_jsonb: SnapshotDay[] | null;
  status?: string | null;
  assinatura_hash?: string | null;
  assinatura_em?: string | null;
  assinatura_por?: string | null;
  colaboradores?: {
    full_name: string;
    matricula: string | null;
    department: string | null;
    pis?: string | null;
    ctps_numero?: string | null;
    ctps_serie?: string | null;
    user_id?: string | null;
  } | null;
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
    const tipo = ((body?.tipo as string) || "csv").toLowerCase();
    const escopo = ((body?.escopo as string) || "consolidado").toLowerCase();
    if (!fechamento_id) return json({ error: "fechamento_id obrigatório" }, 400);
    if (tipo !== "csv" && tipo !== "pdf") return json({ error: "tipo inválido" }, 400);
    if (escopo !== "consolidado" && escopo !== "individual") return json({ error: "escopo inválido" }, 400);
    if (escopo === "individual" && tipo !== "pdf") {
      return json({ error: "escopo individual suporta apenas tipo=pdf" }, 400);
    }

    // 1. Carrega o fechamento "âncora"
    const { data: anchor, error: e1 } = await supabase
      .from("banco_horas_fechamentos")
      .select("id, company_id, colaborador_id, periodo_inicio, periodo_fim, versao, csv_url, pdf_url")
      .eq("id", fechamento_id)
      .maybeSingle();
    if (e1) return json({ error: e1.message }, 400);
    if (!anchor) return json({ error: "Fechamento não encontrado" }, 404);

    // -------- ESCOPO INDIVIDUAL (PDF de 1 colaborador) --------
    if (escopo === "individual") {
      const { data: row, error: eInd } = await supabase
        .from("banco_horas_fechamentos")
        .select(`
          id, company_id, colaborador_id, periodo_inicio, periodo_fim, versao, status,
          saldo_minutos, horas_trabalhadas_minutos, horas_extras_minutos,
          horas_noturnas_minutos, horas_abonadas_minutos, dias_falta, dias_abonados,
          hash_assinatura, assinatura_hash, assinatura_em, assinatura_por,
          csv_url, pdf_url, snapshot_jsonb,
          colaboradores(full_name, matricula, department, pis, ctps_numero, ctps_serie, user_id)
        `)
        .eq("id", fechamento_id)
        .maybeSingle();
      if (eInd) return json({ error: eInd.message }, 400);
      if (!row) return json({ error: "Fechamento não encontrado" }, 404);

      // Segurança: a RLS já barra cross-tenant; aqui reforçamos que
      // colaborador só baixa o próprio. Admin/RH/master passa direto.
      const colab: any = (row as any).colaboradores ?? {};
      const isOwner = colab?.user_id && colab.user_id === userData.user.id;
      if (!isOwner) {
        const { data: myRole } = await supabase.rpc("get_my_role");
        const role = String(myRole ?? "");
        if (!["admin_master", "admin_empresa", "analista_rh", "gestor_departamento"].includes(role)) {
          return json({ error: "PERMISSION_DENIED" }, 403);
        }
      }

      const v = (row as any).versao ?? 1;
      const path = `${(row as any).company_id}/individual/${(row as any).colaborador_id}/${(row as any).periodo_inicio}_${(row as any).periodo_fim}.v${v}.pdf`;

      const payload = await buildPDF(
        [row as unknown as FechamentoRow],
        (row as any).periodo_inicio,
        (row as any).periodo_fim,
        true,
      );
      const contentType = "application/pdf";

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, new Blob([payload], { type: contentType }), { upsert: true });
      if (upErr) return json({ error: "Falha no upload: " + upErr.message }, 500);

      const { data: signed, error: e3 } = await supabase.storage
        .from(BUCKET).createSignedUrl(path, 3600);
      if (e3) return json({ error: e3.message }, 400);

      await supabase.from("banco_horas_fechamentos_auditoria").insert({
        fechamento_id, acao: "exportou_individual",
        user_id: userData.user.id,
        payload: { tipo, path, escopo },
      });

      return json({ url: signed?.signedUrl, path, escopo: "individual" }, 200);
    }

    // -------- ESCOPO CONSOLIDADO (comportamento original) --------
    const storedPath = tipo === "csv" ? anchor.csv_url : anchor.pdf_url;
    const needsRegen = !storedPath || tipo === "pdf";

    let path = storedPath as string | null;

    if (needsRegen) {
      const { data: rows, error: e2 } = await supabase
        .from("banco_horas_fechamentos")
        .select(`
          id, company_id, colaborador_id, periodo_inicio, periodo_fim, versao, status,
          saldo_minutos, horas_trabalhadas_minutos, horas_extras_minutos,
          horas_noturnas_minutos, horas_abonadas_minutos, dias_falta, dias_abonados,
          hash_assinatura, assinatura_hash, assinatura_em, assinatura_por,
          csv_url, pdf_url, snapshot_jsonb,
          colaboradores(full_name, matricula, department, pis, ctps_numero, ctps_serie)
        `)
        .eq("company_id", anchor.company_id)
        .eq("periodo_inicio", anchor.periodo_inicio)
        .eq("periodo_fim", anchor.periodo_fim)
        .order("colaborador_id");
      if (e2) return json({ error: e2.message }, 400);
      const fechamentos = (rows || []) as unknown as FechamentoRow[];
      if (fechamentos.length === 0) return json({ error: "Sem snapshots para exportar" }, 404);

      const v = anchor.versao ?? 1;
      const ext = tipo;
      path = `${anchor.company_id}/fechamento_${anchor.id}.v${v}.${ext}`;

      let payload: Uint8Array;
      let contentType: string;

      if (tipo === "csv") {
        const csv = buildCSV(fechamentos);
        payload = new TextEncoder().encode("\uFEFF" + csv);
        contentType = "text/csv;charset=utf-8";
      } else {
        payload = await buildPDF(fechamentos, anchor.periodo_inicio, anchor.periodo_fim, false);
        contentType = "application/pdf";
      }

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, new Blob([payload], { type: contentType }), { upsert: true });
      if (upErr) return json({ error: "Falha no upload: " + upErr.message }, 500);

      const updateField = tipo === "csv" ? { csv_url: path } : { pdf_url: path };
      await supabase
        .from("banco_horas_fechamentos")
        .update(updateField)
        .eq("company_id", anchor.company_id)
        .eq("periodo_inicio", anchor.periodo_inicio)
        .eq("periodo_fim", anchor.periodo_fim);
    }

    const { data: signed, error: e3 } = await supabase.storage
      .from(BUCKET).createSignedUrl(path!, 3600);
    if (e3) return json({ error: e3.message }, 400);

    await supabase.from("banco_horas_fechamentos_auditoria").insert({
      fechamento_id, acao: "exportou",
      user_id: userData.user.id,
      payload: { tipo, path, regenerado: needsRegen },
    });

    return json({ url: signed?.signedUrl, path, regenerado: needsRegen }, 200);
  } catch (e: any) {
    return json({ error: e?.message || "Erro inesperado" }, 500);
  }
});

// ---------------- CSV ----------------
function buildCSV(fechamentos: FechamentoRow[]): string {
  const header = [
    "matricula", "nome", "departamento", "periodo_inicio", "periodo_fim",
    "data", "status_dia",
    "h_previstas_min", "h_trabalhadas_min", "h_extras_min", "h_noturnas_min",
    "h_intervalo_min", "h_abonadas_min", "saldo_min",
    "TOTAL_h_trabalhadas_min", "TOTAL_h_extras_min", "TOTAL_h_noturnas_min",
    "TOTAL_h_abonadas_min", "TOTAL_dias_falta", "TOTAL_dias_abonados", "TOTAL_saldo_min",
    "hash_assinatura"
  ];
  const lines: string[] = [header.map(csvCell).join(",")];

  for (const f of fechamentos) {
    const c: any = f.colaboradores ?? {};
    const snap = Array.isArray(f.snapshot_jsonb) ? f.snapshot_jsonb : [];
    if (snap.length === 0) {
      lines.push([
        c.matricula ?? "", c.full_name ?? "", c.department ?? "",
        f.periodo_inicio, f.periodo_fim, "", "",
        "", "", "", "", "", "", "",
        f.horas_trabalhadas_minutos, f.horas_extras_minutos, f.horas_noturnas_minutos,
        f.horas_abonadas_minutos, f.dias_falta, f.dias_abonados, f.saldo_minutos,
        f.hash_assinatura ?? ""
      ].map(csvCell).join(","));
      continue;
    }
    for (const d of snap) {
      lines.push([
        c.matricula ?? "", c.full_name ?? "", c.department ?? "",
        f.periodo_inicio, f.periodo_fim,
        d.data, d.status,
        d.horas_previstas_minutos, d.horas_trabalhadas_minutos, d.horas_extras_minutos,
        d.horas_noturnas_minutos, d.horas_intervalo_minutos, d.horas_abonadas_minutos ?? 0,
        d.saldo_minutos,
        f.horas_trabalhadas_minutos, f.horas_extras_minutos, f.horas_noturnas_minutos,
        f.horas_abonadas_minutos, f.dias_falta, f.dias_abonados, f.saldo_minutos,
        f.hash_assinatura ?? ""
      ].map(csvCell).join(","));
    }
  }
  return lines.join("\r\n");
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// ---------------- PDF ----------------
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 36;
const navy = rgb(10 / 255, 22 / 255, 40 / 255);
const gray = rgb(0.4, 0.4, 0.4);
const lineColor = rgb(0.85, 0.85, 0.85);

interface PdfCtx { pdf: PDFDocument; page: PDFPage; y: number; font: PDFFont; fontBold: PDFFont; }

async function buildPDF(
  fechamentos: FechamentoRow[],
  periodoInicio: string,
  periodoFim: string,
  individual: boolean,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ctx: PdfCtx = { pdf, page: pdf.addPage([PAGE_W, PAGE_H]), y: PAGE_H - MARGIN, font, fontBold };

  drawHeader(ctx, periodoInicio, periodoFim, fechamentos.length, individual);
  for (const f of fechamentos) renderColaborador(ctx, f, individual);

  return await pdf.save();
}

function drawHeader(ctx: PdfCtx, periodoInicio: string, periodoFim: string, count: number, individual: boolean) {
  const titulo = individual ? "Espelho de Ponto" : "Folha de Fechamento de Ponto";
  ctx.page.drawText(titulo, { x: MARGIN, y: ctx.y, size: 16, font: ctx.fontBold, color: navy });
  ctx.y -= 18;
  ctx.page.drawText(`Período: ${fmtDate(periodoInicio)} a ${fmtDate(periodoFim)}`, {
    x: MARGIN, y: ctx.y, size: 10, font: ctx.font, color: gray,
  });
  ctx.y -= 12;
  const sub = individual ? `Gerado em ${fmtNow()}` : `Colaboradores: ${count}  •  Gerado em ${fmtNow()}`;
  ctx.page.drawText(sub, { x: MARGIN, y: ctx.y, size: 9, font: ctx.font, color: gray });
  ctx.y -= 14;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 1, color: navy,
  });
  ctx.y -= 14;
}

function ensureSpace(ctx: PdfCtx, need: number) {
  if (ctx.y - need < MARGIN) {
    ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
    ctx.y = PAGE_H - MARGIN;
  }
}

function renderColaborador(ctx: PdfCtx, f: FechamentoRow, individual: boolean) {
  const c: any = f.colaboradores ?? {};
  const snap = Array.isArray(f.snapshot_jsonb) ? f.snapshot_jsonb : [];

  ensureSpace(ctx, 80);
  ctx.page.drawText(`${c.full_name ?? "—"}`, { x: MARGIN, y: ctx.y, size: 11, font: ctx.fontBold, color: navy });
  ctx.y -= 12;
  ctx.page.drawText(
    `Matrícula: ${c.matricula ?? "—"}   Depto: ${c.department ?? "—"}`,
    { x: MARGIN, y: ctx.y, size: 8.5, font: ctx.font, color: gray },
  );
  ctx.y -= 11;
  const ctps = c.ctps_numero ? `${c.ctps_numero}${c.ctps_serie ? "/" + c.ctps_serie : ""}` : "—";
  const pis = c.pis ?? "—";
  ctx.page.drawText(`CTPS: ${ctps}   PIS: ${pis}`, {
    x: MARGIN, y: ctx.y, size: 8.5, font: ctx.font, color: gray,
  });
  ctx.y -= 12;

  const cols = [
    { label: "Data", w: 60 },
    { label: "Status", w: 75 },
    { label: "Prev", w: 45 },
    { label: "Trab", w: 45 },
    { label: "Extra", w: 45 },
    { label: "Not", w: 40 },
    { label: "Interv", w: 45 },
    { label: "Abono", w: 45 },
    { label: "Saldo", w: 50 },
  ];
  ensureSpace(ctx, 16);
  let x = MARGIN;
  for (const col of cols) {
    ctx.page.drawText(col.label, { x, y: ctx.y, size: 8, font: ctx.fontBold, color: navy });
    x += col.w;
  }
  ctx.y -= 4;
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_W - MARGIN, y: ctx.y }, thickness: 0.5, color: lineColor });
  ctx.y -= 10;

  for (const d of snap) {
    ensureSpace(ctx, 12);
    x = MARGIN;
    const cells = [
      fmtDate(d.data),
      truncate(d.status, 12),
      fmtMin(d.horas_previstas_minutos),
      fmtMin(d.horas_trabalhadas_minutos),
      fmtMin(d.horas_extras_minutos),
      fmtMin(d.horas_noturnas_minutos),
      fmtMin(d.horas_intervalo_minutos),
      fmtMin(d.horas_abonadas_minutos ?? 0),
      fmtSaldo(d.saldo_minutos),
    ];
    for (let i = 0; i < cells.length; i++) {
      ctx.page.drawText(cells[i], { x, y: ctx.y, size: 8, font: ctx.font, color: rgb(0.15, 0.15, 0.15) });
      x += cols[i].w;
    }
    ctx.y -= 11;
  }

  ensureSpace(ctx, 20);
  ctx.y -= 4;
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_W - MARGIN, y: ctx.y }, thickness: 0.5, color: lineColor });
  ctx.y -= 11;
  const totais =
    `Total: Trab ${fmtMin(f.horas_trabalhadas_minutos)}  •  Extra ${fmtMin(f.horas_extras_minutos)}  •  ` +
    `Not ${fmtMin(f.horas_noturnas_minutos)}  •  Abono ${fmtMin(f.horas_abonadas_minutos)}  •  ` +
    `Faltas ${f.dias_falta}  •  Saldo ${fmtSaldo(f.saldo_minutos)}`;
  ctx.page.drawText(totais, { x: MARGIN, y: ctx.y, size: 8.5, font: ctx.fontBold, color: navy });
  ctx.y -= 12;
  if (f.hash_assinatura) {
    ctx.page.drawText(`Hash: ${f.hash_assinatura.slice(0, 32)}…`, {
      x: MARGIN, y: ctx.y, size: 7, font: ctx.font, color: gray,
    });
    ctx.y -= 14;
  } else {
    ctx.y -= 6;
  }

  if (f.status === "assinado" && f.assinatura_hash) {
    ensureSpace(ctx, 60);
    ctx.page.drawRectangle({
      x: MARGIN, y: ctx.y - 50, width: PAGE_W - 2 * MARGIN, height: 50,
      borderColor: navy, borderWidth: 0.8, color: rgb(0.96, 0.97, 1),
    });
    let by = ctx.y - 12;
    ctx.page.drawText("ASSINATURA DIGITAL DO COLABORADOR", {
      x: MARGIN + 8, y: by, size: 9, font: ctx.fontBold, color: navy,
    });
    by -= 12;
    ctx.page.drawText(`Assinado por: ${c.full_name ?? "—"}`, {
      x: MARGIN + 8, y: by, size: 8, font: ctx.font, color: rgb(0.15, 0.15, 0.15),
    });
    by -= 11;
    ctx.page.drawText(`Data/Hora: ${fmtTs(f.assinatura_em)}`, {
      x: MARGIN + 8, y: by, size: 8, font: ctx.font, color: rgb(0.15, 0.15, 0.15),
    });
    by -= 11;
    ctx.page.drawText(`SHA-256: ${f.assinatura_hash}`, {
      x: MARGIN + 8, y: by, size: 7, font: ctx.font, color: gray,
    });
    ctx.y -= 56;
  }

  if (!individual) ctx.y -= 6;
}

function fmtMin(min: number | null | undefined): string {
  const m = Number(min ?? 0);
  const sign = m < 0 ? "-" : "";
  const abs = Math.abs(m);
  const h = Math.floor(abs / 60);
  const r = abs % 60;
  return `${sign}${h}:${String(r).padStart(2, "0")}`;
}
function fmtSaldo(min: number | null | undefined): string {
  const m = Number(min ?? 0);
  return (m > 0 ? "+" : "") + fmtMin(m);
}
function fmtDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function fmtNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}
function fmtTs(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}
function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
