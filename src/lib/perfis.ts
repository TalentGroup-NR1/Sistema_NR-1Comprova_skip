/**
 * Centralização única dos perfis de gestão da empresa no NR-1 Comprova.
 *
 * Mapeamento com a nomenclatura oficial (ROLE_LABELS):
 * - admin_empresa: "Administrador Empresa"
 * - analista_rh: "Administrador Operacional"
 */

export const PERFIS_GESTAO_EMPRESA = [
  'admin_empresa',
  'analista_rh',
] as const;

export type PerfilGestaoEmpresa = typeof PERFIS_GESTAO_EMPRESA[number];

/**
 * Retorna true se o role informado pertence aos perfis de gestão da empresa.
 */
export function isPerfilGestaoEmpresa(role: string | null | undefined): boolean {
  if (!role) return false;
  return (PERFIS_GESTAO_EMPRESA as readonly string[]).includes(role);
}
