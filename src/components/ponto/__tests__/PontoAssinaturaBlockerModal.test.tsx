import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PontoAssinaturaBlockerModal } from '../PontoAssinaturaBlockerModal';
import * as AuthHook from '@/hooks/useAuth';
import * as VisibleModulesHook from '@/hooks/useVisibleModules';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useVisibleModules', () => ({
  useIsModuleVisible: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PontoAssinaturaBlockerModal com Guard de Módulo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('permanece 100% oculto e NÃO dispara RPCs quando o módulo ponto está desativado para a empresa', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      user: { id: 'colab-user-123' },
    } as any);

    vi.mocked(VisibleModulesHook.useIsModuleVisible).mockReturnValue({
      isVisible: false,
      isLoading: false,
      isError: false,
      isSuperAdminBypass: false,
      refetch: vi.fn(),
    });

    const { container } = renderWithProviders(<PontoAssinaturaBlockerModal />);

    // Deve retornar null / árvore vazia
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/Ponto fechado — assinatura pendente/i)).not.toBeInTheDocument();

    // Nenhuma RPC de fechamento ou espelho pode ser chamada
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('permanece oculto (Fail-Closed) enquanto o status do módulo estiver carregando', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      user: { id: 'colab-user-123' },
    } as any);

    vi.mocked(VisibleModulesHook.useIsModuleVisible).mockReturnValue({
      isVisible: false,
      isLoading: true,
      isError: false,
      isSuperAdminBypass: false,
      refetch: vi.fn(),
    });

    const { container } = renderWithProviders(<PontoAssinaturaBlockerModal />);

    expect(container).toBeEmptyDOMElement();
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('permanece oculto (Fail-Closed) em caso de erro na checagem de visibilidade', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      user: { id: 'colab-user-123' },
    } as any);

    vi.mocked(VisibleModulesHook.useIsModuleVisible).mockReturnValue({
      isVisible: false,
      isLoading: false,
      isError: true,
      isSuperAdminBypass: false,
      refetch: vi.fn(),
    });

    const { container } = renderWithProviders(<PontoAssinaturaBlockerModal />);

    expect(container).toBeEmptyDOMElement();
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
