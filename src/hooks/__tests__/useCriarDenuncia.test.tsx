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
});
