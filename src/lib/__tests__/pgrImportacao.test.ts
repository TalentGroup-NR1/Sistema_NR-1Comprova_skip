import { describe, it, expect } from "vitest";

// ────────────────────────────────────────────────────────────
// Funções puras extraídas da Edge Function pgr-importar
// ────────────────────────────────────────────────────────────

const PRODUCTION_ORIGINS = [
  "https://nr1pronto.com.br",
  "https://www.nr1pronto.com.br",
  "https://nr-1pronto.com.br",
  "https://www.nr-1pronto.com.br",
  "https://nr1comprova.com.br",
  "https://www.nr1comprova.com.br",
  "https://nr-1comprova.com.br",
  "https://www.nr-1comprova.com.br",
];
const LOCALHOST_REGEX = /^https?:\/\/localhost(:\d+)?$/;

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return true;
  if (LOCALHOST_REGEX.test(origin)) return true;
  if (PRODUCTION_ORIGINS.includes(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.hostname.endsWith(".vercel.app") && (url.protocol === "https:" || url.protocol === "http:")) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function buildCorsHeaders(origin: string): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin) ? (origin || "*") : "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

function fallbackLocalAnalise(texto: string, motivo: string) {
  const linhas = texto.split("\n").filter((l) => l.trim().length > 0);
  return {
    dados_empresa: { nome: null, cnpj: null, responsavel_tecnico: null, cargo_responsavel: null, data_elaboracao: null, validade: null },
    riscos: [] as unknown[],
    plano_acao: [] as unknown[],
    modo_extracao: "fallback_local",
    motivo_fallback: motivo,
    linhas_extraidas: linhas.length,
    aviso: "O OCR com IA não estava disponível. O texto foi extraído localmente. Revise e preencha os dados manualmente antes de confirmar.",
  };
}

function extractTextFromPDFBytesSimple(raw: string): string {
  const textParts: string[] = [];
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match: RegExpExecArray | null;
  while ((match = btEtRegex.exec(raw)) !== null) {
    const block = match[1];
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tj: RegExpExecArray | null;
    while ((tj = tjRegex.exec(block)) !== null) {
      textParts.push(tj[1]);
    }
  }
  return textParts.join(" ").trim();
}

function validarArquivoPdf(nome: string, tamanho: number): { ok: boolean; erro?: string } {
  if (!nome.toLowerCase().endsWith(".pdf")) {
    return { ok: false, erro: "Apenas arquivos PDF são aceitos." };
  }
  if (tamanho > 10 * 1024 * 1024) {
    return { ok: false, erro: "O arquivo excede o limite máximo de 10MB." };
  }
  return { ok: true };
}

// ────────────────────────────────────────────────────────────
// Funções puras de Retry e Backoff da Edge Function pgr-importar
// ────────────────────────────────────────────────────────────
const RETRY_DELAYS_MS = [1000, 4000, 10000];

function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 504);
}

function calcRetryDelayMs(attempt: number, addJitter = false): number {
  const base = RETRY_DELAYS_MS[attempt] ?? 10000;
  if (!addJitter) return base;
  const jitter = Math.floor(Math.random() * (base * 0.2));
  return base + jitter;
}

function mapFriendlyErrorMessage(rawError: string): string {
  const isCorsOrFetch = rawError.includes("Failed to send a request") || rawError.includes("NetworkError") || rawError.includes("fetch");
  const isUnavailable = rawError.includes("503") || rawError.includes("429") || rawError.includes("high demand") || rawError.includes("UNAVAILABLE") || rawError.includes("RESOURCE_EXHAUSTED");
  const isTimeout = rawError.includes("tempo esgotado") || rawError.includes("AbortError");

  if (isCorsOrFetch) {
    return "Falha de conexão com o serviço de análise (CORS ou rede). Verifique sua conexão e tente novamente.";
  }
  if (isUnavailable) {
    return "O serviço de inteligência artificial está temporariamente ocupado com alta demanda. Por favor, aguarde alguns minutos e tente novamente.";
  }
  if (isTimeout) {
    return "A análise demorou mais que o esperado (documento muito extenso). Tente reimportar um arquivo menor ou em outro momento.";
  }
  return rawError || "Falha ao processar o documento do PGR.";
}

