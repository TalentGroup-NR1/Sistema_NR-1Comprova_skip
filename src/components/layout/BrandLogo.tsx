import React, { useState, useEffect } from 'react';
import { DEFAULT_BRANDING } from '@/hooks/useBranding';

interface BrandLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  logoUrl?: string | null;
  brandName?: string | null;
  fallbackUrl?: string;
  className?: string;
}

/**
 * Componente resiliente para exibição do logotipo da marca / empresa.
 * - Evita src vazio (renderizando fallback imediato).
 * - Trata falhas de carregamento (onError) com fallback gracioso para o logo oficial.
 * - Protegido contra loops infinitos de erro.
 */
const PLATFORM_DEFAULT_LOGO = DEFAULT_BRANDING?.logoUrl || "/images/nr-1comprova-logo.png?v=2";

function resolveInitialLogo(logoUrl?: string | null, fallbackUrl: string = PLATFORM_DEFAULT_LOGO): string {
  if (logoUrl && logoUrl.trim()) return logoUrl.trim();
  if (typeof window !== 'undefined') {
    try {
      const last = localStorage.getItem('nr1_branding_data_last');
      if (last) {
        const parsed = JSON.parse(last);
        if (parsed?.logoUrl && parsed.logoUrl.trim()) {
          return parsed.logoUrl.trim();
        }
      }
    } catch {
      // Ignora erro de parsing
    }
  }
  return fallbackUrl;
}

export function BrandLogo({
  logoUrl,
  brandName,
  fallbackUrl = PLATFORM_DEFAULT_LOGO,
  className,
  alt,
  ...rest
}: BrandLogoProps) {
  const [src, setSrc] = useState<string>(() => resolveInitialLogo(logoUrl, fallbackUrl));
  const [failed, setFailed] = useState<boolean>(false);

  // Reage quando a URL do branding mudar (ex: carregamento da API ou troca de tenant)
  useEffect(() => {
    const nextUrl = resolveInitialLogo(logoUrl, fallbackUrl);
    setSrc(nextUrl);
    setFailed(false);
  }, [logoUrl, fallbackUrl]);

  const handleError = () => {
    // Se a URL que falhou já era o fallback, para por aí para evitar loop
    if (failed || src === fallbackUrl) {
      return;
    }
    console.debug('[BrandLogo] Imagem de logo inacessível, utilizando fallback oficial:', src);
    setFailed(true);
    setSrc(fallbackUrl);
  };

  return (
    <img
      src={src}
      alt={alt || brandName || DEFAULT_BRANDING.brandName}
      className={className}
      onError={handleError}
      loading="eager"
      {...rest}
    />
  );
}
