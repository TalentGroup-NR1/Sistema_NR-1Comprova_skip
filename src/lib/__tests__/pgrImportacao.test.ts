import { describe, it, expect } from "vitest";

// ────────────────────────────────────────────────────────────
// Funções puras extraídas da Edge Function pgr-importar
// ────────────────────────────────────────────────────────────

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
// TESTES
// ────────────────────────────────────────────────────────────

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

    it("deve retornar string vazia para PDF sem texto extraível (scaneado)", () => {
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
