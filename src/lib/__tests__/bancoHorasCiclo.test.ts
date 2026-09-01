import { describe, it, expect } from "vitest";
import { getCicloVigente, getCicloOffset } from "../bancoHorasCiclo";

describe("getCicloVigente", () => {
  it("retorna mês corrente quando mensal", () => {
    const c = getCicloVigente({ periodo_fechamento_banco: "mensal" }, new Date(2026, 5, 15));
    expect(c.inicio).toBe("2026-06-01");
    expect(c.fim).toBe("2026-06-30");
  });

  it("quadrimestral âncora 01/05 contém 01/06 → 01/05–31/08", () => {
    const c = getCicloVigente(
      { periodo_fechamento_banco: "quadrimestral", banco_horas_inicio: "2026-05-01" },
      new Date(2026, 5, 1),
    );
    expect(c.inicio).toBe("2026-05-01");
    expect(c.fim).toBe("2026-08-31");
  });

  it("quadrimestral âncora 01/05, ref 02/09 → 01/09–31/12", () => {
    const c = getCicloVigente(
      { periodo_fechamento_banco: "quadrimestral", banco_horas_inicio: "2026-05-01" },
      new Date(2026, 8, 2),
    );
    expect(c.inicio).toBe("2026-09-01");
    expect(c.fim).toBe("2026-12-31");
  });

  it("semestral âncora 01/01 contém 15/07 → 01/07–31/12", () => {
    const c = getCicloVigente(
      { periodo_fechamento_banco: "semestral", banco_horas_inicio: "2026-01-01" },
      new Date(2026, 6, 15),
    );
    expect(c.inicio).toBe("2026-07-01");
    expect(c.fim).toBe("2026-12-31");
  });

  it("anual âncora 01/01/2026 contém 15/06 → 01/01–31/12", () => {
    const c = getCicloVigente(
      { periodo_fechamento_banco: "anual", banco_horas_inicio: "2026-01-01" },
      new Date(2026, 5, 15),
    );
    expect(c.inicio).toBe("2026-01-01");
    expect(c.fim).toBe("2026-12-31");
  });

  it("getCicloOffset volta um ciclo", () => {
    const atual = getCicloVigente(
      { periodo_fechamento_banco: "quadrimestral", banco_horas_inicio: "2026-05-01" },
      new Date(2026, 5, 1),
    );
    const anterior = getCicloOffset(
      { periodo_fechamento_banco: "quadrimestral", banco_horas_inicio: "2026-05-01" },
      atual.inicio,
      -1,
    );
    expect(anterior.inicio).toBe("2026-01-01");
    expect(anterior.fim).toBe("2026-04-30");
  });
});
