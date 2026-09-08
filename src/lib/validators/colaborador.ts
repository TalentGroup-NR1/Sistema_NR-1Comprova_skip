import { z } from 'zod';

// Enum values
export const colaboradorStatusOptions = ['ATIVO', 'FERIAS', 'DESLIGADO', 'LICENCA'] as const;
export const maritalStatusOptions = ['Solteiro(a)', 'Casado(a)', 'Separado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'] as const;
export const sexOptions = ['Feminino', 'Masculino', 'Outro', 'Não informar'] as const;
export const ethnicityOptions = ['Branca', 'Preta', 'Parda', 'Amarela', 'Indígena', 'Não informar'] as const;
export const educationLevelOptions = [
  'Fundamental Incompleto', 'Fundamental Completo',
  'Médio Incompleto', 'Médio Completo',
  'Superior Incompleto', 'Superior Completo',
  'Pós-graduação', 'Mestrado', 'Doutorado'
] as const;
export const contractTypeOptions = ['CLT', 'Estágio', 'Aprendiz', 'PJ', 'Temporário', 'Voluntário', 'Outros'] as const;
export const jobLevelOptions = [
  'Júnior', 'Júnior I', 'Júnior II', 'Júnior III',
  'Pleno', 'Pleno I', 'Pleno II', 'Pleno III',
  'Sênior', 'Sênior I', 'Sênior II', 'Sênior III',
  'Especialista', 'Especialista I', 'Especialista II', 'Especialista III'
] as const;
export const paymentMethodOptions = ['Mensalista', 'Horista', 'Comissionista'] as const;
export const workShiftTypeOptions = ['Integral', 'Parcial', 'Aprendiz', 'Estagiário', 'Flexível'] as const;
export const relationshipTypeOptions = ['Filho(a)', 'Cônjuge', 'Pai/Mãe', 'Outro'] as const;
export const nacionalidadeOptions = ['Brasileira', 'Estrangeira'] as const;

// Mask functions
export function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function formatCNPJ(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 14);
  return numbers
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function formatPhoneBR(value: string): string {
  // Remove tudo que não é dígito
  let numbers = value.replace(/\D/g, '');
  
  // Remove o DDI 55 se presente (quando length > 2, para evitar ambiguidade)
  if (numbers.startsWith('55') && numbers.length > 2) {
    numbers = numbers.slice(2);
  }
  
  // Limita a 11 dígitos (DDD + telefone)
  numbers = numbers.slice(0, 11);
  
  if (numbers.length === 0) return '';
  
  // Formata com DDI +55
  if (numbers.length <= 2) {
    return `+55 ${numbers}`;
  } else if (numbers.length <= 6) {
    return `+55 ${numbers.slice(0, 2)} ${numbers.slice(2)}`;
  } else if (numbers.length <= 10) {
    // Telefone fixo: +55 11 9999-9999
    return `+55 ${numbers.slice(0, 2)} ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  } else {
    // Celular: +55 11 99999-9999
    return `+55 ${numbers.slice(0, 2)} ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  }
}

// Mantém a função antiga para compatibilidade
export function formatPhone(value: string): string {
  return formatPhoneBR(value);
}

export function formatCEP(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 8);
  return numbers.replace(/(\d{5})(\d)/, '$1-$2');
}

export function formatDateBR(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 8);
  return numbers
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2');
}

export function parseDateBR(value: string): Date | null {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  if (isNaN(date.getTime())) return null;
  return date;
}

