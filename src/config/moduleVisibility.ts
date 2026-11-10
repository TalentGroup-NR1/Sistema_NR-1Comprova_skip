import { AppRole } from '@/hooks/useAuth';

export const ALL_ROLES: AppRole[] = [
  'admin_master',
  'admin_empresa',
  'analista_rh',
  'gestor_departamento',
  'colaborador',
];

export const MANAGEMENT_ROLES: AppRole[] = [
  'admin_master',
  'admin_empresa',
  'analista_rh',
  'gestor_departamento',
];

export const ADMIN_ROLES: AppRole[] = [
  'admin_master',
  'admin_empresa',
  'analista_rh',
];

/**
 * Matriz explícita de visibilidade de rotas e módulos por papel.
 * Define quais papéis têm permissão funcional de visualizar e acessar cada módulo.
 * 
 * Regras Especiais:
 * - /fale-conosco: soberania da empresa (somente admin_empresa e analista_rh).
 * - /comportamentos-ofensivos e /denuncias: restrito exclusivamente a membros nominalmente designados.
 * - admin_master: vê todos os módulos operacionais e de gestão, mas NÃO tem acesso às denúncias
 *   e fale-conosco de terceiros sem designação soberana da empresa.
 */
export const MODULE_VISIBILITY: Record<string, AppRole[]> = {
  '/': ALL_ROLES,
  '/colaboradores': MANAGEMENT_ROLES,
  '/ferias': MANAGEMENT_ROLES,
  '/minhas-ferias': ['colaborador'],
  '/demissoes': ADMIN_ROLES,
  '/beneficios': ALL_ROLES,
  '/ponto-eletronico': ALL_ROLES,
  '/minhas-tarefas': ALL_ROLES,
  '/comunicados': ALL_ROLES,
  '/diario-bordo': ALL_ROLES,
  '/avaliacoes': ALL_ROLES,
  '/feedback-gestao': MANAGEMENT_ROLES,
  '/treinamentos': ALL_ROLES,
  '/treinamentos/catalogo-global': ['admin_master'],
  '/cuidar-mais': ALL_ROLES,
  '/mapa-riscos-nr1': ALL_ROLES,
  '/estrutura-organizacional': MANAGEMENT_ROLES,
  '/relatorios-executivos': ADMIN_ROLES,
  '/configuracoes-empresa': ['admin_master', 'admin_empresa'],
  '/empresas': ['admin_master'],
  '/acessos': ['admin_master', 'admin_empresa'],
  '/admin-plataforma': ['admin_master'],
  '/cadastro-empresa': ['admin_master'],
  // Fale conosco reservado estritamente para gestão interna da empresa
  '/fale-conosco': ['admin_empresa', 'analista_rh'],
};

export function canRoleAccessModule(route: string, role: AppRole | null): boolean {
  if (!role) return false;
  const allowed = MODULE_VISIBILITY[route];
  if (!allowed) {
    // Se rota não mapeada na matriz, liberada se não tiver bloqueio específico
    return true;
  }
  return allowed.includes(role);
}
