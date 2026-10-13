import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useAuth } from './useAuth';
import { resolverModuloPai, isModuloBase } from '@/lib/modulosContrataveis';

export interface ModuleVisibility {
  module_key: string;
  visible: boolean;
}

/**
 * Consulta a RPC get_visible_modules avaliando a cascata:
 * 1. company_modules (governança comercial B2B por empresa)
 * 2. module_visibility (RBAC de perfis/papéis dentro da empresa)
 */
export function useVisibleModules() {
  const effectiveCompanyId = useEffectiveCompanyId();
  const { role, isAuthenticated, isSuperAdmin } = useAuth();

  return useQuery({
    queryKey: ['module_visibility', effectiveCompanyId, role],
    queryFn: async (): Promise<ModuleVisibility[]> => {
      if (!isAuthenticated) return [];

      // Super Admin em visão global irrestrita (sem empresa específica selecionada)
      if (isSuperAdmin && !effectiveCompanyId) {
        return [];
      }

      // Usuário sem empresa associada (ex.: cadastro incompleto)
      if (!effectiveCompanyId) return [];

      const { data, error } = await supabase.rpc('get_visible_modules', {
        p_company_id: effectiveCompanyId,
      });

      if (error) {
        console.error('Error fetching module visibility from RPC:', error);
        throw error;
      }

      return (data as ModuleVisibility[]) || [];
    },
    enabled: !!isAuthenticated && (isSuperAdmin || !!effectiveCompanyId),
    retry: typeof process !== 'undefined' && process.env?.NODE_ENV === 'test' ? false : 2,
    staleTime: 30 * 1000, // 30s de cache reativo (reavalia ao navegar/focar janela)
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

/**
 * Hook para verificar se um módulo específico (ou sub-rota) está visível/contratado
 * para o tenant e o perfil do usuário logado.
 *
 * Princípios de Segurança:
 * - Módulo base (/colaboradores): SEMPRE liberado (inegociável).
 * - Super Admin: visão irrestrita declarada (com banner de bypass se o módulo estiver desativado para o tenant).
 * - Fail-Closed: em loading inicial ou erro de RPC, módulos contratáveis NÃO são liberados por defeito.
 */
export function useIsModuleVisible(moduleKey?: string) {
  const { isSuperAdmin } = useAuth();
  const effectiveCompanyId = useEffectiveCompanyId();
  const { data: visibleModules, isLoading, isError, refetch } = useVisibleModules();

  if (!moduleKey) {
    return { isVisible: true, isLoading: false, isError: false, isSuperAdminBypass: false, refetch };
  }

  // 1. Módulo base (/colaboradores e sub-rotas) é inegociável: sempre ativo
  if (isModuloBase(moduleKey)) {
    return { isVisible: true, isLoading: false, isError: false, isSuperAdminBypass: false, refetch };
  }

  const moduloPai = resolverModuloPai(moduleKey);

  // 2. Super Admin da plataforma: visão irrestrita explícita
  if (isSuperAdmin) {
    // Visão global sem empresa selecionada: bypass total
    if (!effectiveCompanyId) {
      return { isVisible: true, isLoading: false, isError: false, isSuperAdminBypass: false, refetch };
    }

    // Com empresa selecionada: verifica se estaria desativado no tenant para exibir banner
    const config = visibleModules?.find(
      (v) => v.module_key === moduleKey || v.module_key === moduloPai
    );
    const estariaDesativado = config ? config.visible === false : false;

    return {
      isVisible: true,
      isLoading,
      isError,
      isSuperAdminBypass: estariaDesativado,
      refetch,
    };
  }

  // 3. Carregamento inicial (sem cache): Fail-Closed (evita flash de conteúdo proibido)
  if (isLoading) {
    return { isVisible: false, isLoading: true, isError: false, isSuperAdminBypass: false, refetch };
  }

  // 4. Erro de RPC persistente: Fail-Closed (oculta recursos contratáveis, nunca abre brechas)
  if (isError) {
    return { isVisible: false, isLoading: false, isError: true, isSuperAdminBypass: false, refetch };
  }

  // 5. Avaliação da resposta da RPC no banco (cascata comercial)
  if (visibleModules && visibleModules.length > 0) {
    const config = visibleModules.find(
      (v) => v.module_key === moduleKey || v.module_key === moduloPai
    );
    // Só é visível se a RPC retornar explicitamente true
    const isVisible = config ? config.visible === true : false;
    return { isVisible, isLoading: false, isError: false, isSuperAdminBypass: false, refetch };
  }

  // Fallback de segurança para não-admins
  return { isVisible: false, isLoading: false, isError: false, isSuperAdminBypass: false, refetch };
}

/**
 * Hook para invalidar caches de visibilidade após mutações pelo Admin Super
 */
export function useInvalidateModuleVisibility() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['module_visibility'] });
    queryClient.invalidateQueries({ queryKey: ['company_modules'] });
  };
}
