import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  usePgrRiscos,
  useCreateRisco,
  useUpdateRisco,
  useDeleteRisco,
} from "../usePgrRiscos";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe("usePgrRiscos hooks", () => {
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

  // 1. usePgrRiscos retorna lista ordenada
  it("usePgrRiscos retorna lista ordenada", async () => {
    const mockRiscos = [
      { id: "r-1", ordem: 0, nome: "Risco Ruído", categoria: "fisico" },
      { id: "r-2", ordem: 1, nome: "Risco Poeira", categoria: "quimico" },
    ];

    const orderMock = vi.fn().mockResolvedValue({ data: mockRiscos, error: null });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
    } as any);

    const { result } = renderHook(() => usePgrRiscos("pgr-abc"), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(selectMock).toHaveBeenCalledWith(
      "id, ordem, categoria, nome, probabilidade, severidade, nivel_risco, descricao, medidas_existentes, grupo_exposto, fonte_origem, created_at, updated_at"
    );
    expect(eqMock).toHaveBeenCalledWith("pgr_importacao_id", "pgr-abc");
    expect(orderMock).toHaveBeenCalledWith("ordem", { ascending: true });
    expect(result.current.riscos).toEqual(mockRiscos);
  });

  // 2. useCreateRisco envia ordem = max+1
  it("useCreateRisco envia ordem = max+1", async () => {
    let insertedPayload: any = null;

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "pgr_riscos") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ ordem: 5 }],
                  error: null,
                }),
              }),
            }),
          }),
          insert: vi.fn().mockImplementation((payload: any) => {
            insertedPayload = payload;
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "new-r", ...payload },
                  error: null,
                }),
              }),
            };
          }),
        } as any;
      }
      return {} as any;
    });

    const { result } = renderHook(() => useCreateRisco(), { wrapper });

    await result.current.mutateAsync({
      pgr_importacao_id: "pgr-1",
      company_id: "comp-1",
      categoria: "ergonomico",
      nome: "Postura Inadequada",
      probabilidade: 3,
      severidade: 2,
    });

    expect(insertedPayload).toBeDefined();
    expect(insertedPayload.ordem).toBe(6); // max (5) + 1
    expect(insertedPayload.fonte_origem).toBe("manual");
  });

  // 3. useCreateRisco inclui historico com acao 'criado'
  it("useCreateRisco inclui historico com acao 'criado'", async () => {
    let insertedPayload: any = null;

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "pgr_riscos") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [], // Nenhum registro ainda -> ordem 0
                  error: null,
                }),
              }),
            }),
          }),
          insert: vi.fn().mockImplementation((payload: any) => {
            insertedPayload = payload;
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "new-r-0", ...payload },
                  error: null,
                }),
              }),
            };
          }),
        } as any;
      }
      return {} as any;
    });

    const { result } = renderHook(() => useCreateRisco(), { wrapper });

    await result.current.mutateAsync({
      pgr_importacao_id: "pgr-1",
      company_id: "comp-1",
      categoria: "acidente",
      nome: "Queda em mesmo nível",
      probabilidade: 2,
      severidade: 4,
    });

    expect(insertedPayload.ordem).toBe(0);
    expect(insertedPayload.historico).toHaveLength(1);
    expect(insertedPayload.historico[0].acao).toBe("criado");
    expect(insertedPayload.historico[0].por).toBe("analista@teste.com");
    expect(insertedPayload.historico[0].em).toBeDefined();
    expect(insertedPayload.criado_por).toBe("user-123");
  });

  // 4. useUpdateRisco anexa historico com acao 'editado'
  it("useUpdateRisco anexa historico com acao 'editado'", async () => {
    let updatePayload: any = null;
    const historicoAnterior = [
      { acao: "criado", por: "outro@teste.com", em: "2026-11-01T10:00:00Z" },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "pgr_riscos") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { historico: historicoAnterior },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockImplementation((payload: any) => {
            updatePayload = payload;
            return {
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: "r-1", ...payload },
                    error: null,
                  }),
                }),
              }),
            };
          }),
        } as any;
      }
      return {} as any;
    });

    const { result } = renderHook(() => useUpdateRisco(), { wrapper });

    await result.current.mutateAsync({
      id: "r-1",
      pgr_importacao_id: "pgr-1",
      patch: {
        nome: "Nome Alterado",
        severidade: 5,
        // Garante que campos protegidos não são aceitos ou são sanitizados
        company_id: "hack-comp",
        pgr_importacao_id: "hack-pgr",
      } as any,
    });

    expect(updatePayload).toBeDefined();
    expect(updatePayload.nome).toBe("Nome Alterado");
    expect(updatePayload.severidade).toBe(5);
    expect(updatePayload.company_id).toBeUndefined();
    expect(updatePayload.pgr_importacao_id).toBeUndefined();

    // Histórico deve ter 2 itens agora (o anterior + novo)
    expect(updatePayload.historico).toHaveLength(2);
    expect(updatePayload.historico[0]).toEqual(historicoAnterior[0]);
    expect(updatePayload.historico[1].acao).toBe("editado");
    expect(updatePayload.historico[1].por).toBe("analista@teste.com");
    expect(updatePayload.historico[1].campos).toContain("nome");
    expect(updatePayload.historico[1].campos).toContain("severidade");
  });

  // 5. useDeleteRisco bloqueia quando há ações vinculadas
  it("useDeleteRisco bloqueia quando há ações vinculadas", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "pgr_plano_acao") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: 3,
              error: null,
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const { result } = renderHook(() => useDeleteRisco(), { wrapper });

    await expect(
      result.current.mutateAsync({
        id: "r-vinculado",
        pgr_importacao_id: "pgr-1",
      })
    ).rejects.toThrow("Este risco está vinculado a 3 ação(ões). Remova o vínculo antes de excluir.");
  });

  // 6. useDeleteRisco executa quando não há vínculo
  it("useDeleteRisco executa quando não há vínculo", async () => {
    let deleteCalled = false;

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "pgr_plano_acao") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: 0,
              error: null,
            }),
          }),
        } as any;
      }
      if (table === "pgr_riscos") {
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

    const { result } = renderHook(() => useDeleteRisco(), { wrapper });

    const res = await result.current.mutateAsync({
      id: "r-livre",
      pgr_importacao_id: "pgr-1",
    });

    expect(res).toEqual({ success: true });
    expect(deleteCalled).toBe(true);
  });
});