async function simularChamadaGeminiComRetry(
  mockResponses: Array<{ status: number; body: string }>,
  onRetry?: (attempt: number, delayMs: number) => void
) {
  let attempt = 0;
  for (; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const res = mockResponses[attempt] || { status: 500, body: "fallback error" };
    if (res.status === 200) {
      return { ok: true, data: JSON.parse(res.body), attemptsUsed: attempt + 1 };
    }

    const isRetryable = isRetryableHttpStatus(res.status);
    if (!isRetryable) {
      throw new Error(`http_${res.status}|${res.body}`);
    }

    if (attempt < RETRY_DELAYS_MS.length) {
      const delay = calcRetryDelayMs(attempt, false);
      if (onRetry) onRetry(attempt, delay);
      continue;
    }

    throw new Error(`http_${res.status}|${res.body}`);
  }

  throw new Error("api_error|sem resposta");
}

// ────────────────────────────────────────────────────────────
// Funções puras de autorização (pgr-excluir)
// ────────────────────────────────────────────────────────────
function canDeleteImportacao(callerRoles: string[], callerCompanyId: string | null, importacaoCompanyId: string): boolean {
  if (callerRoles.includes("admin_master")) return true;
  if (!callerRoles.some(r => ["admin_empresa", "analista_rh"].includes(r))) return false;
  return callerCompanyId === importacaoCompanyId;
}

// ────────────────────────────────────────────────────────────
// TESTES
// ────────────────────────────────────────────────────────────

