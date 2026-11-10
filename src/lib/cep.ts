export interface CepAddress {
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
}

/** Formata o CEP como 00000-000 enquanto o usuário digita. */
export function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function isCepComplete(value: string): boolean {
  return value.replace(/\D/g, "").length === 8;
}

/**
 * Busca o endereço pelo CEP na API pública ViaCEP.
 * Retorna null quando o CEP é inválido, não encontrado ou a consulta falha/expira.
 */
export async function fetchAddressByCep(cep: string): Promise<CepAddress | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      erro?: boolean | string;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (data.erro) return null;

    return {
      logradouro: data.logradouro ?? "",
      bairro: data.bairro ?? "",
      cidade: data.localidade ?? "",
      estado: (data.uf ?? "").toUpperCase(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
