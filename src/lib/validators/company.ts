import { z } from "zod";

// CNPJ format: XX.XXX.XXX/XXXX-XX
const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

export const companySchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(255, "Nome deve ter no máximo 255 caracteres")
    .trim(),
  cnpj: z
    .string()
    .regex(cnpjRegex, "CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX")
    .trim(),
  contact_person: z
    .string()
    .max(255, "Nome do contato deve ter no máximo 255 caracteres")
    .trim()
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Email inválido")
    .max(255, "Email deve ter no máximo 255 caracteres")
    .trim()
    .optional()
    .or(z.literal("")),
  status: z.enum(["active", "inactive"]).default("active"),
  cep: z
    .string()
    .trim()
    .regex(/^\d{5}-\d{3}$/, "CEP deve estar no formato 00000-000")
    .optional()
    .or(z.literal("")),
  logradouro: z.string().trim().max(255).optional().or(z.literal("")),
  numero: z.string().trim().max(20).optional().or(z.literal("")),
  complemento: z.string().trim().max(120).optional().or(z.literal("")),
  bairro: z.string().trim().max(120).optional().or(z.literal("")),
  cidade: z.string().trim().max(120).optional().or(z.literal("")),
  estado: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "UF deve ter 2 letras")
    .optional()
    .or(z.literal("")),
  telefone: z.string().trim().max(30).optional().or(z.literal("")),
  segmento: z.string().trim().max(100).optional().or(z.literal("")),
});

export const SEGMENTOS = [
  "Agronegócio",
  "Tecnologia",
  "Construção Civil",
  "Serviços Financeiros",
  "Energias",
  "Saúde",
  "Outros",
] as const;


export type CompanyFormData = z.infer<typeof companySchema>;

export interface Company extends CompanyFormData {
  id: string;
  logo_url?: string | null;
  logo_upload_date?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  brand_name?: string | null;
  brand_logo_url?: string | null;
  brand_primary_color?: string | null;
  brand_favicon_url?: string | null;
  telefone?: string | null;
  segmento?: string | null;
  is_internal?: boolean | null;
  created_at: string;
  updated_at: string;
}

// Helper function to format CNPJ as user types
export function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

// Validação completa de CNPJ (14 dígitos e dígitos verificadores da Receita Federal)
export function isValidCNPJ(value: string): boolean {
  if (!value) return false;
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  // Elimina números com todos os dígitos iguais
  if (/^(\d)\1+$/.test(digits)) return false;

  // Validação do 1º dígito verificador
  let size = digits.length - 2;
  let numbers = digits.substring(0, size);
  const digitsCheck = digits.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(digitsCheck.charAt(0))) return false;

  // Validação do 2º dígito verificador
  size = size + 1;
  numbers = digits.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(digitsCheck.charAt(1))) return false;

  return true;
}

// Helper function to format Brazilian phone numbers as user types: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
export function formatPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
