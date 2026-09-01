/**
 * Helper para mascaramento de Informações de Identificação Pessoal (PII).
 * Garante conformidade com LGPD nos logs das Edge Functions.
 */

export function maskEmail(email?: string | null): string {
  if (!email || typeof email !== 'string') return '***@***';
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return '***@***';
  const [user, domain] = parts;
  const maskedUser = user.length <= 2 
    ? `${user[0] || '*'}***` 
    : `${user[0]}***${user[user.length - 1]}`;
  return `${maskedUser}@${domain}`;
}

export function maskCpf(cpf?: string | null): string {
  if (!cpf || typeof cpf !== 'string') return '***.***.***-**';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return '***.***.***-**';
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9, 11)}`;
}

export function maskPhone(phone?: string | null): string {
  if (!phone || typeof phone !== 'string') return '(**) *****-****';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return '(**) *****-****';
  return `(${digits.slice(0, 2)}) *****-${digits.slice(-4)}`;
}

export function maskName(name?: string | null): string {
  if (!name || typeof name !== 'string') return '***';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    const n = parts[0];
    return n.length <= 2 ? `${n[0]}***` : `${n[0]}***${n[n.length - 1]}`;
  }
  return parts.map(p => `${p[0]}***`).join(' ');
}
