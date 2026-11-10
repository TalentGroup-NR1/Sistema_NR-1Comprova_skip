import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FeriasDashboard } from "../FeriasDashboard";

vi.mock("@/hooks/useFerias", () => ({
  useColaboradoresComFerias: () => ({
    data: [
      {
        id: "c1",
        full_name: "João Silva",
        periodos_aquisitivos: [
          {
            id: "p1",
            data_inicio_aquisitivo: "2024-01-01",
            data_fim_aquisitivo: "2025-01-01",
            data_limite_gozo: "2025-11-01",
            dias_adquiridos: 30,
          },
        ],
        ferias_gozo: [],
      },
    ],
    isLoading: false,
  }),
  useFeriasPendentesAprovacao: () => ({
    data: [{ id: "pendente-1" }],
    isLoading: false,
  }),
}));

describe("ETAPA 2: FeriasDashboard card navigation", () => {
  it("clicar em 'Férias Vencidas' chama onGoColaboradoresVencidas", () => {
    const onGoAprovacoes = vi.fn();
    const onGoColaboradoresVencidas = vi.fn();
    const onGoColaboradoresAVencer = vi.fn();

    render(
      <FeriasDashboard
        onGoAprovacoes={onGoAprovacoes}
        onGoColaboradoresVencidas={onGoColaboradoresVencidas}
        onGoColaboradoresAVencer={onGoColaboradoresAVencer}
      />
    );

    const vencidasCard = screen.getByText("Férias Vencidas");
    fireEvent.click(vencidasCard);

    expect(onGoColaboradoresVencidas).toHaveBeenCalledTimes(1);
    expect(onGoColaboradoresAVencer).not.toHaveBeenCalled();
    expect(onGoAprovacoes).not.toHaveBeenCalled();
  });

  it("clicar em 'A Vencer (90 dias)' chama onGoColaboradoresAVencer", () => {
    const onGoAprovacoes = vi.fn();
    const onGoColaboradoresVencidas = vi.fn();
    const onGoColaboradoresAVencer = vi.fn();

    render(
      <FeriasDashboard
        onGoAprovacoes={onGoAprovacoes}
        onGoColaboradoresVencidas={onGoColaboradoresVencidas}
        onGoColaboradoresAVencer={onGoColaboradoresAVencer}
      />
    );

    const aVencerCard = screen.getByText("A Vencer (90 dias)");
    fireEvent.click(aVencerCard);

    expect(onGoColaboradoresAVencer).toHaveBeenCalledTimes(1);
    expect(onGoColaboradoresVencidas).not.toHaveBeenCalled();
    expect(onGoAprovacoes).not.toHaveBeenCalled();
  });

  it("clicar em 'Pendentes de Aprovação' chama onGoAprovacoes", () => {
    const onGoAprovacoes = vi.fn();
    const onGoColaboradoresVencidas = vi.fn();
    const onGoColaboradoresAVencer = vi.fn();

    render(
      <FeriasDashboard
        onGoAprovacoes={onGoAprovacoes}
        onGoColaboradoresVencidas={onGoColaboradoresVencidas}
        onGoColaboradoresAVencer={onGoColaboradoresAVencer}
      />
    );

    const pendentesCard = screen.getByText("Pendentes de Aprovação");
    fireEvent.click(pendentesCard);

    expect(onGoAprovacoes).toHaveBeenCalledTimes(1);
    expect(onGoColaboradoresVencidas).not.toHaveBeenCalled();
    expect(onGoColaboradoresAVencer).not.toHaveBeenCalled();
  });
});

