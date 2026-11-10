import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrandingDocumentEffect } from '../BrandingDocumentEffect';
import * as useBrandingModule from '@/hooks/useBranding';
import * as useAuthModule from '@/hooks/useAuth';
import * as colorUtilsModule from '@/lib/colorUtils';

describe('BrandingDocumentEffect - Montagem Real e Resiliência de Raiz', () => {
  const originalTitle = document.title;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    document.title = 'NR-1Comprova';
    document.documentElement.removeAttribute('style');
    const existingIcon = document.querySelector("link[rel='icon']");
    if (existingIcon) {
      existingIcon.remove();
    }
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    document.title = originalTitle;
    warnSpy.mockRestore();
  });

  it('1. Montagem real com tema corporativo (sem mockar colorUtils): aplica CSS variables, title e favicon sem erros', () => {
    vi.spyOn(useBrandingModule, 'useBranding').mockReturnValue({
      brandName: 'Horizonte Contabilidade',
      logoUrl: 'https://cdn.nr1comprova.com.br/horizonte-logo.png',
      primaryColor: '#0D13C5',
      faviconUrl: 'https://cdn.nr1comprova.com.br/horizonte-favicon.ico',
      isCustom: true,
      isLoading: false,
    });

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'user-horizonte-1' },
      isAuthenticated: true,
      loading: false,
    } as any);

    // Monta o componente real na árvore
    expect(() => {
      render(<BrandingDocumentEffect />);
    }).not.toThrow();

    // Valida que o DOM foi manipulado corretamente pelo código real do colorUtils
    expect(document.title).toBe('Horizonte Contabilidade — NR-1Comprova');
    
    const iconLink = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    expect(iconLink).not.toBeNull();
    expect(iconLink?.href).toBe('https://cdn.nr1comprova.com.br/horizonte-favicon.ico');

    // CSS variables aplicadas em :root pelo applyThemeToRoot real
    const rootStyle = document.documentElement.style;
    expect(rootStyle.getPropertyValue('--primary')).toBeTruthy();
    expect(rootStyle.getPropertyValue('--ring')).toBeTruthy();
    expect(rootStyle.getPropertyValue('--sidebar-primary')).toBeTruthy();
    expect(rootStyle.getPropertyValue('--primary-foreground')).toBeTruthy();
    expect(rootStyle.getPropertyValue('--gradient-primary')).toContain('linear-gradient');

    // Valida que nenhuma exceção vazou
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('2. Montagem real com branding padrão da plataforma: preserva título limpo e tema oficial', () => {
    vi.spyOn(useBrandingModule, 'useBranding').mockReturnValue({
      brandName: 'NR-1Comprova',
      logoUrl: '/images/nr-1comprova-logo.png',
      primaryColor: '#C8102E',
      faviconUrl: '/favicon.ico',
      isCustom: false,
      isLoading: false,
    });

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
    } as any);

    expect(() => {
      render(<BrandingDocumentEffect />);
    }).not.toThrow();

    expect(document.title).toBe('NR-1Comprova');
    expect(document.documentElement.style.getPropertyValue('--primary')).toBeTruthy();
  });

  it('3. BLINDAGEM DE RAIZ: Se applyThemeToRoot lançar erro inesperado, o componente captura via try/catch e o app NUNCA quebra', () => {
    vi.spyOn(useBrandingModule, 'useBranding').mockReturnValue({
      brandName: 'Empresa Teste',
      logoUrl: '',
      primaryColor: '#123456',
      faviconUrl: '',
      isCustom: true,
      isLoading: false,
    });

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'u1' },
    } as any);

    // Simula uma falha catastrófica no motor de tema
    vi.spyOn(colorUtilsModule, 'applyThemeToRoot').mockImplementation(() => {
      throw new Error('Falha catastrófica de runtime no tema');
    });

    // A montagem NÃO pode lançar erro para não derrubar a árvore de componentes raiz
    expect(() => {
      render(<BrandingDocumentEffect />);
    }).not.toThrow();

    // Deve registrar aviso resiliente no console
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[BrandingDocumentEffect] Falha ao aplicar tema dinâmico:'),
      expect.any(Error)
    );
  });

  it('4. Blindagem contra falhas de localStorage (ex: storage bloqueado ou modo restrito)', () => {
    vi.spyOn(useBrandingModule, 'useBranding').mockReturnValue({
      brandName: 'Horizonte Contabilidade',
      logoUrl: '',
      primaryColor: '#0D13C5',
      faviconUrl: '',
      isCustom: true,
      isLoading: false,
    });

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'u-restricted' },
      isLoading: false,
    } as any);

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded or storage is disabled', 'QuotaExceededError');
    });

    expect(() => {
      render(<BrandingDocumentEffect />);
    }).not.toThrow();
  });
});
