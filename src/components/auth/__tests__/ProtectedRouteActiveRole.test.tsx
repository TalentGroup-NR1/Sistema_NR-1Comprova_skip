import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from '../ProtectedRoute';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as useAuthModule from '@/hooks/useAuth';

vi.mock('@/hooks/useVisibleModules', () => ({
  useIsModuleVisible: () => ({
    isVisible: true,
    isLoading: false,
    isError: false,
    isSuperAdminBypass: false,
    refetch: vi.fn(),
  }),
}));

describe('ProtectedRoute — Validação contra activeRole e Redirecionamento Amigável', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderRoute = (initialPath: string, role: string) => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      role: role as any,
      activeRole: role as any,
      roles: [role as any],
      availableRoles: [role as any],
      switchActiveRole: vi.fn(),
      loading: false,
      profileLoaded: true,
      mustChangePassword: false,
      isBlocked: false,
      blockReason: null,
      isAdminMaster: role === 'admin_master',
      isAdminEmpresa: role === 'admin_empresa',
      isAdmin: role === 'admin_master' || role === 'admin_empresa',
      isSuperAdmin: false,
      user: { id: 'test-u' },
      session: {},
      companyId: 'comp-1',
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshUserData: vi.fn(),
      clearMustChangePassword: vi.fn(),
    } as any);

    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/" element={<div data-testid="home-page">Home Dashboard</div>} />
          <Route
            path="/demissoes"
            element={
              <ProtectedRoute allowedRoles={['admin_master', 'admin_empresa', 'analista_rh']} moduleKey="/demissoes">
                <div data-testid="demissoes-page">Página de Demissões</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/minhas-ferias"
            element={
              <ProtectedRoute allowedRoles={['colaborador']} moduleKey="/ferias">
                <div data-testid="minhas-ferias-page">Página Minhas Férias</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );
  };

  it('permite acesso a /demissoes quando activeRole é admin_empresa', () => {
    renderRoute('/demissoes', 'admin_empresa');
    expect(screen.getByTestId('demissoes-page')).toBeInTheDocument();
  });

  it('redireciona amigavelmente para / quando activeRole é colaborador e tenta /demissoes', () => {
    renderRoute('/demissoes', 'colaborador');
    // Deve redirecionar para home sem 404
    expect(screen.queryByTestId('demissoes-page')).not.toBeInTheDocument();
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  it('permite acesso a /minhas-ferias quando activeRole é colaborador', () => {
    renderRoute('/minhas-ferias', 'colaborador');
    expect(screen.getByTestId('minhas-ferias-page')).toBeInTheDocument();
  });

  it('redireciona amigavelmente para / quando activeRole é admin_empresa e tenta /minhas-ferias', () => {
    renderRoute('/minhas-ferias', 'admin_empresa');
    expect(screen.queryByTestId('minhas-ferias-page')).not.toBeInTheDocument();
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });
});
