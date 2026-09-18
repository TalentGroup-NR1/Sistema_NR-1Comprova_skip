import { describe, it, expect } from "vitest";
import { calcularProgresso5W2H } from "../../hooks/usePgrAcoes";
import { PgrPlanoAcao } from "../../hooks/usePgrAcoes";

describe("calcularProgresso5W2H", () => {
  it("deve retornar 0/6 para uma ação completamente vazia nos campos de gestão", () => {
    const acao: Partial<PgrPlanoAcao> = {
      por_que: "",
      onde: null,
      como: "   ",
      prazo: null,
      responsavel_id: null,
      custo_estimado: 0
    };
    
    const result = calcularProgresso5W2H(acao);
    expect(result.preenchidos).toBe(0);
    expect(result.total).toBe(6);
    expect(result.completo).toBe(false);
  });

  it("deve contar o custo_estimado APENAS se for maior que zero", () => {
    const acaoComZero: Partial<PgrPlanoAcao> = { custo_estimado: 0 };
    expect(calcularProgresso5W2H(acaoComZero).preenchidos).toBe(0);

    const acaoComValor: Partial<PgrPlanoAcao> = { custo_estimado: 10.5 };
    expect(calcularProgresso5W2H(acaoComValor).preenchidos).toBe(1);
    
    const acaoSemCusto: Partial<PgrPlanoAcao> = {};
    expect(calcularProgresso5W2H(acaoSemCusto).preenchidos).toBe(0);
  });

  it("deve retornar parcial (ex: 3/6) quando alguns campos estão preenchidos", () => {
    const acao: Partial<PgrPlanoAcao> = {
      por_que: "Adequação legal",
      onde: "Fábrica",
      como: "Contratação de terceiros",
      prazo: null, // vazio
      responsavel_id: null, // vazio
      custo_estimado: 0 // não conta
    };
    
    const result = calcularProgresso5W2H(acao);
    expect(result.preenchidos).toBe(3);
    expect(result.total).toBe(6);
    expect(result.completo).toBe(false);
  });

  it("deve retornar 6/6 e completo=true para uma ação com todos os campos preenchidos", () => {
    const acao: Partial<PgrPlanoAcao> = {
      por_que: "Adequação legal",
      onde: "Fábrica",
      como: "Contratação de terceiros",
      prazo: "2026-12-31",
      responsavel_id: "user-123",
      custo_estimado: 1500
    };
    
    const result = calcularProgresso5W2H(acao);
    expect(result.preenchidos).toBe(6);
    expect(result.total).toBe(6);
    expect(result.completo).toBe(true);
  });
});
