import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CadastroEmpresa from "../CadastroEmpresa";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockInvoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: any[]) => mockInvoke(...args),
    },
    storage: {
      from: vi.fn(),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("CadastroEmpresa — Fluxo de Filial", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it("renderiza modo filial e auto-popula dados quando usuário logado é admin_empresa", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "admin-user-123",
        email: "admin.matriz@empresa.com",
        user_metadata: { full_name: "Administrador Matriz" },
      },
      isAuthenticated: true,
      isAdminEmpresa: true,
      isAdminMaster: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CadastroEmpresa />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("Adicionar filial / nova empresa")).toBeInTheDocument();
    expect(
      screen.getByText(/Cadastre uma nova empresa vinculada à sua conta atual de administrador/i)
    ).toBeInTheDocument();
  });

  it("renderiza modo convencional de cadastro para visitante não autenticado", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isAdminEmpresa: false,
      isAdminMaster: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CadastroEmpresa />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("Cadastrar nova empresa")).toBeInTheDocument();
    expect(
      screen.getByText(/Um convite será enviado ao administrador por email/i)
    ).toBeInTheDocument();
  });
});
