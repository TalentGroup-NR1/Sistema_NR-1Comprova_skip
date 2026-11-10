import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '../Sidebar';
import * as AuthHook from '@/hooks/useAuth';
import * as VisibleModulesHook from '@/hooks/useVisibleModules';
import * as DenunciasHook from '@/hooks/useDenuncias';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useVisibleModules', () => ({
  useVisibleModules: vi.fn(),
  useIsModuleVisible: vi.fn(),
}));

vi.mock('@/contexts/CompanyContext', () => ({
  useCompanyContext: () => ({ selectedCompanyId: null }),
}));

vi.mock('@/hooks/useCompanies', () => ({
  useCompanies: () => ({ data: [{ id: 'comp-1', name: 'Empresa Teste' }] }),
}));

vi.mock('@/hooks/useBranding', () => ({
  DEFAULT_BRANDING: {
    brandName: 'NR-1Comprova',
    logoUrl: '/images/nr-1comprova-logo.png',
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
  useDenunciasMonitor: vi.fn(() => ({ barcodeNovas: 0, denunciasNovas: 0, faleConoscoNovos: 0 })),
  useIsResponsavelDenuncia: vi.fn(() => ({ data: false, isLoading: false })),
  useContarDenunciasNaoAssumidas: vi.fn(() => ({
    data: { total_vencidas: 0, total_novas_24h: 0, total_nao_assumidas: 0 },
    isLoading: false,
  })),
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

describe('Sidebar — Perfil Admin Master e Soberania de Módulos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSidebar = () => {
    const result = render(
      <TooltipProvider>
        <MemoryRouter initialEntries={['/']}>
          <Sidebar />
        </MemoryRouter>
      </TooltipProvider>
    );

    // Expandir grupos recolhidos para que links fiquem acessíveis no DOM
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      if (btn.getAttribute('aria-expanded') === 'false') {
        fireEvent.click(btn);
      }
    });

    return result;
  };

  it('6.1. Login admin_master: Sidebar mostra todos os módulos operacionais', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      isAuthenticated: true,
      role: 'admin_master',
      activeRole: 'admin_master',
      availableRoles: ['admin_master'],
      isSuperAdmin: false,
      isAdminMaster: true,
      isAdminEmpresa: false,
      user: { id: 'usr-admin-master', email: 'admin.master@nr1.com' },
      signOut: vi.fn(),
      switchActiveRole: vi.fn(),
    } as any);

    vi.mocked(VisibleModulesHook.useVisibleModules).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(VisibleModulesHook.useIsModuleVisible).mockReturnValue({
      isVisible: true,
      isLoading: false,
      isError: false,
      isSuperAdminBypass: false,
      refetch: vi.fn(),
    });

    renderSidebar();

    // Módulos de Departamento Pessoal
    expect(screen.getByRole('link', { name: /Colaboradores/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Férias/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Demissões/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Benefícios/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ponto Eletrônico/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Minhas Tarefas/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Comunicados/i })).toBeInTheDocument();

    // Módulos de Desenvolvimento
    expect(screen.getByRole('link', { name: /Diário de Bordo/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Avaliação de Desempenho/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Feedback/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Treinamento/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cuidar\+/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mapa de Riscos NR1/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Estrutura Organizacional/i })).toBeInTheDocument();

    // Configurações permitidas
    expect(screen.getByRole('link', { name: /Relatórios Executivos/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Gerenciar Usuários/i })).toBeInTheDocument();
  });

  it('6.3 e 6.4. Login admin_master: NÃO vê Fale Conosco nem Comportamentos Ofensivos', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      isAuthenticated: true,
      role: 'admin_master',
      activeRole: 'admin_master',
      availableRoles: ['admin_master'],
      isSuperAdmin: false,
      isAdminMaster: true,
      isAdminEmpresa: false,
      user: { id: 'usr-admin-master', email: 'admin.master@nr1.com' },
      signOut: vi.fn(),
      switchActiveRole: vi.fn(),
    } as any);

    vi.mocked(VisibleModulesHook.useVisibleModules).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(DenunciasHook.useIsResponsavelDenuncia).mockReturnValue({
      data: false, // Admin master NÃO é designado soberano da empresa
      isLoading: false,
    } as any);

    renderSidebar();

    // 6.3. NÃO vê Fale Conosco
    expect(screen.queryByRole('link', { name: /Fale Conosco/i })).not.toBeInTheDocument();

    // 6.4. NÃO vê Comportamentos Ofensivos
    expect(screen.queryByRole('link', { name: /Comportamentos Ofensivos/i })).not.toBeInTheDocument();
  });

  it('6.5. Login admin_empresa (Horizonte): vê Fale Conosco e itens do seu escopo', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      isAuthenticated: true,
      role: 'admin_empresa',
      activeRole: 'admin_empresa',
      availableRoles: ['admin_empresa'],
      isSuperAdmin: false,
      isAdminMaster: false,
      isAdminEmpresa: true,
      user: { id: 'usr-admin-horizonte', email: 'admin@horizonte.com' },
      signOut: vi.fn(),
      switchActiveRole: vi.fn(),
    } as any);

    vi.mocked(VisibleModulesHook.useVisibleModules).mockReturnValue({
      data: [
        { module_key: '/colaboradores', visible: true },
        { module_key: '/fale-conosco', visible: true },
        { module_key: '/configuracoes-empresa', visible: true },
      ],
      isLoading: false,
      isError: false,
    } as any);

    renderSidebar();

    // Vê Fale Conosco
    expect(screen.getByRole('link', { name: /Fale Conosco/i })).toBeInTheDocument();
    // Vê Configurações da Empresa
    expect(screen.getByRole('link', { name: /Configurações da Empresa/i })).toBeInTheDocument();
    // NÃO vê Cadastro de Empresas (exclusivo admin_master)
    expect(screen.queryByRole('link', { name: /Cadastro de Empresa/i })).not.toBeInTheDocument();
  });
});
