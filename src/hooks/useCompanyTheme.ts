import { useEffect } from "react";
import { useBranding } from "@/hooks/useBranding";
import { applyThemeToRoot } from "@/lib/colorUtils";

export function useCompanyTheme() {
  const branding = useBranding();

  useEffect(() => {
    try {
      if (branding.primaryColor && branding.primaryColor !== "transparent") {
        if (typeof applyThemeToRoot === "function") {
          applyThemeToRoot(branding.primaryColor);
        }
      }
    } catch (err) {
      console.warn("[useCompanyTheme] Falha ao aplicar tema:", err);
    }
  }, [branding.primaryColor]);
}
