import { describe, it, expect } from "vitest";
import {
  normalizeHeader,
  parseCSV,
  parseDias,
  isDiasValido,
  isFormatoData,
  isDescansoFallbackMatch,
  ALIASES_ABONO,
  ALIASES_DESCANSO,
  findColumnIndexWithFallback,
  diagnosticarCSV,
  computeDryRunReport,
} from "../ImportarUltimasFeriasDialog";

describe("ImportarUltimasFeriasDialog — Parsing e Tratamento de Abono Pecuniário", () => {
  it("normaliza headers com acentuação, espaços e caracteres especiais", () => {
    expect(normalizeHeader("CPF")).toBe("cpf");
    expect(normalizeHeader("Período Aquisitivo Início")).toBe("periodo_aquisitivo_inicio");
    expect(normalizeHeader("Dias de Abono")).toBe("dias_de_abono");
    expect(normalizeHeader("Abono Pecuniário (dias)")).toBe("abono_pecuniario_dias");
    expect(normalizeHeader("Abono (dias)")).toBe("abono_dias");
    expect(normalizeHeader("\uFEFFCPF")).toBe("cpf");
  });

  it("testa os 5 cabeçalhos reais de planilhas Excel pt-BR e confirma casamento de alias", () => {
    const acceptedAliases = ALIASES_ABONO;

    const testCases = [
      { input: "Abono Pecuniário (dias)", expectedNormalized: "abono_pecuniario_dias", expectedAlias: "abono_pecuniario_dias" },
      { input: "Dias de Abono", expectedNormalized: "dias_de_abono", expectedAlias: "dias_de_abono" },
      { input: "ABONO", expectedNormalized: "abono", expectedAlias: "abono" },
      { input: "abono_pecuniário_dias", expectedNormalized: "abono_pecuniario_dias", expectedAlias: "abono_pecuniario_dias" },
      { input: "Dias Abono Pecuniário", expectedNormalized: "dias_abono_pecuniario", expectedAlias: "dias_abono_pecuniario" },
    ];

    for (const tc of testCases) {
      const normalized = normalizeHeader(tc.input);
      expect(normalized).toBe(tc.expectedNormalized);
      expect(acceptedAliases).toContain(normalized);
      expect(normalized).toBe(tc.expectedAlias);
    }
  });

  it("testes adversariais para seleção de colunas de descanso/gozo", () => {
    // 1. "periodo_gozo" → NÃO deve casar como dias
    const matchPeriodoGozo = findColumnIndexWithFallback(
      [normalizeHeader("periodo_gozo")],
      ALIASES_DESCANSO,
      isDescansoFallbackMatch
    );
    expect(matchPeriodoGozo.index, "periodo_gozo não deve casar").toBe(-1);

    // 2. "gozo_1" → NÃO deve casar como dias
    const matchGozo1 = findColumnIndexWithFallback(
      [normalizeHeader("gozo_1")],
      ALIASES_DESCANSO,
      isDescansoFallbackMatch
    );
    expect(matchGozo1.index, "gozo_1 não deve casar").toBe(-1);

    // 3. "gozo_ano_2023" → NÃO deve casar como dias
    const matchGozoAno = findColumnIndexWithFallback(
      [normalizeHeader("gozo_ano_2023")],
      ALIASES_DESCANSO,
      isDescansoFallbackMatch
    );
    expect(matchGozoAno.index, "gozo_ano_2023 não deve casar").toBe(-1);

    // 4. "dias_de_gozo" → DEVE casar (match exato)
    const matchDiasDeGozo = findColumnIndexWithFallback(
      [normalizeHeader("dias_de_gozo")],
      ALIASES_DESCANSO,
      isDescansoFallbackMatch
    );
    expect(matchDiasDeGozo.index, "dias_de_gozo deve casar").toBe(0);
    expect(matchDiasDeGozo.isFallback, "dias_de_gozo deve ser match exato").toBe(false);

    // 5. "Dias Gozados" → DEVE casar (match exato)
    const matchDiasGozados = findColumnIndexWithFallback(
      [normalizeHeader("Dias Gozados")],
      ALIASES_DESCANSO,
      isDescansoFallbackMatch
    );
    expect(matchDiasGozados.index, "Dias Gozados deve casar").toBe(0);
    expect(matchDiasGozados.isFallback, "Dias Gozados deve ser match exato").toBe(false);

    // 6. "Total de dias de descanso" → DEVE casar por fallback
    const matchTotalDescanso = findColumnIndexWithFallback(
      [normalizeHeader("Total de dias de descanso")],
      ALIASES_DESCANSO,
      isDescansoFallbackMatch
    );
    expect(matchTotalDescanso.index, "Total de dias de descanso deve casar").toBe(0);
    expect(matchTotalDescanso.isFallback, "Total de dias de descanso deve ser fallback").toBe(true);
  });

  it("testa validação de data em campos de quantidade (isFormatoData)", () => {
    // Datas no formato DD/MM/AAAA, AAAA-MM-DD ou DD-MM-AAAA devem ser detectadas
    expect(isFormatoData("05/02/2024")).toBe(true);
    expect(isFormatoData("2024-02-05")).toBe(true);
    expect(isFormatoData("05-02-2024")).toBe(true);
    expect(isFormatoData("5/2/2024")).toBe(true);

    // Quantidades numéricas válidas NÃO devem ser consideradas data
    expect(isFormatoData("10")).toBe(false);
    expect(isFormatoData("10,0")).toBe(false);
    expect(isFormatoData("10.0")).toBe(false);
    expect(isFormatoData("10 dias")).toBe(false);
    expect(isFormatoData("10d")).toBe(false);
    expect(isFormatoData("")).toBe(false);
    expect(isFormatoData(undefined)).toBe(false);
  });

  it("testa fallback de aproximação para abono e descanso e garante prioridade de match exato", () => {
    // 1. "Abono (qtd. dias)" -> normalizado "abono_qtd_dias" -> casa por aproximação
    const headerAbonoAprox = [normalizeHeader("Abono (qtd. dias)")];
    const matchAbonoAprox = findColumnIndexWithFallback(
      headerAbonoAprox,
      ALIASES_ABONO,
      (h) => h.includes("abono")
    );
    expect(matchAbonoAprox.index).toBe(0);
    expect(matchAbonoAprox.isFallback).toBe(true);

    // 2. "Dias de Descanso Gozados" -> casa (match exato)
    const headerDescansoAprox = [normalizeHeader("Dias de Descanso Gozados")];
    const matchDescansoAprox = findColumnIndexWithFallback(
      headerDescansoAprox,
      ALIASES_DESCANSO,
      isDescansoFallbackMatch
    );
    expect(matchDescansoAprox.index).toBe(0);

    // 3. "Coluna Aleatória" -> não deve casar (retorna -1)
    const headerAleatorio = [normalizeHeader("Coluna Aleatória")];
    const matchAleatorioAbono = findColumnIndexWithFallback(
      headerAleatorio,
      ALIASES_ABONO,
      (h) => h.includes("abono")
    );
    expect(matchAleatorioAbono.index).toBe(-1);
    expect(matchAleatorioAbono.isFallback).toBe(false);

    const matchAleatorioDescanso = findColumnIndexWithFallback(
      headerAleatorio,
      ALIASES_DESCANSO,
      isDescansoFallbackMatch
    );
    expect(matchAleatorioDescanso.index).toBe(-1);
    expect(matchAleatorioDescanso.isFallback).toBe(false);

    // 4. Confirmação de que o fallback NÃO sobrescreve um match exato
    const headersComExatoEFallback = [
      normalizeHeader("Observações sobre o abono"), // index 0 (casaria por fallback)
      normalizeHeader("dias_abono"),                // index 1 (match exato)
    ];
    const matchPrioridade = findColumnIndexWithFallback(
      headersComExatoEFallback,
      ALIASES_ABONO,
      (h) => h.includes("abono")
    );
    expect(matchPrioridade.index).toBe(1); // Ganha o match exato (index 1), não o 0
    expect(matchPrioridade.isFallback).toBe(false);
  });

  it("parseDias extrai inteiros não negativos e valida formatos comuns", () => {
    expect(parseDias("10")).toBe(10);
    expect(isDiasValido("10")).toBe(true);

    expect(parseDias("10,0")).toBe(10);
    expect(isDiasValido("10,0")).toBe(true);

    expect(parseDias("10.0")).toBe(10);
    expect(isDiasValido("10.0")).toBe(true);

    expect(parseDias("10 dias")).toBe(10);
    expect(isDiasValido("10 dias")).toBe(true);

    expect(parseDias("10d")).toBe(10);
    expect(isDiasValido("10d")).toBe(true);

    expect(parseDias("")).toBe(0);
    expect(isDiasValido("")).toBe(true);

    // Texto não numérico: parseDias retorna 0 e isDiasValido acusa erro/aviso
    expect(parseDias("abc")).toBe(0);
    expect(isDiasValido("abc")).toBe(false);
  });

  it("parseCSV lida com separadores ';', ',' e '\\t' (TAB), e remove BOM UTF-8", () => {
    const csvSemicolon = `\uFEFFcpf;nome;dias_descanso;dias_abono\n12345678900;Colaborador Teste;20;10`;
    const res = parseCSV(csvSemicolon);
    expect(res.headers).toEqual(["cpf", "nome", "dias_descanso", "dias_abono"]);
    expect(res.rawHeaders).toEqual(["cpf", "nome", "dias_descanso", "dias_abono"]);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]).toEqual(["12345678900", "Colaborador Teste", "20", "10"]);
    expect(res.sep).toBe(";");

    const csvComma = `cpf,nome,dias_descanso,dias_abono\n12345678900,Colaborador Teste,20,10`;
    const resComma = parseCSV(csvComma);
    expect(resComma.headers).toEqual(["cpf", "nome", "dias_descanso", "dias_abono"]);
    expect(resComma.rows).toHaveLength(1);
    expect(resComma.rows[0]).toEqual(["12345678900", "Colaborador Teste", "20", "10"]);
    expect(resComma.sep).toBe(",");

    const csvTab = `cpf\tnome\tdias_descanso\tdias_abono\n12345678900\tColaborador Teste\t20\t10`;
    const resTab = parseCSV(csvTab);
    expect(resTab.headers).toEqual(["cpf", "nome", "dias_descanso", "dias_abono"]);
    expect(resTab.rows).toHaveLength(1);
    expect(resTab.rows[0]).toEqual(["12345678900", "Colaborador Teste", "20", "10"]);
    expect(resTab.sep).toBe("\t");
  });

  it("reconhece colunas com variações de nomenclatura de abono", () => {
    const variations = [
      "dias_abono",
      "abono",
      "abono_pecuniario",
      "dias_de_abono",
      "abono_pecuniario_dias",
      "dias_abono_pecuniario",
      "dias_vendidos",
      "abono_dias",
      "qtd_abono",
    ];

    const acceptedAliases = ALIASES_ABONO;

    for (const v of variations) {
      const normalized = normalizeHeader(v);
      const isAccepted = acceptedAliases.includes(normalized);
      expect(isAccepted, `Variação "${v}" (normalizada: "${normalized}") deve ser aceita`).toBe(true);
    }
  });

  it("diagnosticarCSV reporta colunas reconhecidas, fallbacks e colunas ignoradas", () => {
    const csv = `CPF;Colaborador;Início Aquisitivo;Fim Aquisitivo;Início Gozo;Fim Gozo;Dias Gozados;Abono Pecuniário (dias);Observação Interna
12345678900;João Silva;01/01/2023;31/12/2023;01/06/2024;20/06/2024;20;10;Férias migradas
`;
    const diag = diagnosticarCSV(csv);
    expect(diag.separador).toBe(";");
    expect(diag.valido).toBe(true);
    expect(diag.reconhecidas.cpf?.index).toBe(0);
    expect(diag.reconhecidas.nome?.index).toBe(1);
    expect(diag.reconhecidas.periodoInicio?.index).toBe(2);
    expect(diag.reconhecidas.periodoFim?.index).toBe(3);
    expect(diag.reconhecidas.inicioGozo?.index).toBe(4);
    expect(diag.reconhecidas.fimGozo?.index).toBe(5);
    expect(diag.reconhecidas.descanso?.index).toBe(6);
    expect(diag.reconhecidas.descanso?.isFallback).toBe(false);
    expect(diag.reconhecidas.abono?.index).toBe(7);
    expect(diag.reconhecidas.abono?.isFallback).toBe(false);

    // Coluna 8 é "Observação Interna" (não mapeada para inserção)
    expect(diag.colunasIgnoradas).toHaveLength(1);
    expect(diag.colunasIgnoradas[0]).toEqual({
      index: 8,
      rawHeader: "Observação Interna",
      header: "observacao_interna",
    });
  });

  it("diagnosticarCSV detecta arquivo inválido quando faltam colunas essenciais", () => {
    const csvInvalido = `CPF;Colaborador;Dias Gozados\n12345678900;João;20`;
    const diag = diagnosticarCSV(csvInvalido);
    expect(diag.valido).toBe(false);
    expect(diag.motivoInvalido).toContain("Colunas obrigatórias ausentes");
  });

  it("idempotência: processar o mesmo lançamento de gozo duas vezes resulta em 1 registro (upsert por chave natural)", () => {
    interface FeriasGozoRow {
      id: string;
      colaborador_id: string;
      periodo_aquisitivo_id: string;
      data_inicio_gozo: string;
      data_fim_gozo: string;
      dias_gozados: number;
      abono_pecuniario_dias: number;
      observacoes: string;
    }

    const dbGozoTable: FeriasGozoRow[] = [];

    function processarGozoIdempotente(payload: {
      colaborador_id: string;
      periodo_aquisitivo_id: string;
      data_inicio_gozo: string;
      data_fim_gozo: string;
      dias_gozados: number;
      abono_pecuniario_dias: number;
      observacoes: string;
    }): { acao: "insert" | "update"; row: FeriasGozoRow } {
      const existingIndex = dbGozoTable.findIndex(
        (g) =>
          g.colaborador_id === payload.colaborador_id &&
          g.periodo_aquisitivo_id === payload.periodo_aquisitivo_id &&
          g.data_inicio_gozo === payload.data_inicio_gozo &&
          g.data_fim_gozo === payload.data_fim_gozo
      );

      if (existingIndex >= 0) {
        dbGozoTable[existingIndex] = {
          ...dbGozoTable[existingIndex],
          dias_gozados: payload.dias_gozados,
          abono_pecuniario_dias: payload.abono_pecuniario_dias,
          observacoes: payload.observacoes,
        };
        return { acao: "update", row: dbGozoTable[existingIndex] };
      } else {
        const newRow: FeriasGozoRow = {
          id: `gozo-${dbGozoTable.length + 1}`,
          ...payload,
        };
        dbGozoTable.push(newRow);
        return { acao: "insert", row: newRow };
      }
    }

    const payloadV1 = {
      colaborador_id: "colab-123",
      periodo_aquisitivo_id: "per-456",
      data_inicio_gozo: "2024-06-01",
      data_fim_gozo: "2024-06-20",
      dias_gozados: 20,
      abono_pecuniario_dias: 0,
      observacoes: "Importado (CSV)",
    };

    // 1ª importação: registro não existe -> INSERT
    const r1 = processarGozoIdempotente(payloadV1);
    expect(r1.acao).toBe("insert");
    expect(dbGozoTable).toHaveLength(1);
    expect(dbGozoTable[0].abono_pecuniario_dias).toBe(0);

    // 2ª importação da mesma chave natural (com abono corrigido) -> UPDATE
    const payloadV2 = {
      ...payloadV1,
      abono_pecuniario_dias: 10,
      observacoes: "Importado (CSV) – Abono pecuniário: 10 dia(s)",
    };

    const r2 = processarGozoIdempotente(payloadV2);
    expect(r2.acao).toBe("update");
    // Confirma que NÃO duplicou: continua exatamente 1 lançamento
    expect(dbGozoTable).toHaveLength(1);
    expect(dbGozoTable[0].id).toBe(r1.row.id);
    expect(dbGozoTable[0].abono_pecuniario_dias).toBe(10);
    expect(dbGozoTable[0].observacoes).toContain("Abono pecuniário: 10 dia(s)");
  });

  describe("computeDryRunReport (Simulação Prévia ao Importar)", () => {
    const colabs = [
      { id: "colab-1", cpf: "11122233344", full_name: "Colaborador Um" },
      { id: "colab-2", cpf: "55566677788", full_name: "Colaborador Dois" },
    ];

    const periodos = [
      { id: "per-1", colaborador_id: "colab-1", data_inicio_aquisitivo: "2023-01-01" },
      { id: "per-2", colaborador_id: "colab-2", data_inicio_aquisitivo: "2023-01-01" },
    ];

    const gozos = [
      {
        id: "gozo-1",
        colaborador_id: "colab-1",
        periodo_aquisitivo_id: "per-1",
        data_inicio_gozo: "2024-05-02",
        data_fim_gozo: "2024-05-21",
        observacoes: "Importado (CSV)",
      },
    ];

    it("identifica linhas existentes como UPDATE (sem colisão)", () => {
      const rows = [
        {
          cpf: "11122233344",
          nome: "Colaborador Um",
          periodo_aquisitivo_inicio: "2023-01-01",
          periodo_aquisitivo_fim: "2023-12-31",
          data_inicio_gozo: "2024-05-02",
          data_fim_gozo: "2024-05-21",
          rawInicioPer: "01/01/2023",
          rawFimPer: "31/12/2023",
          rawIniGozo: "02/05/2024",
          rawFimGozo: "21/05/2024",
        },
      ];

      const report = computeDryRunReport(rows, colabs, periodos, gozos);
      expect(report.linhasUpdate).toBe(1);
      expect(report.linhasInsert).toBe(0);
      expect(report.hasBlockingCollision).toBe(false);
      expect(rows[0].dryRunAction).toBe("UPDATE");
    });

    it("bloqueia com alerta vermelho se houver INSERT para colaborador que já possui CSV importado no mesmo período", () => {
      // Linha com datas diferentes para colab-1 no mesmo período per-1 -> tentaria INSERT
      const rows = [
        {
          cpf: "11122233344",
          nome: "Colaborador Um",
          periodo_aquisitivo_inicio: "2023-01-01",
          periodo_aquisitivo_fim: "2023-12-31",
          data_inicio_gozo: "2024-06-01",
          data_fim_gozo: "2024-06-20",
          rawInicioPer: "01/01/2023",
          rawFimPer: "31/12/2023",
          rawIniGozo: "01/06/2024",
          rawFimGozo: "20/06/2024",
        },
      ];

      const report = computeDryRunReport(rows, colabs, periodos, gozos);
      expect(report.linhasInsert).toBe(1);
      expect(report.linhasUpdate).toBe(0);
      expect(report.hasBlockingCollision).toBe(true);
      expect(report.collisions).toHaveLength(1);
      expect(report.collisions[0].colaboradorNome).toBe("Colaborador Um");
      expect(rows[0].dryRunAction).toBe("INSERT");
    });

    it("permite INSERT normal para colaborador novo sem colisão", () => {
      // Colab-2 não possui nenhum gozo importado previamente
      const rows = [
        {
          cpf: "55566677788",
          nome: "Colaborador Dois",
          periodo_aquisitivo_inicio: "2023-01-01",
          periodo_aquisitivo_fim: "2023-12-31",
          data_inicio_gozo: "2024-07-01",
          data_fim_gozo: "2024-07-30",
          rawInicioPer: "01/01/2023",
          rawFimPer: "31/12/2023",
          rawIniGozo: "01/07/2024",
          rawFimGozo: "30/07/2024",
        },
      ];

      const report = computeDryRunReport(rows, colabs, periodos, gozos);
      expect(report.linhasInsert).toBe(1);
      expect(report.linhasUpdate).toBe(0);
      expect(report.hasBlockingCollision).toBe(false);
      expect(report.collisions).toHaveLength(0);
      expect(rows[0].dryRunAction).toBe("INSERT");
    });
  });
});

