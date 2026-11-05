import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  useDenunciasMonitor: vi.fn(() => ({ denunciasNovas: 0, faleConoscoNovos: 0 })),
  useIsResponsavelDenuncia: vi.fn(() => ({ data: false, isLoading: false })),
  useContarDenunciasNaoAssumidas: vi.fn(() => ({
    data: { total_vencidas: 0, total_novas_24h: 0, total_nao_assumidas: 0 },
  })),
}));

vi.mock('@/hooks/usePulseSurvey', () => ({
  useMyPulseStatus: () => ({ data: null }),
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

describe('Sidebar — Catálogo Global (Etapa 8.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSidebar = () => {
    return render(
      <TooltipProvider>
        <MemoryRouter initialEntries={['/']}>
          <Sidebar />
        </MemoryRouter>
      </TooltipProvider>
    );
  };

  it('exibe "Catálogo Global" no menu para admin_master', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      user: { id: 'u-master', email: 'josenildo.santos@talentgroup.com.br' } as any,
      role: 'admin_master',
      activeRole: 'admin_master',
      availableRoles: ['admin_master'],
      switchActiveRole: vi.fn(),
      isAuthenticated: true,
      loading: false,
      isSuperAdmin: true,
      isAdmin: true,
      mustChangePassword: false,
      isBlocked: false,
      blockReason: null,
      signOut: vi.fn(),
    });

    vi.mocked(VisibleModulesHook.useVisibleModules).mockReturnValue({
      data: ['/treinamentos', '/treinamentos/catalogo-global'],
      isLoading: false,
      isError: false,
      isSuperAdminBypass: true,
      refetch: vi.fn(),
    });

    vi.mocked(VisibleModulesHook.useIsModuleVisible).mockReturnValue({
      isVisible: true,
      isLoading: false,
      isError: false,
      isSuperAdminBypass: true,
      refetch: vi.fn(),
    });

    renderSidebar();

    const catalogoLink = screen.getByRole('link', { name: /Catálogo Global/i });
    expect(catalogoLink).toBeInTheDocument();
    expect(catalogoLink).toHaveAttribute('href', '/treinamentos/catalogo-global');
  });

  it('NÃO exibe "Catálogo Global" para admin_empresa', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      user: { id: 'u-admin', email: 'admin@horizonte.com' } as any,
      role: 'admin_empresa',
      activeRole: 'admin_empresa',
      availableRoles: ['admin_empresa'],
      switchActiveRole: vi.fn(),
      isAuthenticated: true,
      loading: false,
      isSuperAdmin: false,
      isAdmin: true,
      mustChangePassword: false,
      isBlocked: false,
      blockReason: null,
      signOut: vi.fn(),
    });

    vi.mocked(VisibleModulesHook.useVisibleModules).mockReturnValue({
      data: ['/treinamentos'],
      isLoading: false,
      isError: false,
      isSuperAdminBypass: false,
      refetch: vi.fn(),
    });

    vi.mocked(VisibleModulesHook.useIsModuleVisible).mockReturnValue({
      isVisible: true,
      isLoading: false,
      isError: false,
      isSuperAdminBypass: false,
      refetch: vi.fn(),
    });

    renderSidebar();

    expect(screen.queryByRole('link', { name: /Catálogo Global/i })).not.toBeInTheDocument();
  });

  it('NÃO exibe "Catálogo Global" para colaborador', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      user: { id: 'u-colab', email: 'colab@horizonte.com' } as any,
      role: 'colaborador',
      activeRole: 'colaborador',
      availableRoles: ['colaborador'],
      switchActiveRole: vi.fn(),
      isAuthenticated: true,
      loading: false,
      isSuperAdmin: false,
      isAdmin: false,
      mustChangePassword: false,
      isBlocked: false,
      blockReason: null,
      signOut: vi.fn(),
    });

    vi.mocked(VisibleModulesHook.useVisibleModules).mockReturnValue({
      data: ['/treinamentos'],
      isLoading: false,
      isError: false,
      isSuperAdminBypass: false,
      refetch: vi.fn(),
    });

    vi.mocked(VisibleModulesHook.useIsModuleVisible).mockReturnValue({
      isVisible: true,
      isLoading: false,
      isError: false,
      isSuperAdminBypass: false,
      refetch: vi.fn(),
    });

    renderSidebar();

    expect(screen.queryByRole('link', { name: /Catálogo Global/i })).not.toBeInTheDocument();
  });
});
