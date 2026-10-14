import { useCompanyContext } from "@/contexts/CompanyContext";
import { useCompanies } from "@/hooks/useCompanies";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { useAuth } from "@/hooks/useAuth";
import { useMyColaborador } from "@/hooks/useMyFeedbackCycles";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

/** NR-1Comprova defaults — used when no company branding is available. */
export const DEFAULT_BRANDING = {
  brandName: "NR-1Comprova",
  logoUrl: "/images/nr-1comprova-logo.png?v=2",
  primaryColor: "#C8102E",
  faviconUrl: "/favicon.png",
};

export interface Branding {
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  faviconUrl: string;
  isInternal: boolean;
  isCustom: boolean;
  isLoading: boolean;
}

/**
 * Resolves the branding (name, logo, color, favicon) of the effective company.
 * 1. Primária: consulta direta via RPC get_my_company_branding (independente de RLS/lista companies).
 * 2. Secundária: lista companies em cache/banco caso a RPC falhe ou não esteja disponível.
 * 3. Fallback de resiliência: se a busca falhar por erro de rede/RPC, preserva o último branding
 *    conhecido gravado no cache local (evitando virar vermelho após segundos).
 * 4. Padrão da plataforma: empresa genuinamente sem branding ou Super Admin sem empresa selecionada.
 */
export function useBranding(): Branding {
  const { data: companies, isLoading: isCompaniesLoading } = useCompanies();
  const {
    user,
    loading: isAuthLoading,
    profileLoaded,
    isAuthenticated,
    isAdminMaster,
    isSuperAdmin,
    companyId: authCompanyId,
  } = useAuth();
  
  const effectiveCompanyId = useEffectiveCompanyId();
  const { selectedCompanyId } = useCompanyContext();

  const isPlatformAdmin = Boolean(isAdminMaster || isSuperAdmin);
  const candidateIds = [
    effectiveCompanyId,
    selectedCompanyId,
    isPlatformAdmin ? null : authCompanyId,
  ];
  const targetCompanyId = candidateIds.find((id): id is string => Boolean(id)) ?? null;

  // 1. Consulta direta via RPC autorizada
  const directBranding = useCompanyBranding(targetCompanyId);

  // 2. Fallback caso companies já tenha a empresa carregada
  const companyFromList = targetCompanyId
    ? (companies?.find((c) => c.id === targetCompanyId) as any)
    : undefined;

  const isProfileResolving = isAuthenticated === true && profileLoaded === false;
  // Se temos um targetCompanyId, o loading do branding depende prioritariamente da consulta direta.
  // Se a consulta direta ainda não resolveu positivamente e a lista companies ainda está carregando,
  // mantemos loading para evitar flash do padrão da plataforma.
  const isDirectLoading = Boolean(targetCompanyId && directBranding.isLoading);
  const isFallbackLoading = Boolean(
    targetCompanyId && !directBranding.data?.found && isCompaniesLoading
  );
  const isLoading = isAuthLoading || isProfileResolving || isDirectLoading || isFallbackLoading;

  if (isLoading) {
    return {
      brandName: "",
      logoUrl: "",
      primaryColor: "transparent",
      faviconUrl: "",
      isInternal: false,
      isCustom: false,
      isLoading,
    };
  }

  // Se não há empresa selecionada nem perfil (ex: Super Admin em modo global ou deslogado)
  if (!targetCompanyId) {
    return {
      brandName: DEFAULT_BRANDING.brandName,
      logoUrl: DEFAULT_BRANDING.logoUrl,
      primaryColor: DEFAULT_BRANDING.primaryColor,
      faviconUrl: DEFAULT_BRANDING.faviconUrl,
      isInternal: false,
      isCustom: false,
      isLoading: false,
    };
  }

  // 1. Resolução com sucesso pela RPC direta
  if (directBranding.data?.found) {
    const d = directBranding.data;
    const resolvedColor = d.primaryColor && /^#([0-9A-Fa-f]{3}){1,2}$/.test(d.primaryColor)
      ? d.primaryColor
      : DEFAULT_BRANDING.primaryColor;
    const resolvedLogo = d.logoUrl && d.logoUrl.trim()
      ? d.logoUrl.trim()
      : DEFAULT_BRANDING.logoUrl;

    return {
      brandName: d.brandName || DEFAULT_BRANDING.brandName,
      logoUrl: resolvedLogo,
      primaryColor: resolvedColor,
      faviconUrl: d.faviconUrl || resolvedLogo || DEFAULT_BRANDING.faviconUrl,
      isInternal: Boolean(d.isInternal),
      isCustom: Boolean(d.primaryColor || d.logoUrl),
      isLoading: false,
    };
  }

  // 2. Fallback secundário: lista de empresas (se a RPC falhou/não encontrou, mas a lista possui os dados)
  if (companyFromList) {
    const resolvedColor =
      companyFromList.brand_primary_color ||
      companyFromList.primary_color ||
      DEFAULT_BRANDING.primaryColor;
    const resolvedLogo =
      companyFromList.brand_logo_url ||
      companyFromList.logo_url ||
      DEFAULT_BRANDING.logoUrl;

    return {
      brandName: companyFromList.brand_name || companyFromList.name || DEFAULT_BRANDING.brandName,
      logoUrl: resolvedLogo,
      primaryColor: resolvedColor,
      faviconUrl:
        companyFromList.brand_favicon_url ||
        companyFromList.brand_logo_url ||
        companyFromList.logo_url ||
        DEFAULT_BRANDING.faviconUrl,
      isInternal: Boolean(companyFromList.is_internal),
      isCustom: Boolean(companyFromList.brand_primary_color || companyFromList.brand_logo_url),
      isLoading: false,
    };
  }

  // 3. Condicional 2 / Resiliência na janela de deploy ou falha de RPC:
  // Se a consulta direta deu erro E a lista companies está vazia/indisponível,
  // NUNCA reverte para vermelho se já existir cache de branding válido para este usuário!
  if (directBranding.isError && user?.id) {
    try {
      const cachedColor = localStorage.getItem(`nr1_branding_${user.id}`);
      if (cachedColor && /^#([0-9A-Fa-f]{3}){1,2}$/.test(cachedColor)) {
        return {
          brandName: DEFAULT_BRANDING.brandName,
          logoUrl: DEFAULT_BRANDING.logoUrl,
          primaryColor: cachedColor,
          faviconUrl: DEFAULT_BRANDING.faviconUrl,
          isInternal: false,
          isCustom: true,
          isLoading: false,
        };
      }
    } catch {
      // Ignora erro de storage
    }
  }

  // 4. Empresa genuinamente sem branding personalizado (found=false definitivo ou sem dados)
  return {
    brandName: DEFAULT_BRANDING.brandName,
    logoUrl: DEFAULT_BRANDING.logoUrl,
    primaryColor: DEFAULT_BRANDING.primaryColor,
    faviconUrl: DEFAULT_BRANDING.faviconUrl,
    isInternal: false,
    isCustom: false,
    isLoading: false,
  };
}

