import { describe, it, expect } from "vitest";
import {
  sanitizePdfText,
  buildPeriodoDescricao,
  buildDossieHashPayload,
  formatPulsoRowForPdf,
  formatAcompanhamentoRowForPdf,
  isAcompanhamentoForaDoPeriodo,
} from "../relatorioColaboradorPDF";
import { sha256Hex } from "../pdfHelpers";
import type {
  EmployeeReportData,
  ReportPulso,
  ReportAcompanhamento,
} from "@/components/cuidar-mais/relatorio/types";

describe("relatorioColaboradorPDF - Funções Puras do Gerador de Dossiê Probatório", () => {
  const sampleData: EmployeeReportData = {
    colaborador: {
      id: "colab-uuid-123",
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
        campanha: "Clima Q1",
        data_hora: "2026-03-10T14:30:00Z",
        pergunta: "Como você avalia sua semana?",
        resposta: "4",
        score_numeric: 4,
        esfera: "trabalho",
        comentario: "Ambiente favorável e produtivo.",
      },
    ],
    acompanhamentos: [
      {
        id: "a1",
        status: "concluido",
        objetivo: "Alinhamento de expectativas",
        acoes: ["Feedback 1:1", "Adequação de jornada"],
        anotacoes: "Colaboradora satisfeita.",
        resultado: "Sem pendências.",
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

  it("1. sanitizePdfText remove caracteres especiais e emojis incompatíveis com Helvetica", () => {
    const raw = "Avaliação com emoji 😊 e caractere fora do WinAnsi 🚀 e acentuação normal: Atenção!";
    const sanitized = sanitizePdfText(raw);
    expect(sanitized).not.toContain("😊");
    expect(sanitized).not.toContain("🚀");
    expect(sanitized).toContain("Atenção!");
  });

  it("2. buildPeriodoDescricao formata corretamente os diferentes intervalos de data", () => {
    expect(buildPeriodoDescricao("2026-01-01", "2026-12-31")).toBe("01/01/2026 até 31/12/2026");
    expect(buildPeriodoDescricao("2026-01-01", null)).toBe("A partir de 01/01/2026");
    expect(buildPeriodoDescricao(null, "2026-12-31")).toBe("Até 31/12/2026");
    expect(buildPeriodoDescricao(null, null)).toBe("Sem filtro de período (Histórico Completo)");
  });

  it("3. buildDossieHashPayload gera string determinística e preserva máscara de CPF", () => {
    const docId = "DOSSIE-TEST-12345";
    const payload = buildDossieHashPayload(sampleData, docId);

    expect(payload).toContain(docId);
    expect(payload).toContain("colab-uuid-123");
    expect(payload).toContain("***.456.789-**"); // CPF mascarado preservado!
    expect(payload).not.toMatch(/\d{11}/); // Não deve conter 11 dígitos soltos
    expect(payload).toContain("NR1_DOSSIE");
  });

  it("4. sha256Hex calcula hash criptográfico válido do payload do dossiê", async () => {
    const docId = "DOSSIE-TEST-12345";
    const payload = buildDossieHashPayload(sampleData, docId);
    const hash = await sha256Hex(payload);

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("5. formatPulsoRowForPdf formata colunas da tabela de pulsos com nota e rótulo semântico", () => {
    const pulso: ReportPulso = sampleData.pulsos[0];
    const row = formatPulsoRowForPdf(pulso);

    expect(row).toHaveLength(7);
    expect(row[1]).toBe("Campanha");
    expect(row[2]).toBe("Clima Q1");
    expect(row[3]).toBe("trabalho");
    expect(row[4]).toBe("Como você avalia sua semana?");
    expect(row[5]).toBe("Nota 4/5 (Muito Bem)");
    expect(row[6]).toBe("Ambiente favorável e produtivo.");
  });

  it("6. formatAcompanhamentoRowForPdf estrutura ações e status para visualização tabular", () => {
    const acomp: ReportAcompanhamento = sampleData.acompanhamentos[0];
    const row = formatAcompanhamentoRowForPdf(acomp);

    expect(row).toHaveLength(6);
    expect(row[1]).toBe("CONCLUIDO");
    expect(row[2]).toBe("Ana Beatriz Martins");
    expect(row[3]).toContain("Alinhamento de expectativas");
    expect(row[3]).toContain("Feedback 1:1");
    expect(row[4]).toContain("Colaboradora satisfeita.");
    expect(row[4]).toContain("Sem pendências.");
  });

  it("7. isAcompanhamentoForaDoPeriodo identifica corretamente datas fora do intervalo de filtro", () => {
    // acomp criado em 2026-03-15
    const criadoEm = "2026-03-15T10:00:00Z";

    // Fora: antes do início
    expect(isAcompanhamentoForaDoPeriodo(criadoEm, "2026-04-01", "2026-05-01")).toBe(true);

    // Fora: depois do fim
    expect(isAcompanhamentoForaDoPeriodo(criadoEm, "2026-01-01", "2026-02-28")).toBe(true);

    // Dentro do intervalo
    expect(isAcompanhamentoForaDoPeriodo(criadoEm, "2026-01-01", "2026-03-31")).toBe(false);

    // Sem filtro de período
    expect(isAcompanhamentoForaDoPeriodo(criadoEm, null, null)).toBe(false);
    expect(isAcompanhamentoForaDoPeriodo(criadoEm, "", "")).toBe(false);
  });

  it("8. formatAcompanhamentoRowForPdf adiciona etiqueta (FORA DO PERÍODO) quando aplicável", () => {
    const acomp: ReportAcompanhamento = sampleData.acompanhamentos[0]; // criado_em: 2026-03-15

    // Com filtro que não cobre março:
    const rowFora = formatAcompanhamentoRowForPdf(acomp, "2026-04-01", "2026-05-01");
    expect(rowFora[1]).toBe("CONCLUIDO (FORA DO PERÍODO)");

    // Com filtro que cobre março:
    const rowDentro = formatAcompanhamentoRowForPdf(acomp, "2026-01-01", "2026-03-31");
    expect(rowDentro[1]).toBe("CONCLUIDO");
  });
});
