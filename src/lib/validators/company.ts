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
});

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
