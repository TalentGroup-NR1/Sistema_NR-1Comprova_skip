import { describe, it, expect } from "vitest";
import {
  calcularAlertasIndividuais,
  calcularAlertasColetivos,
} from "@/lib/cuidarAlertas";

describe("cuidarAlertas — individuais", () => {
  it("score 25 → score_critico alto", () => {
    const r = calcularAlertasIndividuais({ scoreAtual: 25, scoreAnterior: null, historicoUltimas3: [] });
    expect(r.find((a) => a.gatilho === "score_critico")?.severidade).toBe("alto");
  });
  it("delta -25 → queda_individual moderado", () => {
    const r = calcularAlertasIndividuais({ scoreAtual: 50, scoreAnterior: 75, historicoUltimas3: [] });
    expect(r.find((a) => a.gatilho === "queda_individual")?.severidade).toBe("moderado");
  });
  it("3 semanas todas <50 → padrao_recorrente alto", () => {
    const r = calcularAlertasIndividuais({ scoreAtual: 40, scoreAnterior: 45, historicoUltimas3: [40, 45, 48] });
    expect(r.find((a) => a.gatilho === "padrao_recorrente")?.severidade).toBe("alto");
  });
  it("silêncio 2 semanas → silencio moderado", () => {
    const r = calcularAlertasIndividuais({ scoreAtual: 70, scoreAnterior: 70, historicoUltimas3: [], semanasSemResposta: 2 });
    expect(r.find((a) => a.gatilho === "silencio")?.severidade).toBe("moderado");
  });
  it("score saudável e estável → sem alertas", () => {
    const r = calcularAlertasIndividuais({ scoreAtual: 78, scoreAnterior: 75, historicoUltimas3: [78, 75, 72] });
    expect(r).toHaveLength(0);
  });
  it("delta -10 não dispara queda_individual", () => {
    const r = calcularAlertasIndividuais({ scoreAtual: 65, scoreAnterior: 75, historicoUltimas3: [] });
    expect(r.find((a) => a.gatilho === "queda_individual")).toBeUndefined();
  });
});

describe("cuidarAlertas — coletivos", () => {
  it("humor médio time <50 com 3 respondentes → humor_baixo_time", () => {
    const r = calcularAlertasColetivos({ humorMedio: 45, humorAnterior: 50, respondentes: 3, altaCarga: 0 });
    expect(r.find((a) => a.gatilho === "humor_baixo_time")?.severidade).toBe("moderado");
  });
  it("humor médio baixo mas só 2 respondentes → não dispara", () => {
    const r = calcularAlertasColetivos({ humorMedio: 40, humorAnterior: 60, respondentes: 2, altaCarga: 0 });
    expect(r.find((a) => a.gatilho === "humor_baixo_time")).toBeUndefined();
  });
  it("queda coletiva 20pts → queda_coletiva alto", () => {
    const r = calcularAlertasColetivos({ humorMedio: 55, humorAnterior: 75, respondentes: 5, altaCarga: 0 });
    expect(r.find((a) => a.gatilho === "queda_coletiva")?.severidade).toBe("alto");
  });
  it("3+ colabs com alta carga → alta_carga_time alto", () => {
    const r = calcularAlertasColetivos({ humorMedio: 65, humorAnterior: 65, respondentes: 6, altaCarga: 3 });
    expect(r.find((a) => a.gatilho === "alta_carga_time")?.severidade).toBe("alto");
  });
  it("time saudável → sem alertas", () => {
    const r = calcularAlertasColetivos({ humorMedio: 75, humorAnterior: 72, respondentes: 5, altaCarga: 1 });
    expect(r).toHaveLength(0);
  });
});
