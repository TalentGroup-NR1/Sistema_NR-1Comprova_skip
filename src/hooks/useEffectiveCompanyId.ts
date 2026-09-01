import { useAuth } from './useAuth';
import { useCompanyContext } from '@/contexts/CompanyContext';

/**
 * Hook that returns the effective company ID for data filtering.
 * - Admin master: uses the selected company from context (null = all companies)
 * - Other roles: uses their own company_id from auth
 */
export function useEffectiveCompanyId() {
  const { isAdminMaster, companyId } = useAuth();
  const { selectedCompanyId } = useCompanyContext();
  
  // Admin master: uses context selection (can be null for "all")
  // Other roles: always use their own company_id
  return isAdminMaster ? selectedCompanyId : companyId;
}
