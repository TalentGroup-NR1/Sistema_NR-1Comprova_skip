import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.3";
import { z } from "https://esm.sh/zod@3.23.8";
import { maskName } from "../_shared/mask.ts";

const MAX_FILE_SIZE_BYTES = 10 * 1_048_576; // 10 MB

// ──────────────────────────────────────────────────────────────
// CORS — resposta correta para preflight e para requisições reais.
// Supabase Edge Functions recebem chamadas diretas de JS no browser;
// o supabase-js client envia Authorization + content-type, então
// todos os requests são "non-simple" e disparam preflight OPTIONS.
// ──────────────────────────────────────────────────────────────

/** Origens de produção permitidas (lista estrita). */
const PRODUCTION_ORIGINS = [
  "https://nr1pronto.com.br",
  "https://www.nr1pronto.com.br",
];

/** Em dev: aceita qualquer localhost independente da porta (5173, 8080, 8081, 3000…). */
const LOCALHOST_REGEX = /^https?:\/\/localhost(:\d+)?$/;

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return true;                            // curl / Postman: sem origin
  if (LOCALHOST_REGEX.test(origin)) return true;       // qualquer localhost
  return PRODUCTION_ORIGINS.includes(origin);          // produção: lista estrita
}

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = isAllowedOrigin(origin) ? (origin || "*") : "";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}


const RequestSchema = z.object({
  importacao_id: z.string().uuid(),
});

/**
 * Extrai texto de PDF bytes usando parser nativo (sem dependências externas).
 * Funciona para PDFs com texto vetorial; PDFs escaneados precisam do OCR via IA.
 */
function extractTextFromPDFBytes(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes);
  const textParts: string[] = [];
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match: RegExpExecArray | null;
  while ((match = btEtRegex.exec(raw)) !== null) {
    const block = match[1];
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      textParts.push(tjMatch[1].replace(/\\n/g, "\n").replace(/\\t/g, "\t"));
    }
    const tjArrRegex = /\[(.*?)\]\s*TJ/g;
    let arrMatch: RegExpExecArray | null;
    while ((arrMatch = tjArrRegex.exec(block)) !== null) {
      const strRegex = /\(([^)]*)\)/g;
      let sm: RegExpExecArray | null;
      while ((sm = strRegex.exec(arrMatch[1])) !== null) {
        textParts.push(sm[1]);
      }
    }
  }
  return textParts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Usa OpenAI GPT-4o Vision para OCR de PDFs escaneados/imagem.
 */
async function extractPdfWithOpenAI(bytes: Uint8Array, apiKey: string): Promise<string> {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Extraia TODO o texto deste documento PDF. Retorne apenas o texto, sem formatação adicional." },
          { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } },
        ],
      }],
      max_tokens: 8192,
    }),
  });
  if (!response.ok) throw new Error(`OpenAI OCR error: ${response.status}`);
  const result = await response.json();
  return result.choices?.[0]?.message?.content ?? "";
}

/**
 * Analisa o texto do PGR e extrai estrutura (riscos + plano de ação) via GPT-4o.
 */
async function analisarPgrComOpenAI(texto: string, apiKey: string): Promise<Record<string, unknown>> {
  const systemPrompt = `Você é um especialista em Segurança do Trabalho e NR-1 (Programa de Gerenciamento de Riscos — PGR).
Analise o texto do documento PGR fornecido e extraia as seguintes informações em JSON estruturado:
1. dados_empresa: { nome, cnpj, responsavel_tecnico, cargo_responsavel, data_elaboracao, validade }
2. riscos: array de { categoria (fisico|quimico|biologico|ergonomico|acidente|psicossocial), nome, descricao, probabilidade (1-5), severidade (1-5), local_exposicao, medidas_existentes }
3. plano_acao: array de { medida, prazo_sugerido (texto), responsavel_sugerido, prioridade (alta|media|baixa), risco_referenciado }

Se alguma informação não for encontrada no documento, use null para o campo. Não invente informações.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `TEXTO DO PGR:\n${texto.slice(0, 30000)}` },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI análise error ${response.status}: ${err}`);
  }
  const result = await response.json();
  const content = result.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content);
}

/**
 * Fallback local: estrutura mínima quando a IA não está disponível.
 * Nunca lança exceção — garante que o status sempre avança para aguardando_revisao.
 */
