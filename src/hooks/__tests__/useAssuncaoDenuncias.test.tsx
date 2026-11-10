import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  useAssumirDenuncia,
  useLiberarDenuncia,
  useListarDenunciasVencidas,
} from "../useDenuncias";
import { calcularPrazoDenuncia } from "@/components/denuncias/PrazoBadge";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-123", email: "test@empresa.com" },
    isAuthenticated: true,
    role: "colaborador",
  }),
}));

describe("Modelo Assumir + Tratar e Prazos (Lei 14.457/2022)", () => {
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

  describe("useAssumirDenuncia", () => {
    it("calls assumir_denuncia with p_id", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null });

      const { result } = renderHook(() => useAssumirDenuncia(), { wrapper });

      result.current.mutate("denuncia-abc-1");

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.rpc).toHaveBeenCalledWith("assumir_denuncia", {
        p_id: "denuncia-abc-1",
      });
    });

    it("translates denuncia_ja_assumida error clearly", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: "denuncia_ja_assumida" } as any,
      });

      const { result } = renderHook(() => useAssumirDenuncia(), { wrapper });

      result.current.mutate("denuncia-abc-2");

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toMatch(/já foi assumida por outro responsável/);
    });
  });

  describe("useLiberarDenuncia", () => {
    it("calls liberar_denuncia with p_id", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null });

      const { result } = renderHook(() => useLiberarDenuncia(), { wrapper });

      result.current.mutate("denuncia-xyz-1");

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.rpc).toHaveBeenCalledWith("liberar_denuncia", {
        p_id: "denuncia-xyz-1",
      });
    });

    it("translates apenas_quem_assumiu_pode_liberar error clearly", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: "apenas_quem_assumiu_pode_liberar" } as any,
      });

      const { result } = renderHook(() => useLiberarDenuncia(), { wrapper });

      result.current.mutate("denuncia-xyz-2");

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toMatch(/Apenas o responsável que assumiu pode liberar/);
    });
  });

  describe("useListarDenunciasVencidas", () => {
    it("calls listar_denuncias_vencidas and parses response", async () => {
      vi.mocked(supabase.rpc).mockImplementation(async (fn: string) => {
        if (fn === "sou_responsavel_denuncia") {
          return { data: true, error: null } as any;
        }
        if (fn === "listar_denuncias_vencidas") {
          return {
            data: [
              {
                total_vencidas: 2,
                denuncias_vencidas: [
                  {
                    id: "vencida-1",
                    titulo: "Assédio no setor A",
                    status: "novo",
                    criado_em: "2026-09-01T10:00:00Z",
                    assumido_por: null,
                    dias_vencidos: 34,
                  },
                ],
              },
            ],
            error: null,
          } as any;
        }
        return { data: null, error: null } as any;
      });

      const { result } = renderHook(() => useListarDenunciasVencidas(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.rpc).toHaveBeenCalledWith("listar_denuncias_vencidas");
      expect(result.current.data?.total_vencidas).toBe(2);
      expect(result.current.data?.denuncias_vencidas).toHaveLength(1);
    });
  });

  describe("calcularPrazoDenuncia", () => {
    it("handles concluded complaint correctly", () => {
      const info = calcularPrazoDenuncia({
        status: "concluido",
        prazo_primeira_resposta: "2026-10-01",
        prazo_conclusao: "2026-12-01",
        primeira_resposta_em: "2026-09-15",
        criado_em: "2026-09-01",
      });

      expect(info.tipo).toBe("concluido");
      expect(info.isVencido).toBe(false);
      expect(info.label).toBe("Concluído");
    });

    it("detects expired deadline", () => {
      const info = calcularPrazoDenuncia({
        status: "novo",
        prazo_primeira_resposta: "2026-10-01T00:00:00Z",
        prazo_conclusao: "2026-12-01T00:00:00Z",
        primeira_resposta_em: null,
        criado_em: "2026-09-01T00:00:00Z",
      });

      expect(info.tipo).toBe("primeira_resposta");
      expect(info.isVencido).toBe(true);
      expect(info.label).toMatch(/Vencido há/);
    });

    it("calculates pending response within deadline", () => {
      const futuro = new Date();
      futuro.setDate(futuro.getDate() + 15);

      const info = calcularPrazoDenuncia({
        status: "novo",
        prazo_primeira_resposta: futuro.toISOString(),
        prazo_conclusao: null,
        primeira_resposta_em: null,
        criado_em: new Date().toISOString(),
      });

      expect(info.tipo).toBe("primeira_resposta");
      expect(info.isVencido).toBe(false);
      expect(info.label).toMatch(/Prazo:/);
    });
  });
});
