import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

describe("CadastroEmpresa — Fluxo Simplificado (4 Campos) e Filial", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();

    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it("renderiza exatamente os 4 campos essenciais + checkbox de termos (sem stepper nem campos de endereço/logo)", () => {
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

    // 4 Campos essenciais
    expect(screen.getByLabelText(/Razão social/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CNPJ/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome completo do administrador/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/E-mail do administrador/i)).toBeInTheDocument();

    // Checkbox de termos
    expect(screen.getByLabelText(/Termos de Uso/i)).toBeInTheDocument();

    // Validação que campos removidos NÃO existem
    expect(screen.queryByLabelText(/CEP/i)).toBeNull();
    expect(screen.queryByLabelText(/Logradouro/i)).toBeNull();
    expect(screen.queryByLabelText(/Bairro/i)).toBeNull();
    expect(screen.queryByLabelText(/Telefone/i)).toBeNull();
    expect(screen.queryByLabelText(/Segmento/i)).toBeNull();
    expect(screen.queryByLabelText(/Logo da marca/i)).toBeNull();
    expect(screen.queryByLabelText(/Cor da marca/i)).toBeNull();

    // Exatamente 4 inputs de texto/email + 1 checkbox
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(4);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("envia payload reduzido com apenas os 4 campos essenciais e termos para register-company", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isAdminEmpresa: false,
      isAdminMaster: false,
    });

    mockInvoke.mockResolvedValueOnce({
      data: { success: true, company_id: "comp-123" },
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CadastroEmpresa />
        </BrowserRouter>
      </QueryClientProvider>
    );

    fireEvent.change(screen.getByLabelText(/Razão social/i), {
      target: { value: "Empresa Piloto Ltda" },
    });
    fireEvent.change(screen.getByLabelText(/CNPJ/i), {
      target: { value: "12.345.678/0001-95" },
    });
    fireEvent.change(screen.getByLabelText(/Nome completo do administrador/i), {
      target: { value: "Administrador Piloto" },
    });
    fireEvent.change(screen.getByLabelText(/E-mail do administrador/i), {
      target: { value: "admin@piloto.com.br" },
    });
    fireEvent.click(screen.getByRole("checkbox"));

    fireEvent.click(screen.getByRole("button", { name: /Cadastrar Empresa/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(mockInvoke).toHaveBeenCalledWith("register-company", {
        body: expect.objectContaining({
          razao_social: "Empresa Piloto Ltda",
          cnpj: "12.345.678/0001-95",
          admin_nome: "Administrador Piloto",
          admin_email: "admin@piloto.com.br",
          aceite_termos: true,
        }),
      });
    });

    // Confirma que não foram enviados campos de logo, cor ou endereço
    const sentBody = mockInvoke.mock.calls[0][1].body;
    expect(sentBody).not.toHaveProperty("logo");
    expect(sentBody).not.toHaveProperty("cep");
    expect(sentBody).not.toHaveProperty("logradouro");
    expect(sentBody).not.toHaveProperty("telefone");
    expect(sentBody).not.toHaveProperty("segmento");
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

  it("renderiza modo empresa (fora do fluxo de filial) com campos vazios e box azul quando usuário é super admin / admin_master", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "super-admin-user",
        email: "josenildo.santos@talentgroup.com.br",
        user_metadata: { full_name: "Josenildo Santos" },
      },
      isAuthenticated: true,
      isAdminEmpresa: false,
      isAdminMaster: true,
      isSuperAdmin: true,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CadastroEmpresa />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Título e subtítulo normais de empresa (não filial)
    expect(screen.getByText("Cadastrar nova empresa")).toBeInTheDocument();
    expect(screen.queryByText("Adicionar filial / nova empresa")).toBeNull();
    expect(
      screen.getByText("Preencha os dados essenciais abaixo para enviar o convite ao administrador.")
    ).toBeInTheDocument();

    // Botão de envio padrão
    expect(
      screen.getByRole("button", { name: /Cadastrar Empresa e Enviar Convite/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cadastrar Filial/i })).toBeNull();

    // Campos de admin_nome e admin_email devem permanecer VAZIOS (não auto-popula com dados do super admin)
    const nomeInput = screen.getByLabelText(/Nome completo do administrador/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/E-mail do administrador/i) as HTMLInputElement;
    expect(nomeInput.value).toBe("");
    expect(emailInput.value).toBe("");

    // Box azul de convite presente, box verde de filial ausente
    expect(
      screen.getByText(/📧 Convite por e-mail e perfil posterior/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/🏢 Vínculo direto à sua conta/i)).toBeNull();
  });
});

