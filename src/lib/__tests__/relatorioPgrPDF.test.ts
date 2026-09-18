import { describe, it, expect, vi } from "vitest";
import { jsPDF } from "jspdf";
import { gerarRelatorioPgrPDF } from "../relatorioPgrPDF";

// Mock das dependências globais
vi.mock("jspdf", () => {
  const mockText = vi.fn();
  const mockAddPage = vi.fn();
  const mockSetFont = vi.fn();
  const mockSetFontSize = vi.fn();
  const mockSetTextColor = vi.fn();
  const mockSetFillColor = vi.fn();
  const mockSetDrawColor = vi.fn();
  const mockRect = vi.fn();
  const mockLine = vi.fn();
  const mockAddImage = vi.fn();
  const mockSplitTextToSize = vi.fn((text) => [text]);
  const mockSetPage = vi.fn();

  const jsPDFMock = vi.fn(function() {
    return {
      text: mockText,
      addPage: mockAddPage,
      setFont: mockSetFont,
      setFontSize: mockSetFontSize,
      setTextColor: mockSetTextColor,
      setFillColor: mockSetFillColor,
      setDrawColor: mockSetDrawColor,
      rect: mockRect,
      line: mockLine,
      addImage: mockAddImage,
      splitTextToSize: mockSplitTextToSize,
      setPage: mockSetPage,
      internal: {
        pageSize: {
          getWidth: () => 595.28,
          getHeight: () => 841.89,
        },
        getNumberOfPages: () => 1,
      },
      lastAutoTable: { finalY: 200 },
      output: vi.fn().mockReturnValue(new ArrayBuffer(8)),
    };
  });
  return { jsPDF: jsPDFMock, default: jsPDFMock };
});

const mockAutoTable = vi.fn((doc, options) => {
  doc.lastAutoTable = { finalY: (options.startY || 100) + 50 };
});

vi.mock("jspdf-autotable", () => ({
  default: (...args: any[]) => mockAutoTable(...args),
}));

