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
 * Extrai dados do PGR (PDF) usando Gemini 2.5 Flash Multimodal.
 * O PDF é enviado inteiramente como base64, dispensando OCR local ou extração manual.
 */
async function analisarPgrComGemini(bytes: Uint8Array, apiKey: string): Promise<Record<string, unknown>> {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);

  const systemPrompt = `Você é um especialista em Segurança do Trabalho e NR-1 (Programa de Gerenciamento de Riscos — PGR).
Extraia do documento PGR todos os riscos e todas as ações do plano de ação, sem omitir nenhum.`;

  const schema = {
    type: "OBJECT",
    properties: {
      dados_empresa: {
        type: "OBJECT",
        properties: {
          nome_empresa: { type: "STRING" },
          cnpj: { type: "STRING" },
          responsavel_tecnico: { type: "STRING" },
          cargo_responsavel: { type: "STRING" },
          data_elaboracao: { type: "STRING" },
          validade: { type: "STRING" }
        }
      },
      riscos: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            agente: { type: "STRING" },
            tipo: { type: "STRING", description: "fisico, quimico, ergonomico, psicossocial, biologico ou acidente" },
            descricao: { type: "STRING" },
            fonte: { type: "STRING" },
            meios_de_controle: { type: "STRING" },
            classificacao: { type: "STRING" }
          }
        }
      },
      plano_acao: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            acao: { type: "STRING" },
            prazo: { type: "STRING" },
            responsavel: { type: "STRING" },
            status: { type: "STRING" }
          }
        }
      }
    }
  };

  const ac = new AbortController();
  const timeoutId = setTimeout(() => ac.abort(), 120000); // 120s timeout

  let response;
  let retryCount = 0;
  const inicio = Date.now();
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      retryCount = attempt;
      const elapsed = Date.now() - inicio;
      if (elapsed > 120000) {
        console.warn(`[Gemini API] Timeout atingido (${elapsed}ms). Abortando retry e indo para o fallback.`);
        throw new Error("tempo esgotado");
      }

      try {
        response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
          method: "POST",
          headers: {
            "x-goog-api-key": apiKey.trim(),
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: systemPrompt },
                { inlineData: { mimeType: "application/pdf", data: base64 } }
              ]
            }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: schema,
              temperature: 0.2,
              maxOutputTokens: 65536
            }
          }),
          signal: ac.signal
        });

        if (response.ok) break;

        // Se der 429 ou 5xx tenta mais uma vez
        if (response.status === 429 || response.status >= 500) {
          if (attempt < 2) {
            const delay = 400 * Math.pow(2, attempt);
            console.log(`[Gemini API] Retry trigger on status ${response.status} (attempt ${attempt + 1}/2). Waiting ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
        }

        const err = await response.text();
        console.error(JSON.stringify({ 
          error: "Gemini API Failure", 
          status: response.status, 
          retry_count: attempt, 
          elapsed_ms: Date.now() - inicio,
          details: err 
        }));
        throw new Error(`http_${response.status}`);
      } catch (err) {
        if (attempt === 2 || (err instanceof Error && err.name === 'AbortError')) throw err;
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response) {
    throw new Error("api_error");
  }

  const result = await response.json();
  const candidate = result.candidates?.[0];
  
  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new Error('truncated');
  }

  let content = candidate?.content?.parts?.[0]?.text ?? "{}";
  // Parse resiliente: tira possíveis blocos markdown q o Gemini possa ter retornado mesmo com schema
  content = content.replace(/^```json/gmi, "").replace(/```$/gmi, "").trim();

  try {
    return JSON.parse(content);
  } catch (err) {
    console.error("[Gemini API] JSON Parse falhou. Content:", content.substring(0, 200) + "...");
    throw new Error("parse_failed");
  }
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
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    if (!geminiApiKey || geminiApiKey.trim() === "") {
      const msg = "Segredo GEMINI_API_KEY não configurado no runtime";
      console.error(`[pgr-importar][${requestId}] ${msg}`);
      return new Response(JSON.stringify({ error: msg }), { status: 400, headers: jsonHeaders });
    }

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

    let modoExtracao = "nativo";
    let extracao_raw: Record<string, unknown>;
    const startTime = Date.now();

    // ── PGR Analysis via Gemini ────────────────────────────────
    try {
      console.log(`[pgr-importar][${requestId}] Calling Gemini for PGR analysis`);
      const rawGemini = await analisarPgrComGemini(bytes, geminiApiKey);
        
        // Mapeia do JSON Gemini para o formato esperado pelo frontend (extracao_raw original)
        extracao_raw = {
          dados_empresa: {
            nome: rawGemini.dados_empresa?.nome_empresa ?? null,
            cnpj: rawGemini.dados_empresa?.cnpj ?? null,
            responsavel_tecnico: rawGemini.dados_empresa?.responsavel_tecnico ?? null,
            cargo_responsavel: rawGemini.dados_empresa?.cargo_responsavel ?? null,
            data_elaboracao: rawGemini.dados_empresa?.data_elaboracao ?? null,
            validade: rawGemini.dados_empresa?.validade ?? null
          },
          riscos: (rawGemini.riscos || []).map((r: any) => ({
            categoria: r.tipo ?? "outros",
            nome: r.agente ?? "Risco não especificado",
            descricao: r.descricao ?? null,
            probabilidade: 3, // fallback padrao
            severidade: 3,
            local_exposicao: r.fonte ?? null,
            medidas_existentes: r.meios_de_controle ?? null,
          })),
          plano_acao: (rawGemini.plano_acao || []).map((a: any) => ({
            medida: a.acao ?? "Ação não especificada",
            prazo_sugerido: a.prazo ?? null,
            responsavel_sugerido: a.responsavel ?? null,
            prioridade: "media",
            risco_referenciado: null,
            status: a.status === "concluida" || a.status === "concluído" ? "concluida" : "pendente"
          })),
          modo_extracao: "ia_gemini_multimodal"
        };
        modoExtracao = "ia_gemini_multimodal";
        const riscoCount = Array.isArray(extracao_raw.riscos) ? extracao_raw.riscos.length : 0;
        console.log(`[pgr-importar][${requestId}] Gemini analysis done: ${riscoCount} risks found`);
      } catch (iaErr: any) {
        console.warn(`[pgr-importar][${requestId}] Gemini analysis failed, using fallback:`, iaErr);
        
        let motivo = "api_error";
        if (iaErr?.name === "AbortError") motivo = "tempo esgotado";
        else if (iaErr?.message?.includes("truncated")) motivo = "resposta truncada";
        else if (iaErr?.message?.includes("parse_failed")) motivo = "parse_failed";
        else if (iaErr?.message?.includes("http_429")) motivo = "limite por minuto";
        else if (iaErr?.message) motivo = iaErr.message;
        
        const textoExtraido = extractTextFromPDFBytes(bytes);
        const fbLocal = fallbackLocalAnalise(textoExtraido, motivo);
        
        // Mesclagem de extracao_raw para não destruir o que tinha, adicionando o erro real.
        const prevExtracaoRaw = importacao.extracao_raw && typeof importacao.extracao_raw === 'object' ? importacao.extracao_raw : {};
        extracao_raw = {
          ...prevExtracaoRaw,
          ...fbLocal,
          metodo: "local",
          erro: {
            mensagem: iaErr?.message || String(iaErr),
            duracao_ms: Date.now() - startTime,
            bytes_pdf: bytes.length,
            motivo
          }
        };
        modoExtracao = "fallback_local";
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
