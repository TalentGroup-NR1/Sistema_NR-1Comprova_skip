import { describe, it, expect } from "vitest";

function formatCurrency(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function totalizarCustoReal(execucoes: { custo: number }[]): number {
  return execucoes.reduce((acc, exec) => acc + (Number(exec.custo) || 0), 0);
}

function validarExecucao(form: { o_que_foi_feito: string; custo: number }): { ok: boolean; erro?: string } {
  if (!form.o_que_foi_feito.trim()) {
    return { ok: false, erro: "Preencha o que foi feito" };
  }
  if (form.o_que_foi_feito.length > 1000) {
    return { ok: false, erro: "Texto excedeu 1000 caracteres" };
  }
  if (form.custo < 0) {
    return { ok: false, erro: "O custo não pode ser negativo" };
  }
  return { ok: true };
}

describe("pgrAcoes: Validações e Totalizações 5W2H / Log de Execução", () => {
  it("deve totalizar corretamente o custo real das execuções (array vazio)", () => {
    expect(totalizarCustoReal([])).toBe(0);
  });

  it("deve totalizar corretamente o custo real das execuções (múltiplos itens)", () => {
    const execs = [
      { custo: 10.5 },
      { custo: 20 },
      { custo: 0 },
      { custo: 100 }
    ];
    expect(totalizarCustoReal(execs)).toBe(130.5);
  });

  it("deve validar rejeitando custo negativo", () => {
    const r = validarExecucao({ o_que_foi_feito: "Teste", custo: -10 });
    expect(r.ok).toBe(false);
    expect(r.erro).toBe("O custo não pode ser negativo");
  });

  it("deve validar rejeitando o_que_foi_feito vazio", () => {
    const r = validarExecucao({ o_que_foi_feito: "   ", custo: 10 });
    expect(r.ok).toBe(false);
    expect(r.erro).toBe("Preencha o que foi feito");
  });

  it("deve validar aceitando formulário correto", () => {
    const r = validarExecucao({ o_que_foi_feito: "Instalado exaustor no setor A", custo: 450 });
    expect(r.ok).toBe(true);
  });
});
