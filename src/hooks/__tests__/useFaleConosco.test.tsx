import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  useCriarFaleConosco,
  useFaleConoscoAdmin,
  useResponderFaleConosco,
  useMinhasMensagensFaleConosco,
} from "../useFaleConosco";
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
    role: "admin_empresa",
  }),
}));

describe("Módulo Fale Conosco — Sugestões e Dúvidas (Etapa 5)", () => {
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

  describe("useCriarFaleConosco", () => {
    it("calls criar_fale_conosco with non-anonymous payload", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: "fc-uuid-1",
        error: null,
      } as any);

      const { result } = renderHook(() => useCriarFaleConosco(), { wrapper });

      result.current.mutate({
        tipo: "sugestao",
        titulo: "Bicicletário na entrada",
        mensagem: "Sugiro instalação de bicicletário para incentivar transporte sustentável.",
        anonimo: false,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.rpc).toHaveBeenCalledWith("criar_fale_conosco", {
        p_tipo: "sugestao",
        p_titulo: "Bicicletário na entrada",
        p_mensagem: "Sugiro instalação de bicicletário para incentivar transporte sustentável.",
        p_anonimo: false,
      });

      expect(result.current.data).toBe("fc-uuid-1");
    });

    it("calls criar_fale_conosco with anonymous payload", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: "fc-uuid-2",
        error: null,
      } as any);

      const { result } = renderHook(() => useCriarFaleConosco(), { wrapper });

      result.current.mutate({
        tipo: "duvida",
        titulo: "Prazo de envio de atestado",
        mensagem: "Qual é o prazo limite para entrega do atestado médico de 1 dia?",
        anonimo: true,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.rpc).toHaveBeenCalledWith("criar_fale_conosco", {
        p_tipo: "duvida",
        p_titulo: "Prazo de envio de atestado",
        p_mensagem: "Qual é o prazo limite para entrega do atestado médico de 1 dia?",
        p_anonimo: true,
      });
    });

    it("translates rate_limit_exceeded error clearly", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: "rate_limit_exceeded" } as any,
      });

      const { result } = renderHook(() => useCriarFaleConosco(), { wrapper });

      result.current.mutate({
        tipo: "sugestao",
        titulo: "Muitos envios",
        mensagem: "Testando bloqueio por excesso de requisições rápidas.",
        anonimo: false,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toMatch(/Muitos envios em pouco tempo/);
    });
  });

  describe("useFaleConoscoAdmin", () => {
    it("fetches list of fale_conosco messages for the company", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [
          {
            id: "fc-1",
            tipo: "sugestao",
            titulo: "Cafeteria",
            mensagem: "Melhorias no espaço de café.",
            anonimo: false,
            autor_nome: "Maria Silva",
            status: "recebido",
            resposta: null,
            respondido_em: null,
            created_at: "2026-11-04T12:00:00Z",
          },
        ],
        error: null,
      } as any);

      const { result } = renderHook(() => useFaleConoscoAdmin(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.rpc).toHaveBeenCalledWith("listar_fale_conosco", {
        p_status: null,
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].autor_nome).toBe("Maria Silva");
    });
  });

  describe("useResponderFaleConosco", () => {
    it("calls responder_fale_conosco and invalidates queries", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null });

      const { result } = renderHook(() => useResponderFaleConosco(), { wrapper });

      result.current.mutate({
        id: "fc-1",
        resposta: "Obrigado pela sugestão! O novo espaço será inaugurado em breve.",
        status: "respondido",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.rpc).toHaveBeenCalledWith("responder_fale_conosco", {
        p_id: "fc-1",
        p_resposta: "Obrigado pela sugestão! O novo espaço será inaugurado em breve.",
        p_novo_status: "respondido",
      });
    });
  });

  describe("useMinhasMensagensFaleConosco", () => {
    it("fetches non-anonymous messages of authenticated user", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [
          {
            id: "minha-1",
            tipo: "sugestao",
            titulo: "Bicicletário",
            mensagem: "Minha sugestão.",
            status: "respondido",
            resposta: "Aprovado!",
            respondido_em: "2026-11-04T13:00:00Z",
            created_at: "2026-11-04T10:00:00Z",
          },
        ],
        error: null,
      } as any);

      const { result } = renderHook(() => useMinhasMensagensFaleConosco(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.rpc).toHaveBeenCalledWith("minhas_mensagens_fale_conosco");
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].resposta).toBe("Aprovado!");
    });
  });
});

