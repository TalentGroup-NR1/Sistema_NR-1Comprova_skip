import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCriarDenuncia } from "../useDenuncias";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" }, role: "colaborador" }),
}));

describe("useCriarDenuncia - Rate Limit", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("accepts complaint within limits", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: "fake-uuid", error: null });

    const { result } = renderHook(() => useCriarDenuncia(), { wrapper });

    result.current.mutate({
      titulo: "Test",
      mensagem: "Msg",
      anonimo: true,
      tipo: "denuncia",
      categoria: "assedio_sexual",
      origem: "colegas_pares",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe("fake-uuid");
  });

  it("rejects when rate limit is exceeded", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { message: "rate_limit_exceeded: limit reached" } as any,
    });

    const { result } = renderHook(() => useCriarDenuncia(), { wrapper });

    result.current.mutate({
      titulo: "Test Spam",
      mensagem: "Msg",
      anonimo: true,
      tipo: "denuncia",
      categoria: "assedio_sexual",
      origem: "colegas_pares",
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toMatch(/Muitos envios em pouco tempo/);
  });

  it("propagates rate_limit_exceeded on 4th consecutive attempt", async () => {
    // Simula 3 sucessos e 1 falha de rate limit
    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: "uuid-1", error: null })
      .mockResolvedValueOnce({ data: "uuid-2", error: null })
      .mockResolvedValueOnce({ data: "uuid-3", error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "ERROR: rate_limit_exceeded: max=3;window=60" } as any,
      });

    const { result } = renderHook(() => useCriarDenuncia(), { wrapper });

    // 1ª chamada
    result.current.mutate({ titulo: "1", mensagem: "m1", anonimo: true, tipo: "denuncia", categoria: "assedio_sexual", origem: "colegas_pares" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 2ª chamada
    result.current.mutate({ titulo: "2", mensagem: "m2", anonimo: true, tipo: "denuncia", categoria: "assedio_sexual", origem: "colegas_pares" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 3ª chamada
    result.current.mutate({ titulo: "3", mensagem: "m3", anonimo: true, tipo: "denuncia", categoria: "assedio_sexual", origem: "colegas_pares" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 4ª chamada (bloqueada)
    result.current.mutate({ titulo: "4", mensagem: "m4", anonimo: true, tipo: "denuncia", categoria: "assedio_sexual", origem: "colegas_pares" });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toMatch(/Muitos envios em pouco tempo/);
  });
});