export function formatDateToDisplay(date: Date | string | null): string {
  if (!date) return '';
  if (typeof date === 'string') {
    // If it's an ISO date string (YYYY-MM-DD), parse parts directly to avoid timezone shift
    const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${day}/${month}/${year}`;
    }
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parses an ISO date string (YYYY-MM-DD) into a Date using LOCAL timezone.
 * Use this instead of `new Date("YYYY-MM-DD")` which parses as UTC and shifts dates in negative timezones.
 */
export function parseISODate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formats a Date object to ISO date string (YYYY-MM-DD) using LOCAL timezone.
 * This prevents timezone shift issues when saving dates to the database.
 * 
 * IMPORTANT: Do NOT use date.toISOString().split('T')[0] as it converts to UTC first,
 * which can shift the date by one day in negative timezones (e.g., Brazil UTC-3).
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function parseCurrency(value: string): number {
  const numbers = value.replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(numbers) || 0;
}

// Validation helpers
const dateStringSchema = z.string().refine((val) => {
  if (!val) return true;
  const date = parseDateBR(val);
  return date !== null;
}, { message: 'Data inválida. Use o formato DD/MM/AAAA' });

const requiredDateStringSchema = z.string().min(1, 'Campo obrigatório').refine((val) => {
  const date = parseDateBR(val);
  return date !== null;
}, { message: 'Data inválida. Use o formato DD/MM/AAAA' });

const cpfSchema = z.string()
  .min(1, 'CPF é obrigatório')
  .refine((val) => val.replace(/\D/g, '').length === 11, { message: 'CPF deve ter 11 dígitos' });

const cnpjSchema = z.string()
  .optional()
  .refine((val) => !val || val.replace(/\D/g, '').length === 14, { message: 'CNPJ deve ter 14 dígitos' });

const emailSchema = z.string()
  .min(1, 'E-mail corporativo é obrigatório')
  .email('E-mail inválido');

// Dependente schema
export const dependenteSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nome é obrigatório'),
  birth_date: requiredDateStringSchema,
  relationship: z.enum(relationshipTypeOptions, { required_error: 'Parentesco é obrigatório' }),
});

// Tab 1: Identificação
export const identificacaoSchema = z.object({
  avatar_url: z.string().optional(),
  matricula: z.string().max(50).optional(),
  full_name: z.string().min(1, 'Nome completo é obrigatório').max(255),
  social_name: z.string().max(255).optional(),
  birth_date: requiredDateStringSchema,
  naturalidade: z.string().max(100).optional(),
  nacionalidade: z.string().optional(),
  marital_status: z.enum(maritalStatusOptions).optional().nullable(),
  sex: z.enum(sexOptions).optional().nullable(),
  ethnicity: z.enum(ethnicityOptions).optional().nullable(),
  education_level: z.enum(educationLevelOptions).optional().nullable(),
  dependentes: z.array(dependenteSchema).optional(),
});

// Tab 2: Documentação
export const documentacaoSchema = z.object({
  cpf: cpfSchema,
  cnpj: cnpjSchema,
  razao_social: z.string().max(255).optional(),
  data_pagamento: z.string().max(10).optional(),
  rg: z.string().max(30).optional(),
  pis: z.string().max(20).optional(),
  ctps_numero: z.string().max(20).optional(),
  ctps_serie: z.string().max(20).optional(),
});

// Tab 3: Contrato
export const contratoSchema = z.object({
  contract_type: z.enum(contractTypeOptions, { required_error: 'Tipo de contrato é obrigatório' }),
  cargo_id: z.string().uuid().optional().nullable(),
  job_title: z.string().min(1, 'Cargo é obrigatório').max(100),
  job_level: z.string().max(100).optional().nullable(),
  department: z.string().min(1, 'Departamento é obrigatório').max(100),
  manager_name: z.string().max(255).optional(),
  gestor_id: z.string().uuid().optional().nullable(),
  base_salary: z.string().min(1, 'Salário base é obrigatório'),
  payment_method: z.enum(paymentMethodOptions, { required_error: 'Forma de pagamento é obrigatória' }),
  work_shift_type: z.enum(workShiftTypeOptions).optional().nullable(),
  admission_date: requiredDateStringSchema,
  work_schedule: z.string().max(100).optional(),
  work_schedule_id: z.string().uuid().optional().nullable(),

  is_substituicao: z.boolean().optional().default(false),
  substituicao_colaborador_id: z.string().uuid().optional().nullable(),
  is_banco_horas: z.boolean().optional().default(false),
  jornada_diaria_minutos: z.coerce.number().min(1).max(1440).optional().nullable(), // legado — não usado
  banco_horas_perfil_id: z.string().uuid().optional().nullable(),
  // Onda Férias 1.0 — histórico legado
  ultima_ferias_inicio: z.string().optional().refine((v) => !v || parseDateBR(v) !== null, { message: 'Data inválida. Use DD/MM/AAAA' }),
  ultima_ferias_fim: z.string().optional().refine((v) => !v || parseDateBR(v) !== null, { message: 'Data inválida. Use DD/MM/AAAA' }),
  data_corte_ferias: z.string().optional().refine((v) => !v || parseDateBR(v) !== null, { message: 'Data inválida. Use DD/MM/AAAA' }),
});

// Validação de telefone BR (com DDI)
const phoneSchema = z.string()
  .optional()
  .refine((val) => {
    if (!val) return true;
    const numbers = val.replace(/\D/g, '');
    // Aceita 10 ou 11 dígitos (sem DDI) ou 12/13 dígitos (com DDI 55)
    return numbers.length >= 10 && numbers.length <= 13;
  }, { message: 'Telefone inválido. Use o formato +55 11 99999-9999' });

// Tab: Formação Acadêmica
export const formacaoAcademicaSchema = z.object({
  education_level: z.enum(educationLevelOptions).optional().nullable(),
  cursos_realizados: z.string().max(2000).optional(),
});

// Tab: Alinhamento
export const alinhamentoSchema = z.object({
  alinhamento_notas: z.string().max(5000).optional(),
});

// Tab: Currículo
export const curriculoSchema = z.object({
  curriculo_path: z.string().optional(),
});

// Tab: HumanGuide
export const humanguideSchema = z.object({
  humanguide_notas: z.string().max(5000).optional(),
  humanguide_path: z.string().optional(),
});

// Tab 4: Contato e Endereço
export const contatoEnderecoSchema = z.object({
  email_pessoal: z.string()
    .min(1, 'E-mail pessoal é obrigatório')
    .email('E-mail inválido'),
  corporate_email: z.string()
    .email('E-mail inválido')
    .optional()
    .or(z.literal('')),
  phone: phoneSchema,
  telefone_secundario: phoneSchema,
  address_zip_code: z.string().optional(),
  address_country: z.string().optional(),
  address_state: z.string().optional(),
  address_city: z.string().optional(),
  address_street: z.string().max(255).optional(),
  address_number: z.string().max(50).optional(),
  address_complement: z.string().max(255).optional(),
  address_neighborhood: z.string().max(255).optional(),
});

// Complete schema
export const colaboradorSchema = z.object({
  ...identificacaoSchema.shape,
  ...documentacaoSchema.shape,
  ...contratoSchema.shape,
  ...contatoEnderecoSchema.shape,
  ...formacaoAcademicaSchema.shape,
  ...alinhamentoSchema.shape,
  ...curriculoSchema.shape,
  ...humanguideSchema.shape,
  status: z.enum(colaboradorStatusOptions).default('ATIVO'),
}).superRefine((data, ctx) => {
  const ini = data.ultima_ferias_inicio ? parseDateBR(data.ultima_ferias_inicio) : null;
  const fim = data.ultima_ferias_fim ? parseDateBR(data.ultima_ferias_fim) : null;
  if (ini && !fim) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ultima_ferias_fim'], message: 'Informe a data de fim das últimas férias' });
  }
  if (ini && fim && fim < ini) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ultima_ferias_fim'], message: 'Fim das férias não pode ser anterior ao início' });
  }
});

export type ColaboradorFormData = z.infer<typeof colaboradorSchema>;
export type DependenteFormData = z.infer<typeof dependenteSchema>;
export type IdentificacaoFormData = z.infer<typeof identificacaoSchema>;
export type DocumentacaoFormData = z.infer<typeof documentacaoSchema>;
export type ContratoFormData = z.infer<typeof contratoSchema>;
export type ContatoEnderecoFormData = z.infer<typeof contatoEnderecoSchema>;
export type FormacaoAcademicaFormData = z.infer<typeof formacaoAcademicaSchema>;
export type AlinhamentoFormData = z.infer<typeof alinhamentoSchema>;
export type CurriculoFormData = z.infer<typeof curriculoSchema>;
export type HumanGuideFormData = z.infer<typeof humanguideSchema>;
