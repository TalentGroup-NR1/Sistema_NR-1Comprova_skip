import { describe, it, expect } from "vitest";
import { classifyRisk } from "../riskMatrix";

describe("riskMatrix", () => {
  describe("escala 3x3", () => {
    it("classifica nível 1 (P1 x S1) como Baixo", () => {
      const result = classifyRisk(1, 1, "3x3");
      expect(result.nivel).toBe(1);
      expect(result.classificacao).toBe("Baixo");
    });

    it("classifica nível 4 (P2 x S2) como Moderado", () => {
      const result = classifyRisk(2, 2, "3x3");
      expect(result.nivel).toBe(4);
      expect(result.classificacao).toBe("Moderado");
    });

    it("classifica nível 9 (P3 x S3) como Crítico", () => {
      const result = classifyRisk(3, 3, "3x3");
      expect(result.nivel).toBe(9);
      expect(result.classificacao).toBe("Crítico");
    });
  });

  describe("escala 4x4", () => {
    it("classifica nível 1 (P1 x S1) como Baixo", () => {
      const result = classifyRisk(1, 1, "4x4");
      expect(result.nivel).toBe(1);
      expect(result.classificacao).toBe("Baixo");
    });

    it("classifica nível 12 (P3 x S4) como Alto", () => {
      const result = classifyRisk(3, 4, "4x4");
      expect(result.nivel).toBe(12);
      expect(result.classificacao).toBe("Alto");
    });

    it("classifica nível 16 (P4 x S4) como Crítico", () => {
      const result = classifyRisk(4, 4, "4x4");
      expect(result.nivel).toBe(16);
      expect(result.classificacao).toBe("Crítico");
    });
  });

  describe("escala 5x5", () => {
    it("classifica nível 1 (P1 x S1) como Baixo", () => {
      const result = classifyRisk(1, 1, "5x5");
      expect(result.nivel).toBe(1);
      expect(result.classificacao).toBe("Baixo");
    });

    it("classifica nível 9 (P3 x S3) como Moderado", () => {
      const result = classifyRisk(3, 3, "5x5");
      expect(result.nivel).toBe(9);
      expect(result.classificacao).toBe("Moderado");
    });

    it("classifica nível 15 (P5 x S3) como Alto", () => {
      const result = classifyRisk(5, 3, "5x5");
      expect(result.nivel).toBe(15);
      expect(result.classificacao).toBe("Alto");
    });

    it("classifica nível 25 (P5 x S5) como Crítico", () => {
      const result = classifyRisk(5, 5, "5x5");
      expect(result.nivel).toBe(25);
      expect(result.classificacao).toBe("Crítico");
    });
  });

  describe("limites e neutros", () => {
    it("retorna 'Sem classificação' para null/null e escala null", () => {
      const result = classifyRisk(null, null, null);
      expect(result.nivel).toBeNull();
      expect(result.classificacao).toBe("Sem classificação");
    });

    it("retorna 'Escala não identificada' para escala 6x6", () => {
      const result = classifyRisk(3, 3, "6x6");
      expect(result.nivel).toBe(9);
      expect(result.classificacao).toBe("Escala não identificada");
    });
  });
});
