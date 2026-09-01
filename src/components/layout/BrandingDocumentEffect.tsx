import { useEffect } from "react";
import { useBranding } from "@/hooks/useBranding";

/**
 * Applies the active company branding to the document (favicon + title).
 * Renders nothing.
 */
export function BrandingDocumentEffect() {
  const { brandName, faviconUrl } = useBranding();

  useEffect(() => {
    if (brandName) {
      document.title = `${brandName} — Talent Group`;
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
  }, [brandName, faviconUrl]);

  return null;
}
