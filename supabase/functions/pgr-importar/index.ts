import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.3";
import { z } from "https://esm.sh/zod@3.23.8";
import { maskName } from "../_shared/mask.ts";

const MAX_FILE_SIZE_BYTES = 10 * 1_048_576; // 10 MB

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RequestSchema = z.object({
  importacao_id: z.string().uuid(),
});

/**
 * Extrai texto de PDF bytes usando parser nativo (sem dependências externas).
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const openAiApiKey = Deno.env.get("OPENAI_API_KEY");

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // --- AuthN ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const caller = userData.user;

    // --- Role check ---
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", caller.id).maybeSingle();
    const callerRole = roleRow?.role as string | undefined;
    const allowedRoles = ["admin_master", "admin_empresa", "analista_rh"];
    if (!callerRole || !allowedRoles.includes(callerRole)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Parse payload ---
    const rawBody = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid payload", details: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { importacao_id } = parsed.data;

    // --- Fetch importacao record ---
    const { data: importacao, error: fetchErr } = await supabaseAdmin
      .from("pgr_importacoes").select("*").eq("id", importacao_id).single();
    if (fetchErr || !importacao) {
      return new Response(JSON.stringify({ error: "Importação não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Tenant isolation ---
    if (callerRole !== "admin_master") {
      const { data: profileRow } = await supabaseAdmin
        .from("profiles").select("company_id").eq("user_id", caller.id).maybeSingle();
      if (!profileRow?.company_id || profileRow.company_id !== importacao.company_id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Download file from storage ---
    const { data: fileData, error: dlError } = await supabaseAdmin.storage
      .from("documentos_analise")
      .download(importacao.arquivo_storage);

    if (dlError || !fileData) {
      await supabaseAdmin.from("pgr_importacoes").update({ status: "erro", erro_mensagem: "Falha ao baixar arquivo do storage." }).eq("id", importacao_id);
      return new Response(JSON.stringify({ error: "Falha ao acessar o arquivo enviado." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Size check (10MB) ---
    if (fileData.size > MAX_FILE_SIZE_BYTES) {
      await supabaseAdmin.from("pgr_importacoes").update({
        status: "erro",
        erro_mensagem: `Arquivo excede o limite de 10MB (${(fileData.size / 1_048_576).toFixed(1)}MB).`,
      }).eq("id", importacao_id);
      return new Response(JSON.stringify({ error: "Arquivo excede o limite máximo de 10MB." }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // --- Text extraction ---
    let textoExtraido = "";
    let modoExtracao = "nativo";

    textoExtraido = extractTextFromPDFBytes(bytes);
    console.log(`[pgr-importar] Extração nativa: ${textoExtraido.length} chars (importacao=${importacao_id})`);

    if (textoExtraido.trim().length < 100 && openAiApiKey) {
      console.log(`[pgr-importar] Texto insuficiente, usando OpenAI Vision OCR...`);
      try {
        textoExtraido = await extractPdfWithOpenAI(bytes, openAiApiKey);
        modoExtracao = "ocr_openai";
      } catch (ocrErr) {
        console.warn(`[pgr-importar] OCR falhou, usando texto nativo:`, ocrErr);
      }
    }

    // --- PGR Analysis ---
    let extracao_raw: Record<string, unknown>;

    if (!openAiApiKey) {
      console.log(`[pgr-importar] OPENAI_API_KEY ausente. Usando fallback local para ${maskName(caller.email ?? "user")}`);
      extracao_raw = fallbackLocalAnalise(textoExtraido, "chave_ia_ausente");
      modoExtracao = "fallback_local";
    } else {
      try {
        extracao_raw = await analisarPgrComOpenAI(textoExtraido, openAiApiKey);
        extracao_raw.modo_extracao = modoExtracao === "ocr_openai" ? "ia_openai_ocr" : "ia_openai_nativo";
      } catch (iaErr) {
        console.warn(`[pgr-importar] Análise OpenAI falhou, usando fallback:`, iaErr);
        extracao_raw = fallbackLocalAnalise(textoExtraido, `openai_error: ${iaErr}`);
        modoExtracao = "fallback_local";
      }
    }

    // --- Persist result ---
    const { error: updateErr } = await supabaseAdmin
      .from("pgr_importacoes")
      .update({
        status: "aguardando_revisao",
        extracao_raw,
        modo_extracao: modoExtracao,
      })
      .eq("id", importacao_id);

    if (updateErr) throw updateErr;

    return new Response(
      JSON.stringify({ success: true, status: "aguardando_revisao", extracao_raw, modo_extracao: modoExtracao }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[pgr-importar] Unexpected error:", err);
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
