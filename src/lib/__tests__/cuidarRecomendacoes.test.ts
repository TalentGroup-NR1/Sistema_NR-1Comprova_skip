import { describe, it, expect } from "vitest";
import {
  calcularRecomendacoesColaborador,
  calcularRecomendacoesRH,
} from "@/lib/cuidarRecomendacoes";

describe("cuidarRecomendacoes — colaborador", () => {
  it("score 85 → leve", () => {
    const r = calcularRecomendacoesColaborador({ scoreAtual: 85, scoreAnterior: null, streakSemanal: 0 });
    expect(r).toContain("leve");
  });
  it("score 65 → equilibrada", () => {
    const r = calcularRecomendacoesColaborador({ scoreAtual: 65, scoreAnterior: null, streakSemanal: 0 });
    expect(r).toContain("equilibrada");
  });
  it("score 45 → desafiadora", () => {
    const r = calcularRecomendacoesColaborador({ scoreAtual: 45, scoreAnterior: null, streakSemanal: 0 });
    expect(r).toContain("desafiadora");
  });
  it("score 30 → alerta", () => {
    const r = calcularRecomendacoesColaborador({ scoreAtual: 30, scoreAnterior: null, streakSemanal: 0 });
    expect(r).toContain("alerta");
  });
  it("delta +20 → tendencia_positiva", () => {
    const r = calcularRecomendacoesColaborador({ scoreAtual: 80, scoreAnterior: 60, streakSemanal: 0 });
    expect(r).toContain("tendencia_positiva");
  });
  it("delta -20 → cansaco + tendencia_negativa", () => {
    const r = calcularRecomendacoesColaborador({ scoreAtual: 50, scoreAnterior: 75, streakSemanal: 0 });
    expect(r).toContain("cansaco");
    expect(r).toContain("tendencia_negativa");
  });
  it("streak 4 → constancia", () => {
    const r = calcularRecomendacoesColaborador({ scoreAtual: 70, scoreAnterior: null, streakSemanal: 4 });
    expect(r).toContain("constancia");
  });
  it("streak 12 → constancia + ciclo", () => {
    const r = calcularRecomendacoesColaborador({ scoreAtual: 70, scoreAnterior: null, streakSemanal: 12 });
    expect(r).toContain("constancia");
    expect(r).toContain("ciclo");
  });
  it("sem anterior não gera tendência", () => {
    const r = calcularRecomendacoesColaborador({ scoreAtual: 80, scoreAnterior: null, streakSemanal: 0 });
    expect(r).not.toContain("tendencia_positiva");
    expect(r).not.toContain("tendencia_negativa");
  });
});

describe("cuidarRecomendacoes — RH", () => {
  it("humor médio < 50 → humor_baixo", () => {
    const r = calcularRecomendacoesRH({ humorMedio: 45, humorMedioAnterior: 50, alertasCarga: 0 });
    expect(r).toContain("humor_baixo");
  });
  it("queda coletiva > 10 → queda_coletiva", () => {
    const r = calcularRecomendacoesRH({ humorMedio: 60, humorMedioAnterior: 75, alertasCarga: 0 });
    expect(r).toContain("queda_coletiva");
  });
  it("alertas de carga >= 3 → alta_carga", () => {
    const r = calcularRecomendacoesRH({ humorMedio: 70, humorMedioAnterior: 70, alertasCarga: 5 });
    expect(r).toContain("alta_carga");
  });
  it("time saudável → sem recomendações organizacionais", () => {
    const r = calcularRecomendacoesRH({ humorMedio: 75, humorMedioAnterior: 72, alertasCarga: 1 });
    expect(r).toHaveLength(0);
  });
});
