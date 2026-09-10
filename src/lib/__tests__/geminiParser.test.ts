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
