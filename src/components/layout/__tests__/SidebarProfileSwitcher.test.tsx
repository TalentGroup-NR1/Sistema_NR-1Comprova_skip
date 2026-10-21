import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import * as useAuthModule from '@/hooks/useAuth';

// Mock dependencies
vi.mock('@/contexts/CompanyContext', () => ({
  useCompanyContext: () => ({
    selectedCompanyId: 'comp-1',
    setSelectedCompanyId: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCompanies', () => ({
  useCompanies: () => ({
    data: [{ id: 'comp-1', name: 'Empresa Teste' }],
    isLoading: false,
  }),
}));

vi.mock('@/components/notifications/NotificationsDrawer', () => ({
  NotificationsDrawer: () => null,
}));

vi.mock('@/components/denuncias/FaleConoscoDrawer', () => ({
  FaleConoscoDrawer: () => null,
}));

vi.mock('@/hooks/useNotifications', () => ({
  useUnreadCount: () => 0,
  useNotifications: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useAdminNotifications', () => ({
  useAdminNotifications: () => ({ data: [] }),
}));

vi.mock('@/hooks/useDenuncias', () => ({
  useDenunciasMonitor: () => ({ denunciasNovas: 0, faleConoscoNovos: 0 }),
}));

vi.mock('@/hooks/usePulseSurvey', () => ({
  useMyPulseStatus: () => ({ data: null }),
}));

vi.mock('@/hooks/useBranding', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useBranding')>();
  return {
    ...actual,
    useBranding: () => ({ logoUrl: null, brandName: 'NR-1' }),
  };
});

vi.mock('@/hooks/useVisibleModules', () => ({
  useVisibleModules: () => ({
    data: [
      { module_key: '/colaboradores', visible: true },
      { module_key: '/ferias', visible: true },
      { module_key: '/demissoes', visible: true },
      { module_key: '/beneficios', visible: true },
      { module_key: '/minhas-tarefas', visible: true },
      { module_key: '/comunicados', visible: true },
      { module_key: '/diario-bordo', visible: true },
      { module_key: '/avaliacoes', visible: true },
      { module_key: '/treinamentos', visible: true },
      { module_key: '/cuidar-mais', visible: true },
      { module_key: '/mapa-riscos-nr1', visible: true },
      { module_key: '/estrutura-organizacional', visible: true },
    ],
    isLoading: false,
    isError: false,
  }),
  useIsModuleVisible: () => ({ isVisible: true }),
}));

describe('Sidebar — Seletor de Perfil Ativo (Estilo Flash)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  const renderSidebar = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MemoryRouter>
            <Sidebar />
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );

  it('renderiza o seletor interativo para usuário com 2 papéis (admin_empresa + colaborador)', async () => {
    const switchActiveRoleMock = vi.fn().mockResolvedValue({ error: null });

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      role: 'admin_empresa',
      activeRole: 'admin_empresa',
      roles: ['admin_empresa', 'colaborador'],
      availableRoles: ['admin_empresa', 'colaborador'],
      switchActiveRole: switchActiveRoleMock,
      user: { id: 'u1', email: 'gestor@empresa.com' },
      isSuperAdmin: false,
      loading: false,
      profileLoaded: true,
      companyId: 'comp-1',
      mustChangePassword: false,
      isBlocked: false,
      blockReason: null,
      isAdminMaster: false,
      isAdminEmpresa: true,
      isAdmin: true,
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshUserData: vi.fn(),
      clearMustChangePassword: vi.fn(),
    } as any);

    renderSidebar();

    // Trigger do seletor deve existir
    const trigger = screen.getByTestId('profile-switcher-trigger');
    expect(trigger).toBeInTheDocument();
    expect(screen.getByTestId('active-profile-title')).toHaveTextContent('Perfil da Empresa');

    // Ao clicar no trigger, abre o menu dropdown com as 2 opções
    fireEvent.pointerDown(trigger, { button: 0 });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByTestId('profile-option-empresa')).toBeInTheDocument();
      expect(screen.getByTestId('profile-option-pessoal')).toBeInTheDocument();
    });

    // Clicar em "Meu Perfil"
    fireEvent.click(screen.getByTestId('profile-option-pessoal'));
    expect(switchActiveRoleMock).toHaveBeenCalledWith('colaborador');
  });

  it('NÃO renderiza o seletor interativo para usuário com apenas 1 papel (apenas colaborador)', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      role: 'colaborador',
      activeRole: 'colaborador',
      roles: ['colaborador'],
      availableRoles: ['colaborador'],
      switchActiveRole: vi.fn(),
      user: { id: 'u2', email: 'colaborador@empresa.com' },
      isSuperAdmin: false,
      loading: false,
      profileLoaded: true,
      companyId: 'comp-1',
      mustChangePassword: false,
      isBlocked: false,
      blockReason: null,
      isAdminMaster: false,
      isAdminEmpresa: false,
      isAdmin: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshUserData: vi.fn(),
      clearMustChangePassword: vi.fn(),
    } as any);

    renderSidebar();

    // Trigger interativo NÃO deve existir
    expect(screen.queryByTestId('profile-switcher-trigger')).not.toBeInTheDocument();
    // Badge fixo deve estar presente
    const fixedBadge = screen.getByTestId('profile-fixed-badge');
    expect(fixedBadge).toBeInTheDocument();
    expect(fixedBadge).toHaveTextContent('Meu Perfil');
  });

  it('NÃO renderiza o seletor interativo para usuário com apenas 1 papel (apenas admin_empresa)', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      role: 'admin_empresa',
      activeRole: 'admin_empresa',
      roles: ['admin_empresa'],
      availableRoles: ['admin_empresa'],
      switchActiveRole: vi.fn(),
      user: { id: 'u3', email: 'admin@empresa.com' },
      isSuperAdmin: false,
      loading: false,
      profileLoaded: true,
      companyId: 'comp-1',
      mustChangePassword: false,
      isBlocked: false,
      blockReason: null,
      isAdminMaster: false,
      isAdminEmpresa: true,
      isAdmin: true,
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshUserData: vi.fn(),
      clearMustChangePassword: vi.fn(),
    } as any);

    renderSidebar();

    // Trigger interativo NÃO deve existir
    expect(screen.queryByTestId('profile-switcher-trigger')).not.toBeInTheDocument();
    // Badge fixo deve estar presente com "Perfil da Empresa"
    const fixedBadge = screen.getByTestId('profile-fixed-badge');
    expect(fixedBadge).toBeInTheDocument();
    expect(fixedBadge).toHaveTextContent('Perfil da Empresa');
  });

  it('filtra menu por papel ativo: modo colaborador exibe Minhas Férias e oculta Colaboradores/Demissões', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      role: 'colaborador',
      activeRole: 'colaborador',
      roles: ['admin_empresa', 'colaborador'],
      availableRoles: ['admin_empresa', 'colaborador'],
      switchActiveRole: vi.fn(),
      user: { id: 'u1', email: 'gestor@empresa.com' },
      isSuperAdmin: false,
      loading: false,
      profileLoaded: true,
      companyId: 'comp-1',
      mustChangePassword: false,
      isBlocked: false,
      blockReason: null,
      isAdminMaster: false,
      isAdminEmpresa: false,
      isAdmin: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshUserData: vi.fn(),
      clearMustChangePassword: vi.fn(),
    } as any);

    renderSidebar();

    // Minhas Férias deve estar visível
    expect(screen.getByText('Minhas Férias')).toBeInTheDocument();
    // Colaboradores e Demissões devem estar ocultos
    expect(screen.queryByText('Colaboradores')).not.toBeInTheDocument();
    expect(screen.queryByText('Demissões')).not.toBeInTheDocument();
    expect(screen.queryByText('Gerenciar Usuários')).not.toBeInTheDocument();
  });

  it('filtra menu por papel ativo: modo empresa exibe Colaboradores/Demissões e oculta Minhas Férias', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      role: 'admin_empresa',
      activeRole: 'admin_empresa',
      roles: ['admin_empresa', 'colaborador'],
      availableRoles: ['admin_empresa', 'colaborador'],
      switchActiveRole: vi.fn(),
      user: { id: 'u1', email: 'gestor@empresa.com' },
      isSuperAdmin: false,
      loading: false,
      profileLoaded: true,
      companyId: 'comp-1',
      mustChangePassword: false,
      isBlocked: false,
      blockReason: null,
      isAdminMaster: false,
      isAdminEmpresa: true,
      isAdmin: true,
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshUserData: vi.fn(),
      clearMustChangePassword: vi.fn(),
    } as any);

    renderSidebar();

    // Colaboradores e Demissões devem estar visíveis
    expect(screen.getByText('Colaboradores')).toBeInTheDocument();
    expect(screen.getByText('Demissões')).toBeInTheDocument();
    // Minhas Férias deve estar oculto
    expect(screen.queryByText('Minhas Férias')).not.toBeInTheDocument();
  });
});
