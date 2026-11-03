import { describe, it, expect } from "vitest";
import { addDays, format } from "date-fns";
import {
  calcularStatusPeriodo,
  calcularStatusColaborador,
  contarPorColaborador,
  PeriodoComGozos,
} from "../feriasEngine";

describe("ETAPA 1: calcularStatusPeriodo e contarPorColaborador", () => {
  const hoje = new Date(2026, 10, 3); // 03/11/2026
  const hojeStr = format(hoje, "yyyy-MM-dd");

  it("Colaborador com 1 período vencido → 1 vencido", () => {
    const colab = {
      id: "colab-1",
      periodos: [
        {
          id: "p1",
          data_inicio_aquisitivo: "2024-01-01",
          data_fim_aquisitivo: "2025-01-01",
          data_limite_gozo: "2025-11-01", // no passado
          dias_adquiridos: 30,
          gozos: [],
        },
      ],
    };

    const res = contarPorColaborador([colab], hoje, 90);
    expect(res.colaboradoresVencidos).toBe(1);
    expect(res.periodosVencidos).toBe(1);
    expect(res.colaboradoresAVencer).toBe(0);
    expect(res.periodosAVencer).toBe(0);
    expect(res.porColaborador.get("colab-1")).toEqual({ vencidos: 1, aVencer: 0 });
  });

  it("Colaborador com 2 períodos vencidos → 1 colaborador, 2 períodos (D1)", () => {
    const colab = {
      id: "colab-1",
      periodos: [
        {
          id: "p1",
          data_inicio_aquisitivo: "2023-01-01",
          data_fim_aquisitivo: "2024-01-01",
          data_limite_gozo: "2024-11-01",
          dias_adquiridos: 30,
          gozos: [],
        },
        {
          id: "p2",
          data_inicio_aquisitivo: "2024-01-01",
          data_fim_aquisitivo: "2025-01-01",
          data_limite_gozo: "2025-11-01",
          dias_adquiridos: 30,
          gozos: [],
        },
      ],
    };

    const res = contarPorColaborador([colab], hoje, 90);
    // D1: contagem por colaborador único!
    expect(res.colaboradoresVencidos).toBe(1);
    expect(res.periodosVencidos).toBe(2);
    expect(res.porColaborador.get("colab-1")).toEqual({ vencidos: 2, aVencer: 0 });
  });

  it("Período com saldo 0 e limite passado → NÃO conta ('em_dia')", () => {
    const periodo: PeriodoComGozos = {
      id: "p1",
      data_inicio_aquisitivo: "2024-01-01",
      data_fim_aquisitivo: "2025-01-01",
      data_limite_gozo: "2025-11-01", // no passado
      dias_adquiridos: 30,
      gozos: [
        {
          dias_gozados: 20,
          abono_pecuniario_dias: 10,
          status: "aprovado",
        },
      ],
    };

    const status = calcularStatusPeriodo(periodo, hoje, 90);
    expect(status.status).toBe("em_dia");
    expect(status.diasRestantes).toBe(0);
  });

  it("Limite exatamente hoje → 'a_vencer' (não 'vencida')", () => {
    const periodo: PeriodoComGozos = {
      id: "p1",
      data_inicio_aquisitivo: "2024-11-03",
      data_fim_aquisitivo: "2025-11-03",
      data_limite_gozo: hojeStr, // exatamente 03/11/2026
      dias_adquiridos: 30,
      gozos: [],
    };

    const status = calcularStatusPeriodo(periodo, hoje, 90);
    expect(status.status).toBe("a_vencer");
    expect(status.diasRestantes).toBe(30);
  });

  it("Limite em hoje+90 → 'a_vencer'", () => {
    const limite90 = format(addDays(hoje, 90), "yyyy-MM-dd");
    const periodo: PeriodoComGozos = {
      id: "p1",
      data_inicio_aquisitivo: "2024-11-03",
      data_fim_aquisitivo: "2025-11-03",
      data_limite_gozo: limite90,
      dias_adquiridos: 30,
      gozos: [],
    };

    const status = calcularStatusPeriodo(periodo, hoje, 90);
    expect(status.status).toBe("a_vencer");
  });

  it("Limite em hoje+91 → 'em_dia'", () => {
    const limite91 = format(addDays(hoje, 91), "yyyy-MM-dd");
    const periodo: PeriodoComGozos = {
      id: "p1",
      data_inicio_aquisitivo: "2024-11-03",
      data_fim_aquisitivo: "2025-11-03",
      data_limite_gozo: limite91,
      dias_adquiridos: 30,
      gozos: [],
    };

    const status = calcularStatusPeriodo(periodo, hoje, 90);
    expect(status.status).toBe("em_dia");
  });

  it("Gozo cancelado é ignorado no cálculo de usados", () => {
    const periodo: PeriodoComGozos = {
      id: "p1",
      data_inicio_aquisitivo: "2024-01-01",
      data_fim_aquisitivo: "2025-01-01",
      data_limite_gozo: "2025-11-01", // no passado
      dias_adquiridos: 30,
      gozos: [
        {
          dias_gozados: 30,
          abono_pecuniario_dias: 0,
          status: "cancelado", // CANCELADO!
        },
      ],
    };

    const status = calcularStatusPeriodo(periodo, hoje, 90);
    // Como foi cancelado, usados = 0 -> 30 dias restantes -> vencida!
    expect(status.status).toBe("vencida");
    expect(status.diasRestantes).toBe(30);
  });

  it("Caso real da Horizonte (João Pereira Neto: limite 2027-11-16) → 'em_dia' em 03/11/2026", () => {
    const periodoJoao: PeriodoComGozos = {
      id: "b5c0aec5-77dd-4e14-a039-654614cc05fa",
      data_inicio_aquisitivo: "2026-01-15",
      data_fim_aquisitivo: "2027-01-15",
      data_limite_gozo: "2027-11-16",
      dias_adquiridos: 30,
      gozos: [],
    };

    const status = calcularStatusPeriodo(periodoJoao, hoje, 90);
    expect(status.status).toBe("em_dia");
    // Em 03/11/2026, com início em 15/01/2026: período em aquisição proporcional
    expect(status.diasRestantes).toBeGreaterThan(0);
  });

  it("Cenário real consolidado da Horizonte Contabilidade em 03/11/2026: 0 vencidas e 1 a vencer (Carlos Eduardo Lima)", () => {
    const colabsHorizonte = [
      {
        id: "0540852d-9587-4ceb-a9f4-11ac19d4011e", // João Pereira Neto
        periodos: [
          {
            id: "b5c0aec5-77dd-4e14-a039-654614cc05fa",
            data_inicio_aquisitivo: "2026-01-15",
            data_fim_aquisitivo: "2027-01-15",
            data_limite_gozo: "2027-11-16",
            dias_adquiridos: 30,
            gozos: [],
          },
        ],
      },
      {
        id: "df98e0c0-aa11-48bb-a9d4-2994c36f2d88", // Carlos Eduardo Lima
        periodos: [
          {
            id: "af0b0b21-2cf3-42b8-bbac-c95136e2ae90",
            data_inicio_aquisitivo: "2025-03-15",
            data_fim_aquisitivo: "2026-03-15",
            data_limite_gozo: "2027-01-14", // 72 dias de 03/11/2026 -> a vencer!
            dias_adquiridos: 30,
            gozos: [
              {
                dias_gozados: 23,
                abono_pecuniario_dias: 0,
                status: "planejado",
              },
            ],
          },
        ],
      },
      {
        id: "14e3f03e-1a8f-4a94-be29-48ec04bbb6d9", // João Pedro Santos
        periodos: [
          {
            id: "392270fe-01c8-4e60-9f90-7011dbb319d7",
            data_inicio_aquisitivo: "2025-09-14",
            data_fim_aquisitivo: "2026-09-14",
            data_limite_gozo: "2027-07-16",
            dias_adquiridos: 30,
            gozos: [
              {
                dias_gozados: 30,
                abono_pecuniario_dias: 0,
                status: "aprovado",
              },
            ],
          },
          {
            id: "15c74749-0e7e-429d-afab-8f4bad8eeeba",
            data_inicio_aquisitivo: "2026-09-14",
            data_fim_aquisitivo: "2027-09-14",
            data_limite_gozo: "2028-07-16",
            dias_adquiridos: 30,
            gozos: [],
          },
        ],
      },
    ];

    const res = contarPorColaborador(colabsHorizonte, hoje, 90);
    expect(res.colaboradoresVencidos).toBe(0);
    expect(res.periodosVencidos).toBe(0);
    expect(res.colaboradoresAVencer).toBe(1);
    expect(res.periodosAVencer).toBe(1);
    expect(res.porColaborador.get("df98e0c0-aa11-48bb-a9d4-2994c36f2d88")).toEqual({ vencidos: 0, aVencer: 1 });
  });

  it("Múltiplos colaboradores com diferentes status consolidados corretamente", () => {
    const colabVencido = {
      id: "c-vencido",
      periodos: [
        {
          id: "p-v1",
          data_inicio_aquisitivo: "2023-01-01",
          data_fim_aquisitivo: "2024-01-01",
          data_limite_gozo: "2024-11-01",
          dias_adquiridos: 30,
          gozos: [],
        },
      ],
    };

    const colabAVencer = {
      id: "c-avencer",
      periodos: [
        {
          id: "p-av1",
          data_inicio_aquisitivo: "2024-11-03",
          data_fim_aquisitivo: "2025-11-03",
          data_limite_gozo: format(addDays(hoje, 45), "yyyy-MM-dd"),
          dias_adquiridos: 30,
          gozos: [],
        },
      ],
    };

    const colabEmDia = {
      id: "c-emdia",
      periodos: [
        {
          id: "p-ed1",
          data_inicio_aquisitivo: "2025-01-01",
          data_fim_aquisitivo: "2026-01-01",
          data_limite_gozo: "2027-10-01",
          dias_adquiridos: 30,
          gozos: [],
        },
      ],
    };

    const res = contarPorColaborador(
      [colabVencido, colabAVencer, colabEmDia],
      hoje,
      90
    );

    expect(res.colaboradoresVencidos).toBe(1);
    expect(res.colaboradoresAVencer).toBe(1);
    expect(res.periodosVencidos).toBe(1);
    expect(res.periodosAVencer).toBe(1);
  });

  it("Estouro histórico (usados=35 > direito=30) → diasUsados=35, diasRestantes=0 e status='em_dia'", () => {
    const periodoOverdraft: PeriodoComGozos = {
      id: "p-overdraft",
      data_inicio_aquisitivo: "2024-01-01",
      data_fim_aquisitivo: "2025-01-01",
      data_limite_gozo: "2025-11-01", // no passado
      dias_adquiridos: 30,
      gozos: [
        {
          dias_gozados: 30,
          abono_pecuniario_dias: 5, // total 35 > 30
          status: "aprovado",
        },
      ],
    };

    const status = calcularStatusPeriodo(periodoOverdraft, hoje, 90);
    expect(status.status).toBe("em_dia");
    expect(status.diasRestantes).toBe(0);
    expect(status.diasUsados).toBe(35);
  });

  it("Cobertura: Colaborador com 1 período vencido E 1 período a vencer no contarPorColaborador", () => {
    const colabMisto = {
      id: "c-misto",
      periodos: [
        {
          id: "p-vencido",
          data_inicio_aquisitivo: "2023-01-01",
          data_fim_aquisitivo: "2024-01-01",
          data_limite_gozo: "2024-11-01", // vencido
          dias_adquiridos: 30,
          gozos: [],
        },
        {
          id: "p-avencer",
          data_inicio_aquisitivo: "2024-11-03",
          data_fim_aquisitivo: "2025-11-03",
          data_limite_gozo: format(addDays(hoje, 30), "yyyy-MM-dd"), // a vencer
          dias_adquiridos: 30,
          gozos: [],
        },
      ],
    };

    const res = contarPorColaborador([colabMisto], hoje, 90);
    // Esperado: colaboradoresVencidos=1, colaboradoresAVencer=1 (o mesmo colaborador conta nos dois KPIs)
    expect(res.colaboradoresVencidos).toBe(1);
    expect(res.colaboradoresAVencer).toBe(1);
    expect(res.periodosVencidos).toBe(1);
    expect(res.periodosAVencer).toBe(1);
    expect(res.porColaborador.get("c-misto")).toEqual({ vencidos: 1, aVencer: 1 });
  });

  describe("ETAPA 3: calcularStatusColaborador", () => {
    it("com 1 vencido → { vencidos: 1, aVencer: 0 }", () => {
      const periodos: PeriodoComGozos[] = [
        {
          id: "p1",
          data_inicio_aquisitivo: "2023-01-01",
          data_fim_aquisitivo: "2024-01-01",
          data_limite_gozo: "2024-11-01",
          dias_adquiridos: 30,
          gozos: [],
        },
      ];
      expect(calcularStatusColaborador(periodos, hoje, 90)).toEqual({ vencidos: 1, aVencer: 0 });
    });

    it("com 1 vencido + 1 a vencer → { vencidos: 1, aVencer: 1 }", () => {
      const periodos: PeriodoComGozos[] = [
        {
          id: "p1",
          data_inicio_aquisitivo: "2023-01-01",
          data_fim_aquisitivo: "2024-01-01",
          data_limite_gozo: "2024-11-01",
          dias_adquiridos: 30,
          gozos: [],
        },
        {
          id: "p2",
          data_inicio_aquisitivo: "2024-11-03",
          data_fim_aquisitivo: "2025-11-03",
          data_limite_gozo: format(addDays(hoje, 45), "yyyy-MM-dd"),
          dias_adquiridos: 30,
          gozos: [],
        },
      ];
      expect(calcularStatusColaborador(periodos, hoje, 90)).toEqual({ vencidos: 1, aVencer: 1 });
    });

    it("com 2 vencidos → { vencidos: 2, aVencer: 0 }", () => {
      const periodos: PeriodoComGozos[] = [
        {
          id: "p1",
          data_inicio_aquisitivo: "2023-01-01",
          data_fim_aquisitivo: "2024-01-01",
          data_limite_gozo: "2024-11-01",
          dias_adquiridos: 30,
          gozos: [],
        },
        {
          id: "p2",
          data_inicio_aquisitivo: "2024-01-01",
          data_fim_aquisitivo: "2025-01-01",
          data_limite_gozo: "2025-11-01",
          dias_adquiridos: 30,
          gozos: [],
        },
      ];
      expect(calcularStatusColaborador(periodos, hoje, 90)).toEqual({ vencidos: 2, aVencer: 0 });
    });

    it("com 0 períodos → { vencidos: 0, aVencer: 0 }", () => {
      expect(calcularStatusColaborador([], hoje, 90)).toEqual({ vencidos: 0, aVencer: 0 });
    });
  });
});

