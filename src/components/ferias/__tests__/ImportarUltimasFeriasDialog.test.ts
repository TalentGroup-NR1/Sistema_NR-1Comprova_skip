import { describe, it, expect } from "vitest";
import {
  normalizeHeader,
  parseCSV,
  parseDias,
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

  it("parseDias extrai inteiros não negativos e lida com formatos comuns", () => {
    expect(parseDias("10")).toBe(10);
    expect(parseDias("10 dias")).toBe(10);
    expect(parseDias("10,0")).toBe(10);
    expect(parseDias("10.0")).toBe(10);
    expect(parseDias(" 10 ")).toBe(10);
    expect(parseDias("0")).toBe(0);
    expect(parseDias("")).toBe(0);
    expect(parseDias(undefined)).toBe(0);
    expect(parseDias("-5")).toBe(0);
  });

  it("parseCSV lida com separadores ';' e ',', e remove BOM UTF-8", () => {
    const csvSemicolon = `\uFEFFcpf;nome;dias_descanso;dias_abono\n12345678900;Colaborador Teste;20;10`;
    const res = parseCSV(csvSemicolon);
    expect(res.headers).toEqual(["cpf", "nome", "dias_descanso", "dias_abono"]);
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

    const acceptedAliases = [
      "dias_abono",
      "abono",
      "abono_pecuniario",
      "dias_de_abono",
      "abono_pecuniario_dias",
      "dias_abono_pecuniario",
      "dias_vendidos",
      "abono_dias",
      "qtd_abono",
      "quantidade_abono",
      "dias_de_abono_pecuniario",
    ];

    for (const v of variations) {
      const normalized = normalizeHeader(v);
      const isAccepted = acceptedAliases.includes(normalized);
      expect(isAccepted, `Variação "${v}" (normalizada: "${normalized}") deve ser aceita`).toBe(true);
    }
  });
});
