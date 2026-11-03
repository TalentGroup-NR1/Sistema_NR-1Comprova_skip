import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { RiscoDialog } from "../RiscoDialog";
import type { PgrRisco } from "@/hooks/usePgrRiscos";

describe("RiscoDialog", () => {
  const mockOnSubmit = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Bloqueia submit com nome vazio (mostra erro de validação)
  it("bloqueia submit com nome vazio e exibe mensagem de erro", async () => {
    render(
      <RiscoDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /^Salvar$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Nome deve ter no mínimo 3 caracteres")
      ).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  // 2. Bloqueia submit com nome < 3 caracteres
  it("bloqueia submit com nome menor que 3 caracteres", async () => {
    render(
      <RiscoDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
      />
    );

    const nomeInput = screen.getByPlaceholderText(
      "Ex: Ruído contínuo ou intermitente"
    );
    fireEvent.change(nomeInput, { target: { value: "ab" } });

    const submitBtn = screen.getByRole("button", { name: /^Salvar$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Nome deve ter no mínimo 3 caracteres")
      ).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  // 3. Modo edição preenche todos os campos com os valores do risco
  it("modo edição preenche todos os campos com os dados do risco", () => {
    const riscoMock: PgrRisco = {
      id: "risco-123",
      pgr_importacao_id: "pgr-1",
      ordem: 0,
      categoria: "ergonomico",
      nome: "Esforço repetitivo em digitação",
      probabilidade: 4,
      severidade: 3,
      descricao: "Digitação contínua durante 6 horas diárias sem pausas.",
      medidas_existentes: "Ginástica laboral e cadeiras ajustáveis.",
      grupo_exposto: "Analistas Financeiros",
      fonte_origem: "manual",
      created_at: "2026-11-01T10:00:00Z",
      updated_at: "2026-11-01T10:00:00Z",
    };

    render(
      <RiscoDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        risco={riscoMock}
        onSubmit={mockOnSubmit}
        isPending={false}
      />
    );

    expect(screen.getByText("Editar risco")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Esforço repetitivo em digitação")
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(
        "Digitação contínua durante 6 horas diárias sem pausas."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Ginástica laboral e cadeiras ajustáveis.")
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Analistas Financeiros")
    ).toBeInTheDocument();
  });

  // 4. Cálculo P×S exibe o nível correto ao inicializar ou mudar probabilidade/severidade
  it("cálculo P×S exibe o nível e classificação corretos", () => {
    const riscoMock: PgrRisco = {
      id: "risco-p-s",
      pgr_importacao_id: "pgr-1",
      ordem: 1,
      categoria: "fisico",
      nome: "Ruído Alto",
      probabilidade: 4,
      severidade: 3,
      descricao: null,
      medidas_existentes: null,
      grupo_exposto: null,
      fonte_origem: "manual",
      created_at: "2026-11-01T10:00:00Z",
      updated_at: "2026-11-01T10:00:00Z",
    };

    render(
      <RiscoDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        risco={riscoMock}
        onSubmit={mockOnSubmit}
        isPending={false}
      />
    );

    // 4 × 3 = 12
    expect(screen.getByText(/4 × 3 = 12/i)).toBeInTheDocument();
  });

  // 5. Botão Salvar fica disabled quando isPending = true
  it("botão Salvar fica desabilitado e exibe texto 'Salvando...' quando isPending = true", () => {
    render(
      <RiscoDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={true}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /Salvando.../i });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    const cancelBtn = screen.getByRole("button", { name: /Cancelar/i });
    expect(cancelBtn).toBeDisabled();
  });
});

