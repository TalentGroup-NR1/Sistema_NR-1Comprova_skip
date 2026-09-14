import { useEffect } from "react";
import { useBranding } from "@/hooks/useBranding";
import { hexToHslString, getForegroundHslFromHex } from "@/lib/colorUtils";

/**
 * Applies the active company branding to the document (favicon + title + CSS Theme).
 * Renders nothing.
 */
export function BrandingDocumentEffect() {
  const { brandName, faviconUrl, primaryColor } = useBranding();

  useEffect(() => {
    if (brandName) {
      document.title = `${brandName} — NR1-Pronto`;
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
      const hslColor = hexToHslString(primaryColor);
      const hslForeground = getForegroundHslFromHex(primaryColor);
      
      document.documentElement.style.setProperty('--primary', hslColor);
      document.documentElement.style.setProperty('--primary-foreground', hslForeground);
      document.documentElement.style.setProperty('--ring', hslColor);
      document.documentElement.style.setProperty('--sidebar-primary', hslColor);
    }
  }, [brandName, faviconUrl, primaryColor]);

  return null;
}
