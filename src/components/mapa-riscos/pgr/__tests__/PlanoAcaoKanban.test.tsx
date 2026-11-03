import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlanoAcaoKanban } from "../PlanoAcaoKanban";
import type { PgrPlanoAcao } from "@/hooks/usePgrAcoes";

// Mocks
const mockDeleteMutate = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockSyncMutate = vi.fn();

let mockAcoesData: PgrPlanoAcao[] = [];

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-123", email: "admin@tg.com" },
    role: "admin_empresa",
    activeRole: "admin_empresa",
  }),
}));

vi.mock("@/hooks/useEffectiveCompanyId", () => ({
  useEffectiveCompanyId: () => "company-123",
}));

vi.mock("@/hooks/useResponsaveisRH", () => ({
  useResponsaveisRH: () => ({
    data: [],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/usePgrRiscos", () => ({
  usePgrRiscos: () => ({
    data: [
      { id: "risco-1", nome: "Ruído excessivo", categoria: "fisico" },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/usePgrImportacao", () => ({
  usePgrImportacoes: () => ({
    data: [
      {
        id: "pgr-123",
        status: "confirmado",
        plano_acao: [],
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/usePgrAcoes", async () => {
  const actual = await vi.importActual<any>("@/hooks/usePgrAcoes");
  return {
    ...actual,
    useAcoesPgr: () => ({
      data: mockAcoesData,
      isLoading: false,
    }),
    useUpdateAcao: () => ({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    }),
    useDeleteAcao: () => ({
      mutate: mockDeleteMutate,
      isPending: false,
    }),
    useSincronizarAcoes: () => ({
      mutate: mockSyncMutate,
      isPending: false,
    }),
    useCreateAcao: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
    useUploadEvidenciaAcao: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
  };
});

function renderKanban(pgrImportacaoId: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PlanoAcaoKanban pgrImportacaoId={pgrImportacaoId} />
    </QueryClientProvider>
  );
}

describe("PlanoAcaoKanban", () => {
  const pgrImportacaoId = "pgr-123";

  const acao1: PgrPlanoAcao = {
    id: "acao-1",
    company_id: "company-123",
    pgr_importacao_id: pgrImportacaoId,
    acao: "Instalar proteção nas máquinas de corte",
    prioridade: "alta",
    status: "pendente",
    prazo: "2026-12-15",
    responsavel_id: null,
    cargo_responsavel: null,
    risco_id: "risco-1",
    pgr_riscos: { id: "risco-1", nome: "Ruído excessivo", categoria: "fisico" },
    por_que: null,
    onde: null,
    como: null,
    custo_estimado: 0,
    custo_real: 0,
    evidencia_url: null,
    historico: [],
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-01T10:00:00Z",
  };

  const acao2: PgrPlanoAcao = {
    id: "acao-2",
    company_id: "company-123",
    pgr_importacao_id: pgrImportacaoId,
    acao: "Treinamento de primeiros socorros",
    prioridade: "media",
    status: "em_andamento",
    prazo: null,
    responsavel_id: null,
    cargo_responsavel: null,
    risco_id: null,
    pgr_riscos: null,
    por_que: null,
    onde: null,
    como: null,
    custo_estimado: 0,
    custo_real: 0,
    evidencia_url: null,
    historico: [],
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-01T10:00:00Z",
  };

  const acao3: PgrPlanoAcao = {
    id: "acao-3",
    company_id: "company-123",
    pgr_importacao_id: pgrImportacaoId,
    acao: "Revisão dos extintores de incêndio",
    prioridade: "baixa",
    status: "concluida",
    prazo: null,
    responsavel_id: null,
    cargo_responsavel: null,
    risco_id: null,
    pgr_riscos: null,
    por_que: null,
    onde: null,
    como: null,
    custo_estimado: 0,
    custo_real: 0,
    evidencia_url: null,
    historico: [],
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-01T10:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAcoesData = [acao1, acao2, acao3];
  });

  // 1. Header exibe "Plano de Ação (N)" com N correto
  it("header exibe 'Plano de Ação (3)' com o total de ações", () => {
    renderKanban(pgrImportacaoId);
    expect(screen.getByText("Plano de Ação (3)")).toBeInTheDocument();
  });

  // 2. Botão "+ Nova Ação" abre o dialog em modo criação
  it("botão '+ Nova Ação' abre o dialog em modo criação", () => {
    renderKanban(pgrImportacaoId);

    const novoBtn = screen.getByRole("button", { name: /\+ Nova Ação/i });
    fireEvent.click(novoBtn);

    expect(screen.getByText("Nova ação")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Ex: Instalação de linha de vida e treinamento para trabalho em altura...")
    ).toBeInTheDocument();
  });

  // 3. Lixeira abre AlertDialog com o texto da ação no corpo
  it("lixeira abre AlertDialog com o texto da ação no corpo", () => {
    renderKanban(pgrImportacaoId);

    const deleteButtons = screen.getAllByTitle("Excluir ação");
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText("Excluir ação")).toBeInTheDocument();
    // O texto da ação aparece tanto no card quanto no AlertDialog
    const acaoTextos = screen.getAllByText("Instalar proteção nas máquinas de corte");
    expect(acaoTextos.length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText(/A exclusão é permanente e não pode ser desfeita/i)
    ).toBeInTheDocument();
  });

  // 4. stopPropagation funciona — CRÍTICO: clicar no Trash2 NÃO abre o dialog de edição
  it("stopPropagation: clicar na lixeira NÃO abre o diálogo de edição", () => {
    renderKanban(pgrImportacaoId);

    const deleteButtons = screen.getAllByTitle("Excluir ação");
    fireEvent.click(deleteButtons[0]);

    // O AlertDialog de exclusão deve estar aberto
    expect(screen.getByText("Excluir ação")).toBeInTheDocument();

    // O diálogo de edição NÃO deve estar aberto
    expect(screen.queryByText("Editar ação")).not.toBeInTheDocument();
    expect(screen.queryByText("Detalhes (5W2H)")).not.toBeInTheDocument();
  });

  // 5. Badge do risco aparece quando risco_id preenchido
  it("badge do risco aparece quando risco_id está preenchido e não aparece quando ausente", () => {
    renderKanban(pgrImportacaoId);

    // acao1 possui pgr_riscos.nome = 'Ruído excessivo'
    expect(screen.getByTitle("Esta ação mitiga: Ruído excessivo")).toBeInTheDocument();
    expect(screen.getByText("Ruído excessivo")).toBeInTheDocument();

    // acao2 e acao3 não têm vínculo com risco
    const riskBadges = screen.queryAllByTitle(/^Esta ação mitiga:/i);
    expect(riskBadges.length).toBe(1);
  });

  // 6. Confirmação chama useDeleteAcao com id e pgr_importacao_id
  it("confirmação da exclusão chama useDeleteAcao com { id, pgr_importacao_id }", async () => {
    renderKanban(pgrImportacaoId);

    const deleteButtons = screen.getAllByTitle("Excluir ação");
    fireEvent.click(deleteButtons[0]); // acao-1

    const confirmBtn = screen.getByRole("button", { name: /^Excluir$/i });
    fireEvent.click(confirmBtn);

    expect(mockDeleteMutate).toHaveBeenCalledWith(
      {
        id: "acao-1",
        pgr_importacao_id: pgrImportacaoId,
      },
      expect.any(Object)
    );
  });
});