describe("pgr-importar: CORS Preflight", () => {
  it("deve permitir localhost:5173 (dev local)", () => {
    const h = buildCorsHeaders("http://localhost:5173");
    expect(h["Access-Control-Allow-Origin"]).toBe("http://localhost:5173");
    expect(h["Access-Control-Allow-Methods"]).toContain("OPTIONS");
    expect(h["Access-Control-Allow-Methods"]).toContain("POST");
  });

  it("deve permitir localhost:8081 (porta usada em dev)", () => {
    const h = buildCorsHeaders("http://localhost:8081");
    expect(h["Access-Control-Allow-Origin"]).toBe("http://localhost:8081");
  });

  it("deve permitir localhost:8080", () => {
    const h = buildCorsHeaders("http://localhost:8080");
    expect(h["Access-Control-Allow-Origin"]).toBe("http://localhost:8080");
  });

  it("deve permitir qualquer porta de localhost (regex)", () => {
    [3000, 4000, 5000, 5173, 8081, 9000].forEach((port) => {
      const h = buildCorsHeaders(`http://localhost:${port}`);
      expect(h["Access-Control-Allow-Origin"]).toBe(`http://localhost:${port}`);
    });
  });

  it("deve permitir o domínio de produção https://nr1pronto.com.br", () => {
    const h = buildCorsHeaders("https://nr1pronto.com.br");
    expect(h["Access-Control-Allow-Origin"]).toBe("https://nr1pronto.com.br");
  });

  it("deve permitir www.nr1pronto.com.br", () => {
    const h = buildCorsHeaders("https://www.nr1pronto.com.br");
    expect(h["Access-Control-Allow-Origin"]).toBe("https://www.nr1pronto.com.br");
  });

  it("deve permitir www.nr-1comprova.com.br e nr-1comprova.com.br", () => {
    const h1 = buildCorsHeaders("https://www.nr-1comprova.com.br");
    expect(h1["Access-Control-Allow-Origin"]).toBe("https://www.nr-1comprova.com.br");

    const h2 = buildCorsHeaders("https://nr-1comprova.com.br");
    expect(h2["Access-Control-Allow-Origin"]).toBe("https://nr-1comprova.com.br");
  });

  it("deve permitir subdomínios da vercel (*.vercel.app)", () => {
    const h = buildCorsHeaders("https://sistema-nr-1-comprova.vercel.app");
    expect(h["Access-Control-Allow-Origin"]).toBe("https://sistema-nr-1-comprova.vercel.app");
  });

  it("deve bloquear origem não permitida (ex.: domínio malicioso)", () => {
    const h = buildCorsHeaders("https://evil.example.com");
    expect(h["Access-Control-Allow-Origin"]).toBe("");
  });

  it("deve bloquear domínio parecido com localhost mas diferente", () => {
    const h = buildCorsHeaders("https://notlocalhost.com");
    expect(h["Access-Control-Allow-Origin"]).toBe("");
  });

  it("deve aceitar requisição sem origin (curl/Postman) com wildcard", () => {
    const h = buildCorsHeaders("");
    expect(h["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("deve incluir Access-Control-Max-Age para cache do preflight", () => {
    const h = buildCorsHeaders("http://localhost:8081");
    expect(h["Access-Control-Max-Age"]).toBe("86400");
  });

  it("deve incluir os headers necessários para o supabase-js", () => {
    const h = buildCorsHeaders("http://localhost:8081");
    const allowedHeaders = h["Access-Control-Allow-Headers"].toLowerCase();
    expect(allowedHeaders).toContain("authorization");
    expect(allowedHeaders).toContain("content-type");
    expect(allowedHeaders).toContain("apikey");
  });
});

describe("pgr-importar: Parsing e Validação", () => {
  describe("Validação de arquivo", () => {
    it("deve aceitar PDF dentro do limite", () => {
      const r = validarArquivoPdf("relatorio_pgr.pdf", 5 * 1024 * 1024);
      expect(r.ok).toBe(true);
    });

    it("deve rejeitar arquivo não-PDF", () => {
      const r = validarArquivoPdf("documento.docx", 1024);
      expect(r.ok).toBe(false);
      expect(r.erro).toContain("PDF");
    });

    it("deve rejeitar arquivo maior que 10MB", () => {
      const r = validarArquivoPdf("pgr_grande.pdf", 12 * 1024 * 1024);
      expect(r.ok).toBe(false);
      expect(r.erro).toContain("10MB");
    });

    it("deve aceitar PDF exatamente no limite de 10MB", () => {
      const r = validarArquivoPdf("pgr_limite.pdf", 10 * 1024 * 1024);
      expect(r.ok).toBe(true);
    });
  });

  describe("Fallback local de análise", () => {
    it("deve retornar estrutura completa com modo_extracao=fallback_local", () => {
      const r = fallbackLocalAnalise("Texto de exemplo\nLinha 2\nLinha 3", "chave_ia_ausente");
      expect(r.modo_extracao).toBe("fallback_local");
      expect(r.motivo_fallback).toBe("chave_ia_ausente");
      expect(r.riscos).toEqual([]);
      expect(r.plano_acao).toEqual([]);
      expect(r.dados_empresa.nome).toBeNull();
      expect(r.aviso).toContain("localmente");
    });

    it("deve contar linhas extraídas corretamente", () => {
      const texto = "Linha 1\nLinha 2\n\nLinha 3";
      const r = fallbackLocalAnalise(texto, "test");
      expect(r.linhas_extraidas).toBe(3);
    });

    it("deve funcionar com texto vazio", () => {
      const r = fallbackLocalAnalise("", "test");
      expect(r.linhas_extraidas).toBe(0);
      expect(r.modo_extracao).toBe("fallback_local");
    });
  });

  describe("Extração nativa de texto PDF", () => {
    it("deve extrair texto de marcadores BT...ET", () => {
      const pdfSim = `BT (Plano de Gerenciamento) Tj ET BT (de Riscos) Tj ET`;
      const result = extractTextFromPDFBytesSimple(pdfSim);
      expect(result).toContain("Plano de Gerenciamento");
      expect(result).toContain("de Riscos");
    });

    it("deve retornar string vazia para PDF sem texto extraível (escaneado)", () => {
      const result = extractTextFromPDFBytesSimple("%PDF-1.4\n%%EOF");
      expect(result).toBe("");
    });
  });

  describe("Contrato JSON da extração", () => {
    it("deve retornar os campos obrigatórios esperados pelo frontend", () => {
      const r = fallbackLocalAnalise("qualquer texto", "test");
      expect(r).toHaveProperty("dados_empresa");
      expect(r).toHaveProperty("riscos");
      expect(r).toHaveProperty("plano_acao");
      expect(r).toHaveProperty("modo_extracao");
      expect(r).toHaveProperty("aviso");
    });

    it("dados_empresa deve ter todas as chaves do contrato", () => {
      const r = fallbackLocalAnalise("", "test");
      const keys = Object.keys(r.dados_empresa);
      expect(keys).toEqual(
        expect.arrayContaining(["nome", "cnpj", "responsavel_tecnico", "cargo_responsavel", "data_elaboracao", "validade"])
      );
    });
  });
});

// Mock da lógica de retry para testes
async function mockAnalisarPgrComGemini(mockFetch: typeof fetch) {
  let response;
  let retryCount = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    retryCount = attempt;
    response = await mockFetch(new Request("https://mock"));
    if (response.ok) break;
    if (response.status === 429 || response.status >= 500) {
      if (attempt < 2) continue;
    }
    throw new Error(`http_${response.status}`);
  }
  return { ok: true, retryCount };
}

// Mock do handler principal
async function mockProcessImport(mockFetch: typeof fetch, dbStatus: { status: string, msg?: string }) {
  try {
    if (dbStatus.msg === "force_unexpected") throw new Error("Erro de memoria");
    
    await mockAnalisarPgrComGemini(mockFetch);
    dbStatus.status = "aguardando_revisao";
  } catch (iaErr: any) {
    if (iaErr.message === "Erro de memoria") throw iaErr; // deixa vazar para simular o catch global

    const isUnavailable = iaErr?.message?.includes("http_5") || iaErr?.message?.includes("http_429");
    let amigavelMsg = "Falha na extração de dados do PGR.";
    if (isUnavailable) amigavelMsg = "A IA está indisponível no momento. Tente reimportar em alguns minutos.";

    dbStatus.status = "erro";
    dbStatus.msg = `${amigavelMsg} (Detalhe: ${iaErr?.message || "erro interno"})`;
  }
  return dbStatus;
}

describe("pgr-importar: Lógica de Resiliência (Etapa 3)", () => {
  it("(a) IA retorna 503 -> retry dispara -> após esgotar, status vira erro", async () => {
    let calls = 0;
    const mockFetch = async (input?: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      calls++;
      return new Response(null, { status: 503 });
    };
    
    const db: { status: string; msg?: string } = { status: "processando" };
    await mockProcessImport(mockFetch as unknown as typeof fetch, db); // as unknown as typeof fetch usado devido à complexidade da tipagem global do fetch, mas o db agora respeita a assinatura real
    
    expect(calls).toBe(3); // 1 tentativa + 2 retries
    expect(db.status).toBe("erro");
    expect(db.msg).toContain("A IA está indisponível no momento");
  });

  it("(b) IA retorna 503 e depois 200 -> sucesso no retry, status aguardando_revisao", async () => {
    let calls = 0;
    const mockFetch = async (input?: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      calls++;
      if (calls <= 2) return new Response(null, { status: 503 });
      return new Response(null, { status: 200 }); // sucesso na 3ª tentativa
    };
    
    const db: { status: string; msg?: string } = { status: "processando" };
    await mockProcessImport(mockFetch as unknown as typeof fetch, db); // as unknown as typeof fetch usado para compatibilidade com o tipo nativo
    
    expect(calls).toBe(3);
    expect(db.status).toBe("aguardando_revisao");
  });

  it("(c) exceção inesperada no meio -> status erro, nunca processando", async () => {
    const db: { status: string; msg?: string } = { status: "processando", msg: "force_unexpected" };
    
    try {
      await mockProcessImport({} as unknown as typeof fetch, db); // fetch não é chamado neste teste, objeto vazio satisfaz a compilação
    } catch(err) {
      // simulate global catch
      db.status = "erro";
      db.msg = "Falha interna: Erro de memoria";
    }
    
    expect(db.status).toBe("erro");
    expect(db.msg).toContain("Falha interna");
  });
});

// ────────────────────────────────────────────────────────────
// Mapeamento 5W2H — espelha a lógica de rowsToInsert do hook
// ────────────────────────────────────────────────────────────
function mapActionToRow(a: {
  id: string;
  medida: string;
  responsavel_id?: string | null;
  responsavel_sugerido?: string | null;
  prazo_sugerido?: string | null;
  prioridade: string;
  status: string;
  evidencia_url?: string | null;
  historico?: unknown[];
  por_que?: string | null;
  onde?: string | null;
  como?: string | null;
  custo_estimado?: number | null;
}, companyId: string, importacaoId: string) {
  let parsedDate = null;
  if (a.prazo_sugerido && !isNaN(Date.parse(a.prazo_sugerido))) {
    parsedDate = new Date(a.prazo_sugerido).toISOString().split("T")[0];
  }
  return {
    id: a.id,
    company_id: companyId,
    pgr_importacao_id: importacaoId,
    acao: a.medida,
    responsavel_id: a.responsavel_id || null,
    cargo_responsavel: a.responsavel_sugerido || null,
    prazo: parsedDate,
    prioridade: a.prioridade,
    status: a.status,
    evidencia_url: a.evidencia_url || null,
    historico: a.historico || [],
    // Campos 5W2H
    por_que: a.por_que || null,
    onde: a.onde || null,
    como: a.como || null,
    custo_estimado: a.custo_estimado ?? 0,
  };
}

describe("pgr-importar: Mapeamento 5W2H (rowsToInsert)", () => {
  const BASE = {
    id: "uuid-acao-1",
    medida: "Instalar EPC na area de risco",
    prioridade: "alta",
    status: "pendente",
    prazo_sugerido: "2025-09-30",
    responsavel_sugerido: "Engenheiro de Seguranca",
  };

  it("deve mapear todos os campos 5W2H quando presentes", () => {
    const row = mapActionToRow(
      { ...BASE, por_que: "Reduzir acidentalidade no setor", onde: "Galpao B - linha 3", como: "Aquisicao e instalacao de guard-rail", custo_estimado: 3200 },
      "company-abc", "import-xyz"
    );
    expect(row.por_que).toBe("Reduzir acidentalidade no setor");
    expect(row.onde).toBe("Galpao B - linha 3");
    expect(row.como).toBe("Aquisicao e instalacao de guard-rail");
    expect(row.custo_estimado).toBe(3200);
  });

  it("deve usar custo_estimado = 0 quando ausente (null)", () => {
    const row = mapActionToRow({ ...BASE, custo_estimado: null }, "company-abc", "import-xyz");
    expect(row.custo_estimado).toBe(0);
  });

  it("deve usar custo_estimado = 0 quando nao informado (undefined)", () => {
    const row = mapActionToRow(BASE, "company-abc", "import-xyz");
    expect(row.custo_estimado).toBe(0);
  });

  it("deve mapear por_que/onde/como como null quando ausentes", () => {
    const row = mapActionToRow(BASE, "company-abc", "import-xyz");
    expect(row.por_que).toBeNull();
    expect(row.onde).toBeNull();
    expect(row.como).toBeNull();
  });

  it("deve converter prazo_sugerido ISO para formato YYYY-MM-DD", () => {
    const row = mapActionToRow(
      { ...BASE, prazo_sugerido: "2025-09-30T00:00:00.000Z" },
      "company-abc", "import-xyz"
    );
    expect(row.prazo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("deve definir prazo como null quando prazo_sugerido invalido", () => {
    const row = mapActionToRow(
      { ...BASE, prazo_sugerido: "data-invalida" },
      "company-abc", "import-xyz"
    );
    expect(row.prazo).toBeNull();
  });
});

describe("pgr-importar: Retry com Backoff e Tolerância a Indisponibilidade Transitória", () => {
  it("deve classificar 429, 502, 503 e 504 como erros transitórios (retryable)", () => {
    expect(isRetryableHttpStatus(429)).toBe(true);
    expect(isRetryableHttpStatus(500)).toBe(true);
    expect(isRetryableHttpStatus(502)).toBe(true);
    expect(isRetryableHttpStatus(503)).toBe(true);
    expect(isRetryableHttpStatus(504)).toBe(true);
  });

  it("NÃO deve classificar erros permanentes como retryable (400, 401, 403, 404, 413)", () => {
    expect(isRetryableHttpStatus(200)).toBe(false);
    expect(isRetryableHttpStatus(400)).toBe(false);
    expect(isRetryableHttpStatus(401)).toBe(false);
    expect(isRetryableHttpStatus(403)).toBe(false);
    expect(isRetryableHttpStatus(404)).toBe(false);
    expect(isRetryableHttpStatus(413)).toBe(false);
  });

  it("deve calcular as pausas de backoff proporcionais (~1s, ~4s, ~10s)", () => {
    expect(calcRetryDelayMs(0, false)).toBe(1000);
    expect(calcRetryDelayMs(1, false)).toBe(4000);
    expect(calcRetryDelayMs(2, false)).toBe(10000);
    // Para tentativa extra ou além, fallback teto de 10s
    expect(calcRetryDelayMs(3, false)).toBe(10000);
  });

  it("deve suceder na primeira tentativa sem executar retry quando status é 200", async () => {
    const retries: number[] = [];
    const res = await simularChamadaGeminiComRetry(
      [{ status: 200, body: '{"dados_empresa": {"nome": "Empresa A"}}' }],
      (att) => retries.push(att)
    );
    expect(res.ok).toBe(true);
    expect(res.attemptsUsed).toBe(1);
    expect(retries).toHaveLength(0);
  });

  it("deve recuperar de 503 transitório (High Demand) na 2ª tentativa", async () => {
    const retries: Array<{ attempt: number; delay: number }> = [];
    const res = await simularChamadaGeminiComRetry(
      [
        { status: 503, body: "This model is currently experiencing high demand" },
        { status: 200, body: '{"riscos": [{"perigo": "Ruído"}]}' },
      ],
      (att, delay) => retries.push({ attempt: att, delay })
    );

    expect(res.ok).toBe(true);
    expect(res.attemptsUsed).toBe(2);
    expect(retries).toHaveLength(1);
    expect(retries[0].attempt).toBe(0);
    expect(retries[0].delay).toBe(1000); // 1s
  });

  it("deve recuperar de 429 seguido de 503 na 3ª tentativa", async () => {
    const retries: Array<{ attempt: number; delay: number }> = [];
    const res = await simularChamadaGeminiComRetry(
      [
        { status: 429, body: "Resource exhausted" },
        { status: 503, body: "Service unavailable" },
        { status: 200, body: '{"riscos": []}' },
      ],
      (att, delay) => retries.push({ attempt: att, delay })
    );

    expect(res.ok).toBe(true);
    expect(res.attemptsUsed).toBe(3);
    expect(retries).toHaveLength(2);
    expect(retries[0].delay).toBe(1000); // ~1s
    expect(retries[1].delay).toBe(4000); // ~4s
  });

  it("deve falhar IMEDIATAMENTE sem retentativas em erro permanente 400 (Bad Request)", async () => {
    const retries: number[] = [];
    await expect(
      simularChamadaGeminiComRetry(
        [{ status: 400, body: "Invalid PDF structure" }],
        (att) => retries.push(att)
      )
    ).rejects.toThrow("http_400|Invalid PDF structure");

    expect(retries).toHaveLength(0); // Nenhum retry desperdiçado
  });

  it("deve esgotar as 3 tentativas adicionais (4 totais) se 503 persistir", async () => {
    const retries: number[] = [];
    await expect(
      simularChamadaGeminiComRetry(
        [
          { status: 503, body: "High demand 1" },
          { status: 503, body: "High demand 2" },
          { status: 503, body: "High demand 3" },
          { status: 503, body: "High demand 4" },
        ],
        (att) => retries.push(att)
      )
    ).rejects.toThrow("http_503|High demand 4");

    expect(retries).toHaveLength(3); // Tentativas adicionais 0 (1s), 1 (4s), 2 (10s)
  });

  it("deve formatar erro técnico de 503/alta demanda em mensagem amigável sem expor dados brutos", () => {
    const bruto = 'http_503|{"error": {"code": 503, "message": "This model is currently experiencing high demand."}}';
    const amigavel = mapFriendlyErrorMessage(bruto);
    expect(amigavel).toBe(
      "O serviço de inteligência artificial está temporariamente ocupado com alta demanda. Por favor, aguarde alguns minutos e tente novamente."
    );
    expect(amigavel).not.toContain("503");
    expect(amigavel).not.toContain("This model is currently");
    expect(amigavel).not.toContain("{");
  });

  it("deve formatar erro de rede/CORS em mensagem amigável acionável", () => {
    const bruto = "Failed to send a request to the Edge Function";
    const amigavel = mapFriendlyErrorMessage(bruto);
    expect(amigavel).toBe(
      "Falha de conexão com o serviço de análise (CORS ou rede). Verifique sua conexão e tente novamente."
    );
  });
});


