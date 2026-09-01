import { describe, it, expect } from "vitest";

// ────────────────────────────────────────────────────────────
// Funções puras extraídas da Edge Function pgr-importar
// ────────────────────────────────────────────────────────────

const PRODUCTION_ORIGINS = [
  "https://nr-1pronto.com.br",
  "https://www.nr-1pronto.com.br",
];
const LOCALHOST_REGEX = /^https?:\/\/localhost(:\d+)?$/;

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return true;
  if (LOCALHOST_REGEX.test(origin)) return true;
  return PRODUCTION_ORIGINS.includes(origin);
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

  it("deve permitir o domínio de produção https://nr-1pronto.com.br", () => {
    const h = buildCorsHeaders("https://nr-1pronto.com.br");
    expect(h["Access-Control-Allow-Origin"]).toBe("https://nr-1pronto.com.br");
  });

  it("deve permitir www.nr-1pronto.com.br", () => {
    const h = buildCorsHeaders("https://www.nr-1pronto.com.br");
    expect(h["Access-Control-Allow-Origin"]).toBe("https://www.nr-1pronto.com.br");
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
