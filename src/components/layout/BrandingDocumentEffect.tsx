import { useEffect } from "react";
import { useBranding } from "@/hooks/useBranding";
import { applyThemeToRoot } from "@/lib/colorUtils";
import { useAuth } from "@/hooks/useAuth";

/**
 * Applies the active company branding to the document (favicon + title + CSS Theme).
 * Renders nothing. Hardened with try/catch so branding issues never crash the app.
 */
export function BrandingDocumentEffect() {
  const { brandName, faviconUrl, primaryColor, isLoading } = useBranding();
  const { user } = useAuth();

  useEffect(() => {
    // 1. Título do Documento
    try {
      if (brandName) {
        document.title = brandName === "NR-1Comprova" 
          ? "NR-1Comprova" 
          : `${brandName} — NR-1Comprova`;
      }
    } catch (err) {
      console.warn("[BrandingDocumentEffect] Falha ao atualizar título:", err);
    }

    // 2. Favicon
    try {
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
    } catch (err) {
      console.warn("[BrandingDocumentEffect] Falha ao atualizar favicon:", err);
    }

    // 3. Aplicação Resiliente de Tema CSS
    try {
      if (primaryColor && primaryColor !== "transparent") {
        // Auto-invalidação do cache local (se houver usuário e já carregou da API)
        if (user?.id && !isLoading) {
          try {
            const cacheKey = `nr1_branding_${user.id}`;
            if (localStorage.getItem(cacheKey) !== primaryColor) {
              localStorage.setItem(cacheKey, primaryColor);
            }
          } catch {
            // Ignora falhas de localStorage (ex: modo anônimo ou storage desabilitado)
          }
        }

        if (typeof applyThemeToRoot === "function") {
          applyThemeToRoot(primaryColor);
        } else {
          console.warn("[BrandingDocumentEffect] applyThemeToRoot não é uma função.");
        }
      }
    } catch (err) {
      console.warn("[BrandingDocumentEffect] Falha ao aplicar tema dinâmico:", err);
      // Fallback gracioso: tenta aplicar a cor padrão oficial da plataforma
      try {
        if (typeof applyThemeToRoot === "function") {
          applyThemeToRoot("#C8102E");
        }
      } catch {
        // Degradação silenciosa absoluta: mantém estilos do CSS estático
      }
    }
  }, [brandName, faviconUrl, primaryColor, user?.id, isLoading]);

  return null;
}
