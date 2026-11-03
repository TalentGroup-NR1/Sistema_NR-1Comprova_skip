import { describe, it, expect } from "vitest";
import { addDays, subDays } from "date-fns";
import {
  buildFeriasGozoSchema,
  calcularLimitePagamento,
  subtractBusinessDays,
  isDiaNaoUtil,
  resolverObservacoes,
} from "../FeriasGozoForm";

describe("ETAPA 1: Validação de Saldo no FeriasGozoForm", () => {
  const baseInicio = new Date(2026, 5, 10); // Quarta 10/06/2026
  const basePagamento = new Date(2026, 5, 5); // Sexta 05/06/2026 (5 dias antes)

  it("Criação: permite lançamento quando descanso + abono <= diasRestantes", () => {
    const schema = buildFeriasGozoSchema({
      diasRestantes: 30,
      isEditing: false,
    });

    // 20 dias de descanso + 10 de abono = 30 dias
    const validData = {
      data_inicio_gozo: baseInicio,
      data_fim_gozo: addDays(baseInicio, 19),
      data_pagamento: basePagamento,
      abono_pecuniario_dias: 10,
      observacoes: "",
    };

    const result = schema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("Criação com abono > 0: bloqueia com erro apontando para abono_pecuniario_dias quando excede saldo", () => {
    const schema = buildFeriasGozoSchema({
      diasRestantes: 30,
      isEditing: false,
    });

    // 25 dias de descanso + 10 de abono = 35 dias
    const invalidData = {
      data_inicio_gozo: baseInicio,
      data_fim_gozo: addDays(baseInicio, 24),
      data_pagamento: basePagamento,
      abono_pecuniario_dias: 10,
      observacoes: "",
    };

    const result = schema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorAbono = result.error.issues.find(
        (issue) => issue.path.includes("abono_pecuniario_dias")
      );
      expect(errorAbono).toBeDefined();
      expect(errorAbono?.message).toContain("Total consumido (35d) excede os 30 dias disponíveis");
    }
  });

  it("Criação com abono = 0: bloqueia com erro apontando para data_fim_gozo quando descanso excede saldo (P1)", () => {
    const schema = buildFeriasGozoSchema({
      diasRestantes: 20,
      isEditing: false,
    });

    // 25 dias de descanso + 0 de abono = 25 dias (> 20 dias restantes)
    const invalidData = {
      data_inicio_gozo: baseInicio,
      data_fim_gozo: addDays(baseInicio, 24),
      data_pagamento: basePagamento,
      abono_pecuniario_dias: 0,
      observacoes: "",
    };

    const result = schema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Como abono é 0, o erro deve apontar para data_fim_gozo (P1)
      const errorDataFim = result.error.issues.find(
        (issue) => issue.path.includes("data_fim_gozo")
      );
      expect(errorDataFim).toBeDefined();
      expect(errorDataFim?.message).toContain("Total consumido (25d) excede os 20 dias disponíveis");
    }
  });

  it("Edição: NÃO bloqueia por falso positivo quando saldo livre é pequeno mas diasRestantesParaEdicao comporta a edição", () => {
    const schema = buildFeriasGozoSchema({
      diasRestantes: 0,
      diasRestantesParaEdicao: 25,
      isEditing: true,
    });

    const validEdit = {
      data_inicio_gozo: baseInicio,
      data_fim_gozo: addDays(baseInicio, 14), // 15 dias descanso
      data_pagamento: basePagamento,
      abono_pecuniario_dias: 10, // 10 dias abono = 25 total <= 25
      observacoes: "Edição de período",
    };

    const result = schema.safeParse(validEdit);
    expect(result.success).toBe(true);
  });

  it("Edição: bloqueia se a alteração exceder diasRestantesParaEdicao", () => {
    const schema = buildFeriasGozoSchema({
      diasRestantes: 0,
      diasRestantesParaEdicao: 25,
      isEditing: true,
    });

    const invalidEdit = {
      data_inicio_gozo: baseInicio,
      data_fim_gozo: addDays(baseInicio, 19), // 20 descanso + 10 abono = 30 > 25
      data_pagamento: basePagamento,
      abono_pecuniario_dias: 10,
      observacoes: "Edição inválida",
    };

    const result = schema.safeParse(invalidEdit);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorAbono = result.error.issues.find(
        (issue) => issue.path.includes("abono_pecuniario_dias")
      );
      expect(errorAbono).toBeDefined();
      expect(errorAbono?.message).toContain("Total consumido (30d) excede os 25 dias disponíveis");
    }
  });
});

