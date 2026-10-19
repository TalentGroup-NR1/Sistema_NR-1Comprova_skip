import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import FeedbackForm from "../FeedbackForm";
import * as validarModulo from "@/lib/validarModuloToken";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock("@/lib/validarModuloToken", () => ({
  verificarModuloTokenAtivo: vi.fn(),
  isErroModuloDesativado: vi.fn(),
}));

describe("FeedbackForm - Pós-Submit e Prevenção de Tela Branca", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (validarModulo.verificarModuloTokenAtivo as any).mockResolvedValue(true);
    (validarModulo.isErroModuloDesativado as any).mockReturnValue(false);
  });

  it("renderiza o cartão 'Feedback Enviado!' com CheckCircle2 após envio sem crash de tela branca", async () => {
    // Mock do get_feedback_cycle_by_token
    (supabase.rpc as any).mockImplementation((rpcName: string) => {
      if (rpcName === "get_feedback_cycle_by_token") {
        return Promise.resolve({
          data: [
            {
              cycle_id: "cycle-123",
              colaborador_name: "Colaborador Teste",
              milestone_type: "30_DIAS",
              respondent_type: "COLABORADOR",
              template_id: "tpl-123",
              already_submitted: false,
              questions: [
                {
                  id: "q-1",
                  question_text: "Como foi sua integração?",
                  question_type: "TEXTO_LIVRE",
                  scale_min: 1,
                  scale_max: 5,
                  respondent_type: "COLABORADOR",
                  order_index: 1,
                },
              ],
              questionnaire_configured: true,
            },
          ],
          error: null,
        });
      }
      if (rpcName === "submit_feedback_responses") {
        return Promise.resolve({ error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    render(
      <MemoryRouter initialEntries={["/feedback/valid-test-token"]}>
        <Routes>
          <Route path="/feedback/:token" element={<FeedbackForm />} />
        </Routes>
      </MemoryRouter>
    );

    // Aguarda o formulário carregar
    await waitFor(() => {
      expect(screen.getByText(/Como foi sua integração\?/i)).toBeInTheDocument();
    });

    // Digita resposta
    const textarea = screen.getByPlaceholderText("Digite sua resposta...");
    fireEvent.change(textarea, { target: { value: "Integração foi excelente!" } });

    // Clica em Enviar Feedback
    const submitBtn = screen.getByRole("button", { name: /enviar feedback/i });
    fireEvent.click(submitBtn);

    // Valida que o pós-submit renderiza com sucesso sem ReferenceError
    await waitFor(() => {
      expect(screen.getByText("Feedback Enviado!")).toBeInTheDocument();
      expect(screen.getByText("Obrigado por responder o questionário.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /voltar ao dashboard/i })).toBeInTheDocument();
    });
  });

  it("renderiza tela de sucesso quando o questionário já foi respondido anteriormente (already_submitted)", async () => {
    (supabase.rpc as any).mockImplementation((rpcName: string) => {
      if (rpcName === "get_feedback_cycle_by_token") {
        return Promise.resolve({
          data: [
            {
              cycle_id: "cycle-already",
              colaborador_name: "Gestor Teste",
              milestone_type: "30_DIAS",
              respondent_type: "GESTOR",
              template_id: "tpl-gestor",
              already_submitted: true,
              questions: [],
              questionnaire_configured: true,
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    render(
      <MemoryRouter initialEntries={["/feedback/valid-test-token"]}>
        <Routes>
          <Route path="/feedback/:token" element={<FeedbackForm />} />
        </Routes>
      </MemoryRouter>
    );

    // Deve exibir diretamente o cartão de Feedback Enviado sem crash
    await waitFor(() => {
      expect(screen.getByText("Feedback Enviado!")).toBeInTheDocument();
      expect(screen.getByText("Obrigado por responder o questionário.")).toBeInTheDocument();
    });
  });
});
