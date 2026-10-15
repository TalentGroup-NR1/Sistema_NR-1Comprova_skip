import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TermsReacceptanceModal } from '../TermsReacceptanceModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TERMS_VERSION, PRIVACY_VERSION } from '@/lib/legal';

// Mocks
const mockSignOut = vi.fn();
let mockAuthState = {
  user: { id: 'user-admin-1', email: 'admin@empresa.com.br' } as any,
  role: 'admin_empresa' as any,
  isAdmin: true,
  isSuperAdmin: false,
  loading: false,
  profileLoaded: true,
  signOut: mockSignOut,
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuthState,
}));

const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('TermsReacceptanceModal — Guard de Re-aceite de Termos e LGPD', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockAuthState = {
      user: { id: 'user-admin-1', email: 'admin@empresa.com.br' },
      role: 'admin_empresa',
      isAdmin: true,
      isSuperAdmin: false,
      loading: false,
      profileLoaded: true,
      signOut: mockSignOut,
    };

    mockRpc.mockResolvedValue({
      data: { success: true, already_accepted: false },
      error: null,
    });

    // Mock fetch para detecção de IP
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ip: '189.40.12.5' }),
    } as any);
  });

  it('exibe o modal bloqueador quando o admin da empresa NÃO possui aceite vigente', async () => {
    // terms_acceptance retorna null/vazio (sem aceite prévio)
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    renderWithClient(<TermsReacceptanceModal />);

    // Aguarda exibição do modal e conteúdo obrigatório
    const title = await screen.findByText('Termos de Uso e Política de Privacidade');
    expect(title).toBeInTheDocument();

    expect(screen.getByTestId('reaccept-terms-checkbox')).toBeInTheDocument();
    expect(screen.getByTestId('reaccept-privacy-checkbox')).toBeInTheDocument();

    const submitBtn = screen.getByTestId('reaccept-submit-btn');
    expect(submitBtn).toBeDisabled();
  });

  it('habilita o botão apenas quando ambos os checkboxes forem marcados e chama RPC accept_company_terms no clique', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    renderWithClient(<TermsReacceptanceModal />);

    const submitBtn = await screen.findByTestId('reaccept-submit-btn');
    const checkTerms = screen.getByTestId('reaccept-terms-checkbox');
    const checkPrivacy = screen.getByTestId('reaccept-privacy-checkbox');

    expect(submitBtn).toBeDisabled();

    // Marca apenas Termos
    fireEvent.click(checkTerms);
    expect(submitBtn).toBeDisabled();

    // Marca também Privacidade
    fireEvent.click(checkPrivacy);
    expect(submitBtn).not.toBeDisabled();

    // Clica em Confirmar e Continuar
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('accept_company_terms', {
        p_terms_version: TERMS_VERSION,
        p_privacy_version: PRIVACY_VERSION,
        p_ip_address: '189.40.12.5',
        p_user_agent: expect.any(String),
      });
    });
  });

  it('NÃO exibe o modal quando o usuário já possui aceite vigente em terms_acceptance', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'existing-acceptance-uuid' },
        error: null,
      }),
    });

    renderWithClient(<TermsReacceptanceModal />);

    // Aguarda resolução da query
    await waitFor(() => {
      expect(screen.queryByText('Termos de Uso e Política de Privacidade')).not.toBeInTheDocument();
      expect(screen.queryByTestId('reaccept-submit-btn')).not.toBeInTheDocument();
    });
  });

  it('dispensa super admins da plataforma do guard (bypass de operador do SaaS)', async () => {
    mockAuthState = {
      ...mockAuthState,
      role: 'admin_master',
      isSuperAdmin: true,
    };

    renderWithClient(<TermsReacceptanceModal />);

    expect(screen.queryByText('Termos de Uso e Política de Privacidade')).not.toBeInTheDocument();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('dispensa colaboradores e cargos não-administrativos', async () => {
    mockAuthState = {
      ...mockAuthState,
      role: 'colaborador',
      isAdmin: false,
    };

    renderWithClient(<TermsReacceptanceModal />);

    expect(screen.queryByText('Termos de Uso e Política de Privacidade')).not.toBeInTheDocument();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('permite que o usuário opte por sair da conta através do botão de logout', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    renderWithClient(<TermsReacceptanceModal />);

    const signOutBtn = await screen.findByRole('button', { name: /Sair da conta/i });
    fireEvent.click(signOutBtn);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
