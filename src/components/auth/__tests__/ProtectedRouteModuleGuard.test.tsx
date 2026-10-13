import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import * as AuthHook from '@/hooks/useAuth';
import * as VisibleModulesHook from '@/hooks/useVisibleModules';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useVisibleModules', () => ({
  useIsModuleVisible: vi.fn(),
}));

describe('ProtectedRoute com Guarda de Módulos (moduleKey)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permite acesso quando o módulo está contratado/visível', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      isAuthenticated: true,
      loading: false,
      role: 'colaborador',
      isBlocked: false,
      mustChangePassword: false,
    } as any);

    vi.mocked(VisibleModulesHook.useIsModuleVisible).mockReturnValue({
      isVisible: true,
      isLoading: false,
      isError: false,
      isSuperAdminBypass: false,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/avaliacoes']}>
        <Routes>
          <Route
            path="/avaliacoes"
            element={
              <ProtectedRoute moduleKey="/avaliacoes">
                <div>Conteúdo do Módulo de Avaliações</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Conteúdo do Módulo de Avaliações')).toBeInTheDocument();
  });

  it('bloqueia rota direta com ModuleNotContractedScreen quando o módulo não está contratado', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      isAuthenticated: true,
      loading: false,
      role: 'colaborador',
      isBlocked: false,
      mustChangePassword: false,
    } as any);

    vi.mocked(VisibleModulesHook.useIsModuleVisible).mockReturnValue({
      isVisible: false,
      isLoading: false,
      isError: false,
      isSuperAdminBypass: false,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/ferias']}>
        <Routes>
          <Route
            path="/ferias"
            element={
              <ProtectedRoute moduleKey="/ferias">
                <div>Painel de Férias</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Módulo não contratado')).toBeInTheDocument();
    expect(screen.getByText(/Gestão de Férias/)).toBeInTheDocument();
    expect(screen.queryByText('Painel de Férias')).not.toBeInTheDocument();
  });

  it('exibe loader durante carregamento inicial de visibilidade (evita flash)', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      isAuthenticated: true,
      loading: false,
      role: 'admin_empresa',
      isBlocked: false,
      mustChangePassword: false,
    } as any);

    vi.mocked(VisibleModulesHook.useIsModuleVisible).mockReturnValue({
      isVisible: false,
      isLoading: true,
      isError: false,
      isSuperAdminBypass: false,
      refetch: vi.fn(),
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/ferias']}>
        <Routes>
          <Route
            path="/ferias"
            element={
              <ProtectedRoute moduleKey="/ferias">
                <div>Painel de Férias</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // Loader está ativo e conteúdo bloqueado/protegido
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByText('Painel de Férias')).not.toBeInTheDocument();
    expect(screen.queryByText('Módulo não contratado')).not.toBeInTheDocument();
  });

  it('em erro persistente da RPC, oculta módulo e oferece opção de tentar novamente', () => {
    const refetchMock = vi.fn();

    vi.mocked(AuthHook.useAuth).mockReturnValue({
      isAuthenticated: true,
      loading: false,
      role: 'admin_empresa',
      isBlocked: false,
      mustChangePassword: false,
    } as any);

    vi.mocked(VisibleModulesHook.useIsModuleVisible).mockReturnValue({
      isVisible: false,
      isLoading: false,
      isError: true,
      isSuperAdminBypass: false,
      refetch: refetchMock,
    });

    render(
      <MemoryRouter initialEntries={['/ferias']}>
        <Routes>
          <Route
            path="/ferias"
            element={
              <ProtectedRoute moduleKey="/ferias">
                <div>Painel de Férias</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Instabilidade temporária')).toBeInTheDocument();
    expect(screen.queryByText('Painel de Férias')).not.toBeInTheDocument();

    const retryBtn = screen.getByText('Tentar Novamente');
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(refetchMock).toHaveBeenCalled();
  });

  it('permite Super Admin acessar com banner informativo mesmo se módulo desativado', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      isAuthenticated: true,
      loading: false,
      role: 'super_admin',
      isSuperAdmin: true,
      isBlocked: false,
      mustChangePassword: false,
    } as any);

    vi.mocked(VisibleModulesHook.useIsModuleVisible).mockReturnValue({
      isVisible: true,
      isLoading: false,
      isError: false,
      isSuperAdminBypass: true,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/cuidar-mais']}>
        <Routes>
          <Route
            path="/cuidar-mais"
            element={
              <ProtectedRoute moduleKey="/cuidar-mais">
                <div>Painel Cuidar+</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Painel Cuidar+')).toBeInTheDocument();
    expect(screen.getByText(/Visualizando como Super Admin/)).toBeInTheDocument();
  });
});
