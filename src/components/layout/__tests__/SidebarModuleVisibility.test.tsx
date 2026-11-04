import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '../Sidebar';
import * as AuthHook from '@/hooks/useAuth';
import * as VisibleModulesHook from '@/hooks/useVisibleModules';
import * as CompanyContext from '@/contexts/CompanyContext';
import * as DenunciasHook from '@/hooks/useDenuncias';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useVisibleModules', () => ({
  useVisibleModules: vi.fn(),
  useIsModuleVisible: vi.fn(),
}));

vi.mock('@/contexts/CompanyContext', () => ({
  useCompanyContext: vi.fn(),
}));

vi.mock('@/hooks/useCompanies', () => ({
  useCompanies: () => ({ data: [] }),
}));

vi.mock('@/hooks/useBranding', () => ({
  DEFAULT_BRANDING: {
    brandName: 'NR-1Comprova',
    logoUrl: '/images/nr-1comprova-logo.png?v=2',
    primaryColor: '#C8102E',
    faviconUrl: '/favicon.png',
  },
  useBranding: () => ({ brandName: 'NR1Comprova', logoUrl: null, primaryColor: null }),
}));

vi.mock('@/hooks/useNotifications', () => ({
  useUnreadCount: () => 0,
  useNotifications: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useAdminNotifications', () => ({
  useAdminNotifications: () => ({ data: [] }),
}));

vi.mock('@/hooks/useDenuncias', () => ({
  useDenunciasMonitor: () => ({ barcodeNovas: 0, denunciasNovas: 0, faleConoscoNovos: 0 }),
  useIsResponsavelDenuncia: vi.fn(() => ({ data: false, isLoading: false })),
}));

