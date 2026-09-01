import { describe, it, expect } from "vitest";
import { decidirBotoes, RegistroLike } from "../registroPontoBotoes";

const mk = (
  tipo: RegistroLike["tipo"],
  data_hora = "2026-05-08T09:00:00-03:00"
): RegistroLike => ({ tipo, data_hora });

// Referência de "agora" fixa para tornar os testes determinísticos em relação
// à nova lógica assimétrica (compara dia local BR de última vs hoje).
const AGORA = new Date("2026-05-08T14:00:00-03:00");

describe("decidirBotoes (bloqueio assimétrico)", () => {
  it("sem registro algum => ENTRADA habilitada, SAÍDA desabilitada", () => {
    const r = decidirBotoes(null, AGORA);
    expect(r.entradaDisabled).toBe(false);
    expect(r.saidaDisabled).toBe(true);
  });

  it("undefined => mesmo comportamento de null", () => {
    const r = decidirBotoes(undefined, AGORA);
    expect(r.entradaDisabled).toBe(false);
    expect(r.saidaDisabled).toBe(true);
  });

  it("último = SAIDA => ENTRADA habilitada, SAÍDA desabilitada", () => {
    const r = decidirBotoes(mk("SAIDA", "2026-05-07T17:00:00-03:00"), AGORA);
    expect(r.entradaDisabled).toBe(false);
    expect(r.saidaDisabled).toBe(true);
  });

  it("último = ENTRADA do MESMO dia => ENTRADA desabilitada, SAÍDA habilitada", () => {
    const r = decidirBotoes(mk("ENTRADA", "2026-05-08T08:00:00-03:00"), AGORA);
    expect(r.entradaDisabled).toBe(true);
    expect(r.saidaDisabled).toBe(false);
  });

  it("último = ENTRADA de DIA ANTERIOR => ENTRADA habilitada (avisada) e SAÍDA habilitada", () => {
    // Assimétrico: colaborador pode iniciar o dia mesmo com pendência anterior.
    const r = decidirBotoes(mk("ENTRADA", "2026-05-07T22:00:00-03:00"), AGORA);
    expect(r.entradaDisabled).toBe(false);
    expect(r.saidaDisabled).toBe(false);
    expect(r.entradaTooltip).toMatch(/saída pendente/i);
  });

  it("midnight-split: último = ENTRADA auto do MESMO dia => ENTRADA desabilitada, SAÍDA habilitada", () => {
    const ultimoAuto: RegistroLike = {
      tipo: "ENTRADA",
      data_hora: "2026-05-08T00:00:00-03:00",
      is_auto: true,
    };
    const r = decidirBotoes(ultimoAuto, AGORA);
    expect(r.entradaDisabled).toBe(true);
    expect(r.saidaDisabled).toBe(false);
  });

  it("pausa registrada como SAIDA => próxima marcação deve ser ENTRADA", () => {
    const r = decidirBotoes(mk("SAIDA", "2026-05-08T12:00:00-03:00"), AGORA);
    expect(r.entradaDisabled).toBe(false);
    expect(r.saidaDisabled).toBe(true);
  });
});
