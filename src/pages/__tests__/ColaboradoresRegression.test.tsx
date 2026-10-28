/**
 * Regressão do incidente pós-commit 4bdb70c:
 *  - ReferenceError "isEditing is not defined" em ColaboradorForm (montado sempre por /colaboradores)
 *  - TypeError em filtro de busca quando corporate_email/job_title/department são NULL
 * O ColaboradorForm é renderizado REAL (não mockado) para reproduzir o cenário.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import * as useAuthModule from "@/hooks/useAuth";

const colaboradoresFixture: any[] = [
  {
    id: "c1", full_name: "Pessoa Um", corporate_email: "um@empresa.test",
    job_title: "Analista", department: "Financeiro", status: "ATIVO", contract_type: "CLT", company_id: "comp-1",
  },
  {
    // registro real-like: e-mail corporativo NULL (25 casos em produção)
    id: "c2", full_name: "Pessoa Dois", corporate_email: null,
    job_title: null, department: null, status: "ATIVO", contract_type: null, company_id: "comp-1",
  },
];

vi.mock("@/components/layout/MainLayout", () => ({
  MainLayout: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/colaboradores/ColaboradorTable", () => ({
  ColaboradorTable: ({ colaboradores }: any) => (
    <ul data-testid="tabela">
      {colaboradores.map((c: any) => <li key={c.id}>{c.full_name}</li>)}
    </ul>
  ),
}));

vi.mock("@/components/colaboradores/ImportarColaboradoresDialog", () => ({
  ImportarColaboradoresDialog: () => null,
}));

const mutation = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false };
vi.mock("@/hooks/useColaboradores", () => ({
  useColaboradores: () => ({ data: colaboradoresFixture, isLoading: false }),
  useColaborador: () => ({ data: undefined }),
  useCreateColaborador: () => mutation,
  useUpdateColaborador: () => mutation,
  useDeleteColaborador: () => mutation,
}));

vi.mock("@/hooks/useEffectiveCompanyId", () => ({
  useEffectiveCompanyId: () => "comp-1",
}));

import Colaboradores from "../Colaboradores";

const FALLBACK = "Ocorreu um erro ao carregar a página. Por favor, tente recarregar.";

function mockRole(role: string) {
  vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
    user: { id: "u1" },
    role,
    activeRole: role,
    isAdminMaster: false,
    isAdminEmpresa: role === "admin_empresa",
    isAdmin: role === "admin_empresa",
    roles: [role],
    availableRoles: [role],
  } as any);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ErrorBoundary fallbackMessage={FALLBACK}>
        <Colaboradores />
      </ErrorBoundary>
    </MemoryRouter>
  );
}

describe("Colaboradores — regressão incidente 4bdb70c", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["admin_empresa", "analista_rh", "gestor_departamento"])(
    "%s: renderiza /colaboradores sem ReferenceError e sem acionar o ErrorBoundary",
    (role) => {
      mockRole(role);
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      renderPage();

      expect(screen.queryByText(FALLBACK)).not.toBeInTheDocument();
      expect(screen.getByText("Pessoa Um")).toBeInTheDocument();
      expect(screen.getByText("Pessoa Dois")).toBeInTheDocument();
      const boundaryCalls = errSpy.mock.calls.filter((c) => String(c[0]).includes("[ErrorBoundary]"));
      expect(boundaryCalls).toHaveLength(0);
      errSpy.mockRestore();
    }
  );

  it("admin_empresa: abrir 'Novo Colaborador' monta o formulário sem erro", () => {
    mockRole("admin_empresa");
    renderPage();
    fireEvent.click(screen.getByText("Novo Colaborador"));
    expect(screen.queryByText(FALLBACK)).not.toBeInTheDocument();
  });

  it("filtro de busca não quebra com corporate_email/job_title/department NULL", () => {
    mockRole("admin_empresa");
    renderPage();
    const input = screen.getByPlaceholderText("Buscar por nome, email, cargo ou departamento...");

    fireEvent.change(input, { target: { value: "dois" } });
    expect(screen.queryByText(FALLBACK)).not.toBeInTheDocument();
    expect(screen.getByText("Pessoa Dois")).toBeInTheDocument();
    expect(screen.queryByText("Pessoa Um")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "empresa.test" } });
    expect(screen.getByText("Pessoa Um")).toBeInTheDocument();
    expect(screen.queryByText("Pessoa Dois")).not.toBeInTheDocument();
  });
});