vi.mock('@/hooks/usePulseSurvey', () => ({
  useMyPulseStatus: () => ({ data: null }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/notifications/NotificationsDrawer', () => ({
  NotificationsDrawer: () => null,
}));

vi.mock('@/components/denuncias/FaleConoscoDrawer', () => ({
  FaleConoscoDrawer: () => null,
}));

vi.mock('../PerfilDialog', () => ({
  PerfilDialog: () => null,
}));

vi.mock('../PreferenciasDialog', () => ({
  PreferenciasDialog: () => null,
}));

describe('Sidebar - Visibilidade e Governança Comercial de Módulos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(VisibleModulesHook.useIsModuleVisible).mockReturnValue({
      isVisible: true,
      isLoading: false,
      isError: false,
      isSuperAdminBypass: false,
      refetch: vi.fn(),
    });
  });

  const renderSidebar = () => {
    return render(
      <TooltipProvider>
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      </TooltipProvider>
    );
  };

  it('módulo desativado para a empresa SOME do menu lateral do Admin Empresa', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      isAuthenticated: true,
      role: 'admin_empresa',
      isSuperAdmin: false,
      user: { email: 'admin@horizonte.com.br' },
      signOut: vi.fn(),
    } as any);

    vi.mocked(CompanyContext.useCompanyContext).mockReturnValue({
      selectedCompanyId: null,
    } as any);

    // Na Horizonte: Férias desativado, Colaboradores ativo
    vi.mocked(VisibleModulesHook.useVisibleModules).mockReturnValue({
      data: [
        { module_key: '/colaboradores', visible: true },
        { module_key: '/ferias', visible: false },
      ],
      isLoading: false,
      isError: false,
    } as any);

    renderSidebar();

    // Módulo base sempre visível
    expect(screen.getByText('Colaboradores')).toBeInTheDocument();
    // Módulo desativado oculto
    expect(screen.queryByText('Férias')).not.toBeInTheDocument();
  });

  it('sub-rota (/minhas-ferias) herda desativação do pai e SOME do menu do Colaborador', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      isAuthenticated: true,
      role: 'colaborador',
      isSuperAdmin: false,
      user: { email: 'colab@horizonte.com.br' },
      signOut: vi.fn(),
    } as any);

    vi.mocked(CompanyContext.useCompanyContext).mockReturnValue({
      selectedCompanyId: null,
    } as any);

    // Módulo /ferias desativado
    vi.mocked(VisibleModulesHook.useVisibleModules).mockReturnValue({
      data: [
        { module_key: '/ferias', visible: false },
      ],
      isLoading: false,
      isError: false,
    } as any);

    renderSidebar();

    // Minhas Férias deve estar oculto
    expect(screen.queryByText('Minhas Férias')).not.toBeInTheDocument();
  });

  it('módulo base (/colaboradores) NUNCA é ocultado no menu', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      isAuthenticated: true,
      role: 'admin_empresa',
      isSuperAdmin: false,
      user: { email: 'admin@horizonte.com.br' },
      signOut: vi.fn(),
    } as any);

    vi.mocked(CompanyContext.useCompanyContext).mockReturnValue({
      selectedCompanyId: null,
    } as any);

    // Mesmo se a RPC retornar visible: false para /colaboradores
    vi.mocked(VisibleModulesHook.useVisibleModules).mockReturnValue({
      data: [
        { module_key: '/colaboradores', visible: false },
      ],
      isLoading: false,
      isError: false,
    } as any);

    renderSidebar();

    expect(screen.getByText('Colaboradores')).toBeInTheDocument();
  });

  it('Super Admin sem empresa selecionada vê todos os módulos (bypass explícito)', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      isAuthenticated: true,
      role: 'admin_master',
      isSuperAdmin: true,
      user: { email: 'super@antigravity.com' },
      signOut: vi.fn(),
    } as any);

    vi.mocked(CompanyContext.useCompanyContext).mockReturnValue({
      selectedCompanyId: null, // sem empresa selecionada
    } as any);

    vi.mocked(VisibleModulesHook.useVisibleModules).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);

    renderSidebar();

    expect(screen.getByText('Colaboradores')).toBeInTheDocument();
    expect(screen.getByText('Férias')).toBeInTheDocument();
    expect(screen.getByText('Demissões')).toBeInTheDocument();
  });

  it('em erro de consulta RPC (fail-closed), oculta módulos contratáveis do menu', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      isAuthenticated: true,
      role: 'admin_empresa',
      isSuperAdmin: false,
      user: { email: 'admin@empresa.com' },
      signOut: vi.fn(),
    } as any);

    vi.mocked(CompanyContext.useCompanyContext).mockReturnValue({
      selectedCompanyId: null,
    } as any);

    vi.mocked(VisibleModulesHook.useVisibleModules).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true, // RPC falhou
    } as any);

    renderSidebar();

    // Módulos contratáveis ocultos por segurança
    expect(screen.queryByText('Férias')).not.toBeInTheDocument();
    expect(screen.queryByText('Demissões')).not.toBeInTheDocument();
    // Módulo base (/colaboradores) continua acessível
    expect(screen.getByText('Colaboradores')).toBeInTheDocument();
  });

  it('colaborador designado vê os itens de denúncias independente do cargo', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      isAuthenticated: true,
      role: 'colaborador',
      isSuperAdmin: false,
      user: { email: 'colaborador@empresa.com' },
      signOut: vi.fn(),
    } as any);

    vi.mocked(CompanyContext.useCompanyContext).mockReturnValue({
      selectedCompanyId: 'comp-1',
    } as any);

    vi.mocked(VisibleModulesHook.useVisibleModules).mockReturnValue({
      data: [
        { module_key: '/denuncias', visible: true },
        { module_key: '/comportamentos-ofensivos', visible: true },
      ],
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(DenunciasHook.useIsResponsavelDenuncia).mockReturnValue({
      data: true,
      isLoading: false,
    } as any);

    renderSidebar();

    // O grupo "Configurações" passa a existir para o colaborador designado
    expect(screen.getByText('Configurações')).toBeInTheDocument();

    // Ao expandir o grupo Configurações
    fireEvent.click(screen.getByText('Configurações'));

    expect(screen.getByText('Comportamentos Ofensivos')).toBeInTheDocument();
    // Há o link de gestão no menu e o botão do drawer no rodapé
    expect(screen.getAllByText('Fale Conosco').length).toBe(2);
  });

  it('colaborador NÃO designado NÃO vê os itens de denúncias', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      isAuthenticated: true,
      role: 'colaborador',
      isSuperAdmin: false,
      user: { email: 'colaborador@empresa.com' },
      signOut: vi.fn(),
    } as any);

    vi.mocked(CompanyContext.useCompanyContext).mockReturnValue({
      selectedCompanyId: 'comp-1',
    } as any);

    vi.mocked(VisibleModulesHook.useVisibleModules).mockReturnValue({
      data: [
        { module_key: '/denuncias', visible: true },
        { module_key: '/comportamentos-ofensivos', visible: true },
      ],
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(DenunciasHook.useIsResponsavelDenuncia).mockReturnValue({
      data: false,
      isLoading: false,
    } as any);

    renderSidebar();

    expect(screen.queryByText('Comportamentos Ofensivos')).not.toBeInTheDocument();
  });

  it('admin_empresa NÃO designado NÃO vê o item Comportamentos Ofensivos', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      isAuthenticated: true,
      role: 'admin_empresa',
      isSuperAdmin: false,
      user: { email: 'admin@empresa.com' },
      signOut: vi.fn(),
    } as any);

    vi.mocked(CompanyContext.useCompanyContext).mockReturnValue({
      selectedCompanyId: 'comp-1',
    } as any);

    vi.mocked(VisibleModulesHook.useVisibleModules).mockReturnValue({
      data: [
        { module_key: '/denuncias', visible: true },
        { module_key: '/comportamentos-ofensivos', visible: true },
      ],
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(DenunciasHook.useIsResponsavelDenuncia).mockReturnValue({
      data: false,
      isLoading: false,
    } as any);

    renderSidebar();

    expect(screen.queryByText('Comportamentos Ofensivos')).not.toBeInTheDocument();
  });
});
