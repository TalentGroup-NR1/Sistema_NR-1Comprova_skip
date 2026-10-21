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
