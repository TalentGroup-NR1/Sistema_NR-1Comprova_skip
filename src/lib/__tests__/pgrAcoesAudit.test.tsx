import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCreateExecucao } from "@/hooks/usePgrAcoes";
import { supabase } from "@/integrations/supabase/client";

// Mock do hook de auth e do context de empresa
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-123", email: "test@test.com" } })
}));
vi.mock("@/hooks/useEffectiveCompanyId", () => ({
  useEffectiveCompanyId: () => "company-123"
}));

// Mock do supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe("Auditoria no custo_real (useCreateExecucao)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it("deve incrementar custo_real e registrar rastro no historico da pgr_plano_acao", async () => {
    // 1. Mock do insert na pgr_acao_execucoes
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "exec-1", acao_id: "acao-1" }, error: null })
      })
    });

    // 2. Mock do select do plano de ação atual
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ 
          data: { 
            custo_real: 100, 
            historico: [{ mudanca: "Log antigo" }] 
          }, 
          error: null 
        })
      })
    });

    // 3. Mock do update do plano de ação
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });

    // Mapeamento do .from()
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "pgr_acao_execucoes") return { insert: insertMock };
      if (table === "pgr_plano_acao") return { select: selectMock, update: updateMock };
      return {};
    });

    const { result } = renderHook(() => useCreateExecucao(), { wrapper });

    await waitFor(() => {
      // Act
      result.current.mutate({
        acao_id: "acao-1",
        data: new Date().toISOString(),
        o_que_foi_feito: "Teste",
        custo: 50,
        como: "Simples",
        quem_executou: null,
        onde: null,
        evidencia_url: null
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        custo_real: 150, // 100 + 50
        historico: expect.arrayContaining([
          expect.objectContaining({ mudanca: "Log antigo" }),
          expect.objectContaining({ 
            mudanca: "Custo real atualizado via execução automática",
            autor_id: "user-123"
          })
        ])
      })
    );
  });
});
