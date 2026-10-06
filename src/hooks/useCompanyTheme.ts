import { useEffect } from "react";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useCompanies } from "@/hooks/useCompanies";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useBranding, DEFAULT_BRANDING } from "@/hooks/useBranding";

// Convert hex to HSL values (without the hsl() wrapper)
function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse hex
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Convert to CSS HSL format (without hsl wrapper, just values)
  const hue = Math.round(h * 360);
  const saturation = Math.round(s * 100);
  const lightness = Math.round(l * 100);

  return `${hue} ${saturation}% ${lightness}%`;
}

// Adjust lightness of HSL
function adjustLightness(hsl: string, amount: number): string {
  const parts = hsl.split(' ');
  const h = parts[0];
  const s = parts[1];
  const l = parseInt(parts[2]);
  const newL = Math.max(0, Math.min(100, l + amount));
  return `${h} ${s} ${newL}%`;
}

const DEFAULT_SECONDARY = "#0F172A"; // Slate 900

// Cache the last applied primary color across renders/remounts to avoid
// flashing default theme while company data is being refetched.
let lastAppliedPrimaryHex: string | null = null;

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function useCompanyTheme() {
  const { selectedCompanyId } = useCompanyContext();
  const { data: companies, isLoading: companiesLoading } = useCompanies();
  const { themeColor } = useUserPreferences();
  const branding = useBranding();

  useEffect(() => {
    // While companies are still loading and we have no cached theme yet,
    // skip applying defaults — otherwise the UI flashes to the fallback color.
    if (companiesLoading && !lastAppliedPrimaryHex && !themeColor) {
      return;
    }

    // Cor primária vem do branding da empresa (banco), com fallback NR-1Comprova.
    const brandHex = branding.primaryColor;
    const primaryHex = HEX_RE.test(brandHex) ? brandHex : DEFAULT_BRANDING.primaryColor;
    const secondaryHex = DEFAULT_SECONDARY;

    // No-op if nothing changed since the last application.
    if (primaryHex === lastAppliedPrimaryHex) {
      return;
    }
    lastAppliedPrimaryHex = primaryHex;

    const primaryHSL = hexToHSL(primaryHex);
    const secondaryHSL = hexToHSL(secondaryHex);

    // Apply CSS variables to :root
    const root = document.documentElement;

    // Primary colors
    root.style.setProperty('--primary', primaryHSL);
    root.style.setProperty('--primary-hover', adjustLightness(primaryHSL, -6));
    root.style.setProperty('--primary-pressed', adjustLightness(primaryHSL, -10));
    root.style.setProperty('--primary-muted', adjustLightness(primaryHSL, 45));
    root.style.setProperty('--ring', primaryHSL);
    root.style.setProperty('--focus-ring', primaryHSL);

    // Sidebar primary colors
    root.style.setProperty('--sidebar-primary', primaryHSL);
    root.style.setProperty('--sidebar-ring', primaryHSL);
    root.style.setProperty('--sidebar-active', adjustLightness(primaryHSL, 48));
    root.style.setProperty('--sidebar-active-text', adjustLightness(primaryHSL, -6));

    // Info color (often matches primary)
    root.style.setProperty('--info', primaryHSL);

    // Update gradient
    root.style.setProperty('--gradient-primary', 
      `linear-gradient(135deg, hsl(${primaryHSL}) 0%, hsl(${adjustLightness(primaryHSL, -8)}) 100%)`
    );

    // Sidebar secondary (using secondary color for hover states)
    // Note: We keep sidebar background light, but update hover states
    
    return () => {
      // Cleanup - reset to defaults if needed
      // This runs when component unmounts or dependencies change
    };
  }, [selectedCompanyId, companies, companiesLoading, themeColor, branding.primaryColor]);
}
