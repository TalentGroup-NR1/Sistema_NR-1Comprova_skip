import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { addDays, format } from "date-fns";
import { ColaboradoresFeriasList } from "../ColaboradoresFeriasList";

const hoje = new Date();
const dataVencida = "2024-01-01";
const dataAVencer = format(addDays(hoje, 30), "yyyy-MM-dd");
const dataFutura = format(addDays(hoje, 200), "yyyy-MM-dd");

const mockColaboradores = [
  {
    id: "c-vencido",
    full_name: "Ana Vencida",
    job_title: "Analista",
    department: "Financeiro",
    admission_date: "2023-01-01",
    periodos_aquisitivos: [
      {
        id: "p1",
        data_inicio_aquisitivo: "2023-01-01",
        data_fim_aquisitivo: "2024-01-01",
        data_limite_gozo: dataVencida,
        dias_adquiridos: 30,
      },
    ],
    ferias_gozo: [],
  },
  {
    id: "c-avencer",
    full_name: "Bruno A Vencer",
    job_title: "Desenvolvedor",
    department: "TI",
    admission_date: "2024-01-01",
    periodos_aquisitivos: [
      {
        id: "p2",
        data_inicio_aquisitivo: "2024-01-01",
        data_fim_aquisitivo: "2025-01-01",
        data_limite_gozo: dataAVencer,
        dias_adquiridos: 30,
      },
    ],
    ferias_gozo: [],
  },
  {
    id: "c-misto",
    full_name: "Carlos Misto",
    job_title: "Coordenador",
    department: "Operações",
    admission_date: "2023-01-01",
    periodos_aquisitivos: [
      {
        id: "p3",
        data_inicio_aquisitivo: "2023-01-01",
        data_fim_aquisitivo: "2024-01-01",
        data_limite_gozo: dataVencida,
        dias_adquiridos: 30,
      },
      {
        id: "p4",
        data_inicio_aquisitivo: "2024-01-01",
        data_fim_aquisitivo: "2025-01-01",
        data_limite_gozo: dataAVencer,
        dias_adquiridos: 30,
      },
    ],
    ferias_gozo: [],
  },
  {
    id: "c-emdia",
    full_name: "Diana Em Dia",
    job_title: "Designer",
    department: "Marketing",
    admission_date: "2025-01-01",
    periodos_aquisitivos: [
      {
        id: "p5",
        data_inicio_aquisitivo: "2025-01-01",
        data_fim_aquisitivo: "2026-01-01",
        data_limite_gozo: dataFutura,
        dias_adquiridos: 30,
      },
    ],
    ferias_gozo: [],
  },
];

vi.mock("../ImportarUltimasFeriasDialog", () => ({
  ImportarUltimasFeriasDialog: () => null,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ role: "admin_empresa" }),
}));

vi.mock("@/hooks/useFerias", () => ({
  useColaboradoresComFerias: () => ({
    data: mockColaboradores,
    isLoading: false,
  }),
  getStatusFerias: () => ({
    status: "adquirido",
    label: "Adquirido",
    color: "default",
  }),
}));

