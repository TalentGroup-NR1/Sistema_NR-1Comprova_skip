import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useConfirmarImportacaoPgr } from "../usePgrImportacao";
import { supabase } from "@/integrations/supabase/client";

// Mocks de autenticação e contexto
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-test-uuid", email: "admin@tg.com" },
    role: "admin_empresa",
  }),
}));

vi.mock("@/hooks/useEffectiveCompanyId", () => ({
  useEffectiveCompanyId: () => "company-test-uuid",
}));

// Spies no supabase
const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
});

const mockPlanoAcaoUpsert = vi.fn().mockResolvedValue({ error: null });
const mockRiscosUpsert = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "pgr_importacoes") {
        return { 
          update: mockUpdate,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { company_id: "company-test-uuid" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "pgr_plano_acao") {
        return { upsert: mockPlanoAcaoUpsert };
      }
      if (table === "pgr_riscos") {
        return { upsert: mockRiscosUpsert };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useConfirmarImportacaoPgr — Persistência Relacional de Riscos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const payloadMock = {
    importacaoId: "imp-123",
    dadosEmpresa: {
      nome: "Empresa Teste",
      cnpj: "00.000.000/0001-00",
      responsavel_tecnico: null,
      cargo_responsavel: null,
      registro_profissional: null,
      data_elaboracao: null,
      validade: null,
    },
    riscos: [
      {
        categoria: "ergonomico",
        nome: "Movimentos repetitivos",
        descricao: "Operação contínua de checkout",
        grupo_exposto: "Operadores de Caixa",
        probabilidade: 3,
        severidade: 3,
        local_exposicao: null,
        medidas_existentes: "Pausas programadas",
      },
      {
        categoria: "fisico",
        nome: "Ruído intermitente",
        descricao: null,
        grupo_exposto: null,
        probabilidade: 2,
        severidade: 4,
        local_exposicao: null,
        medidas_existentes: "Protetor auricular",
      },
    ],
    planoAcao: [
      {
        medida: "Treinamento ergonômico",
        prazo_sugerido: "2026-12-01",
        responsavel_sugerido: null,
        prioridade: "media" as const,
        risco_referenciado: null,
      },
    ],
  };

  it("1. useConfirmarImportacaoPgr persiste os riscos em pgr_riscos com fonte_origem 'ia' e ordem", async () => {
    const { result } = renderHook(() => useConfirmarImportacaoPgr(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(payloadMock);
    });

    // Verifica que inseriu na tabela viva pgr_riscos
    expect(supabase.from).toHaveBeenCalledWith("pgr_riscos");
    expect(mockRiscosUpsert).toHaveBeenCalledTimes(1);

    const [riscosChamados, options] = mockRiscosUpsert.mock.calls[0];
    expect(options).toEqual({
      onConflict: "pgr_importacao_id,ordem",
      ignoreDuplicates: true,
    });

    expect(riscosChamados).toHaveLength(2);
    expect(riscosChamados[0]).toMatchObject({
      pgr_importacao_id: "imp-123",
      company_id: "company-test-uuid",
      ordem: 0,
      categoria: "ergonomico",
      nome: "Movimentos repetitivos",
      probabilidade: 3,
      severidade: 3,
      fonte_origem: "ia",
      criado_por: "user-test-uuid",
    });

    expect(riscosChamados[1]).toMatchObject({
      pgr_importacao_id: "imp-123",
      company_id: "company-test-uuid",
      ordem: 1,
      categoria: "fisico",
      nome: "Ruído intermitente",
      probabilidade: 2,
      severidade: 4,
      fonte_origem: "ia",
      criado_por: "user-test-uuid",
    });
  });

  it("2. Idempotência: chamadas repetidas usam ignoreDuplicates e não duplicam", async () => {
    const { result } = renderHook(() => useConfirmarImportacaoPgr(), {
      wrapper: createWrapper(),
    });

    // Primeira confirmação
    await act(async () => {
      await result.current.mutateAsync(payloadMock);
    });

    // Segunda confirmação
    await act(async () => {
      await result.current.mutateAsync(payloadMock);
    });

    expect(mockRiscosUpsert).toHaveBeenCalledTimes(2);
    // Ambas as chamadas configuram idempotência
    for (const call of mockRiscosUpsert.mock.calls) {
      expect(call[1]).toEqual({
        onConflict: "pgr_importacao_id,ordem",
        ignoreDuplicates: true,
      });
    }
  });
});
