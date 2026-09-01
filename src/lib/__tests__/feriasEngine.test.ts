import { describe, it, expect } from "vitest";
import {
  calcularPeriodoAquisitivoAtual,
  isFeriasVencidas,
} from "@/lib/feriasEngine";

describe("feriasEngine", () => {
  it("Cenário 1: usa ultima_ferias_fim quando informado", () => {
    const p = calcularPeriodoAquisitivoAtual(
      {
        admission_date: "2018-03-01",
        ultima_ferias_inicio: "2023-07-01",
        ultima_ferias_fim: "2023-07-30",
      },
      new Date(2024, 5, 1) // 01/06/2024
    );
    expect(p.origem).toBe("ultima_ferias");
    expect(p.inicio.toISOString().slice(0, 10)).toBe("2023-07-30");
    expect(p.fim.toISOString().slice(0, 10)).toBe("2024-07-30");
    expect(p.limite.toISOString().slice(0, 10)).toBe("2025-05-31");
  });

  it("Cenário 2: usa data_corte_ferias quando não há últimas férias", () => {
    const p = calcularPeriodoAquisitivoAtual(
      {
        admission_date: "2018-03-01",
        data_corte_ferias: "2024-01-15",
      },
      new Date(2024, 5, 1)
    );
    expect(p.origem).toBe("data_corte");
    expect(p.inicio.toISOString().slice(0, 10)).toBe("2024-01-15");
    expect(p.fim.toISOString().slice(0, 10)).toBe("2025-01-15");
    expect(p.limite.toISOString().slice(0, 10)).toBe("2025-11-16");
  });

  it("Cenário 3: fallback baseado em admissão quando nenhum campo é informado", () => {
    const p = calcularPeriodoAquisitivoAtual(
      { admission_date: "2018-03-01" },
      new Date(2024, 5, 1)
    );
    expect(p.origem).toBe("admissao");
    // 6 anos completos → inicio = 2024-02-29 (admissão + 6 anos, ano bissexto)
    expect(p.inicio.getFullYear()).toBe(2024);
  });

  it("Cenário 4: férias vencidas só quando hoje > fim + 12 meses", () => {
    // último gozo 2022-01-01 → fim 2023-01-01 → limite 2024-01-01
    const inputs = {
      admission_date: "2018-03-01",
      ultima_ferias_inicio: "2021-12-01",
      ultima_ferias_fim: "2022-01-01",
    };
    expect(isFeriasVencidas(inputs, new Date(2023, 5, 1))).toBe(false);
    expect(isFeriasVencidas(inputs, new Date(2024, 1, 1))).toBe(true);
  });

  it("Cenário 5: prioridade — ultima_ferias vence data_corte", () => {
    const p = calcularPeriodoAquisitivoAtual({
      admission_date: "2018-03-01",
      ultima_ferias_inicio: "2023-07-01",
      ultima_ferias_fim: "2023-07-30",
      data_corte_ferias: "2024-01-15",
    });
    expect(p.origem).toBe("ultima_ferias");
  });
});
