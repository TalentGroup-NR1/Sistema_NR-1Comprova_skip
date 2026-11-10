/**
 * Constantes globais do sistema NR-1Comprova.
 */

/**
 * Prazo padrão de expiração de links de acesso/convite/definição de senha (em horas).
 * Fonte única de verdade para UI, e-mails e mensagens de erro.
 */
export const LINK_EXPIRATION_HOURS = 24;

/**
 * Mensagem padrão de expiração para exibição na UI e e-mails.
 */
export const LINK_EXPIRATION_MESSAGE = `Este link expira em ${LINK_EXPIRATION_HOURS} horas e é de uso único.`;

/**
 * Rótulos oficiais de exibição dos perfis do sistema (fonte única da verdade).
 * Nomenclatura oficial: Colaborador, Gestor de Departamento, Administrador Operacional, Administrador Empresa.
 */
export const ROLE_LABELS: Record<string, string> = {
  admin_master: 'Admin Master',
  admin_empresa: 'Administrador Empresa',
  analista_rh: 'Administrador Operacional',
  gestor_departamento: 'Gestor de Departamento',
  colaborador: 'Colaborador',
  super_admin: 'Super Admin',
};

/**
 * Ordem hierárquica fixa dos 4 perfis para selects e listagens de perfis da empresa:
 * Administrador Empresa → Administrador Operacional → Gestor de Departamento → Colaborador
 */
export const COMPANY_ROLE_ORDER = [
  'admin_empresa',
  'analista_rh',
  'gestor_departamento',
  'colaborador',
] as const;
