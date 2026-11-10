import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useDenunciasAdmin } from "../useDenuncias";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

let mockUser: { id: string } | null = { id: "user-admin-empresa" };
let mockRole: string = "admin_empresa";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser, role: mockRole, isAuthenticated: !!mockUser }),
}));

describe("useIsolamentoDenuncias - Multi-tenant e Permissões", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("admin_empresa receives scoped complaints of its own company", async () => {
    mockUser = { id: "admin-empresa-1" };
    mockRole = "admin_empresa";

    const mockData = [
      {
        id: "denuncia-1",
        titulo: "Relato Empresa A",
        mensagem: "Texto",
        status: "novo",
        criado_em: "2026-11-04T10:00:00Z",
        anonimo: true,
        user_id: null,
        autor_nome: null,
        tipo: "denuncia",
        categoria_comportamento: "assedio_sexual",
        origem_ofensa: "colegas_pares",
        ciencia_cipa_em: null,
        ciencia_cipa_por: null,
      },
    ];

    vi.mocked(supabase.rpc).mockResolvedValue({ data: mockData, error: null });

    const { result } = renderHook(() => useDenunciasAdmin(true), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
    expect(supabase.rpc).toHaveBeenCalledWith("listar_denuncias_admin");
  });

  it("admin_master receives complaints from all companies", async () => {
    mockUser = { id: "admin-master-super" };
    mockRole = "admin_master";

    const mockDataAll = [
      { id: "denuncia-1", titulo: "Empresa A", status: "novo", tipo: "denuncia" },
      { id: "denuncia-2", titulo: "Empresa B", status: "em_analise", tipo: "sugestao" },
    ];

    vi.mocked(supabase.rpc).mockResolvedValue({ data: mockDataAll, error: null });

    const { result } = renderHook(() => useDenunciasAdmin(true), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.length).toBe(2);
  });

  it("colaborador receives forbidden error from backend RPC", async () => {
    mockUser = { id: "colaborador-comum" };
    mockRole = "colaborador";

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: "forbidden" } as any,
    });

    const { result } = renderHook(() => useDenunciasAdmin(true), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    expect(result.current.error?.message).toMatch(/forbidden/);
  });
});
