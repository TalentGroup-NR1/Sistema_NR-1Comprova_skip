import React, { useImperativeHandle, forwardRef } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useSaveIndicator } from "../../components/mapa-riscos/pgr/AcaoDialog";

const TestComponent = forwardRef((props: { field: string }, ref) => {
  const { trackSave, SaveIndicator } = useSaveIndicator();

  useImperativeHandle(ref, () => ({
    trackSave
  }));

  return <SaveIndicator field={props.field} />;
});

describe("useSaveIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deve exibir spinner (loading) enquanto a promise estiver pendente", async () => {
    const ref = React.createRef<any>();
    render(<TestComponent field="campoTeste" ref={ref} />);
    
    let resolvePromise: (val: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    act(() => {
      ref.current.trackSave("campoTeste", pendingPromise);
    });

    // Enquanto pendente, deve exibir o spinner
    expect(screen.getByTestId("save-spinner")).toBeInTheDocument();
    
    // Resolvemos a promise
    await act(async () => {
      resolvePromise(true);
      await pendingPromise;
    });
  });

  it("deve exibir check (sucesso) e remover após 3 segundos", async () => {
    const ref = React.createRef<any>();
    render(<TestComponent field="campoTeste" ref={ref} />);
    const promise = Promise.resolve(true);

    await act(async () => {
      await ref.current.trackSave("campoTeste", promise);
    });

    // Após resolver com sucesso, exibe o check
    expect(screen.getByTestId("save-success")).toBeInTheDocument();

    // Avança o tempo em 3 segundos
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // O indicador deve sumir
    expect(screen.queryByTestId("save-success")).not.toBeInTheDocument();
  });

  it("deve exibir alerta e a mensagem de erro (falha)", async () => {
    const ref = React.createRef<any>();
    render(<TestComponent field="campoErro" ref={ref} />);
    const errorMessage = "Erro simulado no banco";
    const promise = Promise.reject(new Error(errorMessage));

    await act(async () => {
      try {
        await ref.current.trackSave("campoErro", promise);
      } catch (err) {
        // ignora
      }
    });

    // Após rejeitar, exibe o ícone de erro e a mensagem texto
    const errorEl = screen.getByTestId("save-error");
    expect(errorEl).toBeInTheDocument();
    expect(errorEl.textContent).toContain(errorMessage);
  });
});
