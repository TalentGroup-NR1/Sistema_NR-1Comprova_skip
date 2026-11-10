import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { ImportarPgrTab } from "../../components/mapa-riscos/pgr/ImportarPgrTab";
import { PgrImportadoDashboard } from "../../components/mapa-riscos/pgr/PgrImportadoDashboard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock hooks
vi.mock("@/hooks/usePgrImportacao", () => ({
  usePgrImportacoes: vi.fn(),
  useIniciarImportacaoPgr: vi.fn(),
  useConfirmarImportacaoPgr: vi.fn(),
  useExcluirImportacaoPgr: vi.fn(),
  useUpdatePgrActions: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock("@/hooks/usePgrAcoes", () => ({
  useAcoesPgr: vi.fn(() => ({ data: [], isLoading: false })),
  useUpdateAcao: vi.fn(() => ({ mutate: vi.fn() })),
  useSincronizarAcoes: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock("@/components/mapa-riscos/pgr/PlanoAcaoKanban", () => ({
  PlanoAcaoKanban: () => <div>PlanoAcaoKanban</div>,
}));

vi.mock("@/components/mapa-riscos/pgr/PgrDashboardTab", () => ({
  PgrDashboardTab: () => <div>PgrDashboardTab</div>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children, onClick }: any) => <button onClick={onClick} role="tab">{children}</button>,
  TabsContent: ({ children, value }: any) => <div data-testid={`tab-content-${value}`}>{children}</div>,
}));

// Mock timer for simulate process
vi.useFakeTimers();

import * as hooks from "@/hooks/usePgrImportacao";

const queryClient = new QueryClient();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe("PGR Importação UX/UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ImportarPgrTab", () => {
    it("deve exibir as fases de progresso sequencialmente quando isPending for true", () => {
      // Setup mock para indicar que o hook de inicialização está processando
      (hooks.useIniciarImportacaoPgr as any).mockReturnValue({
        isPending: true,
        mutateAsync: vi.fn(),
      });
      (hooks.usePgrImportacoes as any).mockReturnValue({ data: [] });
      (hooks.useConfirmarImportacaoPgr as any).mockReturnValue({ isPending: false });

      render(<ImportarPgrTab />, { wrapper });

      // Verificamos a tela inicial (fase 0)
      expect(screen.getByText("Enviando documento")).toBeInTheDocument();
      expect(screen.getByText("Lendo PDF")).toBeInTheDocument();
      
      // Avançamos o tempo em 3.1s para pular a primeira fase
      act(() => { vi.advanceTimersByTime(3100); });
      // A primeira fase já passou, agora a label deve continuar visível (como passada) e a segunda estar ativa

      // Avançamos mais 8.1s para pular a segunda fase
      act(() => { vi.advanceTimersByTime(8100); });
      expect(screen.getByText("Extraindo riscos com IA")).toBeInTheDocument();
    });

    it("deve exibir banner com CTA claro e laranja quando há PGR aguardando revisão", () => {
      (hooks.useIniciarImportacaoPgr as any).mockReturnValue({
        isPending: false,
        mutateAsync: vi.fn(),
      });
      (hooks.usePgrImportacoes as any).mockReturnValue({
        data: [{ id: "123", status: "aguardando_revisao", arquivo_nome: "doc_teste.pdf", created_at: new Date().toISOString() }],
      });
      (hooks.useConfirmarImportacaoPgr as any).mockReturnValue({ isPending: false });

      render(<ImportarPgrTab />, { wrapper });

      expect(screen.getByText(/A IA leu o documento e identificou os riscos/)).toBeInTheDocument();
      const btn = screen.getByRole("button", { name: "Revisar agora" });
      expect(btn).toBeInTheDocument();
      expect(btn.className).toContain("bg-orange-600");
    });
  });

  describe("PgrImportadoDashboard", () => {
    beforeEach(() => {
      vi.useRealTimers();
    });

    it("deve renderizar empty state explicativo na aba riscos com botão de revisar se status for aguardando_revisao", () => {
      window.HTMLElement.prototype.hasPointerCapture = vi.fn();
      window.HTMLElement.prototype.releasePointerCapture = vi.fn();

      (hooks.usePgrImportacoes as any).mockReturnValue({
        data: [{ id: "123", status: "aguardando_revisao", arquivo_nome: "doc_teste.pdf", created_at: new Date().toISOString(), riscos: [] }],
      });
      
      const onRevisarMock = vi.fn();

      render(<PgrImportadoDashboard pgrId="123" onBack={vi.fn()} onRevisar={onRevisarMock} />, { wrapper });

      const text = screen.getByText(/Este PGR ainda não foi confirmado/i);
      expect(text).toBeInTheDocument();
      
      const btn = screen.getByRole("button", { name: "Revisar agora" });
      expect(btn).toBeInTheDocument();
      
      fireEvent.click(btn);
      expect(onRevisarMock).toHaveBeenCalled();
    });
  });
});
