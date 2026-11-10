/**
 * Rotas públicas (acessíveis sem login) — links compartilháveis enviados por e-mail ou canais de rastreio anônimo.
 * O ProtectedRoute libera qualquer caminho igual a um destes prefixos ou iniciado por
 * `<prefixo>/`, evitando casar por engano com rotas restritas.
 */
export const PUBLIC_ROUTES = [
  '/auth',
  '/login',
  '/atualizar-senha',
  '/unsubscribe',
  '/feedback',
  '/cuidar-mais-form',
  '/avaliacao/preencher',
  '/validar-certificado',
  '/termos',
  '/privacidade',
  '/blog',
  '/acompanhar',
];

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
