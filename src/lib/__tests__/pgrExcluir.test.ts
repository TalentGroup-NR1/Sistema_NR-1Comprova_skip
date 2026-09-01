import { describe, it, expect } from "vitest";

// ────────────────────────────────────────────────────────────
// Funções puras de autorização (pgr-excluir)
// ────────────────────────────────────────────────────────────
function canDeleteImportacao(callerRoles: string[], callerCompanyId: string | null, importacaoCompanyId: string): boolean {
  if (callerRoles.includes("admin_master")) return true;
  if (!callerRoles.some(r => ["admin_empresa", "analista_rh"].includes(r))) return false;
  return callerCompanyId === importacaoCompanyId;
}

describe("pgr-excluir: Autorização", () => {
  it("deve permitir que o admin exclua uma importação", () => {
    expect(canDeleteImportacao(["admin_master"], "empresa1", "empresa2")).toBe(true);
    expect(canDeleteImportacao(["admin_empresa"], "empresa1", "empresa1")).toBe(true);
  });

  it("não deve permitir excluir registros de outra empresa", () => {
    expect(canDeleteImportacao(["admin_empresa"], "empresa1", "empresa2")).toBe(false);
    expect(canDeleteImportacao(["analista_rh"], "empresa1", "empresa2")).toBe(false);
  });

  it("não deve permitir papéis não autorizados", () => {
    expect(canDeleteImportacao(["colaborador"], "empresa1", "empresa1")).toBe(false);
  });
});
