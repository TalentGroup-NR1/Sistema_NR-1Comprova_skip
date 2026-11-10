import { describe, it, expect } from "vitest";

// Simulando a lógica de parser utilizada na edge function pgr-importar
function parseGeminiResponse(candidate: any) {
  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new Error('truncated');
  }

  let content = candidate?.content?.parts?.[0]?.text ?? "{}";
  content = content.replace(/^```json/gmi, "").replace(/```$/gmi, "").trim();

  try {
    return JSON.parse(content);
  } catch (err) {
    throw new Error("parse_failed");
  }
}

// Simulando a lógica de limite de tamanho da edge function
const MAX_FILE_SIZE_BYTES = 10 * 1_048_576; // 10 MB
function checkFileSize(sizeBytes: number) {
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error("PDF muito grande para extração automática");
  }
  return true;
}

describe("pgr-importar: Resiliência do Parse do Gemini", () => {
  it("deve parsear JSON válido limpo", () => {
    const res = parseGeminiResponse({
      content: { parts: [{ text: '{"dados_empresa": {"nome_empresa": "Teste"}}' }] }
    });
    expect(res.dados_empresa.nome_empresa).toBe("Teste");
  });

  it("deve parsear JSON sujo com cercas de markdown (```json)", () => {
    const sujo = "```json\n" + '{"riscos": []}' + "\n```";
    const res = parseGeminiResponse({
      content: { parts: [{ text: sujo }] }
    });
    expect(res.riscos).toEqual([]);
  });

  it("deve rejeitar se finishReason for MAX_TOKENS", () => {
    expect(() => {
      parseGeminiResponse({
        finishReason: 'MAX_TOKENS',
        content: { parts: [{ text: '{"incompleto":' }] }
      });
    }).toThrow("truncated");
  });

  it("deve rejeitar se JSON for inválido/quebrado e finishReason for normal", () => {
    expect(() => {
      parseGeminiResponse({
        content: { parts: [{ text: '{"incompleto":' }] }
      });
    }).toThrow("parse_failed");
  });
});

describe("pgr-importar: Contrato 5W2H do plano_acao", () => {
  it("deve preservar os campos 5W2H na resposta do Gemini", () => {
    const mockItem = {
      acao: "Instalar proteção coletiva",
      prazo: "2025-12-31",
      responsavel: "João Silva",
      status: "pendente",
      por_que: "Reduzir risco de queda de altura",
      onde: "Setor de montagem — Piso 2",
      como: "Instalação de guarda-corpo conforme NR-35",
      custo_estimado: 4500,
    };
    const payload = JSON.stringify({ plano_acao: [mockItem] });
    const res = parseGeminiResponse({
      content: { parts: [{ text: payload }] },
    });
    const item = res.plano_acao[0];
    expect(item.por_que).toBe("Reduzir risco de queda de altura");
    expect(item.onde).toBe("Setor de montagem — Piso 2");
    expect(item.como).toBe("Instalação de guarda-corpo conforme NR-35");
    expect(item.custo_estimado).toBe(4500);
  });

  it("deve aceitar custo_estimado ausente (retorna undefined — frontend usa ?? 0)", () => {
    const mockItem = {
      acao: "Fornecer EPI",
      prazo: "2025-06-30",
      responsavel: "Maria",
      status: "pendente",
      por_que: "Obrigação legal NR-6",
      onde: "Almoxarifado",
      como: "Distribuição de capacetes e luvas",
    };
    const payload = JSON.stringify({ plano_acao: [mockItem] });
    const res = parseGeminiResponse({
      content: { parts: [{ text: payload }] },
    });
    const item = res.plano_acao[0];
    // custo_estimado ausente no JSON → undefined; o hook aplica ?? 0
    const custoFinal = item.custo_estimado ?? 0;
    expect(custoFinal).toBe(0);
  });
});

describe("pgr-importar: Guarda de Tamanho do Arquivo", () => {
  it("deve aceitar arquivo dentro do limite", () => {
    expect(checkFileSize(5 * 1_048_576)).toBe(true);
  });

  it("deve rejeitar arquivo acima do limite (ex: 12MB)", () => {
    expect(() => {
      checkFileSize(12 * 1_048_576);
    }).toThrow("PDF muito grande");
  });
});
