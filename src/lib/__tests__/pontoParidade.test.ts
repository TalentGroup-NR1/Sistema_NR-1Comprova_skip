import { describe, it, expect } from "vitest";
import { detectarParidadeImpar } from "../pontoParidade";

describe("detectarParidadeImpar (Onda 6.13)", () => {
  it("Cenário 1 — esquecimento de retorno do almoço: 3 batidas → ímpar", () => {
    const regs = [
      { data_hora: "2026-05-20T09:00:00-03:00" },
      { data_hora: "2026-05-20T12:00:00-03:00" },
      { data_hora: "2026-05-20T18:00:00-03:00" },
    ];
    expect(detectarParidadeImpar(regs)).toBe(true);
  });

  it("Cenário 2 — jornada completa: 4 batidas → par", () => {
    const regs = [
      { data_hora: "2026-05-20T09:00:00-03:00" },
      { data_hora: "2026-05-20T12:00:00-03:00" },
      { data_hora: "2026-05-20T13:00:00-03:00" },
      { data_hora: "2026-05-20T18:00:00-03:00" },
    ];
    expect(detectarParidadeImpar(regs)).toBe(false);
  });

  it("Cenário 3a — noturno dia D: 21:00 + 23:59(auto) = 2 → par", () => {
    const regs = [
      { data_hora: "2026-05-20T21:00:00-03:00" },
      { data_hora: "2026-05-20T23:59:00-03:00" },
    ];
    expect(detectarParidadeImpar(regs)).toBe(false);
  });

  it("Cenário 3b — noturno dia D+1: 00:00(auto) + 03:00 = 2 → par", () => {
    const regs = [
      { data_hora: "2026-05-21T00:00:00-03:00" },
      { data_hora: "2026-05-21T03:00:00-03:00" },
    ];
    expect(detectarParidadeImpar(regs)).toBe(false);
  });

  it("Cenário 4 — dia vazio → false", () => {
    expect(detectarParidadeImpar([])).toBe(false);
  });
});
