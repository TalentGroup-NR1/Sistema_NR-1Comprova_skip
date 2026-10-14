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

export interface CachedBrandingData {
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  faviconUrl: string;
  companyId?: string | null;
  isCustom: boolean;
}

/**
 * Lê de forma síncrona o branding persistido no localStorage (anti-FOUC).
 * Avalia em cascata: por userId -> por companyId -> última sessão -> legado de cor.
 */
export function getCachedBranding(
  userId?: string | null,
  companyId?: string | null
): CachedBrandingData | null {
  if (typeof window === "undefined") return null;
  try {
    // 1. Por userId
    if (userId) {
      const byUser = localStorage.getItem(`nr1_branding_data_${userId}`);
      if (byUser) {
        const parsed = JSON.parse(byUser);
        if (parsed?.primaryColor) return parsed;
      }
    }
    // 2. Por companyId fornecido ou persistido no seletor
    const targetCid =
      companyId || localStorage.getItem("tgmais_selected_company");
    if (targetCid) {
      const byCompany = localStorage.getItem(
        `nr1_branding_data_company_${targetCid}`
      );
      if (byCompany) {
        const parsed = JSON.parse(byCompany);
        if (parsed?.primaryColor) return parsed;
      }
    }
    // 3. Cache global da última sessão
    const lastSession = localStorage.getItem("nr1_branding_data_last");
    if (lastSession) {
      const parsed = JSON.parse(lastSession);
      if (parsed?.primaryColor) return parsed;
    }
    // 4. Compatibilidade com chave de cor legada
    if (userId) {
      const legacyColor = localStorage.getItem(`nr1_branding_${userId}`);
      if (legacyColor && /^#([0-9A-Fa-f]{3}){1,2}$/.test(legacyColor)) {
        return {
          brandName: DEFAULT_BRANDING.brandName,
          logoUrl: DEFAULT_BRANDING.logoUrl,
          primaryColor: legacyColor,
          faviconUrl: DEFAULT_BRANDING.faviconUrl,
          isCustom: true,
        };
      }
    }
  } catch {
    // Ignora erros de parsing ou storage indisponível
  }
  return null;
}

/**
 * Salva o branding resolvido no localStorage para eliminar FOUC nos próximos renders.
 */
export function setCachedBranding(data: {
  brandName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  faviconUrl?: string | null;
  companyId?: string | null;
  userId?: string | null;
}) {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify({
      brandName: data.brandName || DEFAULT_BRANDING.brandName,
      logoUrl: data.logoUrl || DEFAULT_BRANDING.logoUrl,
      primaryColor: data.primaryColor || DEFAULT_BRANDING.primaryColor,
      faviconUrl:
        data.faviconUrl || data.logoUrl || DEFAULT_BRANDING.faviconUrl,
      companyId: data.companyId,
      isCustom: Boolean(
        (data.primaryColor &&
          data.primaryColor !== DEFAULT_BRANDING.primaryColor) ||
          (data.logoUrl && data.logoUrl !== DEFAULT_BRANDING.logoUrl)
      ),
    });

    localStorage.setItem("nr1_branding_data_last", payload);
    if (data.userId) {
      localStorage.setItem(`nr1_branding_data_${data.userId}`, payload);
      if (data.primaryColor) {
        localStorage.setItem(`nr1_branding_${data.userId}`, data.primaryColor);
      }
    }
    if (data.companyId) {
      localStorage.setItem(
        `nr1_branding_data_company_${data.companyId}`,
        payload
      );
    }
  } catch {
    // Ignora cota de storage excedida ou modo privado restrito
  }
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
    isPlatformAdmin ? null : selectedCompanyId,
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

  // Anti-FOUC: lê branding síncrono em cache no frame 0 (super admin sem empresa sempre usa padrão)
  const cached = isPlatformAdmin && !targetCompanyId ? null : getCachedBranding(user?.id, targetCompanyId);

  if (isLoading) {
    if (cached) {
      return {
        brandName: cached.brandName || DEFAULT_BRANDING.brandName,
        logoUrl: cached.logoUrl || DEFAULT_BRANDING.logoUrl,
        primaryColor: cached.primaryColor || DEFAULT_BRANDING.primaryColor,
        faviconUrl: cached.faviconUrl || DEFAULT_BRANDING.faviconUrl,
        isInternal: false,
        isCustom: Boolean(cached.isCustom),
        isLoading: true,
      };
    }

    // Apenas primeiríssimo acesso sem qualquer cache: usa neutro
    return {
      brandName: "",
      logoUrl: "",
      primaryColor: "transparent",
      faviconUrl: "",
      isInternal: false,
      isCustom: false,
      isLoading: true,
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

    const result = {
      brandName: d.brandName || DEFAULT_BRANDING.brandName,
      logoUrl: resolvedLogo,
      primaryColor: resolvedColor,
      faviconUrl: d.faviconUrl || resolvedLogo || DEFAULT_BRANDING.faviconUrl,
      isInternal: Boolean(d.isInternal),
      isCustom: Boolean(d.primaryColor || d.logoUrl),
      isLoading: false,
    };

    setCachedBranding({
      brandName: result.brandName,
      logoUrl: result.logoUrl,
      primaryColor: result.primaryColor,
      faviconUrl: result.faviconUrl,
      companyId: targetCompanyId,
      userId: user?.id,
    });

    return result;
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

    const result = {
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

    setCachedBranding({
      brandName: result.brandName,
      logoUrl: result.logoUrl,
      primaryColor: result.primaryColor,
      faviconUrl: result.faviconUrl,
      companyId: targetCompanyId,
      userId: user?.id,
    });

    return result;
  }

  // 3. Condicional 2 / Resiliência na janela de deploy ou falha de RPC:
  // Se a consulta direta deu erro E a lista companies está vazia/indisponível,
  // NUNCA reverte para vermelho se já existir cache de branding válido para este usuário!
  if (directBranding.isError && cached) {
    return {
      brandName: cached.brandName || DEFAULT_BRANDING.brandName,
      logoUrl: cached.logoUrl || DEFAULT_BRANDING.logoUrl,
      primaryColor: cached.primaryColor || DEFAULT_BRANDING.primaryColor,
      faviconUrl: cached.faviconUrl || DEFAULT_BRANDING.faviconUrl,
      isInternal: false,
      isCustom: Boolean(cached.isCustom),
      isLoading: false,
    };
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

