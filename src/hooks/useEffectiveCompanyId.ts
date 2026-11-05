import { useAuth } from './useAuth';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useMyColaborador } from '@/hooks/useMyFeedbackCycles';

/**
 * Hook that returns the effective company ID for data filtering.
 * - Admin master: uses the selected company from context (null = all companies / modo plataforma)
 * - Other roles: uses their own company_id from auth (profile) or fallback to colaboradores table
 */
export function useEffectiveCompanyId() {
  const { isAdminMaster, isSuperAdmin, role, roles, companyId } = useAuth();
  const { selectedCompanyId } = useCompanyContext();
  const { data: colaborador } = useMyColaborador();
  
  // 1. Multiempresa / Sandbox: se há uma empresa explicitamente selecionada no contexto de sessão
  if (selectedCompanyId) {
    return selectedCompanyId;
  }

  // 0. Super Admin / Admin Master sem empresa selecionada: opera no "Modo Plataforma" (null)
  if (
    isAdminMaster ||
    isSuperAdmin ||
    role === 'admin_master' ||
    role === 'super_admin' ||
    roles?.includes('super_admin') ||
    roles?.includes('admin_master')
  ) {
    return null;
  }

  // 2. Profile company_id exists (empresa default ou ativa no banco)
  if (companyId) {
    return companyId;
  }

  // 3. Resgate: Fallback to colaboradores table if profile is missing company_id
  if (colaborador?.company_id) {
    return colaborador.company_id;
  }

  // 4. Default fallback (null will trigger DEFAULT_BRANDING in useBranding)
  return null;
}
