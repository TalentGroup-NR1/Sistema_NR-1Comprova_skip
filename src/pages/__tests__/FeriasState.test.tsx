import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Ferias from "../Ferias";

let capturedListProps: any = {};
let capturedDashboardProps: any = {};

vi.mock("@/components/layout/MainLayout", () => ({
  MainLayout: ({ children }: any) => <div data-testid="main-layout">{children}</div>,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ role: "admin_empresa" }),
}));

vi.mock("@/hooks/useFerias", () => ({
  useFeriasPendentesAprovacao: () => ({ data: [] }),
}));

vi.mock("@/components/ferias/FeriasDashboard", () => ({
  FeriasDashboard: (props: any) => {
    capturedDashboardProps = props;
    return (
      <div data-testid="ferias-dashboard">
        <button data-testid="btn-go-vencidas" onClick={props.onGoColaboradoresVencidas}>
          Go Vencidas
        </button>
        <button data-testid="btn-go-avencer" onClick={props.onGoColaboradoresAVencer}>
          Go A Vencer
        </button>
      </div>
    );
  },
}));

vi.mock("@/components/ferias/ColaboradoresFeriasList", () => ({
  ColaboradoresFeriasList: (props: any) => {
    capturedListProps = props;
    return (
      <div data-testid="colaboradores-list">
        <span data-testid="filtro-ativo">{props.filtroFerias}</span>
        <button data-testid="btn-limpar" onClick={props.onLimparFiltro}>
          Limpar
        </button>
      </div>
    );
  },
}));

vi.mock("@/components/ferias/FeriasColaboradorDetail", () => ({
  FeriasColaboradorDetail: () => <div>Detail</div>,
}));

vi.mock("@/components/ferias/AprovacoesPendentesList", () => ({
  AprovacoesPendentesList: () => <div>Aprovações</div>,
}));

describe("ETAPA 2: Ferias.tsx state management e fluxo de filtros", () => {
  it("inicia com tab 'dashboard' e filtroFerias 'todas'", () => {
    render(<Ferias />);
    expect(screen.getByTestId("ferias-dashboard")).toBeDefined();
  });

  it("ao acionar onGoColaboradoresVencidas, muda tab para 'colaboradores' e passa filtro 'vencidas'", () => {
    render(<Ferias />);
    fireEvent.click(screen.getByTestId("btn-go-vencidas"));

    expect(screen.getByTestId("colaboradores-list")).toBeDefined();
    expect(capturedListProps.filtroFerias).toBe("vencidas");
    expect(screen.getByTestId("filtro-ativo").textContent).toBe("vencidas");
  });

  it("ao acionar onGoColaboradoresAVencer, muda tab para 'colaboradores' e passa filtro 'a_vencer'", () => {
    render(<Ferias />);
    fireEvent.click(screen.getByTestId("btn-go-avencer"));

    expect(screen.getByTestId("colaboradores-list")).toBeDefined();
    expect(capturedListProps.filtroFerias).toBe("a_vencer");
    expect(screen.getByTestId("filtro-ativo").textContent).toBe("a_vencer");
  });

  it("ao acionar onLimparFiltro, reseta filtroFerias para 'todas'", () => {
    render(<Ferias />);
    fireEvent.click(screen.getByTestId("btn-go-vencidas"));
    expect(capturedListProps.filtroFerias).toBe("vencidas");

    fireEvent.click(screen.getByTestId("btn-limpar"));
    expect(capturedListProps.filtroFerias).toBe("todas");
    expect(screen.getByTestId("filtro-ativo").textContent).toBe("todas");
  });
});

