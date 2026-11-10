import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAtualizarStatusDenuncia } from "../useDenuncias";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe("useAtualizarStatusDenuncia - Trilha de Auditoria & Parecer", () => {
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

  it("calls atualizar_status_denuncia with id, status, optional parecer and resumo_publico", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHook(() => useAtualizarStatusDenuncia(), { wrapper });

    result.current.mutate({
      id: "denuncia-uuid-1",
      status: "em_analise",
      parecer: "Início de apuração pelo comitê CIPA+A",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.rpc).toHaveBeenCalledWith("atualizar_status_denuncia", {
      p_id: "denuncia-uuid-1",
      p_novo_status: "em_analise",
      p_parecer: "Início de apuração pelo comitê CIPA+A",
      p_resumo_publico: null,
    });
  });

  it("passes null as parecer when not provided", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHook(() => useAtualizarStatusDenuncia(), { wrapper });

    result.current.mutate({
      id: "denuncia-uuid-2",
      status: "concluido",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.rpc).toHaveBeenCalledWith("atualizar_status_denuncia", {
      p_id: "denuncia-uuid-2",
      p_novo_status: "concluido",
      p_parecer: null,
      p_resumo_publico: null,
    });
  });

  it("translates assuma_a_denuncia_primeiro error clearly", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { message: "assuma_a_denuncia_primeiro" } as any,
    });

    const { result } = renderHook(() => useAtualizarStatusDenuncia(), { wrapper });

    result.current.mutate({
      id: "denuncia-uuid-3",
      status: "em_analise",
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toMatch(/Você precisa assumir a denúncia antes de tratá-la/);
  });

  it("translates parecer_obrigatorio_para_conclusao error clearly", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { message: "parecer_obrigatorio_para_conclusao" } as any,
    });

    const { result } = renderHook(() => useAtualizarStatusDenuncia(), { wrapper });

    result.current.mutate({
      id: "denuncia-uuid-4",
      status: "concluido",
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toMatch(/mínimo de 30 caracteres/);
  });

  it("propagates forbidden error when user lacks permission", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { message: "forbidden" } as any,
    });

    const { result } = renderHook(() => useAtualizarStatusDenuncia(), { wrapper });

    result.current.mutate({
      id: "denuncia-uuid-5",
      status: "concluido",
      parecer: "Sem permissão",
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toMatch(/forbidden/);
  });
});
