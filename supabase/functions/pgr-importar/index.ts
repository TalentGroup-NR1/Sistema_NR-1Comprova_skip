import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.3";
import { z } from "https://esm.sh/zod@3.23.8";
import { maskName } from "../_shared/mask.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { mapGeminiRiscos } from "../_shared/pgrMapper.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { fallbackLocalAnalise } from "../_shared/pgrFallback.ts";

const MAX_FILE_SIZE_BYTES = 10 * 1_048_576; // 10 MB
const TIMEOUT_MS = 240000; // 240 segundos (4 minutos) - teto de espera da IA
export const RETRY_DELAYS_MS = [1000, 4000, 10000]; // ~1s, ~4s, ~10s (até 3 tentativas adicionais / 4 no total)

/** Códigos de status HTTP da API Gemini que justificam retentativa automática (erros transitórios de demanda/rate-limit). */
export function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 504);
}

/** Calcula o tempo de pausa para retentativa com jitter leve (até 20%) para evitar sincronismo. */
export function calcRetryDelayMs(attempt: number, addJitter = true): number {
  const base = RETRY_DELAYS_MS[attempt] ?? 10000;
  if (!addJitter) return base;
  const jitter = Math.floor(Math.random() * (base * 0.2));
  return base + jitter;
}

/**
 * Retorna o nome do modelo Gemini a ser utilizado.
 * Lê prioritariamente da variável de ambiente GEMINI_MODEL configurada no Supabase Secrets.
 * Fallback padrão oficial: 'gemini-3.8-flash'.
 */
