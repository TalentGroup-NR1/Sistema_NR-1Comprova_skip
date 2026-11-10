import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { AcaoDialog } from "../AcaoDialog";
import type { PgrPlanoAcao } from "@/hooks/usePgrAcoes";

// Mocks
const mockCreateMutateAsync = vi.fn().mockResolvedValue({ id: "nova-acao-1" });
const mockUpdateMutateAsync = vi.fn().mockResolvedValue({ id: "acao-1" });
const mockRiscosData = [
  { id: "r1", categoria: "ergonomico", nome: "Postura inadequada" },
  { id: "r2", categoria: "fisico", nome: "Ruído excessivo" },
];

vi.mock("@/hooks/useEffectiveCompanyId", () => ({
  useEffectiveCompanyId: () => "company-123",
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-123", email: "test@example.com" },
    role: "admin_empresa",
  }),
}));

vi.mock("@/hooks/useResponsaveisRH", () => ({
  useResponsaveisRH: () => ({
    data: [{ id: "colab-1", full_name: "João Silva" }],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/usePgrRiscos", () => ({
  usePgrRiscos: vi.fn(() => ({
    data: mockRiscosData,
    isLoading: false,
  })),
}));

vi.mock("@/hooks/usePgrAcoes", async () => {
  const actual = await vi.importActual<any>("@/hooks/usePgrAcoes");
  return {
    ...actual,
    useCreateAcao: () => ({
      mutateAsync: mockCreateMutateAsync,
      isPending: false,
    }),
    useUpdateAcao: () => ({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    }),
    useUploadEvidenciaAcao: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
  };
});

describe("AcaoDialog", () => {
  const mockOnOpenChange = vi.fn();
  const defaultPgrId = "pgr-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Modo criação renderiza vazio com título "Nova ação"
  it("modo criação renderiza vazio com título 'Nova ação'", () => {
    render(
      <AcaoDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        pgrImportacaoId={defaultPgrId}
        acao={undefined}
      />
    );

    expect(screen.getByText("Nova ação")).toBeInTheDocument();
    const textarea = screen.getByPlaceholderText(
      "Ex: Instalação de linha de vida e treinamento para trabalho em altura..."
    );
    expect(textarea).toBeInTheDocument();
    expect((textarea as HTMLTextAreaElement).value).toBe("");

    // Opção padrão "Sem vínculo com risco" está no seletor
    expect(screen.getAllByText("Sem vínculo com risco").length).toBeGreaterThan(0);
  });

  // 2. Modo criação exibe riscos no seletor
  it("modo criação exibe riscos no seletor", () => {
    render(
      <AcaoDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        pgrImportacaoId={defaultPgrId}
        acao={undefined}
      />
    );

    // No Radix UI Select, itens com seus labels estão no DOM (ou podem ser abertos)
    expect(screen.getByText("ergonomico — Postura inadequada")).toBeInTheDocument();
    expect(screen.getByText("fisico — Ruído excessivo")).toBeInTheDocument();
  });

  // 3. Modo edição preenche e chama UPDATE (não CREATE)
  it("modo edição preenche e chama UPDATE (não CREATE)", async () => {
    const acaoMock: PgrPlanoAcao = {
      id: "acao-1",
      company_id: "company-123",
      pgr_importacao_id: defaultPgrId,
      acao: "Adequação de bancada de trabalho",
      por_que: "Reduzir queixas ergonômicas",
      onde: "Linha de montagem",
      como: "Ajuste na altura dos postos",
      custo_estimado: 500,
      custo_real: 0,
      responsavel_id: "colab-1",
      cargo_responsavel: null,
      prazo: "2026-12-31",
      prioridade: "media",
      status: "pendente",
      evidencia_url: null,
      historico: [],
      created_at: "2026-11-01T10:00:00Z",
      updated_at: "2026-11-01T10:00:00Z",
      risco_id: "r1",
      pgr_riscos: { id: "r1", nome: "Postura inadequada", categoria: "ergonomico" },
      colaboradores: { full_name: "João Silva" },
    };

    render(
      <AcaoDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        pgrImportacaoId={defaultPgrId}
        acao={acaoMock}
      />
    );

    expect(screen.getByText("Editar ação")).toBeInTheDocument();
    expect(screen.getByText("Adequação de bancada de trabalho")).toBeInTheDocument();

    // Altera o campo "Onde" via onBlur
    const ondeInput = screen.getByDisplayValue("Linha de montagem");
    fireEvent.change(ondeInput, { target: { value: "Setor de Embalagem" } });
    fireEvent.blur(ondeInput);

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "acao-1",
          pgrImportacaoId: defaultPgrId,
          updates: { onde: "Setor de Embalagem" },
        })
      );
    });

    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
  });

  // 4. Modo criação chama CREATE (não UPDATE) com risco_id nulo se não selecionado
  it("modo criação chama CREATE (não UPDATE) com risco_id nulo se não selecionado", async () => {
    render(
      <AcaoDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        pgrImportacaoId={defaultPgrId}
        acao={undefined}
      />
    );

    const textarea = screen.getByPlaceholderText(
      "Ex: Instalação de linha de vida e treinamento para trabalho em altura..."
    );
    fireEvent.change(textarea, { target: { value: "Treinamento de CIPA" } });

    const submitBtn = screen.getByRole("button", { name: /Criar Ação/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          pgr_importacao_id: defaultPgrId,
          company_id: "company-123",
          acao: "Treinamento de CIPA",
          risco_id: null,
          prioridade: "media",
        })
      );
    });

    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  describe("ETAPA M1 — Descrição da Ação Editável (6.1 a-f)", () => {
    const acaoPgrMock: PgrPlanoAcao = {
      id: "acao-pgr-01",
      company_id: "company-123",
      pgr_importacao_id: defaultPgrId,
      acao: "Promover treinamentos ergonômicos e posturais",
      por_que: "Reduzir queixas ergonômicas",
      onde: "Geral",
      como: "Palestras e práticas",
      custo_estimado: 1200,
      custo_real: 0,
      responsavel_id: "colab-1",
      cargo_responsavel: null,
      prazo: "2026-12-31",
      prioridade: "alta",
      status: "pendente",
      evidencia_url: null,
      historico: [],
      created_at: "2026-11-01T10:00:00Z",
      updated_at: "2026-11-01T10:00:00Z",
      risco_id: "r1",
    };

    // 6.1a: Renderiza habilitado para ação PGR
    it("6.1a: renderiza campo de descrição habilitado e editável no modo edição para ação do PGR", () => {
      render(
        <AcaoDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          pgrImportacaoId={defaultPgrId}
          acao={acaoPgrMock}
        />
      );

      const textarea = screen.getByRole("textbox", { name: /Descrição da Ação \(O que\?\)/i });
      expect(textarea).toBeInTheDocument();
      expect(textarea).toBeEnabled();
      expect(textarea).not.toHaveAttribute("readonly");
      expect((textarea as HTMLTextAreaElement).value).toBe("Promover treinamentos ergonômicos e posturais");
    });

    // 6.1b: Aceita digitação e atualiza estado e contador
    it("6.1b: aceita digitação e atualiza estado e contador de caracteres", () => {
      render(
        <AcaoDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          pgrImportacaoId={defaultPgrId}
          acao={acaoPgrMock}
        />
      );

      const textarea = screen.getByRole("textbox", { name: /Descrição da Ação \(O que\?\)/i });
      fireEvent.change(textarea, { target: { value: "Revisar postos de trabalho" } });

      expect((textarea as HTMLTextAreaElement).value).toBe("Revisar postos de trabalho");
      expect(screen.getByTestId("edit-acao-char-count")).toHaveTextContent("26/2000 caracteres");
    });

    // 6.1c: Salva novo valor com rastreabilidade completa no histórico
    it("6.1c: salva novo valor com rastreabilidade completa no histórico ao disparar blur", async () => {
      render(
        <AcaoDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          pgrImportacaoId={defaultPgrId}
          acao={acaoPgrMock}
        />
      );

      const textarea = screen.getByRole("textbox", { name: /Descrição da Ação \(O que\?\)/i });
      fireEvent.change(textarea, { target: { value: "Treinar equipe em ergonomia aplicada" } });
      fireEvent.blur(textarea);

      await waitFor(() => {
        expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "acao-pgr-01",
            pgrImportacaoId: defaultPgrId,
            updates: { acao: "Treinar equipe em ergonomia aplicada" },
            mensagemLog: 'Alterou descrição da ação de "Promover treinamentos ergonômicos e posturais" para "Treinar equipe em ergonomia aplicada"',
            detalhesLog: {
              campo: "acao",
              de: "Promover treinamentos ergonômicos e posturais",
              para: "Treinar equipe em ergonomia aplicada",
            },
          })
        );
      });
    });

    // 6.1d: Rejeita campo vazio com mensagem clara e não dispara update
    it("6.1d: validação de campo vazio exibe 'A descrição da ação não pode ficar vazia.' e não salva", async () => {
      render(
        <AcaoDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          pgrImportacaoId={defaultPgrId}
          acao={acaoPgrMock}
        />
      );

      const textarea = screen.getByRole("textbox", { name: /Descrição da Ação \(O que\?\)/i });
      fireEvent.change(textarea, { target: { value: "   " } });
      fireEvent.blur(textarea);

      expect(screen.getByTestId("edit-acao-error")).toHaveTextContent(
        "A descrição da ação não pode ficar vazia."
      );
      expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
    });

    // 6.1e: Respeita limite máximo de 2000 caracteres no textarea
    it("6.1e: possui limite máximo de 2000 caracteres com contador numérico", () => {
      render(
        <AcaoDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          pgrImportacaoId={defaultPgrId}
          acao={acaoPgrMock}
        />
      );

      const textarea = screen.getByRole("textbox", { name: /Descrição da Ação \(O que\?\)/i });
      expect(textarea).toHaveAttribute("maxlength", "2000");
      expect(screen.getByTestId("edit-acao-char-count")).toHaveTextContent(
        `${acaoPgrMock.acao.length}/2000 caracteres`
      );
    });

    // 6.1f: Ação manual / modo criação continua funcionando normalmente
    it("6.1f: modo criação continua funcionando isoladamente sem misturar com estado de edição", async () => {
      render(
        <AcaoDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          pgrImportacaoId={defaultPgrId}
          acao={undefined}
        />
      );

      const textarea = screen.getByPlaceholderText(
        "Ex: Instalação de linha de vida e treinamento para trabalho em altura..."
      );
      fireEvent.change(textarea, { target: { value: "Ação manual criada do zero" } });

      const submitBtn = screen.getByRole("button", { name: /Criar Ação/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            acao: "Ação manual criada do zero",
          })
        );
      });
      expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
    });
  });
});