function fallbackLocalAnalise(texto: string, motivo: string): Record<string, unknown> {
  const linhas = texto.split("\n").filter((l) => l.trim().length > 0);
  return {
    dados_empresa: { nome: null, cnpj: null, responsavel_tecnico: null, cargo_responsavel: null, data_elaboracao: null, validade: null },
    riscos: [],
    plano_acao: [],
    modo_extracao: "fallback_local",
    motivo_fallback: motivo,
    linhas_extraidas: linhas.length,
    aviso: "O OCR com IA não estava disponível. O texto foi extraído localmente. Revise e preencha os dados manualmente antes de confirmar.",
  };
}

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const corsHeaders = buildCorsHeaders(req);

  // ── Preflight CORS ─────────────────────────────────────────
  if (req.method === "OPTIONS") {
    console.log(`[pgr-importar][${requestId}] OPTIONS preflight from origin=${req.headers.get("origin") ?? "no-origin"}`);
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  console.log(`[pgr-importar][${requestId}] ${req.method} request started`);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const openAiApiKey = Deno.env.get("OPENAI_API_KEY");

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    // ── AuthN ────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.warn(`[pgr-importar][${requestId}] Missing or invalid Authorization header`);
      return new Response(JSON.stringify({ error: "Unauthorized: Missing header" }), { status: 200, headers: jsonHeaders });
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user) {
      console.warn(`[pgr-importar][${requestId}] Auth failed: ${userErr?.message ?? "no user"}`);
      return new Response(JSON.stringify({ error: `Unauthorized: ${userErr?.message}` }), { status: 200, headers: jsonHeaders });
    }
    const caller = userData.user;
    console.log(`[pgr-importar][${requestId}] Caller: ${maskName(caller.email ?? caller.id)}`);

    // ── Role check ────────────────────────────────────────────
    const hasServiceKey = !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    console.log(`[pgr-importar][${requestId}] hasServiceKey: ${hasServiceKey}`);

    const { data: roleRows, error: roleErr } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", caller.id);
    
    if (roleErr) {
      console.error(`[pgr-importar][${requestId}] Erro ao buscar roles em user_roles:`, roleErr);
    }
    
    const dbRoles = roleRows?.map(r => r.role) || [];
    const jwtRole = caller.user_metadata?.role || caller.app_metadata?.role;
    if (jwtRole) dbRoles.push(jwtRole);

    const allowedRoles = ["admin_master", "admin_empresa", "analista_rh"];
    const hasAllowedRole = dbRoles.some(r => allowedRoles.includes(r));

    if (!hasAllowedRole) {
      const errMsg = roleErr ? `Database Error: ${roleErr.message}` : `roles are [${dbRoles.join(",")}]`;
      console.warn(`[pgr-importar][${requestId}] Forbidden: ${errMsg}`);
      return new Response(JSON.stringify({ error: `Forbidden: ${errMsg}` }), { status: 200, headers: jsonHeaders });
    }

    const callerRole = dbRoles.find(r => allowedRoles.includes(r)) || dbRoles[0]; // pick the valid one for later logging

    // ── Parse payload ─────────────────────────────────────────
    const rawBody = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      console.warn(`[pgr-importar][${requestId}] Invalid payload:`, parsed.error.flatten());
      return new Response(JSON.stringify({ error: `Invalid payload: ${JSON.stringify(parsed.error.flatten())}` }), { status: 200, headers: jsonHeaders });
    }
    const { importacao_id } = parsed.data;
    console.log(`[pgr-importar][${requestId}] Processing importacao_id=${importacao_id}`);

    // ── Fetch importacao record ───────────────────────────────
    const { data: importacao, error: fetchErr } = await supabaseAdmin
      .from("pgr_importacoes").select("*").eq("id", importacao_id).single();
    if (fetchErr || !importacao) {
      console.error(`[pgr-importar][${requestId}] Importação não encontrada: ${fetchErr?.message}`);
      return new Response(JSON.stringify({ error: `Importação não encontrada: ${fetchErr?.message}` }), { status: 200, headers: jsonHeaders });
    }

    // ── Tenant isolation ──────────────────────────────────────
    if (callerRole !== "admin_master") {
      const { data: profileRow } = await supabaseAdmin
        .from("profiles").select("company_id").eq("user_id", caller.id).maybeSingle();
      if (!profileRow?.company_id || profileRow.company_id !== importacao.company_id) {
        console.warn(`[pgr-importar][${requestId}] Tenant mismatch for caller ${maskName(caller.email ?? caller.id)}`);
        return new Response(JSON.stringify({ error: "Forbidden: Tenant mismatch" }), { status: 200, headers: jsonHeaders });
      }
    }

    // ── Download file from storage ────────────────────────────
    console.log(`[pgr-importar][${requestId}] Downloading from storage: ${importacao.arquivo_storage}`);
    const { data: fileData, error: dlError } = await supabaseAdmin.storage
      .from("documentos_analise")
      .download(importacao.arquivo_storage);

    if (dlError || !fileData) {
      const msg = `Falha ao baixar arquivo do storage: ${dlError?.message ?? "sem dados"}`;
      console.error(`[pgr-importar][${requestId}] ${msg}`);
      await supabaseAdmin.from("pgr_importacoes").update({ status: "erro", erro_mensagem: msg }).eq("id", importacao_id);
      return new Response(JSON.stringify({ error: msg }), { status: 200, headers: jsonHeaders });
    }

    // ── Size check (10MB) ─────────────────────────────────────
    if (fileData.size > MAX_FILE_SIZE_BYTES) {
      const msg = `Arquivo excede o limite de 10MB (${(fileData.size / 1_048_576).toFixed(1)}MB).`;
      console.warn(`[pgr-importar][${requestId}] ${msg}`);
      await supabaseAdmin.from("pgr_importacoes").update({ status: "erro", erro_mensagem: msg }).eq("id", importacao_id);
      return new Response(JSON.stringify({ error: msg }), { status: 200, headers: jsonHeaders });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    console.log(`[pgr-importar][${requestId}] File downloaded: ${bytes.length} bytes`);

    // ── Text extraction ────────────────────────────────────────
    let textoExtraido = extractTextFromPDFBytes(bytes);
    let modoExtracao = "nativo";
    console.log(`[pgr-importar][${requestId}] Native extraction: ${textoExtraido.length} chars`);

    if (textoExtraido.trim().length < 100 && openAiApiKey) {
      console.log(`[pgr-importar][${requestId}] Insufficient text, falling back to OpenAI Vision OCR`);
      try {
        textoExtraido = await extractPdfWithOpenAI(bytes, openAiApiKey);
        modoExtracao = "ocr_openai";
        console.log(`[pgr-importar][${requestId}] OCR extracted: ${textoExtraido.length} chars`);
      } catch (ocrErr) {
        console.warn(`[pgr-importar][${requestId}] OCR failed, keeping native text:`, ocrErr);
      }
    }

    // ── PGR Analysis ───────────────────────────────────────────
    let extracao_raw: Record<string, unknown>;

    if (!openAiApiKey) {
      console.log(`[pgr-importar][${requestId}] OPENAI_API_KEY absent — using local fallback`);
      extracao_raw = fallbackLocalAnalise(textoExtraido, "chave_ia_ausente");
      modoExtracao = "fallback_local";
    } else {
      try {
        console.log(`[pgr-importar][${requestId}] Calling OpenAI for PGR analysis`);
        extracao_raw = await analisarPgrComOpenAI(textoExtraido, openAiApiKey);
        extracao_raw.modo_extracao = modoExtracao === "ocr_openai" ? "ia_openai_ocr" : "ia_openai_nativo";
        const riscoCount = Array.isArray(extracao_raw.riscos) ? extracao_raw.riscos.length : 0;
        console.log(`[pgr-importar][${requestId}] OpenAI analysis done: ${riscoCount} risks found`);
      } catch (iaErr) {
        console.warn(`[pgr-importar][${requestId}] OpenAI analysis failed, using fallback:`, iaErr);
        extracao_raw = fallbackLocalAnalise(textoExtraido, `openai_error: ${iaErr}`);
        modoExtracao = "fallback_local";
      }
    }

    // ── Persist result ─────────────────────────────────────────
    const { error: updateErr } = await supabaseAdmin
      .from("pgr_importacoes")
      .update({ status: "aguardando_revisao", extracao_raw, modo_extracao: modoExtracao })
      .eq("id", importacao_id);

    if (updateErr) {
      console.error(`[pgr-importar][${requestId}] Failed to persist result:`, updateErr);
      throw updateErr;
    }

    console.log(`[pgr-importar][${requestId}] Done — status=aguardando_revisao, modo=${modoExtracao}`);
    return new Response(
      JSON.stringify({ success: true, status: "aguardando_revisao", extracao_raw, modo_extracao: modoExtracao }),
      { status: 200, headers: jsonHeaders }
    );

  } catch (err) {
    console.error(`[pgr-importar][${requestId}] Unexpected error:`, err);
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
    // Retorna 200 com payload de erro para o supabase-js client não esconder o erro
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 200, headers: jsonHeaders }
    );
  }
});
