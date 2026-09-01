import { useCompanyContext } from "@/contexts/CompanyContext";
import { useCompanies } from "@/hooks/useCompanies";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";

/** NR1-Pronto defaults — used when no company branding is available. */
export const DEFAULT_BRANDING = {
  brandName: "Gestão Ativa",
  logoUrl: "/images/nr1-pronto-logo.png",
  primaryColor: "#C8102E",
  faviconUrl: "/favicon.png",
};

export interface Branding {
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  faviconUrl: string;
  isInternal: boolean;
  isLoading: boolean;
}

/**
 * Resolves the branding (name, logo, color, favicon) of the effective company.
 * Falls back to the NR1-Pronto defaults when there is no company in context
 * (e.g. login screen) or when the company has no branding configured.
 */
export function useBranding(): Branding {
  const { data: companies, isLoading } = useCompanies();
  const effectiveCompanyId = useEffectiveCompanyId();
  const { selectedCompanyId } = useCompanyContext();

  const companyId = effectiveCompanyId ?? selectedCompanyId;
  const company = companyId
    ? (companies?.find((c) => c.id === companyId) as any)
    : undefined;

  return {
    brandName: company?.brand_name || DEFAULT_BRANDING.brandName,
    logoUrl:
      company?.brand_logo_url || company?.logo_url || DEFAULT_BRANDING.logoUrl,
    primaryColor:
      company?.brand_primary_color ||
      company?.primary_color ||
      DEFAULT_BRANDING.primaryColor,
    faviconUrl:
      company?.brand_favicon_url ||
      company?.brand_logo_url ||
      company?.logo_url ||
      DEFAULT_BRANDING.faviconUrl,
    isInternal: Boolean(company?.is_internal),
    isLoading,
  };
}
