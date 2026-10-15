import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WelcomeWizard, getWizardSessionDismissedKey } from '../WelcomeWizard';
import * as AuthHook from '@/hooks/useAuth';
import * as BrandingHook from '@/hooks/useBranding';
import * as OnboardingHook from '@/hooks/useOnboardingProgress';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useBranding', () => ({
  useBranding: vi.fn(),
}));

vi.mock('@/hooks/useOnboardingProgress', () => ({
  useOnboardingProgress: vi.fn(),
  useSaveOnboardingProgress: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('@/components/empresa/BrandingForm', () => ({
  BrandingForm: ({ removeLogo, onRemoveLogoChange, onLogoFileChange }: any) => (
    <div data-testid="mock-branding-form">
      <span>{removeLogo ? 'Logo Marcado Para Remoção' : 'Logo Normal'}</span>
      <button type="button" onClick={() => onRemoveLogoChange?.(true)}>
        Simular Remover Logo
      </button>
      <button
        type="button"
        onClick={() => onLogoFileChange?.(new File(['dummy'], 'novo.png', { type: 'image/png' }))}
      >
        Simular Upload Novo Logo
      </button>
    </div>
  ),
  uploadCompanyLogo: vi.fn(),
}));

describe('WelcomeWizard - Fechamento Determinístico e Descarte na Sessão', () => {
  let queryClient: QueryClient;
  let mockUpsert: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    mockUpsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({
      upsert: mockUpsert,
    } as any);

    vi.mocked(AuthHook.useAuth).mockReturnValue({
      companyId: 'company-test-123',
      role: 'admin_empresa',
      loading: false,
    } as any);

    vi.mocked(BrandingHook.useBranding).mockReturnValue({
      isInternal: false,
      isLoading: false,
      brandName: '',
      primaryColor: '#C8102E',
      logoUrl: null,
    } as any);

    vi.mocked(OnboardingHook.useOnboardingProgress).mockReturnValue({
      data: null,
      isFetching: false,
      isFetched: true,
    } as any);
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <WelcomeWizard />
      </QueryClientProvider>
    );
  };

  it('1. abre o modal quando o usuário é elegível e não possui progresso concluído/descartado', () => {
    renderComponent();
    expect(screen.getByText('Identidade Visual da Empresa')).toBeInTheDocument();
    expect(screen.getByText('Continuar depois')).toBeInTheDocument();
  });

  it('2. clique em "Continuar depois" fecha o modal imediatamente e dispara upsert assíncrono 1x', async () => {
    renderComponent();

    const btnContinuarDepois = screen.getByText('Continuar depois');
    expect(btnContinuarDepois).toBeInTheDocument();

    // Clica em "Continuar depois"
    await act(async () => {
      fireEvent.click(btnContinuarDepois);
    });

    // 1. Modal fecha imediatamente (síncrono na sessão)
    expect(screen.queryByText('Identidade Visual da Empresa')).not.toBeInTheDocument();

    // 2. Upsert é disparado exatamente 1 vez com dismissed: true
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: 'company-test-123',
        dismissed: true,
      }),
      { onConflict: 'company_id' }
    );

    // 3. Flag de sessão é registrada
    const sessionKey = getWizardSessionDismissedKey('company-test-123');
    expect(sessionStorage.getItem(sessionKey)).toBe('true');
  });

  it('3. modal NÃO reabre na mesma sessão mesmo após re-render ou re-fetch de queries', async () => {
    const { rerender } = renderComponent();

    const btnContinuarDepois = screen.getByText('Continuar depois');
    await act(async () => {
      fireEvent.click(btnContinuarDepois);
    });

    expect(screen.queryByText('Identidade Visual da Empresa')).not.toBeInTheDocument();

    // Simula refetch onde data ainda volta como null (disputa de estado anterior)
    vi.mocked(OnboardingHook.useOnboardingProgress).mockReturnValue({
      data: null,
      isFetching: false,
      isFetched: true,
    } as any);

    rerender(
      <QueryClientProvider client={queryClient}>
        <WelcomeWizard />
      </QueryClientProvider>
    );

    // O modal deve continuar fechado devido ao sessionDismissed
    expect(screen.queryByText('Identidade Visual da Empresa')).not.toBeInTheDocument();
  });

  it('4. se a persistência falhar, o modal permanece fechado na sessão e registra log seguro', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUpsert.mockResolvedValueOnce({
      error: { message: 'Database connection timeout' },
    });

    renderComponent();

    const btnContinuarDepois = screen.getByText('Continuar depois');
    await act(async () => {
      fireEvent.click(btnContinuarDepois);
    });

    // Modal permanece fechado na sessão
    expect(screen.queryByText('Identidade Visual da Empresa')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[WelcomeWizard] Falha ao persistir descarte no banco:',
        'Database connection timeout'
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('5. (b) salvar com removeLogo=true → RPC chamada com _brand_logo_url: null e _remove_logo: true', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: 'company-test-123', error: null });
    vi.mocked(supabase.rpc).mockImplementation(mockRpc);

    renderComponent();

    // Simula clique em "Remover Logo" dentro do BrandingForm
    const btnSimularRemover = screen.getByText('Simular Remover Logo');
    await act(async () => {
      fireEvent.click(btnSimularRemover);
    });

    expect(screen.getByText('Logo Marcado Para Remoção')).toBeInTheDocument();

    // Clica em Salvar
    const btnSalvar = screen.getByText('Salvar');
    await act(async () => {
      fireEvent.click(btnSalvar);
    });

    // RPC atualizar_branding_empresa deve ser chamada com _brand_logo_url: null
    expect(mockRpc).toHaveBeenCalledWith(
      'atualizar_branding_empresa',
      expect.objectContaining({
        _brand_logo_url: null,
        _remove_logo: true,
      })
    );
  });

  it('6. (d) salvar sem remoção → RPC NÃO recebe _brand_logo_url: null', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: 'company-test-123', error: null });
    vi.mocked(supabase.rpc).mockImplementation(mockRpc);

    renderComponent();

    expect(screen.getByText('Logo Normal')).toBeInTheDocument();

    // Clica em Salvar sem remover
    const btnSalvar = screen.getByText('Salvar');
    await act(async () => {
      fireEvent.click(btnSalvar);
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'atualizar_branding_empresa',
      expect.not.objectContaining({
        _brand_logo_url: null,
      })
    );
  });

  it('7. (c) selecionar novo arquivo após remover → removeLogo reseta para false', async () => {
    renderComponent();

    // 1. Marca para remover
    const btnSimularRemover = screen.getByText('Simular Remover Logo');
    await act(async () => {
      fireEvent.click(btnSimularRemover);
    });
    expect(screen.getByText('Logo Marcado Para Remoção')).toBeInTheDocument();

    // 2. Seleciona novo arquivo
    const btnSimularUpload = screen.getByText('Simular Upload Novo Logo');
    await act(async () => {
      fireEvent.click(btnSimularUpload);
    });

    // 3. removeLogo foi resetado para false
    expect(screen.getByText('Logo Normal')).toBeInTheDocument();
  });
});
