import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FaleConoscoDrawer } from "../FaleConoscoDrawer";
import { BrowserRouter } from "react-router-dom";
import React from "react";

vi.mock("@/hooks/useFaleConosco", () => ({
  useCriarFaleConosco: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("../CanalDenunciaModal", () => ({
  CanalDenunciaModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="canal-denuncia-modal-mock">CanalDenunciaModal Aberto</div> : null,
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock;

describe("FaleConoscoDrawer — Entrada do Canal de Denúncias e Acompanhamento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza o bloco de destaque do Canal de Denúncias", () => {
    render(
      <BrowserRouter>
        <FaleConoscoDrawer open={true} onOpenChange={() => {}} />
      </BrowserRouter>
    );

    expect(
      screen.getByText("Precisa denunciar assédio, discriminação ou violência?")
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Acessar Canal de Denúncias/i })
    ).toBeDefined();
  });

  it("renderiza o link de acompanhamento pelo protocolo para /acompanhar", () => {
    render(
      <BrowserRouter>
        <FaleConoscoDrawer open={true} onOpenChange={() => {}} />
      </BrowserRouter>
    );

    const linkAcompanhar = screen.getByText(
      /Já registrou uma denúncia\? Acompanhe pelo protocolo →/i
    );
    expect(linkAcompanhar).toBeDefined();
    expect(linkAcompanhar.closest("a")?.getAttribute("href")).toBe("/acompanhar");

    // Mantém o link de ver minhas mensagens enviadas
    const linkMinhas = screen.getByText(/Ver minhas mensagens enviadas/i);
    expect(linkMinhas).toBeDefined();
    expect(linkMinhas.closest("a")?.getAttribute("href")).toBe("/fale-conosco/minhas");
  });

  it("ao clicar em 'Acessar Canal de Denúncias', abre o CanalDenunciaModal e fecha o drawer", () => {
    const onOpenChangeMock = vi.fn();

    render(
      <BrowserRouter>
        <FaleConoscoDrawer open={true} onOpenChange={onOpenChangeMock} />
      </BrowserRouter>
    );

    const btnDenuncia = screen.getByRole("button", { name: /Acessar Canal de Denúncias/i });
    fireEvent.click(btnDenuncia);

    // Deve solicitar fechamento do drawer
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);

    // E abrir o modal de denúncias
    expect(screen.getByTestId("canal-denuncia-modal-mock")).toBeDefined();
  });
});
