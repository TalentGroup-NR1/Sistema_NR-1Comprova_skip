import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PulsoColaboradorDetail } from "../PulsoColaboradorDetail";
import * as pulseHooks from "@/hooks/usePulseCampaigns";
import * as colabHooks from "@/hooks/useColaboradores";

vi.mock("@/hooks/usePulseCampaigns", () => ({
  useEmployeePulseHistory: vi.fn(),
  EMOJI_SCALE: [
    { score: 1, emoji: "😢", label: "Muito mal", color: "bg-red-500", textColor: "text-red-500" },
    { score: 2, emoji: "🙁", label: "Mal", color: "bg-orange-500", textColor: "text-orange-500" },
    { score: 3, emoji: "😐", label: "Neutro", color: "bg-yellow-500", textColor: "text-yellow-500" },
    { score: 4, emoji: "🙂", label: "Bem", color: "bg-green-500", textColor: "text-green-500" },
    { score: 5, emoji: "😄", label: "Muito bem", color: "bg-emerald-500", textColor: "text-emerald-500" },
  ],
}));

vi.mock("@/hooks/useColaboradores", () => ({
  useColaborador: vi.fn(),
}));

// Mock child components that might need router/canvas/dialog complexities
vi.mock("../PulsoEvolutionChartEmployee", () => ({
  PulsoEvolutionChartEmployee: () => <div data-testid="evolution-chart">Evolution Chart</div>,
}));

vi.mock("../acompanhamentos/AcompanhamentoForm", () => ({
  AcompanhamentoForm: () => <div>AcompanhamentoForm</div>,
}));

describe("PulsoColaboradorDetail", () => {
  const mockColaborador = {
    id: "colab-123",
    full_name: "João Silva",
    job_title: "Desenvolvedor",
    department: "Tecnologia",
    avatar_url: null,
  };

  it("renderiza histórico com sucesso quando há respostas", () => {
    vi.mocked(colabHooks.useColaborador).mockReturnValue({
      data: mockColaborador,
      isLoading: false,
    } as any);

    vi.mocked(pulseHooks.useEmployeePulseHistory).mockReturnValue({
      data: [
        {
          campaign_id: "camp-1",
          campaign_title: "Clima Semanal",
          campaign_date: "2026-10-01",
          created_at: "2026-10-01T10:00:00Z",
          question_id: "q-1",
          pergunta: "Como você está hoje?",
          tipo: "escala_0_5",
          resposta_numerica: 4,
          resposta: "4",
          comentario: "Tudo ótimo",
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<PulsoColaboradorDetail colaboradorId="colab-123" onBack={vi.fn()} />);

    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText("Clima Semanal")).toBeInTheDocument();
    expect(screen.getByText("Como você está hoje?")).toBeInTheDocument();
    expect(screen.getByText(/Tudo ótimo/)).toBeInTheDocument();
    expect(screen.queryByText(/Este colaborador ainda não respondeu/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Erro ao carregar histórico/)).not.toBeInTheDocument();
  });

  it("renderiza estado vazio quando a resposta for sucesso mas sem campanhas", () => {
    vi.mocked(colabHooks.useColaborador).mockReturnValue({
      data: mockColaborador,
      isLoading: false,
    } as any);

    vi.mocked(pulseHooks.useEmployeePulseHistory).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<PulsoColaboradorDetail colaboradorId="colab-123" onBack={vi.fn()} />);

    expect(screen.getByText("Este colaborador ainda não respondeu nenhuma campanha do Pulso.")).toBeInTheDocument();
    expect(screen.queryByText(/Erro ao carregar histórico/)).not.toBeInTheDocument();
  });

  it("renderiza estado de erro claramente quando a chamada RPC/query falha (não engole como vazio)", () => {
    vi.mocked(colabHooks.useColaborador).mockReturnValue({
      data: mockColaborador,
      isLoading: false,
    } as any);

    vi.mocked(pulseHooks.useEmployeePulseHistory).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Acesso negado"),
    } as any);

    render(<PulsoColaboradorDetail colaboradorId="colab-123" onBack={vi.fn()} />);

    expect(screen.getByText("Erro ao carregar histórico de respostas.")).toBeInTheDocument();
    expect(screen.getByText("Acesso negado")).toBeInTheDocument();
    // Garante que NÃO mostra a mensagem enganosa de vazio
    expect(screen.queryByText("Este colaborador ainda não respondeu nenhuma campanha do Pulso.")).not.toBeInTheDocument();
  });
});
