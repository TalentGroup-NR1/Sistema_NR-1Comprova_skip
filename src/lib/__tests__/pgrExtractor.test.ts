import { describe, it, expect } from "vitest";
import { mapGeminiRiscos } from "../../../supabase/functions/_shared/pgrMapper";

describe("pgrExtractor agnostic mapping", () => {
  it("mapeia estrutura tabular (matriz 3x3) (P3xS3=9 -> Alto)", () => {
    const rawOutput = {
      riscos: [{
        perigo: "Ruído",
        categoria: "fisico",
        descricao: "Exposição a ruído contínuo",
        probabilidade: 3,
        severidade: 3,
        escala_matriz: "3x3",
        fonte: "Página 12",
        confianca: 95
      }]
    };
    const mapped = mapGeminiRiscos(rawOutput.riscos);
    expect(mapped[0].nome).toBe("Ruído");
    expect(mapped[0].probabilidade).toBe(3);
    expect(mapped[0].escala_matriz).toBe("3x3");
    expect(mapped[0].confianca).toBe(95);
  });

  it("mapeia estrutura em texto (matriz 5x5) com sinônimos normalizados (P4xS4=16)", () => {
    const rawOutput = {
      riscos: [{
        perigo: "Postura Inadequada",
        categoria: "ergonomico",
        probabilidade: 4,
        severidade: 4,
        escala_matriz: "5x5",
        fonte: "Anexo II",
        confianca: 88
      }]
    };
    const mapped = mapGeminiRiscos(rawOutput.riscos);
    expect(mapped[0].probabilidade).toBe(4);
    expect(mapped[0].severidade).toBe(4);
    expect(mapped[0].escala_matriz).toBe("5x5");
  });

  it("retorna nulo para matriz nula (P, S e nível voltam null)", () => {
    const rawOutput = {
      riscos: [{
        perigo: "Queda de altura",
        categoria: "acidente"
      }]
    };
    const mapped = mapGeminiRiscos(rawOutput.riscos);
    expect(mapped[0].nome).toBe("Queda de altura");
    expect(mapped[0].probabilidade).toBeNull();
    expect(mapped[0].severidade).toBeNull();
    expect(mapped[0].nivel).toBeNull();
    expect(mapped[0].escala_matriz).toBeNull();
  });

  it("retorna escala mantida fiel se for desconhecida (ex: 6x6)", () => {
    const rawOutput = {
      riscos: [{
        perigo: "Eletricidade",
        categoria: "acidente",
        probabilidade: 3,
        severidade: 6,
        escala_matriz: "6x6"
      }]
    };
    const mapped = mapGeminiRiscos(rawOutput.riscos);
    expect(mapped[0].escala_matriz).toBe("6x6");
  });
});
