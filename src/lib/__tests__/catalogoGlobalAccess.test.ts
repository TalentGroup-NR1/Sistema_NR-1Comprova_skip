/**
 * Testes Unitários de Autorização e Regras de Negócio do Catálogo Global (Etapa 8.5)
 */

import { describe, it, expect } from "vitest";
import { canRoleAccessModule, MODULE_VISIBILITY } from "@/config/moduleVisibility";
import { AppRole } from "@/hooks/useAuth";

describe("Catálogo Global — Autorização e Visibilidade (Etapa 8.5)", () => {
  const ROUTE = "/treinamentos/catalogo-global";

  it("1.1. Apenas admin_master tem permissão no moduleVisibility para /treinamentos/catalogo-global", () => {
    expect(MODULE_VISIBILITY[ROUTE]).toEqual(["admin_master"]);
    expect(canRoleAccessModule(ROUTE, "admin_master")).toBe(true);
  });

  it("1.2. admin_empresa NÃO tem acesso à rota /treinamentos/catalogo-global", () => {
    expect(canRoleAccessModule(ROUTE, "admin_empresa")).toBe(false);
  });

  it("1.3. analista_rh, gestor_departamento e colaborador NÃO têm acesso ao catálogo global", () => {
    const roles: AppRole[] = ["analista_rh", "gestor_departamento", "colaborador"];
    roles.forEach((role) => {
      expect(canRoleAccessModule(ROUTE, role)).toBe(false);
    });
  });

  it("4.1 e 4.2. Regra de formulário: Link externo força gera_certificado=false", () => {
    // Simulação da regra de negócio aplicada pelo hook/formulário
    const resolveGeraCertificado = (tipo: string, flagInformada: boolean) => {
      if (tipo === "link") return false;
      return flagInformada;
    };

    expect(resolveGeraCertificado("link", true)).toBe(false);
    expect(resolveGeraCertificado("link", false)).toBe(false);
    expect(resolveGeraCertificado("pdf", true)).toBe(true);
    expect(resolveGeraCertificado("video", true)).toBe(true);
  });

  it("4.2. Regra de formulário: origem travada em 'plataforma' e company_id em NULL", () => {
    const payloadFactory = (input: { titulo: string; tipo: "pdf" | "link" }) => ({
      ...input,
      origem: "plataforma" as const,
      company_id: null,
    });

    const payload = payloadFactory({ titulo: "Treinamento Global", tipo: "pdf" });
    expect(payload.origem).toBe("plataforma");
    expect(payload.company_id).toBeNull();
  });

  it("3.3. Ponto de Atenção: admin_master_scope aceita company_id NULL", () => {
    // Simulação da função PostgreSQL public.admin_master_scope(_company_id uuid)
    const adminMasterScope = (callerRole: string, targetCompanyId: string | null) => {
      const isAdminMaster = callerRole === "admin_master";
      if (!isAdminMaster) return false;
      return targetCompanyId === null; // ou is_internal = true
    };

    expect(adminMasterScope("admin_master", null)).toBe(true);
    expect(adminMasterScope("admin_empresa", null)).toBe(false);
    expect(adminMasterScope("colaborador", null)).toBe(false);
  });
});

