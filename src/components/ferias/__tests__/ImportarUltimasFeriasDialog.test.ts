import { describe, it, expect } from "vitest";
import {
  normalizeHeader,
  parseCSV,
  parseDias,
  isDiasValido,
  ALIASES_ABONO,
  ALIASES_DESCANSO,
  findColumnIndexWithFallback,
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

    // 2. "Dias de Descanso Gozados" -> casa (seja exato ou por aproximação)
    const headerDescansoAprox = [normalizeHeader("Dias de Descanso Gozados")];
    const matchDescansoAprox = findColumnIndexWithFallback(
      headerDescansoAprox,
      ALIASES_DESCANSO,
      (h) => (h.includes("descanso") || h.includes("gozo")) && !h.includes("inicio") && !h.includes("fim") && !h.includes("data")
    );
    expect(matchDescansoAprox.index).toBe(0);

    // Teste com variação não listada nos aliases exatos para provar fallback de descanso/gozo
    const headerGozoInedito = [normalizeHeader("Gozo usufruído no ano")];
    const matchGozoInedito = findColumnIndexWithFallback(
      headerGozoInedito,
      ALIASES_DESCANSO,
      (h) => (h.includes("descanso") || h.includes("gozo")) && !h.includes("inicio") && !h.includes("fim") && !h.includes("data")
    );
    expect(matchGozoInedito.index).toBe(0);
    expect(matchGozoInedito.isFallback).toBe(true);

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
      (h) => (h.includes("descanso") || h.includes("gozo")) && !h.includes("inicio") && !h.includes("fim") && !h.includes("data")
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

  it("parseCSV lida com separadores ';' e ',', e remove BOM UTF-8", () => {
    const csvSemicolon = `\uFEFFcpf;nome;dias_descanso;dias_abono\n12345678900;Colaborador Teste;20;10`;
    const res = parseCSV(csvSemicolon);
    expect(res.headers).toEqual(["cpf", "nome", "dias_descanso", "dias_abono"]);
    expect(res.rawHeaders).toEqual(["cpf", "nome", "dias_descanso", "dias_abono"]);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]).toEqual(["12345678900", "Colaborador Teste", "20", "10"]);

    const csvComma = `cpf,nome,dias_descanso,dias_abono\n12345678900,Colaborador Teste,20,10`;
    const resComma = parseCSV(csvComma);
    expect(resComma.headers).toEqual(["cpf", "nome", "dias_descanso", "dias_abono"]);
    expect(resComma.rows).toHaveLength(1);
    expect(resComma.rows[0]).toEqual(["12345678900", "Colaborador Teste", "20", "10"]);
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
});

