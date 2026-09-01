import { describe, it, expect } from "vitest";
import {
  gerarDatasSemanais,
  calcularScore,
  calcularTendencia,
  calcularAlertas,
  getIsoWeek,
} from "../cuidarEngine";

describe("cuidarEngine.gerarDatasSemanais", () => {
  it("retorna semanas seg–sex do ano", () => {
    const datas = gerarDatasSemanais(2025);
    expect(datas.length).toBeGreaterThanOrEqual(52);
    expect(datas.length).toBeLessThanOrEqual(53);
    datas.forEach((d) => {
      // início = segunda (ISO 1), fim = sexta (ISO 5), 4 dias entre eles
      expect(((d.data.getUTCDay() + 6) % 7) + 1).toBe(1);
      expect(((d.dataFim.getUTCDay() + 6) % 7) + 1).toBe(5);
      expect((d.dataFim.getTime() - d.data.getTime()) / 86400000).toBe(4);
    });
  });

  it("marca 12 últimas sextas do mês em um ano", () => {
    const datas = gerarDatasSemanais(2025);
    const ultimas = datas.filter((d) => d.ultimaSextaDoMes);
    expect(ultimas.length).toBe(12);
  });
});

describe("cuidarEngine.calcularScore", () => {
  it("escala_0_5: 4 -> 80", () => {
    expect(calcularScore({ tipo: "escala_0_5", resposta: "4" })).toBe(80);
  });
  it("escala_0_5: 0 -> 0", () => {
    expect(calcularScore({ tipo: "escala_0_5", resposta: "0" })).toBe(0);
  });
  it("escala_0_5: 5 -> 100", () => {
    expect(calcularScore({ tipo: "escala_0_5", resposta: "5" })).toBe(100);
  });
  it("texto -> null", () => {
    expect(calcularScore({ tipo: "texto", resposta: "ok" })).toBeNull();
  });
});

describe("cuidarEngine.calcularTendencia", () => {
  it("80 vs 65 -> +15", () => {
    expect(calcularTendencia(80, 65)).toBe(15);
  });
  it("trata null como 0", () => {
    expect(calcularTendencia(null, 50)).toBe(-50);
  });
});

describe("cuidarEngine.calcularAlertas", () => {
  it("score 25 -> alerta individual", () => {
    const alertas = calcularAlertas({
      humorMedio: 70,
      humorMedioAnterior: 70,
      scoresPorColaborador: [{ employee_id: "a", score: 25 }],
      totalColaboradoresAtivos: 10,
      totalRespondentesUnicos: 10,
    });
    expect(alertas.find((a) => a.tipo === "individual")).toBeTruthy();
  });

  it("queda > 15 -> alerta queda_grupo", () => {
    const alertas = calcularAlertas({
      humorMedio: 50,
      humorMedioAnterior: 70,
      scoresPorColaborador: [],
      totalColaboradoresAtivos: 10,
      totalRespondentesUnicos: 10,
    });
    expect(alertas.find((a) => a.tipo === "queda_grupo")).toBeTruthy();
  });

  it("participação < 30% -> alerta", () => {
    const alertas = calcularAlertas({
      humorMedio: 70,
      humorMedioAnterior: 70,
      scoresPorColaborador: [],
      totalColaboradoresAtivos: 100,
      totalRespondentesUnicos: 20,
    });
    expect(alertas.find((a) => a.tipo === "participacao_baixa")).toBeTruthy();
  });
});

describe("getIsoWeek", () => {
  it("4 Jan 2026 -> semana 1", () => {
    expect(getIsoWeek(new Date(Date.UTC(2026, 0, 4)))).toBe(1);
  });
});
