import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AtualizarSenha from '../AtualizarSenha';
import { BrowserRouter } from 'react-router-dom';
import { TERMS_VERSION, PRIVACY_VERSION } from '@/lib/legal';

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

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      updateUser: (...args: any[]) => mockUpdateUser(...args),
      signOut: () => mockSignOut(),
      getSession: () => mockGetSession(),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
      verifyOtp: vi.fn().mockResolvedValue({ error: null }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    },
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

describe('AtualizarSenha — Aceite Obrigatório de Termos e Privacidade (LGPD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'test-user-id', email: 'cliente@empresa.com.br' } } },
    });

    mockOnAuthStateChange.mockImplementation((callback: any) => {
      callback('PASSWORD_RECOVERY', { user: { id: 'test-user-id', email: 'cliente@empresa.com.br' } });
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    mockUpdateUser.mockResolvedValue({ data: {}, error: null });
    mockRpc.mockResolvedValue({ data: { success: true, already_accepted: false }, error: null });
    mockSignOut.mockResolvedValue({ error: null });

    // Mock fetch para ipify
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ip: '177.136.240.10' }),
    } as any);
  });

  it('exibe os dois checkboxes obrigatórios com links para /termos e /privacidade', async () => {
    render(
      <BrowserRouter>
        <AtualizarSenha />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Li e aceito os Termos de Uso/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Li e aceito a Política de Privacidade/i)).toBeInTheDocument();
    });

    const linkTermos = screen.getByRole('link', { name: /Termos de Uso/i });
    expect(linkTermos).toHaveAttribute('href', '/termos');
    expect(linkTermos).toHaveAttribute('target', '_blank');

    const linkPrivacidade = screen.getByRole('link', { name: /Política de Privacidade/i });
    expect(linkPrivacidade).toHaveAttribute('href', '/privacidade');
    expect(linkPrivacidade).toHaveAttribute('target', '_blank');
  });

  it('mantém o botão desabilitado enquanto ambos os checkboxes não forem marcados', async () => {
    render(
      <BrowserRouter>
        <AtualizarSenha />
      </BrowserRouter>
    );

    const submitBtn = await screen.findByRole('button', { name: /Definir Senha e Acessar/i });
    const checkTermos = screen.getByLabelText(/Li e aceito os Termos de Uso/i);
    const checkPrivacidade = screen.getByLabelText(/Li e aceito a Política de Privacidade/i);

    // 1. Ambos desmarcados -> desabilitado
    expect(submitBtn).toBeDisabled();

    // 2. Apenas Termos marcado -> desabilitado
    fireEvent.click(checkTermos);
    expect(submitBtn).toBeDisabled();

    // 3. Desmarca termos e marca apenas privacidade -> desabilitado
    fireEvent.click(checkTermos);
    fireEvent.click(checkPrivacidade);
    expect(submitBtn).toBeDisabled();

    // 4. Ambos marcados -> habilitado
    fireEvent.click(checkTermos);
    expect(submitBtn).not.toBeDisabled();
  });

  it('no submit com sucesso: chama updateUser e accept_company_terms via RPC com versões vigentes e IP', async () => {
    render(
      <BrowserRouter>
        <AtualizarSenha />
      </BrowserRouter>
    );

    const inputs = await screen.findAllByPlaceholderText('••••••');
    const pwdInput = inputs[0];
    const confirmInput = inputs[1];

    fireEvent.change(pwdInput, { target: { value: 'NovaSenhaSegura123!' } });
    fireEvent.change(confirmInput, { target: { value: 'NovaSenhaSegura123!' } });

    const checkTermos = screen.getByLabelText(/Li e aceito os Termos de Uso/i);
    const checkPrivacidade = screen.getByLabelText(/Li e aceito a Política de Privacidade/i);

    fireEvent.click(checkTermos);
    fireEvent.click(checkPrivacidade);

    const submitBtn = screen.getByRole('button', { name: /Definir Senha e Acessar/i });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'NovaSenhaSegura123!' });
      expect(mockRpc).toHaveBeenCalledWith('accept_company_terms', {
        p_terms_version: TERMS_VERSION,
        p_privacy_version: PRIVACY_VERSION,
        p_ip_address: '177.136.240.10',
        p_user_agent: expect.any(String),
      });
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/auth');
    });
  });

  it('se a RPC retornar erro: exibe toast de aviso claro mas NÃO trava o redirecionamento do usuário', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Timeout temporário de banco' },
    });

    render(
      <BrowserRouter>
        <AtualizarSenha />
      </BrowserRouter>
    );

    const inputs = await screen.findAllByPlaceholderText('••••••');
    fireEvent.change(inputs[0], { target: { value: 'NovaSenhaSegura123!' } });
    fireEvent.change(inputs[1], { target: { value: 'NovaSenhaSegura123!' } });

    fireEvent.click(screen.getByLabelText(/Li e aceito os Termos de Uso/i));
    fireEvent.click(screen.getByLabelText(/Li e aceito a Política de Privacidade/i));

    fireEvent.click(screen.getByRole('button', { name: /Definir Senha e Acessar/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalled();
      expect(mockRpc).toHaveBeenCalled();
      // Toast de aviso para o usuário sobre a instabilidade dos termos
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'Aviso sobre registro de termos',
        })
      );
      // Fluxo prossegue sem travar: signOut e navegação acontecem
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/auth');
    });
  });
});
