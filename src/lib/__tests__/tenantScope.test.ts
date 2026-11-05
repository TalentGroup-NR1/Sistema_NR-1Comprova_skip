import { describe, it, expect } from 'vitest';
import { getTenantCompanyId, requireTenantCompanyId } from '../tenantScope';

describe('tenantScope', () => {
  it('retorna null para admin_master sem selectedCompanyId', () => {
    const user = {
      id: 'usr-admin-master',
      role: 'admin_master',
      company_id: 'empresa-123', // mesmo se tiver company_id residual
    };

    const tenant = getTenantCompanyId(user as any, null);
    expect(tenant).toBeNull();
  });

  it('retorna selectedCompanyId para admin_master quando uma empresa sandbox for selecionada', () => {
    const user = {
      id: 'usr-admin-master',
      role: 'admin_master',
      company_id: null,
    };

    const tenant = getTenantCompanyId(user as any, 'sandbox-comp-uuid');
    expect(tenant).toBe('sandbox-comp-uuid');
  });

  it('retorna company_id ou selectedCompanyId para outros perfis (admin_empresa, colaborador)', () => {
    const userEmpresa = {
      id: 'usr-admin-empresa',
      role: 'admin_empresa',
      company_id: 'empresa-horizonte',
    };

    expect(getTenantCompanyId(userEmpresa as any, null)).toBe('empresa-horizonte');
    expect(getTenantCompanyId(userEmpresa as any, 'empresa-horizonte')).toBe('empresa-horizonte');
  });

  it('requireTenantCompanyId lança erro se company_id for nulo ou vazio', () => {
    expect(() => requireTenantCompanyId(null, 'Listagem')).toThrowError(
      /company_id não definido. Acesso global proibido./
    );
    expect(() => requireTenantCompanyId('', 'Listagem')).toThrowError(
      /company_id não definido. Acesso global proibido./
    );
  });

  it('requireTenantCompanyId retorna o company_id válido', () => {
    expect(requireTenantCompanyId('valid-comp-id', 'Listagem')).toBe('valid-comp-id');
  });
});
