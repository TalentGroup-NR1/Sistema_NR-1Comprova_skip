import { describe, it, expect } from "vitest";
import { calcTurnoverRate } from "../calcTurnover";

describe("calcTurnoverRate", () => {
  it("retorna 0 quando não há admissões nem desligamentos", () => {
    expect(calcTurnoverRate({ admissoes: 0, desligamentos: 0, totalFuncionarios: 100 })).toBe(0);
  });

  it("retorna 0 quando totalFuncionarios é 0", () => {
    expect(calcTurnoverRate({ admissoes: 5, desligamentos: 3, totalFuncionarios: 0 })).toBe(0);
  });

  it("Atech: 3 admissões / 0 deslig / 3 ativos = 50%", () => {
    expect(calcTurnoverRate({ admissoes: 3, desligamentos: 0, totalFuncionarios: 3 })).toBe(50);
  });

  it("0 adm + 2 deslig / 100 ativos = 1%", () => {
    expect(calcTurnoverRate({ admissoes: 0, desligamentos: 2, totalFuncionarios: 100 })).toBe(1);
  });

  it("10 adm + 5 deslig / 50 ativos = 15%", () => {
    expect(calcTurnoverRate({ admissoes: 10, desligamentos: 5, totalFuncionarios: 50 })).toBe(15);
  });

  it("retorna resultado com 1 casa decimal", () => {
    const result = calcTurnoverRate({ admissoes: 3, desligamentos: 2, totalFuncionarios: 100 });
    const decimals = result.toString().split(".")[1];
    expect(!decimals || decimals.length <= 1).toBe(true);
  });
});
