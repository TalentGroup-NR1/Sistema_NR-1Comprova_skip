import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLoginBranding } from '../useLoginBranding';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_BRANDING } from '../useBranding';
import { applyThemeToRoot } from '@/lib/colorUtils';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe('useLoginBranding - Resolução dinâmica no login e White-label', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.title = 'NR-1Comprova';
  });

  it('1. Login por e-mail exato: encontra empresa e aplica branding customizado e variáveis CSS', async () => {
    const mockHorizonte = {
      found: true,
      brand_name: 'Horizonte Contabilidade',
      logo_url: 'https://alneozvrsuwszlkisbyo.supabase.co/storage/v1/object/public/logos/8ce4c4cd/logo.jpg',
      primary_color: '#0D13C5',
      favicon_url: null,
    };

    (supabase.rpc as any).mockResolvedValueOnce({ data: mockHorizonte, error: null });

    const { result } = renderHook(() => useLoginBranding());

    await act(async () => {
      await result.current.resolveEmail('admin@horizontecontabil.com.br');
    });

    expect(supabase.rpc).toHaveBeenCalledWith('get_company_branding_by_email', {
      p_email: 'admin@horizontecontabil.com.br',
    });

    expect(result.current.branding.isCustom).toBe(true);
    expect(result.current.branding.brandName).toBe('Horizonte Contabilidade');
    expect(result.current.branding.primaryColor).toBe('#0D13C5');
    expect(result.current.branding.logoUrl).toBe(mockHorizonte.logo_url);
    expect(document.title).toBe('Horizonte Contabilidade — NR-1Comprova');
    expect(document.documentElement.style.getPropertyValue('--primary')).not.toBe('');
  });

  it('2. Login por e-mail inexistente ou desconhecido: mantém o fallback padrão oficial da plataforma', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({ data: { found: false }, error: null });

    const { result } = renderHook(() => useLoginBranding());

    await act(async () => {
      await result.current.resolveEmail('desconhecido@empresa.com.br');
    });

    expect(result.current.branding.isCustom).toBe(false);
    expect(result.current.branding.brandName).toBe(DEFAULT_BRANDING.brandName);
    expect(result.current.branding.primaryColor).toBe(DEFAULT_BRANDING.primaryColor);
    expect(result.current.branding.logoUrl).toBe(DEFAULT_BRANDING.logoUrl);
    expect(document.title).toBe('NR-1Comprova');
  });

  it('3. Limpeza do campo ou e-mail inválido reverte imediatamente para a identidade padrão oficial', async () => {
    // Primeiro resolve Horizonte
    (supabase.rpc as any).mockResolvedValueOnce({
      data: {
        found: true,
        brand_name: 'Horizonte Contabilidade',
        logo_url: 'https://logo.horizonte',
        primary_color: '#0D13C5',
      },
      error: null,
    });

    const { result } = renderHook(() => useLoginBranding());

    await act(async () => {
      await result.current.resolveEmail('admin@horizontecontabil.com.br');
    });
    expect(result.current.branding.isCustom).toBe(true);

    // Agora o usuário apaga o campo
    await act(async () => {
      await result.current.resolveEmail('');
    });

    expect(result.current.branding.isCustom).toBe(false);
    expect(result.current.branding.brandName).toBe(DEFAULT_BRANDING.brandName);
    expect(result.current.branding.primaryColor).toBe(DEFAULT_BRANDING.primaryColor);
    expect(result.current.branding.logoUrl).toBe(DEFAULT_BRANDING.logoUrl);
    expect(document.title).toBe('NR-1Comprova');
  });

  it('4. Multiempresa no login: contrato de resolução prioriza vínculo is_default', async () => {
    // Simula a resposta da RPC que no banco faz: ORDER BY uc.is_default DESC, uc.created_at ASC LIMIT 1
    const mockVincDefault = {
      found: true,
      brand_name: 'Empresa Principal (Default)',
      logo_url: 'https://logo.default.com/logo.png',
      primary_color: '#10B981',
      favicon_url: null,
    };

    (supabase.rpc as any).mockResolvedValueOnce({ data: mockVincDefault, error: null });

    const { result } = renderHook(() => useLoginBranding());

    await act(async () => {
      await result.current.resolveEmail('usuario.multiempresa@grupo.com.br');
    });

    expect(result.current.branding.isCustom).toBe(true);
    expect(result.current.branding.brandName).toBe('Empresa Principal (Default)');
    expect(result.current.branding.primaryColor).toBe('#10B981');
  });

  it('5. Troca de empresa atualiza o tema: applyThemeToRoot altera as variáveis CSS em :root', () => {
    // Aplica Empresa A (#0D13C5)
    applyThemeToRoot('#0D13C5');
    const primaryA = document.documentElement.style.getPropertyValue('--primary');
    const sidebarA = document.documentElement.style.getPropertyValue('--sidebar-primary');
    expect(primaryA).not.toBe('');
    expect(sidebarA).toBe(primaryA);

    // Troca para Empresa B (#10B981)
    applyThemeToRoot('#10B981');
    const primaryB = document.documentElement.style.getPropertyValue('--primary');
    const sidebarB = document.documentElement.style.getPropertyValue('--sidebar-primary');
    expect(primaryB).not.toBe(primaryA);
    expect(sidebarB).toBe(primaryB);

    // Fallback seguro se valor for inválido ou nulo
    applyThemeToRoot(null);
    const primaryFallback = document.documentElement.style.getPropertyValue('--primary');
    expect(primaryFallback).not.toBe('');
  });
});
