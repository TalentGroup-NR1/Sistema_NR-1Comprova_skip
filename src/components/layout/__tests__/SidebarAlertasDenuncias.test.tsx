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
  useCompanyContext: () => ({ selectedCompanyId: 'comp-1' }),
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
  useIsResponsavelDenuncia: vi.fn(() => ({ data: true, isLoading: false })),
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

describe('Sidebar - Alertas e Badges de Denúncias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      isAuthenticated: true,
      role: 'admin_empresa',
      activeRole: 'admin_empresa',
      availableRoles: ['admin_empresa'],
      isSuperAdmin: false,
      user: { id: 'usr-1', email: 'responsavel@empresa.com' },
      switchActiveRole: vi.fn(),
      signOut: vi.fn(),
    } as any);

    vi.mocked(VisibleModulesHook.useVisibleModules).mockReturnValue({
      data: [{ module_key: '/comportamentos-ofensivos', visible: true }],
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

    vi.mocked(DenunciasHook.useIsResponsavelDenuncia).mockReturnValue({
      data: true,
      isLoading: false,
    } as any);
  });

  const renderSidebar = () => {
    const result = render(
      <TooltipProvider>
        <MemoryRouter initialEntries={['/']}>
          <Sidebar />
        </MemoryRouter>
      </TooltipProvider>
    );

    // Expandir grupo Configurações se estiver fechado
    const configBtn = screen.getByRole('button', { name: /Configurações/i });
    if (configBtn.getAttribute('aria-expanded') === 'false') {
      fireEvent.click(configBtn);
    }

    return result;
  };

  it('exibe estado Crítico no item Comportamentos Ofensivos quando total_vencidas > 0', () => {
    vi.mocked(DenunciasHook.useContarDenunciasNaoAssumidas).mockReturnValue({
      data: { total_vencidas: 3, total_novas_24h: 1, total_nao_assumidas: 2 },
      isLoading: false,
    } as any);

    renderSidebar();

    const link = screen.getByRole('link', { name: /Comportamentos Ofensivos/i });
    expect(link).toBeInTheDocument();
    // Prioridade para total_vencidas (3) no badge
    expect(link).toHaveTextContent('3');
    // Classe crítica aplicada
    expect(link.className).toContain('bg-red-50');
    expect(link.className).toContain('text-red-700');
  });

  it('exibe estado Alerta/Urgente no item quando não há vencidas mas há não assumidas', () => {
    vi.mocked(DenunciasHook.useContarDenunciasNaoAssumidas).mockReturnValue({
      data: { total_vencidas: 0, total_novas_24h: 0, total_nao_assumidas: 4 },
      isLoading: false,
    } as any);

    renderSidebar();

    const link = screen.getByRole('link', { name: /Comportamentos Ofensivos/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent('4');
    // Classe de alerta aplicada (não deve ter fundo permanente bg-red-50, apenas hover)
    expect(link.className).toContain('text-red-600');
    expect(link.className.split(' ')).not.toContain('bg-red-50');
  });

  it('exibe estado Normal quando não há vencidas nem pendentes não assumidas', () => {
    vi.mocked(DenunciasHook.useContarDenunciasNaoAssumidas).mockReturnValue({
      data: { total_vencidas: 0, total_novas_24h: 0, total_nao_assumidas: 0 },
      isLoading: false,
    } as any);

    renderSidebar();

    const link = screen.getByRole('link', { name: /Comportamentos Ofensivos/i });
    expect(link).toBeInTheDocument();
    // Não tem badge numérico
    expect(link).not.toHaveTextContent('0');
    // Não tem classes de alerta ou crítico
    expect(link.className).not.toContain('bg-red-50');
    expect(link.className).not.toContain('text-red-600');
  });
});