describe("ETAPA 3: ColaboradoresFeriasList — Filtro Visual, Chip, Badges e Empty State", () => {
  it("filtroFerias='todas' exibe todos os colaboradores", () => {
    render(<ColaboradoresFeriasList onSelectColaborador={vi.fn()} filtroFerias="todas" />);

    expect(screen.getByText("Ana Vencida")).toBeDefined();
    expect(screen.getByText("Bruno A Vencer")).toBeDefined();
    expect(screen.getByText("Carlos Misto")).toBeDefined();
    expect(screen.getByText("Diana Em Dia")).toBeDefined();
    expect(screen.queryByTestId("chip-filtro-vencidas")).toBeNull();
    expect(screen.queryByTestId("chip-filtro-avencer")).toBeNull();
  });

  it("filtroFerias='vencidas' exibe apenas colaboradores vencidos", () => {
    render(<ColaboradoresFeriasList onSelectColaborador={vi.fn()} filtroFerias="vencidas" />);

    expect(screen.getByText("Ana Vencida")).toBeDefined();
    expect(screen.getByText("Carlos Misto")).toBeDefined();
    expect(screen.queryByText("Bruno A Vencer")).toBeNull();
    expect(screen.queryByText("Diana Em Dia")).toBeNull();
  });

  it("filtroFerias='a_vencer' exibe apenas a vencer", () => {
    render(<ColaboradoresFeriasList onSelectColaborador={vi.fn()} filtroFerias="a_vencer" />);

    expect(screen.getByText("Bruno A Vencer")).toBeDefined();
    expect(screen.getByText("Carlos Misto")).toBeDefined();
    expect(screen.queryByText("Ana Vencida")).toBeNull();
    expect(screen.queryByText("Diana Em Dia")).toBeNull();
  });

  it("searchTerm + filtro funcionam em interseção", () => {
    render(<ColaboradoresFeriasList onSelectColaborador={vi.fn()} filtroFerias="vencidas" />);

    const searchInput = screen.getByPlaceholderText("Buscar por nome, cargo ou departamento...");
    fireEvent.change(searchInput, { target: { value: "Carlos" } });

    expect(screen.getByText("Carlos Misto")).toBeDefined();
    expect(screen.queryByText("Ana Vencida")).toBeNull();
  });

  it("Chip de filtro aparece quando filtroFerias !== 'todas' e clicar no ✕ chama onLimparFiltro", () => {
    const onLimparFiltro = vi.fn();
    const { unmount } = render(
      <ColaboradoresFeriasList
        onSelectColaborador={vi.fn()}
        filtroFerias="vencidas"
        onLimparFiltro={onLimparFiltro}
      />
    );

    const chipVencidas = screen.getByTestId("chip-filtro-vencidas");
    expect(chipVencidas).toBeDefined();

    const btnLimpar = chipVencidas.querySelector("button");
    fireEvent.click(btnLimpar!);
    expect(onLimparFiltro).toHaveBeenCalledTimes(1);

    unmount();

    render(
      <ColaboradoresFeriasList
        onSelectColaborador={vi.fn()}
        filtroFerias="a_vencer"
        onLimparFiltro={onLimparFiltro}
      />
    );

    const chipAVencer = screen.getByTestId("chip-filtro-avencer");
    expect(chipAVencer).toBeDefined();
    fireEvent.click(chipAVencer.querySelector("button")!);
    expect(onLimparFiltro).toHaveBeenCalledTimes(2);
  });

  it("Badge duplo quando colaborador tem vencido + a vencer (Carlos Misto)", () => {
    render(<ColaboradoresFeriasList onSelectColaborador={vi.fn()} filtroFerias="todas" />);

    const rowCarlos = screen.getByText("Carlos Misto").closest("tr")!;
    expect(rowCarlos.textContent).toContain("Férias vencidas");
    expect(rowCarlos.textContent).toContain("A vencer (90d)");
  });

  it("Empty state correto para filtro 'vencidas' quando nenhum resultado", () => {
    const onLimparFiltro = vi.fn();
    render(
      <ColaboradoresFeriasList
        onSelectColaborador={vi.fn()}
        filtroFerias="vencidas"
        onLimparFiltro={onLimparFiltro}
      />
    );

    const searchInput = screen.getByPlaceholderText("Buscar por nome, cargo ou departamento...");
    fireEvent.change(searchInput, { target: { value: "NomeInexistente" } });

    expect(screen.getByText("Nenhum colaborador com férias vencidas.")).toBeDefined();
    const btnLimpar = screen.getByRole("button", { name: "Limpar filtro" });
    fireEvent.click(btnLimpar);
    expect(onLimparFiltro).toHaveBeenCalled();
  });

  it("Empty state correto para filtro 'a_vencer' quando nenhum resultado", () => {
    const onLimparFiltro = vi.fn();
    render(
      <ColaboradoresFeriasList
        onSelectColaborador={vi.fn()}
        filtroFerias="a_vencer"
        onLimparFiltro={onLimparFiltro}
      />
    );

    const searchInput = screen.getByPlaceholderText("Buscar por nome, cargo ou departamento...");
    fireEvent.change(searchInput, { target: { value: "NomeInexistente" } });

    expect(screen.getByText("Nenhum colaborador com férias a vencer nos próximos 90 dias.")).toBeDefined();
  });

  it("Alerta de divergência aparece no cenário forçado (totalEsperadoDivergencia > 0 e lista vazia)", () => {
    render(
      <ColaboradoresFeriasList
        onSelectColaborador={vi.fn()}
        filtroFerias="vencidas"
        totalEsperadoDivergencia={2}
      />
    );

    const searchInput = screen.getByPlaceholderText("Buscar por nome, cargo ou departamento...");
    fireEvent.change(searchInput, { target: { value: "Inexistente" } });

    const alerta = screen.getByTestId("alerta-divergencia");
    expect(alerta).toBeDefined();
    expect(alerta.textContent).toContain("⚠️ Divergência detectada: o painel indica 2 colaborador(es) mas a lista está vazia.");
  });
});
