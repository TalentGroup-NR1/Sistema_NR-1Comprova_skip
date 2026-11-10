import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.3";
import { inflateSync } from "https://esm.sh/fflate@0.8.2";
import { z } from "https://esm.sh/zod@3.23.8";
import { maskName } from "../_shared/mask.ts";
import { generateLocalFallbackAnalysis } from "../_shared/profileAnalysisFallback.ts";

const MAX_BODY_BYTES = 20 * 1_048_576; // 20 MB
const MAX_FILE_SIZE_BYTES = 10 * 1_048_576; // 10 MB por arquivo

const AnalyzeProfileSchema = z.object({
  analise_id: z.string().uuid(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function extractTextFromFile(
  supabaseAdmin: ReturnType<typeof createClient>,
  path: string
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from("documentos_analise")
    .download(path);

  if (error || !data) {
    throw new Error(`Falha ao baixar arquivo: ${path} - ${error?.message}`);
  }

  // Validação de limite de tamanho (10MB)
  if (data.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Arquivo "${path}" excede o limite máximo permitido de 10MB (${(data.size / 1_048_576).toFixed(1)}MB).`);
  }

  const fileName = path.toLowerCase();

  // For TXT files, read directly
  if (fileName.endsWith(".txt")) {
    return await data.text();
  }

  // For PDF files, extract text using basic parser with OpenAI Vision OCR fallback
  if (fileName.endsWith(".pdf")) {
    const arrayBuffer = await data.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const text = extractTextFromPDFBytes(bytes);
    if (text.trim().length >= 50) {
      return text;
    }
    // Fallback: use OpenAI Vision for scanned/image PDFs if OPENAI_API_KEY is configured
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (openAiKey) {
      console.log(`PDF nativo retornou pouco texto (${text.trim().length} chars), usando OCR via OpenAI Vision...`);
      try {
        return await extractTextWithOpenAIVision(bytes, openAiKey, "application/pdf");
      } catch (ocrErr) {
        console.warn("OpenAI Vision OCR falhou, usando texto nativo residual:", ocrErr);
      }
    }
    return text.trim() || `Documento PDF "${path}" carregado para análise.`;
  }

  // For DOCX, try basic extraction with OpenAI Vision OCR fallback
  if (fileName.endsWith(".docx")) {
    const arrayBuffer = await data.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const text = await extractTextFromDocxBytes(bytes);
    if (text.trim().length >= 50) {
      return text;
    }
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (openAiKey) {
      console.log(`DOCX extraction returned little text (${text.trim().length} chars), using OpenAI Vision OCR...`);
      try {
        return await extractTextWithOpenAIVision(bytes, openAiKey, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      } catch (ocrErr) {
        console.warn("OpenAI Vision OCR falhou no DOCX, usando texto residual:", ocrErr);
      }
    }
    return text.trim() || `Documento DOCX "${path}" carregado para análise.`;
  }

  // Fallback: try to read as text
  return await data.text();
}

/**
 * Basic PDF text extraction without external libraries.
 * Extracts text streams from PDF content.
 */
function extractTextFromPDFBytes(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes);
  const textParts: string[] = [];

  // Extract text between BT and ET markers (text objects)
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match: RegExpExecArray | null;

  while ((match = btEtRegex.exec(raw)) !== null) {
    const block = match[1];

    // Extract text from Tj and TJ operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      textParts.push(decodePDFString(tjMatch[1]));
    }

    // TJ array operator
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    let tjArrMatch: RegExpExecArray | null;
    while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
      const inner = tjArrMatch[1];
      const strRegex = /\(([^)]*)\)/g;
      let strMatch: RegExpExecArray | null;
      while ((strMatch = strRegex.exec(inner)) !== null) {
        textParts.push(decodePDFString(strMatch[1]));
      }
    }
  }

  return textParts.join(" ").replace(/\s+/g, " ").trim();
}

function decodePDFString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

/**
 * Properly extract text from DOCX by unzipping and parsing word/document.xml.
 */
async function extractTextFromDocxBytes(bytes: Uint8Array): Promise<string> {
  try {
    const xmlContent = await extractFileFromZip(bytes, "word/document.xml");
    if (!xmlContent) {
      return "";
    }

    const paragraphs: string[] = [];
    const paraRegex = /<w:p[\s>]([\s\S]*?)<\/w:p>/g;
    let paraMatch: RegExpExecArray | null;

    while ((paraMatch = paraRegex.exec(xmlContent)) !== null) {
      const paraContent = paraMatch[1];
      const textParts: string[] = [];
      const textRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
      let textMatch: RegExpExecArray | null;
      while ((textMatch = textRegex.exec(paraContent)) !== null) {
        textParts.push(textMatch[1]);
      }
      if (textParts.length > 0) {
        paragraphs.push(textParts.join(""));
      }
    }

    if (paragraphs.length > 0) {
      return paragraphs.join("\n");
    }

    const allText: string[] = [];
    const fallbackRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let fbMatch: RegExpExecArray | null;
    while ((fbMatch = fallbackRegex.exec(xmlContent)) !== null) {
      allText.push(fbMatch[1]);
    }
    return allText.join(" ");
  } catch (err) {
    console.error("DOCX ZIP extraction failed:", err);
    return "";
  }
}

/**
 * Extract a file from a ZIP archive using native Web APIs.
 */
async function extractFileFromZip(zipBytes: Uint8Array, targetPath: string): Promise<string | null> {
  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);
  let offset = 0;

  while (offset < zipBytes.length - 4) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break;

    const compressionMethod = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const uncompressedSize = view.getUint32(offset + 22, true);
    const fileNameLen = view.getUint16(offset + 26, true);
    const extraFieldLen = view.getUint16(offset + 28, true);

    const fileNameBytes = zipBytes.slice(offset + 30, offset + 30 + fileNameLen);
    const fileName = new TextDecoder().decode(fileNameBytes);

    const dataStart = offset + 30 + fileNameLen + extraFieldLen;

    if (fileName === targetPath) {
      const fileData = zipBytes.slice(dataStart, dataStart + compressedSize);

      if (compressionMethod === 0) {
        return new TextDecoder("utf-8").decode(fileData);
      } else if (compressionMethod === 8) {
        const decompressed = inflateSync(fileData);
        return new TextDecoder("utf-8").decode(decompressed);
      } else {
        return null;
      }
    }

    offset = dataStart + compressedSize;
  }

  return null;
}

/**
 * Extract text from a scanned/image document using OpenAI GPT-4o Vision API.
 */
async function extractTextWithOpenAIVision(bytes: Uint8Array, openAiKey: string, mimeType: string = "application/pdf"): Promise<string> {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extraia TODO o texto deste documento. Retorne apenas o texto extraído, sem formatação adicional, sem comentários." },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha no OCR via OpenAI Vision (${response.status}): ${errText}`);
  }

  const result = await response.json();
  const text = result.choices?.[0]?.message?.content || "";
  if (text.trim().length < 10) {
    throw new Error("OpenAI Vision não conseguiu extrair texto legível do documento.");
  }
  return text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const openAiApiKey = Deno.env.get("OPENAI_API_KEY");

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // --- AuthN/AuthZ: validate JWT + role + company ownership ---
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

    const contentLength = Number(req.headers.get('content-length') ?? '0');
    if (contentLength > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = AnalyzeProfileSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload', details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { analise_id } = parsed.data;

    // Caller's active role via get_my_role() (which evaluates profiles.active_role)
    const { data: activeRoleRpc, error: roleRpcErr } = await supabaseUser.rpc("get_my_role");
    let callerRole: string | null = activeRoleRpc as string | null;

    if (roleRpcErr || !callerRole) {
      const { data: rolesRows } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id);
      callerRole = rolesRows?.[0]?.role ?? null;
    }

    const allowedRoles = ["admin_master", "admin_empresa", "analista_rh"];
    if (!callerRole || !allowedRoles.includes(callerRole)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the analysis record
    const { data: analise, error: fetchError } = await supabaseAdmin
      .from("analises_perfil")
      .select("*")
      .eq("id", analise_id)
      .single();

    if (fetchError || !analise) {
      return new Response(
        JSON.stringify({ error: "Análise não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tenant isolation: non-master must belong to the same company as the analysis
    if (callerRole !== "admin_master") {
      const { data: profileRow } = await supabaseAdmin
        .from("profiles")
        .select("company_id")
        .eq("user_id", caller.id)
        .maybeSingle();
      if (!profileRow?.company_id || profileRow.company_id !== analise.company_id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Update status to processing
    await supabaseAdmin
      .from("analises_perfil")
      .update({ status: "processando" })
      .eq("id", analise_id);

    // Extract text from all 4 documents
    const docPaths = {
      alinhamento: analise.doc_alinhamento_path,
      anuncio: analise.doc_anuncio_path,
      entrevista: analise.doc_entrevista_path,
      curriculo: analise.doc_curriculo_path,
    };

    const texts: Record<string, string> = {};

    for (const [key, path] of Object.entries(docPaths)) {
      if (!path) {
        await supabaseAdmin
          .from("analises_perfil")
          .update({
            status: "erro",
            resultado: { error: `Documento "${key}" não foi fornecido.` },
          })
          .eq("id", analise_id);

        return new Response(
          JSON.stringify({ error: `Documento "${key}" ausente` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        texts[key] = await extractTextFromFile(supabaseAdmin, path);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
        console.error(`Erro ao processar ${key}:`, errorMsg);

        await supabaseAdmin
          .from("analises_perfil")
          .update({
            status: "erro",
            resultado: { error: `Falha ao processar documento "${key}": ${errorMsg}` },
          })
          .eq("id", analise_id);

        return new Response(
          JSON.stringify({ error: `Falha ao processar "${key}": ${errorMsg}` }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const systemPrompt = `Você é um analista de recrutamento e seleção ESPECIALISTA com mais de 20 anos de experiência em consultoria de R&S. Seu papel é pensar como um headhunter sênior que avalia candidatos com rigor profissional.

Você receberá 4 documentos e deve realizar DUAS ANÁLISES CRUZADAS INDEPENDENTES:

**ANÁLISE 1 — ALINHAMENTO COM CLIENTE × ENTREVISTA DO CANDIDATO**
Cruze o que o cliente solicitou na reunião de alinhamento (perfil ideal, competências, modelo de trabalho, requisitos técnicos e comportamentais) com o que o candidato demonstrou/declarou na entrevista. Avalie se o candidato entrega o que o cliente precisa.

**ANÁLISE 2 — ANÚNCIO DA VAGA × CURRÍCULO DO CANDIDATO**
Cruze o que foi publicado no anúncio da vaga (requisitos formais, experiência, formação, certificações) com o que o currículo do candidato apresenta. Avalie a proximidade documental entre o perfil publicado e o perfil apresentado.

PARA CADA ANÁLISE, você deve fornecer:
- **percentual_aderencia** (0-100): nota de aderência específica daquele cruzamento
- **convergencias**: pontos onde o candidato atende ao requisitado
- **divergencias**: pontos onde o candidato NÃO atende ao requisitado
- **pontos_atencao**: alertas, dealbreakers, riscos identificados
- **pontos_fortes**: diferenciais positivos do candidato que vão além do solicitado
- **parecer**: parecer profissional de consultoria (2-3 parágrafos) com linguagem de relatório executivo

REGRAS DE PONTUAÇÃO RIGOROSA:
1. Identifique requisitos INEGOCIÁVEIS (CNH, disponibilidade de viagem, stack técnica obrigatória, formação específica, certificações, idiomas obrigatórios, experiência mínima).
2. Se o candidato tiver DIVERGÊNCIA em requisito inegociável, o percentual daquela análise NÃO PODE ultrapassar 50%.
3. Acima de 70%: SOMENTE se cumprir TODOS os requisitos obrigatórios.
4. 51-70%: Cumpre maioria dos obrigatórios mas tem lacunas em desejáveis.
5. 0-50%: Divergência em pelo menos um requisito obrigatório.

AO FINAL, forneça:
- **percentual_aderencia_geral**: média ponderada (50% cada análise), arredondada
- **conclusao_geral**: parecer consolidado (3-4 parágrafos) com recomendação final como analista de R&S, incluindo: recomendação (aprovar/reprovar/aprovar com ressalvas), justificativa, e sugestões para próximos passos.`;

    const userPrompt = `Analise a aderência do candidato "${analise.candidato_nome}" para a vaga "${analise.vaga}".

--- ALINHAMENTO COM CLIENTE (Reunião de Alinhamento da Vaga) ---
${texts.alinhamento?.slice(0, 8000) || "Sem conteúdo"}

--- ANÚNCIO DA VAGA ---
${texts.anuncio?.slice(0, 8000) || "Sem conteúdo"}

--- ENTREVISTA DO CANDIDATO ---
${texts.entrevista?.slice(0, 8000) || "Sem conteúdo"}

--- CURRÍCULO DO CANDIDATO ---
${texts.curriculo?.slice(0, 8000) || "Sem conteúdo"}`;

    const blocoSchema = {
      type: "object",
      properties: {
        percentual_aderencia: { type: "integer", minimum: 0, maximum: 100, description: "Percentual de aderência deste cruzamento (0-100)" },
        convergencias: { type: "array", items: { type: "string" }, description: "Pontos de convergência identificados" },
        divergencias: { type: "array", items: { type: "string" }, description: "Pontos de divergência identificados" },
        pontos_atencao: { type: "array", items: { type: "string" }, description: "Pontos de atenção, alertas e dealbreakers" },
        pontos_fortes: { type: "array", items: { type: "string" }, description: "Pontos fortes e diferenciais do candidato" },
        parecer: { type: "string", description: "Parecer profissional de consultoria (2-3 parágrafos)" },
      },
      required: ["percentual_aderencia", "convergencias", "divergencias", "pontos_atencao", "pontos_fortes", "parecer"],
    };

    let resultado: Record<string, unknown>;

    if (!openAiApiKey) {
      console.log(`OPENAI_API_KEY não configurada. Gerando análise estruturada com fallback local para ${maskName(analise.candidato_nome)}...`);
      resultado = generateLocalFallbackAnalysis(analise.candidato_nome, analise.vaga, texts, "chave_ia_ausente");
    } else {
      try {
        const aiResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openAiApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "analise_aderencia",
                    description: "Retorna as duas análises cruzadas de aderência do candidato à vaga.",
                    parameters: {
                      type: "object",
                      properties: {
                        analise_alinhamento_entrevista: { ...blocoSchema, description: "Análise 1: Alinhamento com Cliente × Entrevista do Candidato" },
                        analise_anuncio_curriculo: { ...blocoSchema, description: "Análise 2: Anúncio da Vaga × Currículo do Candidato" },
                        percentual_aderencia_geral: { type: "integer", minimum: 0, maximum: 100, description: "Percentual de aderência geral consolidado (média ponderada)" },
                        conclusao_geral: { type: "string", description: "Conclusão geral consolidada com recomendação final (3-4 parágrafos)" },
                      },
                      required: ["analise_alinhamento_entrevista", "analise_anuncio_curriculo", "percentual_aderencia_geral", "conclusao_geral"],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: {
                type: "function",
                function: { name: "analise_aderencia" },
              },
            }),
          }
        );

        if (!aiResponse.ok) {
          const statusCode = aiResponse.status;
          const errorText = await aiResponse.text();
          console.warn(`OpenAI API retornou status ${statusCode}. Acionando fallback gracioso:`, errorText);
          resultado = generateLocalFallbackAnalysis(analise.candidato_nome, analise.vaga, texts, `openai_status_${statusCode}`);
        } else {
          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

          if (toolCall?.function?.arguments) {
            try {
              resultado = JSON.parse(toolCall.function.arguments);
            } catch {
              console.warn("Falha ao fazer parse do tool_call da OpenAI, usando fallback local...");
              resultado = generateLocalFallbackAnalysis(analise.candidato_nome, analise.vaga, texts, "parse_error");
            }
          } else {
            console.warn("OpenAI não retornou tool_call estruturado, usando fallback local...");
            resultado = generateLocalFallbackAnalysis(analise.candidato_nome, analise.vaga, texts, "missing_tool_call");
          }
        }
      } catch (openAiErr) {
        console.warn("Exceção na chamada OpenAI. Acionando fallback local gracioso:", openAiErr);
        resultado = generateLocalFallbackAnalysis(analise.candidato_nome, analise.vaga, texts, "network_exception");
      }
    }

    // Ensure percentual values are integers 0-100
    const clampPct = (v: unknown) => typeof v === "number" ? Math.round(Math.min(100, Math.max(0, v))) : 0;

    if (resultado.analise_alinhamento_entrevista && typeof resultado.analise_alinhamento_entrevista === "object") {
      (resultado.analise_alinhamento_entrevista as Record<string, unknown>).percentual_aderencia =
        clampPct((resultado.analise_alinhamento_entrevista as Record<string, unknown>).percentual_aderencia);
    }
    if (resultado.analise_anuncio_curriculo && typeof resultado.analise_anuncio_curriculo === "object") {
      (resultado.analise_anuncio_curriculo as Record<string, unknown>).percentual_aderencia =
        clampPct((resultado.analise_anuncio_curriculo as Record<string, unknown>).percentual_aderencia);
    }
    resultado.percentual_aderencia_geral = clampPct(resultado.percentual_aderencia_geral);

    // Raw job ad text
    const rawAnuncio = (texts.anuncio || "")
      .replace(/\0/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    resultado.texto_anuncio_bruto = rawAnuncio;

    // Save result
    const { error: saveError } = await supabaseAdmin
      .from("analises_perfil")
      .update({ status: "concluido", resultado })
      .eq("id", analise_id);

    if (saveError) {
      console.error("Failed to save resultado:", saveError);
      resultado.texto_anuncio_bruto = "[Erro ao salvar texto bruto do anúncio]";
      await supabaseAdmin
        .from("analises_perfil")
        .update({ status: "concluido", resultado })
        .eq("id", analise_id);
    }

    return new Response(
      JSON.stringify({ success: true, resultado }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error in analyze-profile:", err);
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";

    try {
      const body = await req.clone().json().catch(() => null);
      if (body?.analise_id) {
        await supabaseAdmin
          .from("analises_perfil")
          .update({ status: "erro", resultado: { error: errorMsg } })
          .eq("id", body.analise_id);
      }
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
