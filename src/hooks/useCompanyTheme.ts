import { useEffect } from "react";
import { useBranding } from "@/hooks/useBranding";
import { applyThemeToRoot } from "@/lib/colorUtils";

export function useCompanyTheme() {
  const branding = useBranding();

  useEffect(() => {
    if (branding.primaryColor && branding.primaryColor !== "transparent") {
      applyThemeToRoot(branding.primaryColor);
    }
  }, [branding.primaryColor]);
}
