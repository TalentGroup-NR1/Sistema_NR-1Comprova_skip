import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CadastroEmpresa from "../CadastroEmpresa";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Polyfill de ResizeObserver para o Radix UI no JSDOM
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

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

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(),
  },
}));

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};
vi.mock("sonner", () => ({
  toast: {
    success: (...args: any[]) => mockToast.success(...args),
    error: (...args: any[]) => mockToast.error(...args),
  },
}));

describe("CadastroEmpresa — Toggle Administrador Já Cadastrado (skip_invite)", () => {
  let queryClient: QueryClient;
  const mockInvoke = supabase.functions.invoke as unknown as ReturnType<typeof vi.fn>;
  const mockFrom = supabase.from as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockUseAuth.mockReturnValue({
      user: { id: "master-1", email: "admin@talentgroup.com.br" },
      isAuthenticated: true,
      isAdminEmpresa: false,
      isAdminMaster: true,
      isSuperAdmin: true,
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CadastroEmpresa />
        </BrowserRouter>
      </QueryClientProvider>
    );

  it("1. Renderiza opções de 'Novo administrador' e 'Administrador já cadastrado' para Admin Master", () => {
    renderComponent();

    expect(screen.getByText(/Novo administrador/i)).toBeInTheDocument();
    expect(screen.getByText(/Administrador já cadastrado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cadastrar Empresa e Enviar Convite/i })).toBeInTheDocument();
  });

  it("2. Ao selecionar 'Administrador já cadastrado' e e-mail existir: busca profile, preenche nome e habilita submit com skip_invite = true", async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        user_id: "user-gabriela",
        full_name: "Gabriela Mattos",
        email: "gmattos@talentgroup.com.br",
      },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnValue({
        maybeSingle: mockMaybeSingle,
      }),
    });

    mockInvoke.mockResolvedValueOnce({
      data: { success: true, company_id: "comp-uniti", is_branch: true },
      error: null,
    });

    renderComponent();

    // Clica no modo existente
    fireEvent.click(screen.getByText(/Administrador já cadastrado/i));

    expect(screen.getByText(/Esta empresa será vinculada diretamente à conta existente/i)).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/E-mail do administrador/i);
    fireEvent.change(emailInput, { target: { value: "gmattos@talentgroup.com.br" } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText(/Administrador Ativo/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue("Gabriela Mattos")).toBeInTheDocument();
    });

    // Preenche CNPJ e Razão
    fireEvent.change(screen.getByLabelText(/Razão social/i), {
      target: { value: "TG UNITI SERVIÇOS LTDA" },
    });
    fireEvent.change(screen.getByLabelText(/CNPJ/i), {
      target: { value: "39.453.650/0001-28" },
    });

    const submitBtn = screen.getByRole("button", { name: /Cadastrar Empresa e Vincular Administrador/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("register-company", {
        body: expect.objectContaining({
          razao_social: "TG UNITI SERVIÇOS LTDA",
          cnpj: "39.453.650/0001-28",
          admin_nome: "Gabriela Mattos",
          admin_email: "gmattos@talentgroup.com.br",
          skip_invite: true,
        }),
      });
      expect(mockToast.success).toHaveBeenCalledWith(
        expect.stringContaining("vinculada a gmattos@talentgroup.com.br"),
        expect.anything()
      );
    });
  });

  it("3. Ao selecionar 'Administrador já cadastrado' e e-mail NÃO existir: exibe erro amigável e bloqueia submit", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    renderComponent();

    fireEvent.click(screen.getByText(/Administrador já cadastrado/i));

    const emailInput = screen.getByLabelText(/E-mail do administrador/i);
    fireEvent.change(emailInput, { target: { value: "inexistente@talentgroup.com.br" } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(
        screen.getByText(/Nenhuma conta encontrada com este e-mail. Use o modo 'Novo administrador' para convidar./i)
      ).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /Cadastrar Empresa e Vincular Administrador/i });
    expect(submitBtn).toBeDisabled();
  });
});
