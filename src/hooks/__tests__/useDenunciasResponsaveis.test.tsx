import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  useResponsaveisDenuncias,
  useDesignarResponsavelDenuncia,
  useRemoverResponsavelDenuncia,
  useContagemDenunciasSemResponsavel,
} from "../useDenuncias";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "admin-empresa-1", email: "admin@empresa.com" },
    role: "admin_empresa",
    isAuthenticated: true,
  })),
}));

describe("useDenunciasResponsaveis - Gestão de Designados (Lei 14.457/2022)", () => {
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

  it("useResponsaveisDenuncias lista os responsáveis designados", async () => {
    const mockResponsaveis = [
      {
        user_id: "user-1",
        nome: "Maria da Silva",
        email: "maria@empresa.com",
        ativo: true,
        created_at: "2026-11-04T10:00:00Z",
        designado_por_nome: "Admin Gestor",
      },
    ];

    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockResponsaveis, error: null });

    const { result } = renderHook(() => useResponsaveisDenuncias(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResponsaveis);
    expect(supabase.rpc).toHaveBeenCalledWith("listar_responsaveis_denuncias");
  });

  it("useDesignarResponsavelDenuncia chama RPC designar_responsavel_denuncia com p_user_id", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHook(() => useDesignarResponsavelDenuncia(), { wrapper });

    await result.current.mutateAsync("user-2");

    expect(supabase.rpc).toHaveBeenCalledWith("designar_responsavel_denuncia", {
      p_user_id: "user-2",
    });
  });

  it("useDesignarResponsavelDenuncia lança erro quando limite de 3 membros for excedido", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { message: "limite_designados_atingido" } as any,
    });

    const { result } = renderHook(() => useDesignarResponsavelDenuncia(), { wrapper });

    await expect(result.current.mutateAsync("user-4")).rejects.toThrow(
      "Limite de 3 responsáveis ativos por empresa atingido."
    );
  });

  it("useRemoverResponsavelDenuncia chama RPC remover_responsavel_denuncia com transferência", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHook(() => useRemoverResponsavelDenuncia(), { wrapper });

    await result.current.mutateAsync({
      userId: "user-1",
      transferirPara: "user-2",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("remover_responsavel_denuncia", {
      p_user_id: "user-1",
      p_transferir_para: "user-2",
    });
  });

  it("useRemoverResponsavelDenuncia lança erro quando não houver outro designado para receber denúncias abertas", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { message: "nenhum_designado_restante" } as any,
    });

    const { result } = renderHook(() => useRemoverResponsavelDenuncia(), { wrapper });

    await expect(
      result.current.mutateAsync({ userId: "user-1" })
    ).rejects.toThrow(
      "Não há outro responsável ativo para receber as denúncias abertas. Designe outro membro antes de remover."
    );
  });

  it("useContagemDenunciasSemResponsavel retorna contagem sem vazar dados das denúncias", async () => {
    const mockContagem = {
      total_sem_responsavel: 2,
      total_em_aberto: 5,
      tem_designados: true,
    };

    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockContagem, error: null });

    const { result } = renderHook(() => useContagemDenunciasSemResponsavel(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockContagem);
    expect(supabase.rpc).toHaveBeenCalledWith("contagem_denuncias_sem_responsavel");
  });
});

