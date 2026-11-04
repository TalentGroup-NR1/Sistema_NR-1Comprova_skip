import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useHistoricoDenuncia, useRegistrarCienciaCipa } from "../useDenuncias";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe("useTrilhaAuditoriaDenuncias - Histórico e Ciência CAT/SINAN", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("useHistoricoDenuncia fetches audit trail items for given complaint id", async () => {
    const mockHistorico = [
      {
        id: "hist-1",
        status_anterior: "em_analise",
        status_novo: "concluido",
        justificativa: "Apuração concluída com medidas preventivas",
        alterado_por: "admin-1",
        alterado_por_nome: "Maria Gestora",
        created_at: "2026-11-04T11:00:00Z",
      },
      {
        id: "hist-2",
        status_anterior: null,
        status_novo: "ciencia_cipa",
        justificativa: "Ciencia legal CAT/SINAN registrada",
        alterado_por: "admin-1",
        alterado_por_nome: "Maria Gestora",
        created_at: "2026-11-04T10:30:00Z",
      },
    ];

    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockHistorico, error: null });

    const { result } = renderHook(() => useHistoricoDenuncia("denuncia-123"), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockHistorico);
    expect(supabase.rpc).toHaveBeenCalledWith("listar_historico_denuncia", {
      p_denuncia_id: "denuncia-123",
    });
  });

  it("useRegistrarCienciaCipa calls registrar_ciencia_cipa RPC", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHook(() => useRegistrarCienciaCipa(), { wrapper });

    result.current.mutate("denuncia-456");

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.rpc).toHaveBeenCalledWith("registrar_ciencia_cipa", {
      p_denuncia_id: "denuncia-456",
    });
  });
});
