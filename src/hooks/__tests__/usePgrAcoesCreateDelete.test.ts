import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCreateAcao, useDeleteAcao } from "../usePgrAcoes";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-123", email: "analista@teste.com" },
  }),
}));

vi.mock("@/hooks/useEffectiveCompanyId", () => ({
  useEffectiveCompanyId: () => "comp-123",
}));

describe("useCreateAcao e useDeleteAcao", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: { id: "user-123", email: "analista@teste.com" } as any,
      },
      error: null,
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  // 1. useCreateAcao insere com status 'pendente' e historico correto
  it("useCreateAcao insere com status 'pendente' e historico correto", async () => {
    let insertedPayload: any = null;

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "pgr_plano_acao") {
        return {
          insert: vi.fn().mockImplementation((payload: any) => {
            insertedPayload = payload;
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "acao-new-1", ...payload },
                  error: null,
                }),
              }),
            };
          }),
        } as any;
      }
      return {} as any;
    });

    const { result } = renderHook(() => useCreateAcao(), { wrapper });

    await result.current.mutateAsync({
      pgr_importacao_id: "pgr-1",
      company_id: "comp-1",
      acao: "Treinamento ergonômico",
      prioridade: "alta",
      prazo: "30 dias",
    });

    expect(insertedPayload).toBeDefined();
    expect(insertedPayload.acao).toBe("Treinamento ergonômico");
    expect(insertedPayload.status).toBe("pendente");
    expect(insertedPayload.custo_estimado).toBe(0);
    expect(insertedPayload.custo_real).toBe(0);
    expect(insertedPayload.historico).toHaveLength(1);
    expect(insertedPayload.historico[0].acao).toBe("criado");
    expect(insertedPayload.historico[0].por).toBe("analista@teste.com");
  });

  // 2. useCreateAcao aceita risco_id opcional
  it("useCreateAcao aceita risco_id opcional", async () => {
    let insertedPayload: any = null;

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "pgr_plano_acao") {
        return {
          insert: vi.fn().mockImplementation((payload: any) => {
            insertedPayload = payload;
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "acao-new-2", ...payload },
                  error: null,
                }),
              }),
            };
          }),
        } as any;
      }
      return {} as any;
    });

    const { result } = renderHook(() => useCreateAcao(), { wrapper });

    await result.current.mutateAsync({
      pgr_importacao_id: "pgr-1",
      company_id: "comp-1",
      acao: "Adequação de postos de trabalho",
      risco_id: "risco-uuid-999",
    });

    expect(insertedPayload).toBeDefined();
    expect(insertedPayload.risco_id).toBe("risco-uuid-999");
  });

  // 3. useDeleteAcao bloqueia quando há execuções
  it("useDeleteAcao bloqueia quando há execuções vinculadas", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "pgr_acao_execucoes") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: 2,
              error: null,
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const { result } = renderHook(() => useDeleteAcao(), { wrapper });

    await expect(
      result.current.mutateAsync({
        id: "acao-com-exec",
        pgr_importacao_id: "pgr-1",
      })
    ).rejects.toThrow("Esta ação tem 2 execução(ões) registrada(s). Remova as execuções antes de excluir.");
  });

  // 4. useDeleteAcao executa quando não há execuções
  it("useDeleteAcao executa quando não há execuções vinculadas", async () => {
    let deleteCalled = false;

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "pgr_acao_execucoes") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: 0,
              error: null,
            }),
          }),
        } as any;
      }
      if (table === "pgr_plano_acao") {
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => {
              deleteCalled = true;
              return Promise.resolve({ error: null });
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const { result } = renderHook(() => useDeleteAcao(), { wrapper });

    const res = await result.current.mutateAsync({
      id: "acao-sem-exec",
      pgr_importacao_id: "pgr-1",
    });

    expect(res).toEqual({
      success: true,
      id: "acao-sem-exec",
      pgr_importacao_id: "pgr-1",
    });
    expect(deleteCalled).toBe(true);
  });
});

