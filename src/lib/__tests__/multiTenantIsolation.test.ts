import { describe, it, expect } from "vitest";

interface UserContext {
  userId: string;
  companyId: string;
  role: "admin_master" | "admin_empresa" | "analista_rh" | "gestor_departamento" | "colaborador";
}

/**
 * Função pura de autorização multi-tenant que espelha as regras RLS do Supabase
 * e os guards das Edge Functions (create-user, finalize-colaborador-user, etc.)
 */
function checkTenantAccess(
  caller: UserContext,
  targetCompanyId: string,
  targetUserId?: string
): { allowed: boolean; reason?: string } {
  // admin_master tem acesso a todos os tenants
  if (caller.role === "admin_master") {
    return { allowed: true };
  }

  // Cross-tenant check
  if (caller.companyId !== targetCompanyId) {
    return { allowed: false, reason: "CROSS_TENANT_FORBIDDEN" };
  }

  // Colaborador só pode acessar a si próprio
  if (caller.role === "colaborador") {
    if (targetUserId && targetUserId !== caller.userId) {
      return { allowed: false, reason: "SELF_ACCESS_ONLY" };
    }
  }

  return { allowed: true };
}

describe("Multi-Tenant Isolation & Authorization Rules", () => {
  const companyA = "11111111-1111-1111-1111-111111111111";
  const companyB = "22222222-2222-2222-2222-222222222222";

  it("should allow admin_master to access any tenant", () => {
    const master: UserContext = {
      userId: "u-master",
      companyId: companyA,
      role: "admin_master",
    };
    expect(checkTenantAccess(master, companyA).allowed).toBe(true);
    expect(checkTenantAccess(master, companyB).allowed).toBe(true);
  });

  it("should block admin_empresa from accessing data belonging to company B", () => {
    const adminA: UserContext = {
      userId: "u-admin-a",
      companyId: companyA,
      role: "admin_empresa",
    };
    expect(checkTenantAccess(adminA, companyA).allowed).toBe(true);
    const result = checkTenantAccess(adminA, companyB);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("CROSS_TENANT_FORBIDDEN");
  });

  it("should block analista_rh and gestor from cross-tenant operations", () => {
    const rhA: UserContext = {
      userId: "u-rh-a",
      companyId: companyA,
      role: "analista_rh",
    };
    expect(checkTenantAccess(rhA, companyB).allowed).toBe(false);

    const gestorA: UserContext = {
      userId: "u-gestor-a",
      companyId: companyA,
      role: "gestor_departamento",
    };
    expect(checkTenantAccess(gestorA, companyB).allowed).toBe(false);
  });

  it("should allow colaborador only to access own data in own company", () => {
    const colab1: UserContext = {
      userId: "u-colab-1",
      companyId: companyA,
      role: "colaborador",
    };

    // Próprios dados na empresa A -> Permitido
    expect(checkTenantAccess(colab1, companyA, "u-colab-1").allowed).toBe(true);

    // Dados de outro colaborador na empresa A -> Negado
    const otherUserInSameCompany = checkTenantAccess(colab1, companyA, "u-colab-2");
    expect(otherUserInSameCompany.allowed).toBe(false);
    expect(otherUserInSameCompany.reason).toBe("SELF_ACCESS_ONLY");

    // Dados na empresa B -> Negado por cross-tenant
    const otherCompany = checkTenantAccess(colab1, companyB, "u-colab-1");
    expect(otherCompany.allowed).toBe(false);
    expect(otherCompany.reason).toBe("CROSS_TENANT_FORBIDDEN");
  });
});
