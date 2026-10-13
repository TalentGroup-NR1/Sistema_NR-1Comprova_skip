import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
      isSuperAdminBypass: false,
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

  it('bloqueia e exibe ModuleNotContractedScreen quando o módulo não está contratado', () => {
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
      isSuperAdminBypass: false,
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

    expect(screen.getByText('Módulo não contratado')).toBeInTheDocument();
    expect(screen.getByText(/Avaliação de Desempenho/)).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo do Módulo de Avaliações')).not.toBeInTheDocument();
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
      isSuperAdminBypass: true,
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
