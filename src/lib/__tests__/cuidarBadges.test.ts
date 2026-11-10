import { describe, it, expect } from "vitest";
import { calcularBadges } from "../cuidarBadges";

describe("cuidarBadges.calcularBadges", () => {
  it("score 85 -> semana_leve", () => {
    expect(calcularBadges({ scoreAtual: 85, scoreAnterior: null, streakSemanal: 0 }))
      .toContain("semana_leve");
  });

  it("score 65 -> semana_equilibrada", () => {
    expect(calcularBadges({ scoreAtual: 65, scoreAnterior: null, streakSemanal: 0 }))
      .toContain("semana_equilibrada");
  });

  it("score 45 -> semana_desafiadora", () => {
    expect(calcularBadges({ scoreAtual: 45, scoreAnterior: null, streakSemanal: 0 }))
      .toContain("semana_desafiadora");
  });

  it("score 30 -> atencao_bem_estar", () => {
    expect(calcularBadges({ scoreAtual: 30, scoreAnterior: null, streakSemanal: 0 }))
      .toContain("atencao_bem_estar");
  });

  it("score 75 vs 55 -> resiliencia", () => {
    expect(calcularBadges({ scoreAtual: 75, scoreAnterior: 55, streakSemanal: 0 }))
      .toContain("resiliencia");
  });

  it("score 50 vs 75 -> sinal_cansaco", () => {
    expect(calcularBadges({ scoreAtual: 50, scoreAnterior: 75, streakSemanal: 0 }))
      .toContain("sinal_cansaco");
  });

  it("delta exatamente 15 não gera resiliencia", () => {
    expect(calcularBadges({ scoreAtual: 75, scoreAnterior: 60, streakSemanal: 0 }))
      .not.toContain("resiliencia");
  });

  it("streak 4 -> constancia", () => {
    expect(calcularBadges({ scoreAtual: 70, scoreAnterior: null, streakSemanal: 4 }))
      .toContain("constancia");
  });

  it("streak 12 -> constancia + ciclo_bem_estar", () => {
    const out = calcularBadges({ scoreAtual: 70, scoreAnterior: null, streakSemanal: 12 });
    expect(out).toContain("constancia");
    expect(out).toContain("ciclo_bem_estar");
  });

  it("sem anterior não gera resiliencia/sinal_cansaco", () => {
    const out = calcularBadges({ scoreAtual: 90, scoreAnterior: null, streakSemanal: 0 });
    expect(out).not.toContain("resiliencia");
    expect(out).not.toContain("sinal_cansaco");
  });
});