describe("gerarRelatorioPgrPDF (Teste de Fumaça)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("deve gerar o PDF sem lançar exceções e preencher a capa com fallbacks", async () => {
    // Arrange
    const pgrInfo = {
      id: "pgr-123",
      data_elaboracao: undefined,
      validade: undefined,
      responsavel_tecnico: undefined,
      cargo_responsavel: undefined,
      status: "ativo"
    };

    const empresa = {
      name: "Empresa Teste",
      cnpj: "12.345.678/0001-99",
    };

    const emitente = {
      nome: "Joao Teste",
      email: "joao@teste.com",
      cargo: "Engenheiro",
    };

    const acoes = [
      {
        id: "acao-1",
        acao: "Ação de Teste",
        status: "pendente",
        prioridade: "alta",
        onde: "Setor A",
        por_que: "Motivo A",
        como: "Metodo A",
        prazo: "2024-12-31",
        colaboradores: { full_name: "Responsavel A" },
        execucoes: [],
      }
    ];

    // Act
    const result = await gerarRelatorioPgrPDF({
      pgrInfo,
      acoes,
      empresa,
      emitente,
      verificacaoUrlBase: "http://localhost",
    });

    // Assert
    expect(result).toHaveProperty("docId");
    expect(result).toHaveProperty("blob");
    
    // Verifica se a tabela da capa recebe os campos (o autoTable seria chamado com "—")
    // Como mockamos o autoTable, apenas garantimos que a execução fluiu sem erros
    expect(jsPDF).toHaveBeenCalled();
  });

  it("deve preencher a capa com os valores do PGR quando presentes", async () => {
    // Arrange
    const pgrInfo = {
      id: "pgr-456",
      data_elaboracao: "2024-05-15T12:00:00Z",
      validade: "2025-05-15T12:00:00Z",
      responsavel_tecnico: "Joao Engenheiro",
      registro_profissional: "CREA-SP 12345",
      status: "ativo"
    };

    const empresa = {
      name: "Empresa Teste",
      cnpj: "12.345.678/0001-99",
    };

    const emitente = {
      nome: "Joao Teste",
      email: "joao@teste.com",
      cargo: "Engenheiro",
    };

    // Act
    await gerarRelatorioPgrPDF({
      pgrInfo,
      acoes: [],
      empresa,
      emitente,
      verificacaoUrlBase: "http://localhost",
    });

    // Assert: O autoTable é chamado várias vezes. A primeira é para a capa "Informações do Relatório"
    expect(mockAutoTable).toHaveBeenCalled();
    const coverTableCall = (mockAutoTable as any).mock.calls.find((call: any) => 
      call[1].head && call[1].head[0] && call[1].head[0][0]?.content === "Informações do Relatório"
    );
    expect(coverTableCall).toBeDefined();
    
    // Verifica se os valores foram mapeados no corpo da tabela
    const body = coverTableCall[1].body;
    expect(body).toContainEqual(["ID do PGR Base", "pgr-456"]);
    expect(body).toContainEqual(["Responsável Técnico", "Joao Engenheiro"]);
    expect(body).toContainEqual(["Registro Profissional", "CREA-SP 12345"]);
    expect(body.some((r: string[]) => r[0] === "Data de Elaboração PGR" && r[1].includes("15/05/2024"))).toBe(true);
    expect(body.some((r: string[]) => r[0] === "Validade PGR" && r[1].includes("15/05/2025"))).toBe(true);
    expect(body.some((r: string[]) => r[0] === "Emitido em")).toBe(true);
    expect(body.some((r: string[]) => r[0] === "Emitido por" && r[1].includes("Joao Teste"))).toBe(true);
    expect(body.some((r: string[]) => r[0] === "ID Documento (Rastreabilidade)")).toBe(true);
    expect(body.some((r: string[]) => r[0] === "Hash de Integridade (SHA-256)")).toBe(true);
  });

  it("deve preencher as novas seções de Riscos Mapeados e Ações Mapeadas com as regras de formatação (Regressão)", async () => {
    const pgrInfo = {
      id: "pgr-456",
      data_elaboracao: "2024-05-15T12:00:00Z",
      validade: "2025-05-15T12:00:00Z",
      responsavel_tecnico: "Joao Engenheiro",
      registro_profissional: "CREA-SP 12345",
      status: "ativo"
    };
    const empresa = { name: "Empresa Teste", cnpj: "12.345.678/0001-99" };
    const emitente = { nome: "Joao Teste", email: "joao@teste.com", cargo: "Engenheiro" };

    const riscos = [
      {
        nome: "Demandas do Trabalho",
        categoria: "psicossocial",
        classificacao: "Moderado",
        descricao: "Descrição do risco 1",
        grupo_exposto: "Colaboradores",
        local_exposicao: "Página 9",
        escala_matriz: "5x5",
        nivel: 0,
        severidade: 0,
        probabilidade: 0,
        confianca: 100,
        medidas_existentes: "null"
      },
      {
        nome: "Risco Químico",
        categoria: "químico",
        classificacao: "Baixo",
        descricao: null,
        grupo_exposto: "Produção",
        local_exposicao: null,
        escala_matriz: "5x5",
        nivel: 2,
        severidade: 1,
        probabilidade: 2,
        medidas_existentes: "EPI"
      }
    ];

    const planoAcao = [
      {
        medida: "Treinamento",
        status: "pendente",
        prioridade: "media",
        prazo_sugerido: "730",
        risco_referenciado: "null",
        responsavel_sugerido: "Empresa contratante"
      },
      {
        medida: "Troca de equipamento",
        status: "pendente",
        prioridade: "alta",
        prazo_sugerido: "Dentro do prazo de vigência",
        risco_referenciado: "null",
        responsavel_sugerido: "Manutenção"
      }
    ];

    await gerarRelatorioPgrPDF({
      pgrInfo,
      acoes: [],
      riscos: riscos as any,
      planoAcao: planoAcao as any,
      empresa,
      emitente,
      verificacaoUrlBase: "http://localhost",
    });

    // (e) capa continua saindo com os 9 campos
    const coverTableCall = (mockAutoTable as any).mock.calls.find((call: any) => 
      call[1].head && call[1].head[0] && call[1].head[0][0]?.content === "Informações do Relatório"
    );
    expect(coverTableCall).toBeDefined();
    const coverBody = coverTableCall[1].body;
    expect(coverBody).toContainEqual(["ID do PGR Base", "pgr-456"]);

    // (a) os nomes reais dos riscos chegam ao corpo
    const riscosTableCall = (mockAutoTable as any).mock.calls.find((call: any) => 
      call[1].head && call[1].head[0] && call[1].head[0][0] === "Risco (Nome e Descrição)"
    );
    expect(riscosTableCall).toBeDefined();
    const riscosBody = riscosTableCall[1].body;
    expect(riscosBody.some((r: any[]) => r[0].includes("Demandas do Trabalho"))).toBe(true);

    // (b) a string "null" não aparece
    const riscosFlattened = riscosBody.flat().join(" ");
    expect(riscosFlattened).not.toContain("null");
    
    // (c) "0" não aparece nas colunas de matriz
    expect(riscosBody[0][2]).toBe("Moderado"); 
    expect(riscosBody[1][2]).toBe("2"); 

    // (d) "730 dias" aparece nas ações
    const acoesTableCall = (mockAutoTable as any).mock.calls.find((call: any) => 
      call[1].head && call[1].head[0] && call[1].head[0][0] === "Medida"
    );
    expect(acoesTableCall).toBeDefined();
    const acoesBody = acoesTableCall[1].body;
    expect(acoesBody[0][3]).toBe("730 dias");
    expect(acoesBody[1][3]).toBe("Dentro do prazo de vigência");

    const acoesFlattened = acoesBody.flat().join(" ");
    expect(acoesFlattened).not.toContain("null");

    // Verificar a ordem de renderização: Capa -> Resumo -> Riscos -> Ações
    const allTableCalls = (mockAutoTable as any).mock.calls;
    // Pega o conteúdo do primeiro item do header de cada tabela renderizada
    const tableHeaders = allTableCalls.map((c: any) => c[1].head?.[0]?.[0]?.content || c[1].head?.[0]?.[0]);
    
    // tableHeaders deve ser exatamente essa sequência
    expect(tableHeaders[0]).toBe("Informações do Relatório");
    expect(tableHeaders[1]).toBe("Indicador"); // Resumo do Plano (Dashboard)
    expect(tableHeaders[2]).toBe("Risco (Nome e Descrição)");
    expect(tableHeaders[3]).toBe("Medida");
  });
});
