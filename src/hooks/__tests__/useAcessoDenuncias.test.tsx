import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  useIsResponsavelDenuncia,
  useDenunciasAdmin,
  useDenunciasMonitor,
} from "../useDenuncias";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

const mockAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockAuth(),
}));

describe("useAcessoDenuncias - Restrição Estrita de Acesso", () => {
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

  it("useIsResponsavelDenuncia retorna true quando sou_responsavel_denuncia retorna true", async () => {
    mockAuth.mockReturnValue({
      user: { id: "user-123" },
      isAuthenticated: true,
      role: "colaborador",
    });

    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: true, error: null });

    const { result } = renderHook(() => useIsResponsavelDenuncia(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith("sou_responsavel_denuncia");
  });

  it("useIsResponsavelDenuncia retorna false se RPC retornar erro", async () => {
    mockAuth.mockReturnValue({
      user: { id: "user-123" },
      isAuthenticated: true,
      role: "colaborador",
    });

    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { message: "error" } as any,
    });

    const { result } = renderHook(() => useIsResponsavelDenuncia(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(false);
  });

  it("useDenunciasAdmin não dispara RPC quando enabled = false", async () => {
    mockAuth.mockReturnValue({
      user: { id: "admin-empresa-1" },
      isAuthenticated: true,
      role: "admin_empresa",
    });

    const { result } = renderHook(() => useDenunciasAdmin(false), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(supabase.rpc).not.toHaveBeenCalledWith("listar_denuncias_admin");
  });

  it("useDenunciasMonitor não ativa chamadas se usuário não for responsável", async () => {
    mockAuth.mockReturnValue({
      user: { id: "admin-master-1" },
      isAuthenticated: true,
      role: "admin_master",
    });

    // sou_responsavel_denuncia retorna false
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: false, error: null });

    const { result } = renderHook(() => useDenunciasMonitor(), { wrapper });

    await waitFor(() => {
      expect(result.current.enabled).toBe(false);
    });

    // listar_denuncias_admin não pode ter sido chamado
    expect(supabase.rpc).not.toHaveBeenCalledWith("listar_denuncias_admin");
  });
});

