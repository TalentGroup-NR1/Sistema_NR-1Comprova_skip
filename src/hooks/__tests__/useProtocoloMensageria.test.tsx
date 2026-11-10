import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  useCriarDenuncia,
  useConsultarProtocolo,
  useResponderProtocolo,
  useComiteEnviarMensagem,
  useAtualizarStatusDenuncia,
} from "../useDenuncias";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-comite-1", email: "comite@empresa.com" },
    isAuthenticated: true,
    role: "colaborador",
  }),
}));

describe("Protocolo de Rastreio e Mensageria Anônima (Etapa 4B)", () => {
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

  describe("useCriarDenuncia com protocolo e data_fato", () => {
    it("calls criar_denuncia and returns generated protocol string", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: "DEN-2026-K7M2P9QX",
        error: null,
      } as any);

      const { result } = renderHook(() => useCriarDenuncia(), { wrapper });

      result.current.mutate({
        titulo: "Denúncia de assédio",
        mensagem: "Fatos ocorridos no departamento fiscal",
        anonimo: true,
        tipo: "denuncia",
        categoria: "assedio_sexual",
        origem: "lideranca_interna",
        data_fato: "2026-10-15",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.rpc).toHaveBeenCalledWith("criar_denuncia", {
        p_titulo: "Denúncia de assédio",
        p_mensagem: "Fatos ocorridos no departamento fiscal",
        p_anonimo: true,
        p_tipo: "denuncia",
        p_categoria: "assedio_sexual",
        p_origem: "lideranca_interna",
        p_data_fato: "2026-10-15",
      });

      expect(result.current.data).toBe("DEN-2026-K7M2P9QX");
    });
  });

  describe("useConsultarProtocolo", () => {
    it("returns formatted external complaint data on valid protocol", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: {
          protocolo: "DEN-2026-K7M2P9QX",
          status_externo: "Em apuração",
          criado_em: "2026-10-15T12:00:00Z",
          data_fato: "2026-10-14",
          mensagens: [
            {
              id: "msg-1",
              autor: "comite",
              mensagem: "Solicitamos mais detalhes.",
              created_at: "2026-10-16T10:00:00Z",
            },
          ],
          resumo_publico: null,
          permite_resposta: true,
        },
        error: null,
      } as any);

      const { result } = renderHook(() => useConsultarProtocolo(), { wrapper });

      result.current.mutate({
        protocolo: "DEN-2026-K7M2P9QX",
        dataFato: "2026-10-14",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.rpc).toHaveBeenCalledWith("consultar_denuncia_por_protocolo", {
        p_protocolo: "DEN-2026-K7M2P9QX",
        p_data_fato: "2026-10-14",
      });

      expect(result.current.data?.status_externo).toBe("Em apuração");
      expect(result.current.data?.mensagens).toHaveLength(1);
    });

    it("throws generic error when protocol is invalid or not found", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { erro: "protocolo_invalido" },
        error: null,
      } as any);

      const { result } = renderHook(() => useConsultarProtocolo(), { wrapper });

      result.current.mutate({
        protocolo: "DEN-2026-INVALIDO",
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toMatch(/Protocolo inválido ou não encontrado/);
    });

    it("handles rate limit error clearly", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: "rate_limit_exceeded" } as any,
      });

      const { result } = renderHook(() => useConsultarProtocolo(), { wrapper });

      result.current.mutate({
        protocolo: "DEN-2026-K7M2P9QX",
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toMatch(/Muitas tentativas/);
    });
  });

  describe("useResponderProtocolo", () => {
    it("calls responder_denuncia_por_protocolo with anonymous payload", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { ok: true },
        error: null,
      } as any);

      const { result } = renderHook(() => useResponderProtocolo(), { wrapper });

      result.current.mutate({
        protocolo: "DEN-2026-K7M2P9QX",
        dataFato: "2026-10-14",
        mensagem: "Os fatos ocorreram na sala de reuniões às 14h.",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.rpc).toHaveBeenCalledWith("responder_denuncia_por_protocolo", {
        p_protocolo: "DEN-2026-K7M2P9QX",
        p_data_fato: "2026-10-14",
        p_mensagem: "Os fatos ocorreram na sala de reuniões às 14h.",
      });
    });
  });

  describe("useComiteEnviarMensagem", () => {
    it("calls comite_enviar_mensagem and invalidates queries", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: null,
      } as any);

      const { result } = renderHook(() => useComiteEnviarMensagem(), { wrapper });

      result.current.mutate({
        denunciaId: "denuncia-uuid-1",
        mensagem: "Mensagem oficial do comitê.",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.rpc).toHaveBeenCalledWith("comite_enviar_mensagem", {
        p_denuncia_id: "denuncia-uuid-1",
        p_mensagem: "Mensagem oficial do comitê.",
      });
    });

    it("translates assuma_a_denuncia_primeiro error clearly", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: "assuma_a_denuncia_primeiro" } as any,
      });

      const { result } = renderHook(() => useComiteEnviarMensagem(), { wrapper });

      result.current.mutate({
        denunciaId: "denuncia-uuid-2",
        mensagem: "Tentativa sem assumir",
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toMatch(/Você precisa assumir a denúncia/);
    });
  });

  describe("useAtualizarStatusDenuncia com resumo_publico", () => {
    it("passes p_resumo_publico to atualizar_status_denuncia", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null });

      const { result } = renderHook(() => useAtualizarStatusDenuncia(), { wrapper });

      result.current.mutate({
        id: "denuncia-uuid-1",
        status: "concluido",
        parecer: "Parecer circunstanciado com mais de 30 caracteres para conclusão legal.",
        resumo_publico: "Agradecemos o relato. Medidas administrativas foram adotadas.",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.rpc).toHaveBeenCalledWith("atualizar_status_denuncia", {
        p_id: "denuncia-uuid-1",
        p_novo_status: "concluido",
        p_parecer: "Parecer circunstanciado com mais de 30 caracteres para conclusão legal.",
        p_resumo_publico: "Agradecemos o relato. Medidas administrativas foram adotadas.",
      });
    });
  });
});

