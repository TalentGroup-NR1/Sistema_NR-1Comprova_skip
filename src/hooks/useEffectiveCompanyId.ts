import { useAuth } from './useAuth';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useMyColaborador } from '@/hooks/useMyFeedbackCycles';

/**
 * Hook that returns the effective company ID for data filtering.
 * - Admin master: uses the selected company from context (null = all companies)
 * - Other roles: uses their own company_id from auth (profile) or fallback to colaboradores table
 */
export function useEffectiveCompanyId() {
  const { isAdminMaster, companyId } = useAuth();
  const { selectedCompanyId } = useCompanyContext();
  const { data: colaborador } = useMyColaborador();
  
  // 1. Admin Master: always respects the dropdown selection (can be null for "all")
  if (isAdminMaster) {
    return selectedCompanyId;
  }

  // 2. Multiempresa: se há uma empresa explicitamente selecionada no contexto de sessão
  if (selectedCompanyId) {
    return selectedCompanyId;
  }

  // 3. Profile company_id exists (empresa default ou ativa no banco)
  if (companyId) {
    return companyId;
  }

  // 4. Resgate: Fallback to colaboradores table if profile is missing company_id
  if (colaborador?.company_id) {
    return colaborador.company_id;
  }

  // 5. Default fallback (null will trigger DEFAULT_BRANDING in useBranding)
  return null;
}
