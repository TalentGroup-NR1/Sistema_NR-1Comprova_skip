import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "../ErrorBoundary";

function CrashingComponent(): JSX.Element {
  throw new Error("Erro simulado para prova de Error Boundary");
}

function NormalComponent(): JSX.Element {
  return <div>Conteúdo renderizado com sucesso</div>;
}

describe("ErrorBoundary Global", () => {
  it("renderiza children normalmente quando não há erro", () => {
    render(
      <ErrorBoundary>
        <NormalComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("Conteúdo renderizado com sucesso")).toBeInTheDocument();
  });

  it("captura erro de renderização e exibe cartão amigável sem tela branca", () => {
    // Silencia console.error esperado do React durante o teste de crash
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary fallbackMessage="Ocorreu um erro ao carregar a página. Por favor, tente recarregar.">
        <CrashingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("Ops, algo deu errado!")).toBeInTheDocument();
    expect(
      screen.getByText("Ocorreu um erro ao carregar a página. Por favor, tente recarregar.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tentar novamente/i })).toBeInTheDocument();

    spy.mockRestore();
  });
});
