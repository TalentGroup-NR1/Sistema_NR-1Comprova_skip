import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardAdmin } from '../DashboardAdmin';
import { AniversariosHojeAlert } from '../AniversariosHojeAlert';
import * as AuthHook from '@/hooks/useAuth';
import * as EffectiveCompanyHook from '@/hooks/useEffectiveCompanyId';
import * as DashboardMetricsHook from '@/hooks/useDashboardMetrics';
import * as AniversariantesGlobaisHook from '@/hooks/useAniversariantesGlobais';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useEffectiveCompanyId', () => ({
  useEffectiveCompanyId: vi.fn(),
}));

vi.mock('@/hooks/useDashboardMetrics', () => ({
  useDashboardMetrics: vi.fn(),
}));

vi.mock('@/hooks/useAniversariantesGlobais', () => ({
  useAniversariantesGlobais: vi.fn(),
}));

vi.mock('@/hooks/useVisibleModules', () => ({
  useIsModuleVisible: vi.fn(() => ({ isVisible: true })),
}));

describe('DashboardAdmin — Isolamento de Dados do Admin Master (Zero Leakage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('6.2. Login admin_master sem company: renderiza Estado Vazio com mensagem orientativa e zero dados de clientes', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      role: 'admin_master',
      isAdminMaster: true,
      user: { id: 'usr-josenildo' },
    } as any);

    vi.mocked(EffectiveCompanyHook.useEffectiveCompanyId).mockReturnValue(null);

    vi.mocked(DashboardMetricsHook.useDashboardMetrics).mockReturnValue({
      totalAtivos: 0,
      contratadosMes: 0,
      demitidosMes: 0,
      turnoverRate: 0,
      ytdContratados: 0,
      ytdDemitidos: 0,
      ultimaAdmissaoRef: null,
      ultimaDemissaoRef: null,
      aniversariantes: [],
      aniversariosEmpresa: [],
      diarioBordoReminders: [],
      recentes: [],
      funcionariosPorEmpresa: [],
      funcionariosPorEmpresaCliente: [],
      showCompanyBreakdown: false,
      isLoading: false,
      error: null,
    });

    vi.mocked(AniversariantesGlobaisHook.useAniversariantesGlobais).mockReturnValue({
      data: { nascimentos: [], empresa: [] },
      isLoading: false,
    } as any);

    render(
      <MemoryRouter>
        <DashboardAdmin />
      </MemoryRouter>
    );

    // Estado vazio orientativo presente
    expect(screen.getByTestId('admin-master-empty-dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Você está como Admin Master/i)).toBeInTheDocument();
    expect(
      screen.getByText(/O painel consolidado de clientes é exibido por empresa/i)
    ).toBeInTheDocument();

    // Botões orientativos
    expect(screen.getByRole('button', { name: /Ver empresas cadastradas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Módulos/i })).toBeInTheDocument();

    // Zero dados de clientes renderizados:
    expect(screen.queryByText('Total de Ativos')).not.toBeInTheDocument();
    expect(screen.queryByText('Contratados do Mês')).not.toBeInTheDocument();
    expect(screen.queryByText('Mariana Oliveira Lima')).not.toBeInTheDocument();
    expect(screen.queryByText('Horizonte Contabilidade')).not.toBeInTheDocument();
    expect(screen.queryByText('TG MAIS')).not.toBeInTheDocument();
  });

  it('6.6. Aniversariantes: deduplica colaboradores evitando que a mesma pessoa apareça 2x', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      role: 'admin_empresa',
      isAdminMaster: false,
      user: { id: 'usr-admin-empresa' },
    } as any);

    vi.mocked(EffectiveCompanyHook.useEffectiveCompanyId).mockReturnValue('comp-horizonte');

    const todayStr = new Date().toISOString().slice(0, 10);

    // Simula dois registros da mesma pessoa (duplicação de JOIN ou vínculos)
    const aniversariantesDuplicados = [
      {
        id: 'colab-1',
        full_name: 'Mariana Oliveira Lima',
        birth_date: `${todayStr}`,
        department: 'Fiscal',
      },
      {
        id: 'colab-2',
        full_name: 'Mariana Oliveira Lima',
        birth_date: `${todayStr}`,
        department: 'Financeiro',
      },
    ];

    render(
      <AniversariosHojeAlert
        aniversariantes={aniversariantesDuplicados}
        aniversariosEmpresa={[]}
        isLoading={false}
      />
    );

    // O modal deve ser exibido com apenas 1 entrada para Mariana Oliveira Lima
    const itensMariana = screen.getAllByText('Mariana Oliveira Lima');
    expect(itensMariana).toHaveLength(1);
    expect(screen.getByText(/Aniversário \(1\)/i)).toBeInTheDocument();
  });

  it('6.7. AniversariosHojeAlert: nunca renderiza modal para admin_master sem company_id', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      role: 'admin_master',
      isAdminMaster: true,
      user: { id: 'usr-admin-master' },
    } as any);

    vi.mocked(EffectiveCompanyHook.useEffectiveCompanyId).mockReturnValue(null);

    const todayStr = new Date().toISOString().slice(0, 10);
    const aniversariantes = [
      {
        id: 'colab-1',
        full_name: 'Mariana Oliveira Lima',
        birth_date: `${todayStr}`,
        department: 'Fiscal',
      },
    ];

    const { container } = render(
      <AniversariosHojeAlert
        aniversariantes={aniversariantes}
        aniversariosEmpresa={[]}
        isLoading={false}
      />
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('Mariana Oliveira Lima')).not.toBeInTheDocument();
  });
});
