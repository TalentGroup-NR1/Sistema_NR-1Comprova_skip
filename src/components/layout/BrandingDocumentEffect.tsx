import { useEffect } from "react";
import { useBranding } from "@/hooks/useBranding";
import { hexToHslString, getForegroundHslFromHex } from "@/lib/colorUtils";
import { useAuth } from "@/hooks/useAuth";

/**
 * Applies the active company branding to the document (favicon + title + CSS Theme).
 * Renders nothing.
 */
export function BrandingDocumentEffect() {
  const { brandName, faviconUrl, primaryColor, isLoading } = useBranding();
  const { user } = useAuth();

  useEffect(() => {
    if (brandName) {
      document.title = brandName === "NR-1Comprova" 
        ? "NR-1Comprova" 
        : `${brandName} — NR-1Comprova`;
    }
    if (faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      if (link.href !== faviconUrl) {
        link.href = faviconUrl;
      }
    }
    if (primaryColor) {
      // Auto-invalidação do cache local (se houver usuário e já carregou da API)
      if (user?.id && !isLoading) {
        const cacheKey = `nr1_branding_${user.id}`;
        if (localStorage.getItem(cacheKey) !== primaryColor) {
          localStorage.setItem(cacheKey, primaryColor);
        }
      }

      const hslColor = hexToHslString(primaryColor);
      const hslForeground = getForegroundHslFromHex(primaryColor);
      
      document.documentElement.style.setProperty('--primary', hslColor);
      document.documentElement.style.setProperty('--primary-foreground', hslForeground);
      document.documentElement.style.setProperty('--ring', hslColor);
      document.documentElement.style.setProperty('--sidebar-primary', hslColor);
      document.documentElement.style.setProperty('--focus-ring', hslColor);
      document.documentElement.style.setProperty('--sidebar-ring', hslColor);
      document.documentElement.style.setProperty('--accent', hslColor);
    }
  }, [brandName, faviconUrl, primaryColor, user?.id, isLoading]);

  return null;
}
