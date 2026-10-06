import { useCompanyContext } from "@/contexts/CompanyContext";
import { useCompanies } from "@/hooks/useCompanies";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { useAuth } from "@/hooks/useAuth";
import { useMyColaborador } from "@/hooks/useMyFeedbackCycles";
/** NR-1Comprova defaults — used when no company branding is available. */
export const DEFAULT_BRANDING = {
  brandName: "NR-1Comprova",
  logoUrl: "/images/Logo_NR1_Transparente.png",
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
 * Falls back to the NR-1Comprova defaults when there is no company in context
 * (e.g. login screen) or when the company has no branding configured.
 */
export function useBranding(): Branding {
  const { data: companies, isLoading: isCompaniesLoading } = useCompanies();
  const { loading: isAuthLoading } = useAuth();
  const { isLoading: isColaboradorLoading } = useMyColaborador();
  
  const effectiveCompanyId = useEffectiveCompanyId();
  const { selectedCompanyId } = useCompanyContext();

  const companyId = effectiveCompanyId ?? selectedCompanyId;
  const company = companyId
    ? (companies?.find((c) => c.id === companyId) as any)
    : undefined;

  // Unifica a cascata para o Loading Gate: o branding está carregando enquanto 
  // os profiles (auth), o vínculo (colaborador) OU os temas (companies) estiverem rodando
  const isLoading = isAuthLoading || isColaboradorLoading || isCompaniesLoading;

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
