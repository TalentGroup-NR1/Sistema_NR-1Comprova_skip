import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CuidarMais from "../CuidarMais";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock das dependências
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn()
}));

// Mocks simples para componentes que não precisamos testar o interno
vi.mock("@/components/cuidar-mais/pulso", () => ({
  PulsoCampanhasBuilder: () => <div>PulsoCampanhasBuilder</div>,
  ColaboradorPulsoViewV2: () => <div>ColaboradorPulsoViewV2</div>,
  PulsoColaboradoresList: () => <div>PulsoColaboradoresList</div>,
  PulsoColaboradorDetail: () => <div>PulsoColaboradorDetail</div>,
}));

vi.mock("@/components/cuidar-mais/biblioteca/MateriaisApoioAdmin", () => ({
  MateriaisApoioAdmin: () => <div>MateriaisApoioAdmin</div>,
}));

vi.mock("@/components/cuidar-mais/agregados/ResultadosAgregadosTab", () => ({
  ResultadosAgregadosTab: () => <div>ResultadosAgregadosTab</div>,
}));

vi.mock("@/components/cuidar-mais/acompanhamentos/AcompanhamentosList", () => ({
  AcompanhamentosList: () => <div>AcompanhamentosList</div>,
}));

vi.mock("@/components/layout/MainLayout", () => ({
  MainLayout: ({ children }: any) => <div data-testid="main-layout">{children}</div>,
}));

vi.mock("@/components/cuidar-mais/fiscalizacao/FiscalizacaoList", () => ({
  FiscalizacaoList: () => <div>FiscalizacaoList</div>,
}));

vi.mock("@/components/cuidar-mais/relatorio", () => ({
  RelatorioTab: () => <div>RelatorioTab</div>,
}));

const queryClient = new QueryClient();

const renderComponent = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <CuidarMais />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe("CuidarMais - Fiscalização Gate", () => {
  it("deve renderizar aba de Fiscalização para Admin Empresa", async () => {
    const { useAuth } = await import("@/hooks/useAuth");
    vi.mocked(useAuth).mockReturnValue({ role: "admin_empresa" } as any);
    
    renderComponent();
    
    expect(screen.queryByText("Fiscalização")).toBeInTheDocument();
  });

  it("deve renderizar aba de Fiscalização para Admin Master", async () => {
    const { useAuth } = await import("@/hooks/useAuth");
    vi.mocked(useAuth).mockReturnValue({ role: "admin_master" } as any);
    
    renderComponent();
    
    expect(screen.queryByText("Fiscalização")).toBeInTheDocument();
  });

  it("deve renderizar aba de Fiscalização para Analista RH", async () => {
    const { useAuth } = await import("@/hooks/useAuth");
    vi.mocked(useAuth).mockReturnValue({ role: "analista_rh" } as any);
    
    renderComponent();
    
    expect(screen.queryByText("Fiscalização")).toBeInTheDocument();
  });

  it("NÃO deve renderizar aba de Fiscalização para Gestor de Departamento", async () => {
    const { useAuth } = await import("@/hooks/useAuth");
    vi.mocked(useAuth).mockReturnValue({ role: "gestor_departamento" } as any);
    
    renderComponent();
    
    expect(screen.queryByText("Fiscalização")).not.toBeInTheDocument();
    // Mas deve renderizar Acompanhamentos
    expect(screen.queryByText("Acompanhamentos")).toBeInTheDocument();
  });

  it("NÃO deve renderizar aba de Fiscalização para Colaborador", async () => {
    const { useAuth } = await import("@/hooks/useAuth");
    vi.mocked(useAuth).mockReturnValue({ role: "colaborador" } as any);
    
    renderComponent();
    
    expect(screen.queryByText("Fiscalização")).not.toBeInTheDocument();
    expect(screen.queryByText("Acompanhamentos")).not.toBeInTheDocument();
  });

  it("deve renderizar Acompanhamentos para Gestor de Departamento (canViewAcompanhamentos)", async () => {
    const { useAuth } = await import("@/hooks/useAuth");
    vi.mocked(useAuth).mockReturnValue({ role: "gestor_departamento" } as any);

    renderComponent();

    expect(screen.getByText("Acompanhamentos")).toBeInTheDocument();
  });

  it("deve renderizar Acompanhamentos para Admin Master e Analista RH", async () => {
    const { useAuth } = await import("@/hooks/useAuth");
    vi.mocked(useAuth).mockReturnValue({ role: "analista_rh" } as any);

    renderComponent();

    expect(screen.getByText("Acompanhamentos")).toBeInTheDocument();
  });
});
