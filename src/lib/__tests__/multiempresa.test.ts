import { describe, it, expect } from 'vitest';

export type AppRole = 'admin_master' | 'admin_empresa' | 'analista_rh' | 'gestor_departamento' | 'colaborador' | 'super_admin';

export interface UserCompanyLink {
  user_id: string;
  company_id: string;
  role: AppRole;
  is_default: boolean;
}

/**
 * Função pura que simula a lógica de resolução de papel por vínculo (get_my_role)
 * e o isolamento multi-tenant garantido pelo banco (RLS e checkTenantAccess)
 */
export function resolveRoleForEffectiveCompany(
  links: UserCompanyLink[],
  effectiveCompanyId: string,
  legacyRoleFallback?: AppRole
): AppRole {
  const link = links.find((l) => l.company_id === effectiveCompanyId);
  if (link) {
    return link.role;
  }
  // Fallback temporário (marcado para remoção no Ciclo B)
  return legacyRoleFallback ?? 'colaborador';
}

/**
 * Validação de acesso à empresa (espelha a RPC set_active_company e has_company_access)
 */
export function canSwitchToCompany(
  callerUserId: string,
  targetCompanyId: string,
  isSuperAdmin: boolean,
  links: UserCompanyLink[]
): { allowed: boolean; error?: string } {
  if (isSuperAdmin) {
    return { allowed: true };
  }
  const hasLink = links.some(
    (l) => l.user_id === callerUserId && l.company_id === targetCompanyId
  );
  if (!hasLink) {
    return { allowed: false, error: 'Acesso negado: usuário não possui vínculo com esta empresa.' };
  }
  return { allowed: true };
}

/**
 * Regra de exibição do seletor de empresa (UX)
 */
export function shouldShowCompanySelector(
  userLinksCount: number,
  isAdminMaster: boolean,
  isSuperAdmin: boolean
): boolean {
  if (isAdminMaster || isSuperAdmin) return true;
  return userLinksCount > 1;
}

/**
 * Correção 1: Validação de permissão de escrita em user_companies
 * No Ciclo A: APENAS super_admin pode gravar vínculos. admin_empresa é terminantemente impedido.
 */
export function canWriteUserCompany(
  callerRole: AppRole,
  isSuperAdmin: boolean
): boolean {
  // Apenas super_admin da plataforma pode gravar vínculos no Ciclo A
  return isSuperAdmin;
}

/**
 * Correção 2: Simulação da trigger idempotente de sincronização
 * Quando um usuário recebe company_id no profile, garante que o vínculo em user_companies é criado
 */
export function simulateProfileCompanySyncTrigger(
  existingLinks: UserCompanyLink[],
  userId: string,
  newCompanyId: string,
  derivedRole: AppRole
): { updatedLinks: UserCompanyLink[]; created: boolean } {
  const alreadyExists = existingLinks.some(
    (l) => l.user_id === userId && l.company_id === newCompanyId
  );

  if (alreadyExists) {
    // Idempotente: se já existe (ex.: troca via set_active_company), não duplica
    return { updatedLinks: [...existingLinks], created: false };
  }

  // Cria o vínculo com a role derivada
  const newLink: UserCompanyLink = {
    user_id: userId,
    company_id: newCompanyId,
    role: derivedRole,
    is_default: existingLinks.length === 0,
  };

  return { updatedLinks: [...existingLinks, newLink], created: true };
}

describe('Fundação Multiempresa - Regras e Isolamento', () => {
  const compA = '11111111-1111-1111-1111-111111111111';
  const compB = '22222222-2222-2222-2222-222222222222';
  const compC = '33333333-3333-3333-3333-333333333333';
  const userId = 'u-admin-multitenant';

  const userLinks: UserCompanyLink[] = [
    { user_id: userId, company_id: compA, role: 'admin_empresa', is_default: true },
    { user_id: userId, company_id: compB, role: 'gestor_departamento', is_default: false },
  ];

  it('1. deve resolver o papel especificamente pelo vínculo com a empresa efetiva', () => {
    // Na empresa A, o usuário é admin_empresa
    const roleA = resolveRoleForEffectiveCompany(userLinks, compA);
    expect(roleA).toBe('admin_empresa');

    // Na empresa B, o mesmo usuário é gestor_departamento
    const roleB = resolveRoleForEffectiveCompany(userLinks, compB);
    expect(roleB).toBe('gestor_departamento');
  });

  it('2. deve permitir troca de empresa para empresa com vínculo e bloquear empresa sem vínculo (fail-closed)', () => {
    // Troca para Empresa B (tem vínculo) -> Sucesso
    const switchB = canSwitchToCompany(userId, compB, false, userLinks);
    expect(switchB.allowed).toBe(true);
    expect(switchB.error).toBeUndefined();

    // Tentativa de troca para Empresa C (sem vínculo) -> Bloqueado
    const switchC = canSwitchToCompany(userId, compC, false, userLinks);
    expect(switchC.allowed).toBe(false);
    expect(switchC.error).toContain('Acesso negado');
  });

  it('3. usuário com 1 único vínculo NÃO vê o seletor de empresa (experiência zero mudança)', () => {
    const singleLink = [userLinks[0]];
    const show = shouldShowCompanySelector(singleLink.length, false, false);
    expect(show).toBe(false);
  });

  it('4. usuário com 2 ou mais vínculos VÊ o seletor de empresa', () => {
    const show = shouldShowCompanySelector(userLinks.length, false, false);
    expect(show).toBe(true);
  });

  it('5. Super Admin sempre vê o seletor de empresa e tem bypass para qualquer empresa', () => {
    const show = shouldShowCompanySelector(0, false, true);
    expect(show).toBe(true);

    const switchAny = canSwitchToCompany(userId, compC, true, []);
    expect(switchAny.allowed).toBe(true);
  });

  it('6. Correção 1: admin_empresa NÃO tem permissão de escrita em user_companies (apenas super_admin)', () => {
    // admin_empresa tentando gravar vínculo -> Bloqueado
    expect(canWriteUserCompany('admin_empresa', false)).toBe(false);
    // analista_rh tentando gravar vínculo -> Bloqueado
    expect(canWriteUserCompany('analista_rh', false)).toBe(false);
    // super_admin -> Permitido
    expect(canWriteUserCompany('super_admin', true)).toBe(true);
  });

  it('7. Correção 2: novo usuário criado nasce com vínculo via trigger idempotente', () => {
    const initialLinks: UserCompanyLink[] = [];
    
    // Novo usuário criado apontando para compA
    const result = simulateProfileCompanySyncTrigger(initialLinks, 'u-new', compA, 'admin_empresa');
    expect(result.created).toBe(true);
    expect(result.updatedLinks.length).toBe(1);
    expect(result.updatedLinks[0]).toEqual({
      user_id: 'u-new',
      company_id: compA,
      role: 'admin_empresa',
      is_default: true,
    });

    // Se o profile atualizar para a mesma empresa (ou set_active_company para empresa já vinculada), não duplica
    const idempotentResult = simulateProfileCompanySyncTrigger(result.updatedLinks, 'u-new', compA, 'admin_empresa');
    expect(idempotentResult.created).toBe(false);
    expect(idempotentResult.updatedLinks.length).toBe(1);
  });
});
