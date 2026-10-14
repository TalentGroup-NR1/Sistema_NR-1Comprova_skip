import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_BRANDING } from '@/hooks/useBranding';
import { applyThemeToRoot } from '@/lib/colorUtils';

export interface LoginBranding {
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  faviconUrl: string;
  isCustom: boolean;
  isLoading: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Hook para resolução dinâmica de branding na tela de login (/auth).
 * Permite identificar o tenant tanto por query param (?empresa=) quanto
 * por digitação do e-mail exato cadastrado.
 */
export function useLoginBranding() {
  const [branding, setBranding] = useState<LoginBranding>({
    brandName: DEFAULT_BRANDING.brandName,
    logoUrl: DEFAULT_BRANDING.logoUrl,
    primaryColor: DEFAULT_BRANDING.primaryColor,
    faviconUrl: DEFAULT_BRANDING.faviconUrl,
    isCustom: false,
    isLoading: false,
  });

  const lastCheckedEmailRef = useRef<string>('');

  // 1. Resolução pré-login via URL (?empresa= ou ?slug=)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const empresaSlug = params.get('empresa') || params.get('slug');

    if (empresaSlug && empresaSlug.trim()) {
      let isMounted = true;
      setBranding((prev) => ({ ...prev, isLoading: true }));

      supabase
        .rpc('get_company_branding_by_slug' as never, { p_slug: empresaSlug.trim() } as never)
        .then(({ data, error }) => {
          if (!isMounted) return;
          const res = data as {
            found?: boolean;
            brand_name?: string;
            logo_url?: string;
            primary_color?: string;
            favicon_url?: string;
          } | null;

          if (!error && res?.found) {
            const resolvedColor = res.primary_color || DEFAULT_BRANDING.primaryColor;
            setBranding({
              brandName: res.brand_name || DEFAULT_BRANDING.brandName,
              logoUrl: res.logo_url || DEFAULT_BRANDING.logoUrl,
              primaryColor: resolvedColor,
              faviconUrl: res.favicon_url || DEFAULT_BRANDING.faviconUrl,
              isCustom: true,
              isLoading: false,
            });
            applyThemeToRoot(resolvedColor);
            document.title = `${res.brand_name || 'NR-1Comprova'} — NR-1Comprova`;
          } else {
            setBranding((prev) => ({ ...prev, isLoading: false }));
          }
        })
        .catch(() => {
          if (isMounted) setBranding((prev) => ({ ...prev, isLoading: false }));
        });

      return () => {
        isMounted = false;
      };
    }
  }, []);

  // 2. Resolução por e-mail exato digitado no formulário
  const resolveEmail = useCallback(async (rawEmail: string) => {
    const cleanEmail = rawEmail.trim().toLowerCase();

    // Se o e-mail não mudou, evita requisições redundantes
    if (cleanEmail === lastCheckedEmailRef.current) return;
    lastCheckedEmailRef.current = cleanEmail;

    // Se o e-mail estiver incompleto ou inválido, reverte para a identidade padrão oficial
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      setBranding({
        brandName: DEFAULT_BRANDING.brandName,
        logoUrl: DEFAULT_BRANDING.logoUrl,
        primaryColor: DEFAULT_BRANDING.primaryColor,
        faviconUrl: DEFAULT_BRANDING.faviconUrl,
        isCustom: false,
        isLoading: false,
      });
      applyThemeToRoot(DEFAULT_BRANDING.primaryColor);
      document.title = 'NR-1Comprova';
      return;
    }

    setBranding((prev) => ({ ...prev, isLoading: true }));

    try {
      const { data, error } = await supabase.rpc('get_company_branding_by_email' as never, {
        p_email: cleanEmail,
      } as never);

      const res = data as {
        found?: boolean;
        brand_name?: string;
        logo_url?: string;
        primary_color?: string;
        favicon_url?: string;
      } | null;

      if (!error && res?.found) {
        const resolvedColor = res.primary_color || DEFAULT_BRANDING.primaryColor;
        setBranding({
          brandName: res.brand_name || DEFAULT_BRANDING.brandName,
          logoUrl: res.logo_url || DEFAULT_BRANDING.logoUrl,
          primaryColor: resolvedColor,
          faviconUrl: res.favicon_url || DEFAULT_BRANDING.faviconUrl,
          isCustom: true,
          isLoading: false,
        });
        applyThemeToRoot(resolvedColor);
        document.title = `${res.brand_name || 'NR-1Comprova'} — NR-1Comprova`;
      } else {
        // E-mail não encontrado ou sem tenant personalizado → Fallback seguro
        setBranding({
          brandName: DEFAULT_BRANDING.brandName,
          logoUrl: DEFAULT_BRANDING.logoUrl,
          primaryColor: DEFAULT_BRANDING.primaryColor,
          faviconUrl: DEFAULT_BRANDING.faviconUrl,
          isCustom: false,
          isLoading: false,
        });
        applyThemeToRoot(DEFAULT_BRANDING.primaryColor);
        document.title = 'NR-1Comprova';
      }
    } catch {
      setBranding((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  return {
    branding,
    resolveEmail,
  };
}