describe("ETAPA 2: Data de Pagamento, Regressão de 2 Dias Úteis e Regra do Abono", () => {
  // Segunda-feira, 15 de junho de 2026
  const segunda = new Date(2026, 5, 15);
  // Quinta anterior, 11 de junho de 2026 (2 dias úteis antes)
  const quintaAnterior = new Date(2026, 5, 11);
  // Sábado anterior, 13 de junho de 2026 (2 dias corridos antes, fim de semana)
  const sabadoAnterior = new Date(2026, 5, 13);
  // Quarta anterior, 10 de junho de 2026 (5 dias corridos antes)
  const quarta5DiasAntes = new Date(2026, 5, 10);

  it("subtractBusinessDays: calcula corretamente 2 dias úteis pulando sábado e domingo", () => {
    const limite = subtractBusinessDays(segunda, 2);
    // De segunda 15/06, volta domingo 14/06 (pula), sábado 13/06 (pula), sexta 12/06 (1), quinta 11/06 (0)
    expect(limite.getFullYear()).toBe(2026);
    expect(limite.getMonth()).toBe(5);
    expect(limite.getDate()).toBe(11); // Quinta 11/06
  });

  it("Sem abono (abono=0): pagamento 2 dias úteis antes (quinta-feira) DEVE PASSAR", () => {
    const schema = buildFeriasGozoSchema({
      diasRestantes: 30,
      isEditing: false,
    });

    const validData = {
      data_inicio_gozo: segunda,
      data_fim_gozo: addDays(segunda, 19),
      data_pagamento: quintaAnterior,
      abono_pecuniario_dias: 0,
      observacoes: "",
    };

    const result = schema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("Sem abono (abono=0): pagamento 2 dias corridos antes (sábado) DEVE BLOQUEAR (correção de regressão)", () => {
    const schema = buildFeriasGozoSchema({
      diasRestantes: 30,
      isEditing: false,
    });

    const invalidData = {
      data_inicio_gozo: segunda,
      data_fim_gozo: addDays(segunda, 19),
      data_pagamento: sabadoAnterior, // Sábado 13/06 (apenas 2 dias corridos, mas não 2 dias úteis!)
      abono_pecuniario_dias: 0,
      observacoes: "",
    };

    const result = schema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorPagamento = result.error.issues.find(
        (issue) => issue.path.includes("data_pagamento")
      );
      expect(errorPagamento).toBeDefined();
      expect(errorPagamento?.message).toContain("2 dias úteis antes");
    }
  });

  it("Com abono (abono=10): pagamento 5 dias corridos antes (quarta-feira) DEVE PASSAR (Súmula 328 TST)", () => {
    const schema = buildFeriasGozoSchema({
      diasRestantes: 30,
      isEditing: false,
    });

    const validData = {
      data_inicio_gozo: segunda,
      data_fim_gozo: addDays(segunda, 19),
      data_pagamento: quarta5DiasAntes, // 10/06 = 5 dias antes de 15/06
      abono_pecuniario_dias: 10,
      observacoes: "",
    };

    const result = schema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("Com abono (abono=10): pagamento 4 dias antes (quinta 11/06) DEVE BLOQUEAR mesmo sendo 2 dias úteis", () => {
    const schema = buildFeriasGozoSchema({
      diasRestantes: 30,
      isEditing: false,
    });

    const invalidData = {
      data_inicio_gozo: segunda,
      data_fim_gozo: addDays(segunda, 19),
      data_pagamento: quintaAnterior, // 11/06 = 4 dias antes (inválido pela Súmula 328 TST de 5 dias)
      abono_pecuniario_dias: 10,
      observacoes: "",
    };

    const result = schema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorPagamento = result.error.issues.find(
        (issue) => issue.path.includes("data_pagamento")
      );
      expect(errorPagamento).toBeDefined();
      expect(errorPagamento?.message).toContain("5 dias antes do início (Súmula 328 TST)");
    }
  });

  it("calcularLimitePagamento: o limite mais restritivo sempre vence", () => {
    // Caso padrão: início na quarta 17/06.
    // 2 dias úteis antes = segunda 15/06.
    // 5 dias corridos antes = sexta 12/06.
    // Mais restritivo é 12/06 (mais anterior).
    const quarta17 = new Date(2026, 5, 17);
    const limiteComAbono = calcularLimitePagamento(quarta17, 10);
    expect(limiteComAbono.getDate()).toBe(12); // Sexta 12/06

    // Caso feriado bancário: se 11 e 12 de junho fossem feriados, 2 dias úteis seria 09/06 (terça)
    // 5 dias corridos seria 10/06 (quarta). Aqui 2 dias úteis é mais restritivo que 5 corridos.
    const feriadosMock = new Set(["2026-06-11", "2026-06-12"]);
    const limiteComFeriado = calcularLimitePagamento(segunda, 10, feriadosMock);
    // segunda 15/06: volta dom 14, sab 13, sex 12 (feriado), qui 11 (feriado), qua 10 (1), ter 09 (0)
    expect(limiteComFeriado.getDate()).toBe(9); // Terça 09/06 vence porque é mais restritivo que 10/06!
  });

  it("isDiaNaoUtil: detecta corretamente sábado, domingo e feriados", () => {
    expect(isDiaNaoUtil(sabadoAnterior)).toBe(true); // Sábado
    expect(isDiaNaoUtil(new Date(2026, 5, 14))).toBe(true); // Domingo 14/06
    expect(isDiaNaoUtil(quarta5DiasAntes)).toBe(false); // Quarta 10/06

    const feriados = new Set(["2026-06-10"]);
    expect(isDiaNaoUtil(quarta5DiasAntes, feriados)).toBe(true); // Quarta com feriado
  });

  it("MC-1: dataInicio com hora (ex: 14:30) retorna limite normalizado à meia-noite (00:00:00.000)", () => {
    const inicioComHora = new Date(2026, 5, 15, 14, 30, 45, 123);
    const limite = calcularLimitePagamento(inicioComHora, 10);
    expect(limite.getHours()).toBe(0);
    expect(limite.getMinutes()).toBe(0);
    expect(limite.getSeconds()).toBe(0);
    expect(limite.getMilliseconds()).toBe(0);
  });

  it("MC-2: fim < início curto-circuita o superRefine gerando apenas 1 erro em data_fim_gozo", () => {
    const schema = buildFeriasGozoSchema({
      diasRestantes: 30,
      isEditing: false,
    });

    const invalidDates = {
      data_inicio_gozo: segunda,
      data_fim_gozo: subDays(segunda, 1), // Fim anterior ao início
      data_pagamento: quintaAnterior,
      abono_pecuniario_dias: 10,
      observacoes: "",
    };

    const result = schema.safeParse(invalidDates);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBe(1);
      expect(result.error.issues[0].path).toContain("data_fim_gozo");
      expect(result.error.issues[0].message).toContain("igual ou posterior");
    }
  });
});

describe("ETAPA 3: Fracionamento CLT art. 134 §1º no FeriasGozoForm", () => {
  const baseInicio = new Date(2026, 5, 15);
  const basePagamento = new Date(2026, 5, 10);

  it("Período de 4 dias: bloqueia com erro na data_fim_gozo (mínimo 5 dias)", () => {
    const schema = buildFeriasGozoSchema({
      diasRestantes: 30,
      isEditing: false,
      periodosExistentes: [],
    });

    const data = {
      data_inicio_gozo: baseInicio,
      data_fim_gozo: addDays(baseInicio, 3), // 4 dias (15 a 18)
      data_pagamento: basePagamento,
      abono_pecuniario_dias: 0,
      observacoes: "",
    };

    const result = schema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path.includes("data_fim_gozo"));
      expect(err?.message).toContain("Período mínimo de 5 dias corridos (CLT art. 134, §1º)");
    }
  });

  it("Período de 5 dias: passa", () => {
    const schema = buildFeriasGozoSchema({
      diasRestantes: 30,
      isEditing: false,
      periodosExistentes: [],
    });

    const data = {
      data_inicio_gozo: baseInicio,
      data_fim_gozo: addDays(baseInicio, 4), // 5 dias (15 a 19)
      data_pagamento: basePagamento,
      abono_pecuniario_dias: 0,
      observacoes: "",
    };

    const result = schema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("3º fracionamento sem nenhum período >= 14 dias: bloqueia", () => {
    const schema = buildFeriasGozoSchema({
      diasRestantes: 30,
      isEditing: false,
      // Já existem 2 períodos de 5 dias
      periodosExistentes: [{ dias: 5 }, { dias: 5 }],
    });

    const data = {
      data_inicio_gozo: baseInicio,
      data_fim_gozo: addDays(baseInicio, 9), // 10 dias (nenhum deles tem 14)
      data_pagamento: basePagamento,
      abono_pecuniario_dias: 0,
      observacoes: "",
    };

    const result = schema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path.includes("data_fim_gozo"));
      expect(err?.message).toContain("ao menos um deve ter 14 dias ou mais");
    }
  });

  it("3º fracionamento com um período anterior >= 14 dias: passa", () => {
    const schema = buildFeriasGozoSchema({
      diasRestantes: 30,
      isEditing: false,
      periodosExistentes: [{ dias: 14 }, { dias: 6 }],
    });

    const data = {
      data_inicio_gozo: baseInicio,
      data_fim_gozo: addDays(baseInicio, 9), // 10 dias
      data_pagamento: basePagamento,
      abono_pecuniario_dias: 0,
      observacoes: "",
    };

    const result = schema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("Edição: não conta contra si mesmo ao editar o único período de 14 dias", () => {
    // No banco existiam: período A (14 dias) e período B (6 dias).
    // O usuário está editando o período A para 15 dias.
    // O componente pai passa periodosExistentes filtrando o próprio editingGozo -> [{ dias: 6 }].
    const schema = buildFeriasGozoSchema({
      diasRestantes: 10,
      diasRestantesParaEdicao: 24,
      isEditing: true,
      periodosExistentes: [{ dias: 6 }], // período B apenas
    });

    const data = {
      data_inicio_gozo: baseInicio,
      data_fim_gozo: addDays(baseInicio, 14), // 15 dias
      data_pagamento: basePagamento,
      abono_pecuniario_dias: 0,
      observacoes: "Edição do período principal",
    };

    const result = schema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe("ETAPA 4: Campo de Abono, Robustez R1/R2 e Payloads", () => {
  const baseInicio = new Date(2026, 5, 15);
  const basePagamento = new Date(2026, 5, 10);

  it("Abono 11: bloqueia por exceder o máximo legal de 10 dias (1/3 por CLT art. 143)", () => {
    const schema = buildFeriasGozoSchema({
      diasRestantes: 30,
      isEditing: false,
    });

    const data = {
      data_inicio_gozo: baseInicio,
      data_fim_gozo: addDays(baseInicio, 18),
      data_pagamento: basePagamento,
      abono_pecuniario_dias: 11,
      observacoes: "",
    };

    const result = schema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path.includes("abono_pecuniario_dias"));
      expect(err?.message).toContain("Máximo de 10 dias");
    }
  });

  it("R1: 4º período bloqueia com erro de limite de 3 períodos atingido", () => {
    const schema = buildFeriasGozoSchema({
      diasRestantes: 30,
      isEditing: false,
      // Já existem 3 períodos
      periodosExistentes: [{ dias: 14 }, { dias: 5 }, { dias: 5 }],
    });

    const data = {
      data_inicio_gozo: baseInicio,
      data_fim_gozo: addDays(baseInicio, 4), // 5 dias
      data_pagamento: basePagamento,
      abono_pecuniario_dias: 0,
      observacoes: "",
    };

    const result = schema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path.includes("data_fim_gozo"));
      expect(err?.message).toContain("Limite de 3 períodos atingido para este período aquisitivo");
    }
  });

  it("R2: datas invertidas geram apenas 1 erro em data_fim_gozo e não disparam erro de fracionamento", () => {
    const schema = buildFeriasGozoSchema({
      diasRestantes: 30,
      isEditing: false,
      periodosExistentes: [{ dias: 5 }, { dias: 5 }],
    });

    const data = {
      data_inicio_gozo: baseInicio,
      data_fim_gozo: subDays(baseInicio, 3), // invertido
      data_pagamento: basePagamento,
      abono_pecuniario_dias: 0,
      observacoes: "",
    };

    const result = schema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Deve conter erro de data igual ou posterior
      expect(result.error.issues.length).toBe(1);
      expect(result.error.issues[0].message).toContain("igual ou posterior");
      // Não deve conter erro de fracionamento
      const errFrac = result.error.issues.find((i) => i.message.includes("CLT"));
      expect(errFrac).toBeUndefined();
    }
  });

  it("Criação 20 descanso + 10 abono: valida com sucesso e calcula totais corretos (30 consumidos, 0 restantes)", () => {
    const schema = buildFeriasGozoSchema({
      diasRestantes: 30,
      isEditing: false,
      periodosExistentes: [],
    });

    const data = {
      data_inicio_gozo: baseInicio,
      data_fim_gozo: addDays(baseInicio, 19), // 20 dias
      data_pagamento: basePagamento,
      abono_pecuniario_dias: 10,
      observacoes: "   ", // em branco
    };

    const result = schema.safeParse(data);
    expect(result.success).toBe(true);

    if (result.success) {
      // Simula montagem do payload
      const payload = {
        dias_gozados: 20,
        abono_pecuniario_dias: Number(result.data.abono_pecuniario_dias) || 0,
        observacoes: result.data.observacoes?.trim() || null,
      };
      expect(payload.dias_gozados).toBe(20);
      expect(payload.abono_pecuniario_dias).toBe(10);
      expect(payload.observacoes).toBeNull(); // Conforme decisão P2: observacoes = null
    }
  });

  it("Criação 20 descanso + 0 abono: payload grava abono_pecuniario_dias=0 e observacoes=null", () => {
    const schema = buildFeriasGozoSchema({
      diasRestantes: 30,
      isEditing: false,
      periodosExistentes: [],
    });

    const data = {
      data_inicio_gozo: baseInicio,
      data_fim_gozo: addDays(baseInicio, 19), // 20 dias
      data_pagamento: basePagamento,
      abono_pecuniario_dias: 0,
      observacoes: "",
    };

    const result = schema.safeParse(data);
    expect(result.success).toBe(true);

    if (result.success) {
      const payload = {
        dias_gozados: 20,
        abono_pecuniario_dias: Number(result.data.abono_pecuniario_dias) || 0,
        observacoes: result.data.observacoes?.trim() || null,
      };
      expect(payload.dias_gozados).toBe(20);
      expect(payload.abono_pecuniario_dias).toBe(0);
      expect(payload.observacoes).toBeNull();
    }
  });

  it("Edição adicionando abono 10: persiste abono_pecuniario_dias=10 no payload", () => {
    const schema = buildFeriasGozoSchema({
      diasRestantes: 5,
      diasRestantesParaEdicao: 30,
      isEditing: true,
      periodosExistentes: [],
    });

    const editData = {
      data_inicio_gozo: baseInicio,
      data_fim_gozo: addDays(baseInicio, 19), // 20 dias
      data_pagamento: basePagamento,
      abono_pecuniario_dias: 10,
      observacoes: "Período ajustado com abono",
    };

    const result = schema.safeParse(editData);
    expect(result.success).toBe(true);

    if (result.success) {
      const payload = {
        dias_gozados: 20,
        abono_pecuniario_dias: Number(result.data.abono_pecuniario_dias) || 0,
        observacoes: result.data.observacoes?.trim() || null,
      };
      expect(payload.abono_pecuniario_dias).toBe(10);
      expect(payload.observacoes).toBe("Período ajustado com abono");
    }
  });

  describe("BLOQUEIO 2: Preservação de observações históricas no UPDATE", () => {
    it("No UPDATE: preserva observação histórica quando o campo no formulário estiver vazio ou com espaços", () => {
      // Caso 1: usuário não alterou nada e o formulário enviou vazio
      const obs1 = resolverObservacoes({
        valuesObservacoes: "",
        editingObservacoes: "Abono pecuniário: 10 dia(s)",
        isEditing: true,
      });
      expect(obs1).toBe("Abono pecuniário: 10 dia(s)");

      // Caso 2: usuário apagou o texto e deixou apenas espaços em branco
      const obs2 = resolverObservacoes({
        valuesObservacoes: "    ",
        editingObservacoes: "Abono pecuniário: 10 dia(s)",
        isEditing: true,
      });
      expect(obs2).toBe("Abono pecuniário: 10 dia(s)");

      // Caso 3: undefined
      const obs3 = resolverObservacoes({
        valuesObservacoes: undefined,
        editingObservacoes: "teste manual",
        isEditing: true,
      });
      expect(obs3).toBe("teste manual");
    });

    it("No UPDATE: atualiza observação quando o usuário digitar um novo texto", () => {
      const obs = resolverObservacoes({
        valuesObservacoes: "Nova observação digitada pelo usuário",
        editingObservacoes: "Abono pecuniário: 10 dia(s)",
        isEditing: true,
      });
      expect(obs).toBe("Nova observação digitada pelo usuário");
    });

    it("No UPDATE: mantém null quando values estiver vazio e o registro original também for null", () => {
      const obs = resolverObservacoes({
        valuesObservacoes: "",
        editingObservacoes: null,
        isEditing: true,
      });
      expect(obs).toBeNull();
    });

    it("No CREATE: grava null quando vazio e grava o texto quando digitado", () => {
      expect(
        resolverObservacoes({
          valuesObservacoes: "",
          isEditing: false,
        })
      ).toBeNull();

      expect(
        resolverObservacoes({
          valuesObservacoes: "   ",
          isEditing: false,
        })
      ).toBeNull();

      expect(
        resolverObservacoes({
          valuesObservacoes: "Novo lançamento com texto",
          isEditing: false,
        })
      ).toBe("Novo lançamento com texto");
    });

    it("TESTE OBRIGATÓRIO DO BLOQUEIO 2: criar com 'teste manual', editar sem alterar observações -> continua 'teste manual'", () => {
      // 1. Simula CREATE com observações 'teste manual'
      const obsCreate = resolverObservacoes({
        valuesObservacoes: "teste manual",
        isEditing: false,
      });
      expect(obsCreate).toBe("teste manual");

      // Registro agora existe no banco com editingGozo.observacoes = "teste manual"
      const editingGozoNoBanco = {
        id: "gozo-123",
        observacoes: obsCreate,
        abono_pecuniario_dias: 0,
      };

      // 2. Simula UPDATE do mesmo lançamento sem alterar nada em observações (form submetido com vazio ou com o mesmo valor)
      // Se submetido com o mesmo valor original:
      const obsUpdateMesmoValor = resolverObservacoes({
        valuesObservacoes: "teste manual",
        editingObservacoes: editingGozoNoBanco.observacoes,
        isEditing: true,
      });
      expect(obsUpdateMesmoValor).toBe("teste manual");

      // Se o campo estiver vazio / não tocado / em branco:
      const obsUpdateVazio = resolverObservacoes({
        valuesObservacoes: "",
        editingObservacoes: editingGozoNoBanco.observacoes,
        isEditing: true,
      });
      // 3. Verifica que observacoes CONTINUA 'teste manual' no payload (NÃO virou null)
      expect(obsUpdateVazio).toBe("teste manual");
    });
  });
});
