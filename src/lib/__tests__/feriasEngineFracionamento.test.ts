import { describe, it, expect } from "vitest";
import { validarFracionamento } from "../feriasEngine";

describe("CLT art. 134 §1º: validarFracionamento", () => {
  it("Período de 4 dias: bloqueia por não atingir o mínimo de 5 dias", () => {
    const res = validarFracionamento({
      periodosExistentes: [],
      novoPeriodo: { dias: 4 },
      maxFracionamentos: 3,
    });
    expect(res.valido).toBe(false);
    expect(res.erro).toContain("mínimo de 5 dias corridos");
  });

  it("Período de 5 dias: passa na validação de mínimo", () => {
    const res = validarFracionamento({
      periodosExistentes: [],
      novoPeriodo: { dias: 5 },
      maxFracionamentos: 3,
    });
    expect(res.valido).toBe(true);
  });

  it("Divisão em 3 períodos sem nenhum de 14 dias: bloqueia", () => {
    const res = validarFracionamento({
      periodosExistentes: [{ dias: 5 }, { dias: 5 }],
      novoPeriodo: { dias: 10 },
      maxFracionamentos: 3,
    });
    expect(res.valido).toBe(false);
    expect(res.erro).toContain("ao menos um deve ter 14 dias ou mais");
  });

  it("Divisão em 3 períodos com um anterior de 14 dias: passa", () => {
    const res = validarFracionamento({
      periodosExistentes: [{ dias: 14 }, { dias: 6 }],
      novoPeriodo: { dias: 10 },
      maxFracionamentos: 3,
    });
    expect(res.valido).toBe(true);
  });

  it("Divisão em 3 períodos onde o novo período é o de 14 dias: passa", () => {
    const res = validarFracionamento({
      periodosExistentes: [{ dias: 8 }, { dias: 8 }],
      novoPeriodo: { dias: 14 },
      maxFracionamentos: 3,
    });
    expect(res.valido).toBe(true);
  });

  it("Total de 2 períodos (não atingiu 3): passa mesmo se nenhum tiver 14 ainda", () => {
    const res = validarFracionamento({
      periodosExistentes: [{ dias: 5 }],
      novoPeriodo: { dias: 5 },
      maxFracionamentos: 3,
    });
    expect(res.valido).toBe(true);
  });

  it("R1: 4º período bloqueia com erro de limite atingido mesmo com 14 dias no 1º", () => {
    const res = validarFracionamento({
      periodosExistentes: [{ dias: 14 }, { dias: 5 }, { dias: 5 }],
      novoPeriodo: { dias: 5 },
      maxFracionamentos: 3,
    });
    expect(res.valido).toBe(false);
    expect(res.erro).toContain("Limite de 3 períodos atingido para este período aquisitivo");
  });
});

