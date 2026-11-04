import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DenunciaDetailDialog } from "../DenunciaDetailDialog";
import { DenunciaAdmin } from "@/hooks/useDenuncias";
import React from "react";

// Mock useAuth
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

// Mock useDenuncias hooks
vi.mock("@/hooks/useDenuncias", () => ({
  useAtualizarStatusDenuncia: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useAssumirDenuncia: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useLiberarDenuncia: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useHistoricoDenuncia: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useComiteMensagens: vi.fn(() => ({
    data: [
      {
        id: "msg-1",
        autor: "comite",
        autor_nome: "Maria Comitê",
        mensagem: "Olá, recebemos sua denúncia e daremos seguimento.",
        created_at: "2026-11-04T10:00:00Z",
      },
      {
        id: "msg-2",
        autor: "denunciante",
        mensagem: "Obrigado, gostaria de saber se precisam de mais detalhes.",
        created_at: "2026-11-04T11:00:00Z",
      },
    ],
    isLoading: false,
  })),
  useComiteEnviarMensagem: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

import { useAuth } from "@/hooks/useAuth";

const mockDenuncia: DenunciaAdmin = {
  id: "den-123",
  company_id: "comp-1",
  tipo: "assedio_moral",
  titulo: "Denúncia de Teste de Layout",
  mensagem: "Texto detalhado do relato de teste.",
  anonimo: true,
  autor_nome: null,
  autor_email: null,
  autor_user_id: null,
  status: "em_analise",
  prioridade: "alta",
  criado_em: "2026-11-01T12:00:00Z",
  data_fato: "2026-10-30",
  protocolo: "DEN-2026-TESTE123",
  assumido_por: null,
  assumido_por_nome: null,
  assumido_em: null,
  prazo_primeira_resposta: "2026-12-01T12:00:00Z",
  primeira_resposta_em: null,
  prazo_conclusao: "2027-01-30T12:00:00Z",
  parecer_atual: null,
  resumo_publico: null,
  ultima_mensagem_denunciante_em: "2026-11-04T11:00:00Z",
};

describe("DenunciaDetailDialog — Ordem das seções e Comunicação com Denunciante", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza o protocolo em destaque no cabeçalho com texto auxiliar", () => {
    (useAuth as any).mockReturnValue({
      user: { id: "user-123" },
    });

    render(
      <DenunciaDetailDialog
        denuncia={mockDenuncia}
        onOpenChange={() => {}}
      />
    );

    expect(screen.getByText("DEN-2026-TESTE123")).toBeDefined();
    expect(
      screen.getByText(/O denunciante usa este código para acompanhar o relato em/i)
    ).toBeDefined();
    expect(screen.getByText("/acompanhar")).toBeDefined();
  });

  it("exibe a seção Comunicação Anônima com o Denunciante com mensagens carregadas", () => {
    (useAuth as any).mockReturnValue({
      user: { id: "user-123" },
    });

    render(
      <DenunciaDetailDialog
        denuncia={mockDenuncia}
        onOpenChange={() => {}}
      />
    );

    expect(
      screen.getByText("Comunicação Anônima com o Denunciante")
    ).toBeDefined();
    expect(
      screen.getByText("Olá, recebemos sua denúncia e daremos seguimento.")
    ).toBeDefined();
    expect(
      screen.getByText("Obrigado, gostaria de saber se precisam de mais detalhes.")
    ).toBeDefined();
    expect(screen.getByText("Denunciante (Anônimo)")).toBeDefined();
    expect(screen.getByText("Maria Comitê")).toBeDefined();
  });

  it("desabilita envio se a denúncia não estiver assumida pelo usuário logado", () => {
    (useAuth as any).mockReturnValue({
      user: { id: "outro-usuario" },
    });

    render(
      <DenunciaDetailDialog
        denuncia={{ ...mockDenuncia, assumido_por: null }}
        onOpenChange={() => {}}
      />
    );

    expect(
      screen.getByText("Assuma a denúncia para se comunicar com o denunciante.")
    ).toBeDefined();
    const btnEnviar = screen.getByRole("button", { name: /Enviar ao denunciante/i });
    expect(btnEnviar.getAttribute("disabled")).toBeDefined();
  });

  it("habilita envio de mensagens quando a denúncia é assumida pelo usuário logado", () => {
    (useAuth as any).mockReturnValue({
      user: { id: "usuario-titular" },
    });

    render(
      <DenunciaDetailDialog
        denuncia={{
          ...mockDenuncia,
          assumido_por: "usuario-titular",
          assumido_por_nome: "Titular Teste",
          assumido_em: "2026-11-04T12:00:00Z",
        }}
        onOpenChange={() => {}}
      />
    );

    expect(
      screen.getByText("Você é o titular responsável por esta apuração")
    ).toBeDefined();

    // Form de envio deve estar ativo com botão habilitado ao digitar texto
    const textarea = screen.getByPlaceholderText(
      "Escreva uma mensagem ou pedido de esclarecimento ao denunciante..."
    ) as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(false);

    fireEvent.change(textarea, { target: { value: "Mensagem de esclarecimento" } });
    expect(screen.getByText(/26 \/ 2000 caracteres/)).toBeDefined();

    const btnEnviar = screen.getByRole("button", { name: /Enviar ao denunciante/i });
    expect(btnEnviar.getAttribute("disabled")).toBeNull();
  });
});
