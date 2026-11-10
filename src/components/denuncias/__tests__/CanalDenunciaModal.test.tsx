import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CanalDenunciaModal } from "../CanalDenunciaModal";
import { BrowserRouter } from "react-router-dom";
import React from "react";

const mutateAsyncMock = vi.fn();
vi.mock("@/hooks/useDenuncias", () => ({
  useCriarDenuncia: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select
      value={value}
      onChange={(e) => onValueChange && onValueChange(e.target.value)}
      data-testid="mock-native-select"
    >
      <option value="">Selecione...</option>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("CanalDenunciaModal — Sucesso do Protocolo e Guard de Fechamento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
    window.HTMLElement.prototype.setPointerCapture = vi.fn();
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renderiza o formulário inicial de denúncia sigilosa", () => {
    render(
      <BrowserRouter>
        <CanalDenunciaModal open={true} onOpenChange={() => {}} />
      </BrowserRouter>
    );

    expect(screen.getByText("Canal de Denúncias — Lei nº 14.457/2022")).toBeDefined();
    expect(screen.getByText("Anonimato Garantido por Lei")).toBeDefined();
    expect(screen.getByRole("button", { name: /Registrar Denúncia Sigilosa/i })).toBeDefined();
  });

  it("exibe validação se submeter formulário incompleto", async () => {
    render(
      <BrowserRouter>
        <CanalDenunciaModal open={true} onOpenChange={() => {}} />
      </BrowserRouter>
    );

    const submitBtn = screen.getByRole("button", { name: /Registrar Denúncia Sigilosa/i });
    fireEvent.click(submitBtn);

    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it("ao submeter com sucesso, transiciona para a tela de protocolo no mesmo diálogo", async () => {
    mutateAsyncMock.mockResolvedValueOnce("DEN-2026-TESTEABC");
    const onOpenChangeMock = vi.fn();

    render(
      <BrowserRouter>
        <CanalDenunciaModal open={true} onOpenChange={onOpenChangeMock} />
      </BrowserRouter>
    );

    // Preenche título
    fireEvent.change(screen.getByPlaceholderText(/Assédio moral recorrente/i), {
      target: { value: "Relato de Assédio Teste" },
    });

    // Preenche mensagem
    fireEvent.change(screen.getByPlaceholderText(/Descreva a situação com o máximo/i), {
      target: { value: "Descrição detalhada dos fatos ocorridos na empresa para teste de denúncia." },
    });

    // Seleciona Categoria e Origem via mock select
    const [selectCategoria, selectOrigem] = screen.getAllByTestId("mock-native-select");
    fireEvent.change(selectCategoria, { target: { value: "bullying_assedio_moral" } });
    fireEvent.change(selectOrigem, { target: { value: "lideranca_interna" } });

    // Submete
    const submitBtn = screen.getByRole("button", { name: /Registrar Denúncia Sigilosa/i });
    fireEvent.click(submitBtn);

    // Verifica que mutateAsync foi chamado
    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: "denuncia",
          titulo: "Relato de Assédio Teste",
          anonimo: true,
          categoria: "bullying_assedio_moral",
          origem: "lideranca_interna",
        })
      );
    });

    // O modal NÃO deve ter sido fechado!
    expect(onOpenChangeMock).not.toHaveBeenCalledWith(false);

    // O protocolo gerado deve estar visível em destaque na tela!
    expect(await screen.findByText("DEN-2026-TESTEABC")).toBeDefined();
    expect(screen.getByText("Registro Concluído com Sucesso")).toBeDefined();
    expect(screen.getByRole("button", { name: /Copiar protocolo/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Baixar comprovante/i })).toBeDefined();
  });

  it("aciona guard de fechamento se o usuário tentar fechar sem copiar o código", async () => {
    mutateAsyncMock.mockResolvedValueOnce("DEN-2026-GUARD123");
    const onOpenChangeMock = vi.fn();

    render(
      <BrowserRouter>
        <CanalDenunciaModal open={true} onOpenChange={onOpenChangeMock} />
      </BrowserRouter>
    );

    // Preenche campos
    fireEvent.change(screen.getByPlaceholderText(/Assédio moral recorrente/i), {
      target: { value: "Relato de Teste Guard" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Descreva a situação com o máximo/i), {
      target: { value: "Texto longo de descrição dos fatos para atender aos 10 caracteres." },
    });

    const [selectCategoria, selectOrigem] = screen.getAllByTestId("mock-native-select");
    fireEvent.change(selectCategoria, { target: { value: "bullying_assedio_moral" } });
    fireEvent.change(selectOrigem, { target: { value: "colegas_pares" } });

    fireEvent.click(screen.getByRole("button", { name: /Registrar Denúncia Sigilosa/i }));

    // Aguarda tela de sucesso
    expect(await screen.findByText("DEN-2026-GUARD123")).toBeDefined();

    // Clica em "Entendi e guardei o código" SEM ter copiado
    const btnEntendi = screen.getByRole("button", { name: /Entendi e guardei o código/i });
    fireEvent.click(btnEntendi);

    // O modal NÃO deve fechar
    expect(onOpenChangeMock).not.toHaveBeenCalledWith(false);

    // O alerta secundário deve aparecer
    expect(screen.getByText("Você ainda não copiou o código!")).toBeDefined();
    expect(
      screen.getByText(/Certifique-se de salvar o protocolo antes de fechar/i)
    ).toBeDefined();

    // Copia o código pelo botão do alerta
    const btnCopiarAgora = screen.getByRole("button", { name: /Copiar agora/i });
    fireEvent.click(btnCopiarAgora);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("DEN-2026-GUARD123");
    });

    // Agora ao clicar em "Entendi e guardei o código", deve fechar
    fireEvent.click(btnEntendi);
    await waitFor(() => {
      expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    });
  });
});
