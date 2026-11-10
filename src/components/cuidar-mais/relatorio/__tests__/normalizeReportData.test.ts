import { describe, it, expect } from "vitest";
import {
  normalizeReportPayload,
  formatReportDateTime,
  formatReportDate,
  getStatusBadgeConfig,
  getAcompanhamentoBadgeConfig,
} from "../normalizeReportData";

describe("normalizeReportData - Funções Puras do Dossiê Relatório", () => {
  const samplePayload = {
    colaborador: {
      id: "0924315f-1c9a-4e0d-9624-353315cca277",
      full_name: "Mariana Souza Ribeiro",
      cpf: "***.456.789-**",
      cargo: "Analista Contábil Pleno",
      departamento: "Contabilidade",
      admissao: "2023-03-15",
      status: "ATIVO",
    },
    filtro_aplicado: {
      data_inicio: "2026-01-01",
      data_fim: "2026-12-31",
    },
    pulsos: [
      {
        id: "p1",
        origem: "campanha",
        campanha: "Clima Organizacional Q1",
        data_hora: "2026-03-10T14:30:00Z",
        pergunta: "Como você se sente em relação à sua carga de trabalho?",
        resposta: "4",
        score_numeric: 4,
        esfera: "trabalho",
        comentario: "Tudo bem estruturado na equipe.",
      },
    ],
    acompanhamentos: [
      {
        id: "a1",
        status: "concluido",
        objetivo: "Alinhamento de rotina e prevenção de estresse",
        acoes: ["Conversa de feedback 1:1", "Revisão de prazos"],
        anotacoes: "Colaboradora demonstrou boa receptividade.",
        resultado: "Quadro estabilizado.",
        responsavel_nome: "Ana Beatriz Martins",
        criado_em: "2026-03-15T10:00:00Z",
        atualizado_em: "2026-03-20T16:00:00Z",
        concluido_em: "2026-03-20T16:00:00Z",
        proximo_contato_em: null,
        updated_by_nome: "Ana Beatriz Martins",
      },
    ],
    regras_aplicadas: "Dossiê individual confidencial emitido em conformidade com a NR-1.",
  };

  it("normaliza payload quando retornado como objeto direto", () => {
    const result = normalizeReportPayload(samplePayload);
    expect(result).not.toBeNull();
    expect(result?.colaborador?.full_name).toBe("Mariana Souza Ribeiro");
    expect(result?.colaborador?.cpf).toBe("***.456.789-**");
    expect(result?.pulsos).toHaveLength(1);
    expect(result?.pulsos[0].score_numeric).toBe(4);
    expect(result?.acompanhamentos).toHaveLength(1);
    expect(result?.acompanhamentos[0].responsavel_nome).toBe("Ana Beatriz Martins");
    expect(result?.regras_aplicadas).toContain("NR-1");
  });

  it("normaliza payload quando retornado dentro de array (ex.: data[0])", () => {
    const result = normalizeReportPayload([samplePayload]);
    expect(result).not.toBeNull();
    expect(result?.colaborador?.id).toBe("0924315f-1c9a-4e0d-9624-353315cca277");
    expect(result?.pulsos).toHaveLength(1);
  });

  it("normaliza payload quando retornado com chave get_employee_report_data", () => {
    const result = normalizeReportPayload({
      get_employee_report_data: samplePayload,
    });
    expect(result).not.toBeNull();
    expect(result?.colaborador?.full_name).toBe("Mariana Souza Ribeiro");
  });

  it("preserva máscara do CPF rigorosamente sem alterações", () => {
    const result = normalizeReportPayload(samplePayload);
    expect(result?.colaborador?.cpf).toBe("***.456.789-**");
    expect(result?.colaborador?.cpf).not.toMatch(/^\d{11}$/);
  });

  it("lida defensivamente com retornos nulos, vazios ou inválidos", () => {
    expect(normalizeReportPayload(null)).toBeNull();
    expect(normalizeReportPayload(undefined)).toBeNull();
    expect(normalizeReportPayload([])).toBeNull();
    expect(normalizeReportPayload("invalid json")).toBeNull();
  });

  it("formata data_hora em formato pt-BR com horário (formatReportDateTime)", () => {
    const formatted = formatReportDateTime("2026-03-10T14:30:00Z");
    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
    expect(formatReportDateTime(null)).toBe("—");
    expect(formatReportDateTime("")).toBe("—");
  });

  it("formata data simples em formato pt-BR (formatReportDate)", () => {
    expect(formatReportDate("2026-03-15")).toBe("15/03/2026");
    expect(formatReportDate("2023-12-01T00:00:00Z")).toBe("01/12/2023");
    expect(formatReportDate(null)).toBe("—");
  });

  it("aplica classes semânticas obrigatórias para status do colaborador (verde, amarelo, vermelho)", () => {
    const ativo = getStatusBadgeConfig("ativo");
    expect(ativo.label).toBe("Ativo");
    expect(ativo.className).toContain("emerald");

    const afastado = getStatusBadgeConfig("AFASTADO");
    expect(afastado.label).toBe("Afastado");
    expect(afastado.className).toContain("amber");

    const desligado = getStatusBadgeConfig("desligado");
    expect(desligado.label).toBe("Desligado");
    expect(desligado.className).toContain("red");

    const desconhecido = getStatusBadgeConfig(null);
    expect(desconhecido.label).toBe("Não informado");
  });

  it("retorna classes semânticas para os status de acompanhamento institucional", () => {
    expect(getAcompanhamentoBadgeConfig("novo").className).toContain("blue");
    expect(getAcompanhamentoBadgeConfig("em_andamento").className).toContain("amber");
    expect(getAcompanhamentoBadgeConfig("concluido").className).toContain("emerald");
    expect(getAcompanhamentoBadgeConfig("arquivado").className).toContain("slate");
  });
});
