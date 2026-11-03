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
});
