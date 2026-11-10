import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AtualizarSenha from '../AtualizarSenha';
import { BrowserRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockUpdateUser = vi.fn();
const mockRpc = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockVerifyOtp = vi.fn();
const mockResetPasswordForEmail = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      updateUser: (...args: any[]) => mockUpdateUser(...args),
      signOut: () => mockSignOut(),
      getSession: () => mockGetSession(),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
      verifyOtp: (...args: any[]) => mockVerifyOtp(...args),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: (...args: any[]) => mockResetPasswordForEmail(...args),
    },
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

describe('AtualizarSenha — Fluxo Anti-Scanner (Convite Seguro)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    mockVerifyOtp.mockResolvedValue({
      data: { user: { id: 'u123', email: 'daniela.alcantara@talentgroup.com.br' }, session: {} },
      error: null,
    });
    mockUpdateUser.mockResolvedValue({ data: {}, error: null });
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });
    mockSignOut.mockResolvedValue({ error: null });
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ip: '72.152.84.181' }),
    } as any);

    // Reset URL
    delete (window as any).location;
    (window as any).location = new URL('https://www.nr-1comprova.com.br/atualizar-senha');
  });

  it('ETAPA 2: ao carregar com token_hash na URL: NÃO chama verifyOtp no mount e exibe formulário', async () => {
    window.location.search = '?token_hash=hash_anti_scanner_123&type=recovery&email=daniela.alcantara@talentgroup.com.br';

    render(
      <BrowserRouter>
        <AtualizarSenha />
      </BrowserRouter>
    );

    // Formulário renderiza diretamente sem erro
    const submitBtn = await screen.findByRole('button', { name: /Definir Senha e Acessar/i });
    expect(submitBtn).toBeInTheDocument();

    // PROVA CRÍTICA ANTI-SCANNER: verifyOtp NUNCA é chamado no mount
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it('ETAPA 2: ao submeter a senha: chama verifyOtp com token_hash, define senha e aceita termos', async () => {
    window.location.search = '?token_hash=hash_anti_scanner_123&type=recovery&email=daniela.alcantara@talentgroup.com.br';

    render(
      <BrowserRouter>
        <AtualizarSenha />
      </BrowserRouter>
    );

    const inputs = await screen.findAllByPlaceholderText('••••••');
    fireEvent.change(inputs[0], { target: { value: 'MinhaNovaSenha@2026' } });
    fireEvent.change(inputs[1], { target: { value: 'MinhaNovaSenha@2026' } });

    fireEvent.click(screen.getByLabelText(/Li e aceito os Termos de Uso/i));
    fireEvent.click(screen.getByLabelText(/Li e aceito a Política de Privacidade/i));

    const submitBtn = screen.getByRole('button', { name: /Definir Senha e Acessar/i });
    expect(submitBtn).not.toBeDisabled();

    // Ação intencional do usuário
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // 1. verifyOtp só agora é invocado
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        type: 'recovery',
        token_hash: 'hash_anti_scanner_123',
      });
      // 2. Senha é atualizada
      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: 'MinhaNovaSenha@2026',
      });
      // 3. Termos LGPD aceitos
      expect(mockRpc).toHaveBeenCalledWith('accept_company_terms', expect.any(Object));
      // 4. Logout e redirect para login
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/auth');
    });
  });

  it('ETAPA 2: quando token já foi usado ou expirou: exibe erro claro e botão "Solicitar novo link" com e-mail preenchido', async () => {
    window.location.search = '?token_hash=hash_ja_usado&type=recovery&email=daniela.alcantara@talentgroup.com.br';

    mockVerifyOtp.mockResolvedValueOnce({
      data: null,
      error: { message: 'Token has expired or is invalid', code: 'otp_expired' },
    });

    render(
      <BrowserRouter>
        <AtualizarSenha />
      </BrowserRouter>
    );

    const inputs = await screen.findAllByPlaceholderText('••••••');
    fireEvent.change(inputs[0], { target: { value: 'MinhaNovaSenha@2026' } });
    fireEvent.change(inputs[1], { target: { value: 'MinhaNovaSenha@2026' } });

    fireEvent.click(screen.getByLabelText(/Li e aceito os Termos de Uso/i));
    fireEvent.click(screen.getByLabelText(/Li e aceito a Política de Privacidade/i));

    const submitBtn = screen.getByRole('button', { name: /Definir Senha e Acessar/i });
    fireEvent.click(submitBtn);

    // Exibe mensagem de erro
    await waitFor(() => {
      expect(screen.getByText('Este link expirou ou já foi utilizado.')).toBeInTheDocument();
    });

    // Botão de solicitar novo link disponível
    const solicitBtn = screen.getByRole('button', { name: /Solicitar novo link/i });
    expect(solicitBtn).toBeInTheDocument();

    // Ao clicar, o modal abre com o e-mail preenchido dos parâmetros
    fireEvent.click(solicitBtn);
    const emailInput = await screen.findByPlaceholderText('seu.email@exemplo.com');
    expect(emailInput).toHaveValue('daniela.alcantara@talentgroup.com.br');

    // Ao confirmar, chama resetPasswordForEmail com o e-mail preenchido
    const enviarBtn = screen.getByRole('button', { name: /Enviar novo link/i });
    fireEvent.click(enviarBtn);

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'daniela.alcantara@talentgroup.com.br',
        expect.objectContaining({ redirectTo: expect.stringContaining('/atualizar-senha') })
      );
    });
  });

  it('ETAPA 2: links legados (hash #type=recovery ou #access_token): mantém compatibilidade', async () => {
    mockOnAuthStateChange.mockImplementation((callback: any) => {
      callback('PASSWORD_RECOVERY', { user: { id: 'legado-1', email: 'legado@talentgroup.com.br' } });
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
      <BrowserRouter>
        <AtualizarSenha />
      </BrowserRouter>
    );

    const inputs = await screen.findAllByPlaceholderText('••••••');
    fireEvent.change(inputs[0], { target: { value: 'SenhaLegada123!' } });
    fireEvent.change(inputs[1], { target: { value: 'SenhaLegada123!' } });

    fireEvent.click(screen.getByLabelText(/Li e aceito os Termos de Uso/i));
    fireEvent.click(screen.getByLabelText(/Li e aceito a Política de Privacidade/i));

    const submitBtn = screen.getByRole('button', { name: /Definir Senha e Acessar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // No fluxo legado com sessão, verifyOtp não é chamado, mas updateUser é
      expect(mockVerifyOtp).not.toHaveBeenCalled();
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'SenhaLegada123!' });
    });
  });
});