export function getGeminiModelName(): string {
  try {
    const envModel = Deno.env.get("GEMINI_MODEL")?.trim();
    if (envModel) {
      return envModel.replace(/^models\//, "");
    }
  } catch {
    // Ambiente sem Deno.env (ex.: testes unitários isolados)
  }
  return "gemini-3.8-flash";
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
 * Extrai dados do PGR (PDF) usando Gemini 3.8 Flash Multimodal (ou modelo definido em GEMINI_MODEL).
 * O PDF é enviado inteiramente como base64, dispensando OCR local ou extração manual.
 */
async function analisarPgrComGemini(bytes: Uint8Array, apiKey: string): Promise<Record<string, unknown>> {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);

  const systemPrompt = `Você é um especialista em Segurança do Trabalho e NR-1 (Programa de Gerenciamento de Riscos — PGR).
Extraia do documento PGR todos os riscos e todas as ações do plano de ação, sem omitir nenhum.
Seja agnóstico à estrutura do documento. Resolva a seção por significado e não por título literal (ex. "Inventário de Riscos", "Levantamento de Perigos", "Matriz", etc).
Normalize sinônimos (ex. perigo, fator de risco, agente nocivo).
Percorra o documento inteiro, incluindo anexos e tabelas embutidas.
Não invente valores; se o campo estiver ausente, retorne nulo ou vazio.
Identifique a escala da matriz de risco no documento (ex. 3x3, 4x4, 5x5).
Nunca armazene ou extraia nomes de trabalhadores identificados (dado de saúde sensível). Em riscos psicossociais, não armazene resposta individual identificada.`;

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
          registro_profissional: { type: "STRING", description: "CREA, CRM, MTE ou similar do responsável técnico" },
          data_elaboracao: { type: "STRING", description: "Formato YYYY-MM-DD se possível" },
          validade: { type: "STRING" }
        }
      },
      riscos: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            perigo: { type: "STRING", description: "Perigo, agente ou fator de risco" },
            categoria: { type: "STRING", description: "fisico, quimico, ergonomico, psicossocial, biologico ou acidente" },
            descricao: { type: "STRING", description: "Descrição do risco ou possíveis lesões" },
            grupo_exposto: { type: "STRING" },
            probabilidade: { type: "NUMBER" },
            severidade: { type: "NUMBER" },
            nivel: { type: "NUMBER" },
            classificacao: { type: "STRING" },
            escala_matriz: { type: "STRING", description: "Ex: 3x3, 4x4, 5x5" },
            medidas_existentes: { type: "STRING" },
            fonte: { type: "STRING", description: "Página ou seção de onde foi extraído" },
            confianca: { type: "NUMBER", description: "Nível de confiança na extração, de 0 a 100" }
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
            status: { type: "STRING" },
            por_que: { type: "STRING" },
            onde: { type: "STRING" },
            como: { type: "STRING" },
            custo_estimado: { type: "NUMBER", description: "Custo orçado numérico se houver, ou 0" }
          }
        }
      }
    }
  };

  const ac = new AbortController();
  const timeoutId = setTimeout(() => ac.abort(), TIMEOUT_MS);

  let response: Response | undefined;
  let lastErrorSnippet = "";
  const inicio = Date.now();
  try {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      const elapsed = Date.now() - inicio;
      if (elapsed > TIMEOUT_MS) {
        console.warn(`[Gemini API] Timeout atingido (${elapsed}ms). Abortando retry.`);
        throw new Error("tempo esgotado");
      }

      try {
        const modelName = getGeminiModelName();
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`, {
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
              // Teto suportado pelo Gemini 3.8 Flash: até 65.536 tokens de saída
              maxOutputTokens: 65536
            }
          }),
          signal: ac.signal
        });

        if (response.ok) {
          if (attempt > 0) {
            console.log(`[Gemini API] Sucesso na tentativa ${attempt + 1} após retentativa com backoff.`);
          }
          break;
        }

        const isRetryable = isRetryableHttpStatus(response.status);
        const errBody = await response.text();
        lastErrorSnippet = errBody.substring(0, 500);

        // Erros permanentes (ex: 400 Bad Request, 401/403 Auth, 404 Modelo, 413 Payload) -> não retenta
        if (!isRetryable) {
          console.error(`[Gemini API Erro Permanente] status=${response.status} time=${new Date().toISOString()} body=${lastErrorSnippet}`);
          throw new Error(`http_${response.status}|${lastErrorSnippet}`);
        }

        // Se o erro for transitório (429 ou 502/503/504) e restam retries -> pausa com backoff
        if (attempt < RETRY_DELAYS_MS.length) {
          const delay = calcRetryDelayMs(attempt);
          console.warn(`[Gemini API Alta Demanda/RateLimit] status=${response.status} (tentativa ${attempt + 1}/${RETRY_DELAYS_MS.length + 1}). Aguardando ${delay}ms para retry...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        // Esgotou todas as 3 tentativas adicionais
        console.error(`[Gemini API Retentativas Esgotadas] status=${response.status} após ${attempt + 1} tentativas.`);
        throw new Error(`http_${response.status}|${lastErrorSnippet}`);

      } catch (err: any) {
        // Se for abort/timeout do controller, ou erro permanente já disparado, propaga imediatamente
        if (err instanceof Error && (err.name === 'AbortError' || err.message === 'tempo esgotado' || err.message?.startsWith('http_'))) {
          throw err;
        }

        // Erro de rede/socket transitório no fetch()
        if (attempt < RETRY_DELAYS_MS.length) {
          const delay = calcRetryDelayMs(attempt);
          console.warn(`[Gemini API Erro de Rede] ${err?.message}. Tentativa ${attempt + 1}/${RETRY_DELAYS_MS.length + 1}. Aguardando ${delay}ms para retry...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response || !response.ok) {
    throw new Error(`api_error|${lastErrorSnippet || "sem resposta"}`);
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



serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const corsHeaders = buildCorsHeaders(req);
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  // ── Preflight CORS ─────────────────────────────────────────
  if (req.method === "OPTIONS") {
    console.log(`[pgr-importar][${requestId}] OPTIONS preflight from origin=${req.headers.get("origin") ?? "no-origin"}`);
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  console.log(`[pgr-importar][${requestId}] ${req.method} request started`);

  let supabaseAdminGlobal: ReturnType<typeof createClient> | null = null;
  let importacaoIdGlobal: string | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error(`[pgr-importar][${requestId}] Variáveis de ambiente ausentes`);
      return new Response(
        JSON.stringify({ error: "Configuração do servidor incompleta" }),
        { status: 200, headers: jsonHeaders }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    supabaseAdminGlobal = supabaseAdmin;

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

    const callerRole = dbRoles.find(r => allowedRoles.includes(r)) || dbRoles[0];

    // ── Parse payload ─────────────────────────────────────────
    const rawBody = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      console.warn(`[pgr-importar][${requestId}] Invalid payload:`, parsed.error.flatten());
      return new Response(JSON.stringify({ error: `Invalid payload: ${JSON.stringify(parsed.error.flatten())}` }), { status: 200, headers: jsonHeaders });
    }
    const { importacao_id } = parsed.data;
    importacaoIdGlobal = importacao_id;
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

    // ── PGR Analysis via Gemini ────────────────────────────────
    try {
      console.log(`[pgr-importar][${requestId}] Calling Gemini for PGR analysis`);
      const rawGemini = await analisarPgrComGemini(bytes, geminiApiKey);
      
      // Mapeia do JSON Gemini para o formato esperado pelo frontend (extracao_raw original)
      const r = rawGemini as any;
      extracao_raw = {
        dados_empresa: {
          nome: r.dados_empresa?.nome_empresa ?? null,
          cnpj: r.dados_empresa?.cnpj ?? null,
          responsavel_tecnico: r.dados_empresa?.responsavel_tecnico ?? null,
          cargo_responsavel: r.dados_empresa?.cargo_responsavel ?? null,
          registro_profissional: r.dados_empresa?.registro_profissional ?? null,
          data_elaboracao: r.dados_empresa?.data_elaboracao ?? null,
          validade: r.dados_empresa?.validade ?? null
        },
        riscos: mapGeminiRiscos(r.riscos),
        plano_acao: (r.plano_acao || []).map((a: any) => ({
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
      console.warn(`[pgr-importar][${requestId}] Gemini analysis failed:`, iaErr);
      
      const isTimeout = iaErr?.name === "AbortError" || iaErr?.message === "tempo esgotado";
      const errMsg = iaErr?.message || "";
      const is404 = errMsg.includes("http_404") || errMsg.includes("NOT_FOUND") || errMsg.includes("no longer available");
      const isUnavailable = errMsg.includes("http_5") || 
                            errMsg.includes("http_429") || 
                            errMsg.includes("high demand") || 
                            errMsg.includes("UNAVAILABLE") ||
                            errMsg.includes("RESOURCE_EXHAUSTED");
      
      let amigavelMsg = "Falha na extração de dados do PGR.";
      if (isTimeout) {
        amigavelMsg = "A análise demorou mais que o esperado (documento muito extenso). Tente reimportar um arquivo menor ou em outro momento.";
      } else if (is404) {
        amigavelMsg = "O modelo de IA está em atualização ou temporariamente indisponível. Por favor, contate o suporte técnico.";
      } else if (isUnavailable) {
        amigavelMsg = "O serviço de inteligência artificial está temporariamente ocupado com alta demanda. Por favor, aguarde alguns minutos e tente novamente.";
      } else {
        amigavelMsg = "Não foi possível extrair dados do documento PGR. Verifique se o arquivo PDF está legível e tente novamente.";
      }

      // Detalhes técnicos completos ficam no log interno do servidor para auditoria técnica
      console.error(`[pgr-importar][${requestId}] Log técnico da falha de IA:`, errMsg);
      
      // Atualiza diretamente para erro para não prender o usuário em "processando" ou "aguardando revisão"
      await supabaseAdmin.from("pgr_importacoes")
        .update({ status: "erro", erro_mensagem: amigavelMsg })
        .eq("id", importacao_id);
        
      return new Response(
        JSON.stringify({ error: amigavelMsg }),
        { status: 200, headers: jsonHeaders }
      );
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
    console.error(`[pgr-importar][${requestId}] Unexpected error no catch global:`, err);
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
    
    // Tenta atualizar para 'erro' no banco usando os globals
    if (supabaseAdminGlobal && importacaoIdGlobal) {
      try {
        await supabaseAdminGlobal.from("pgr_importacoes")
          .update({ status: "erro", erro_mensagem: `Falha interna: ${errorMsg}` })
          .eq("id", importacaoIdGlobal);
      } catch (dbErr) {
        console.error(`[pgr-importar][${requestId}] Falha ao tentar marcar status como erro:`, dbErr);
      }
    }
    
    // Retorna 200 com payload de erro para o supabase-js client não esconder o erro de rede
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 200, headers: jsonHeaders }
    );
  }
});
