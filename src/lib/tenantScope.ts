import { AppRole } from '@/hooks/useAuth';

export interface TenantUserLike {
  id?: string;
  company_id?: string | null;
  role?: AppRole | string | null;
  active_role?: AppRole | string | null;
  selectedCompanyId?: string | null;
}

/**
 * Retorna o company_id válido e isolado para o contexto de execução.
 * 
 * Regras:
 * - Se for admin_master sem selectedCompanyId (ou company_id nulo), retorna null.
 * - Se for admin_master com selectedCompanyId (sandbox/empresa selecionada), retorna selectedCompanyId.
 * - Para os demais usuários (admin_empresa, colaborador, etc.), retorna selectedCompanyId ou company_id do cadastro.
 */
export function getTenantCompanyId(
  user: TenantUserLike | null | undefined,
  selectedCompanyId?: string | null
): string | null {
  if (!user) return null;

  const currentRole = user.active_role || user.role;
  const isAdminMaster = currentRole === 'admin_master';

  const companyCandidate = selectedCompanyId ?? user.selectedCompanyId ?? (isAdminMaster ? null : user.company_id);

  if (!companyCandidate) {
    return null;
  }

  return companyCandidate;
}

/**
 * Exige um company_id estritamente definido. Lança erro caso o usuário não esteja
 * sob o escopo de uma empresa isolada.
 * Utilizado para queries e mutações de dados operacionais que NUNCA podem rodar globalmente.
 */
export function requireTenantCompanyId(
  companyId: string | null | undefined,
  contextName = 'Operação de tenant'
): string {
  if (!companyId || companyId.trim() === '') {
    throw new Error(`[TenantScope] ${contextName} bloqueada: company_id não definido. Acesso global proibido.`);
  }
  return companyId;
}
