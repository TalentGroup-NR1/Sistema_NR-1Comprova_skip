import {
  formatCPF,
  formatCNPJ,
  formatPhoneBR,
  formatCEP,
  parseDateBR,
  formatDateToISO,
  parseCurrency,
  contractTypeOptions,
  paymentMethodOptions,
  maritalStatusOptions,
  sexOptions,
  ethnicityOptions,
  educationLevelOptions,
  workShiftTypeOptions,
} from '@/lib/validators/colaborador';

export interface RawColaboradorRow {
  linha: number;
  // Campos obrigatórios v1
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  data_admissao: string;
  tipo_contrato: string;
  cargo: string;
  departamento: string;
  salario_base: string;
  forma_pagamento: string;
  email_pessoal: string;
  // Opcionais v1
  email_corporativo?: string;
  matricula?: string;
  // Opcionais v2 — Contato e Endereço
  telefone?: string;
  telefone_secundario?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  // Opcionais v2 — Identificação Pessoal
  nome_social?: string;
  naturalidade?: string;
  nacionalidade?: string;
  estado_civil?: string;
  sexo?: string;
  raca_cor?: string;
  pcd?: string;
  escolaridade?: string;
  // Opcionais v2 — Contrato Complementar & Horário
  tipo_jornada?: string;
  nivel?: string;
  horario_trabalho?: string;
  cnpj?: string;
  razao_social?: string;
  data_pagamento?: string;
  banco_horas?: string;
  // Opcionais v2 — Documentação
  rg?: string;
  rg_orgao_emissor?: string;
  rg_uf?: string;
  pis?: string;
  ctps_numero?: string;
  ctps_serie?: string;
}

export interface ValidatedColaboradorRow {
  linha: number;
  // Sanitizados obrigatórios
  full_name: string;
  cpf: string; // Formatted 000.000.000-00
  cpf_raw: string; // 11 digits
  birth_date_iso: string; // YYYY-MM-DD (local)
  admission_date_iso: string; // YYYY-MM-DD (local)
  contract_type: string;
  job_title: string;
  department: string;
  base_salary: number;
  payment_method: string;
  email_pessoal: string;
  email_corporativo: string | null;
  matricula: string | null; // explicitamente null se vazio
  // Matching Estrutura Organizacional
  cargo_id: string | null;
  cargo_matched: boolean;
  cargo_nome_oficial: string | null;
  departamento_matched: boolean;
  departamento_nome_oficial: string | null;
  job_level: string | null;
  job_level_matched: boolean;
  work_schedule_id: string | null;
  work_schedule: string | null;
  work_schedule_matched: boolean;
  // Opcionais v2
  phone: string | null;
  telefone_secundario: string | null;
  address_zip_code: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  social_name: string | null;
  naturalidade: string | null;
  nacionalidade: string;
  marital_status: string | null;
  sex: string | null;
  ethnicity: string | null;
  education_level: string | null;
  work_shift_type: string | null;
  cnpj: string | null;
  razao_social: string | null;
  data_pagamento: string | null;
  is_banco_horas: boolean;
  // Documentos
  rg: string | null;
  pis: string | null;
  ctps_numero: string | null;
  ctps_serie: string | null;
  // Raw
  raw: RawColaboradorRow;
}

export interface RejectedColaboradorRow {
  linha: number;
  raw: RawColaboradorRow;
  motivos: string[];
}

export const COLABORADORES_TEMPLATE_CSV = `nome_completo;cpf;data_nascimento;data_admissao;tipo_contrato;cargo;departamento;salario_base;forma_pagamento;email_pessoal;email_corporativo;matricula;telefone;telefone_secundario;cep;logradouro;numero;complemento;bairro;cidade;uf;nome_social;naturalidade;nacionalidade;estado_civil;sexo;raca_cor;pcd;escolaridade;tipo_jornada;nivel;horario_trabalho;cnpj;razao_social;data_pagamento;banco_horas;rg;rg_orgao_emissor;rg_uf;pis;ctps_numero;ctps_serie
Maria da Silva;012.345.678-90;15/04/1992;01/02/2026;CLT;Analista de Recursos Humanos;Recursos Humanos;4500,00;Mensalista;maria.silva@exemplo.com.br;maria.silva@empresa.com.br;0010;+55 11 98888-7777;;01310-100;Avenida Paulista;1000;Apto 42;Bela Vista;São Paulo;SP;;São Paulo - SP;Brasileira;Casado(a);Feminino;Branca;NAO;Superior Completo;Integral;Pleno;;;;;SIM;12.345.678-9;SSP;SP;123.45678.90-1;1234567;001-0
João Pereira Neto;098.765.432-10;28/11/1988;15/01/2026;CLT;Engenheiro de Seguranca;Seguranca do Trabalho;7800,00;Mensalista;joao.neto@exemplo.com.br;joao.neto@empresa.com.br;0011;+55 11 97777-6666;;04578-000;Rua Funchal;500;;Vila Olímpia;São Paulo;SP;;Campinas - SP;Brasileira;Solteiro(a);Masculino;Parda;NAO;Pós-graduação;Integral;Sênior;;;;;NAO;23.456.789-0;SSP;SP;098.76543.21-0;7654321;002-0
`;

export function downloadTemplateColaboradores(): void {
  const blob = new Blob(['\uFEFF' + COLABORADORES_TEMPLATE_CSV], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo-importacao-colaboradores.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export function normalizeMatchingKey(val?: string | null): string {
  return (val || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function matchEnum<T extends string>(
  input: string | undefined | null,
  validOptions: readonly T[]
): { matched?: T; error?: string } {
  if (!input || !input.trim()) return {};
  const normInput = normalizeMatchingKey(input);
  for (const opt of validOptions) {
    if (normalizeMatchingKey(opt) === normInput) {
      return { matched: opt };
    }
  }
  return {
    error: `Valor inválido ("${input.trim()}"). Opções válidas: ${validOptions.join(', ')}`,
  };
}

export function parseBooleanBR(val?: string | null): boolean {
  if (!val) return false;
  const norm = normalizeMatchingKey(val);
  return ['sim', 's', 'true', '1', 'v'].includes(norm);
}

export const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export function normalizeUF(val?: string | null): string | null {
  if (!val) return null;
  const clean = val.trim().toUpperCase();
  if (ESTADOS_BRASIL.includes(clean as any)) {
    return clean;
  }
  return null;
}

export function parseColaboradoresCSV(text: string): {
  headers: string[];
  rows: RawColaboradorRow[];
  error?: string;
} {
  const cleanText = text.replace(/^\uFEFF/, '').trim();
  if (!cleanText) {
    return { headers: [], rows: [], error: 'O arquivo CSV está vazio.' };
  }

  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      headers: [],
      rows: [],
      error: 'O arquivo deve conter pelo menos o cabeçalho e 1 linha de dados.',
    };
  }

  // Detect delimiter based on first line
  const firstLine = lines[0];
  const countSemicolon = (firstLine.match(/;/g) || []).length;
  const countComma = (firstLine.match(/,/g) || []).length;
  const countTab = (firstLine.match(/\t/g) || []).length;

  let sep = ';';
  if (countTab > countSemicolon && countTab > countComma) {
    sep = '\t';
  } else if (countComma > countSemicolon) {
    sep = ',';
  }

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === sep && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map(normalizeHeader);

  const idxMap: Record<string, number> = {};
  headers.forEach((h, i) => {
    idxMap[h] = i;
  });

  const getCol = (cols: string[], ...aliases: string[]): string => {
    for (const a of aliases) {
      const idx = idxMap[a];
      if (idx !== undefined && cols[idx] !== undefined) {
        return cols[idx].replace(/^"|"$/g, '').trim();
      }
    }
    return '';
  };

  // Required header validation
  const requiredAliases = [
    { name: 'nome_completo', keys: ['nome_completo', 'nome', 'full_name'] },
    { name: 'cpf', keys: ['cpf'] },
    { name: 'data_nascimento', keys: ['data_nascimento', 'nascimento', 'birth_date'] },
    { name: 'data_admissao', keys: ['data_admissao', 'admissao', 'admission_date'] },
    { name: 'tipo_contrato', keys: ['tipo_contrato', 'contrato', 'contract_type', 'regime'] },
    { name: 'cargo', keys: ['cargo', 'job_title', 'funcao'] },
    { name: 'departamento', keys: ['departamento', 'department', 'setor', 'area'] },
    { name: 'salario_base', keys: ['salario_base', 'salario', 'base_salary'] },
    { name: 'forma_pagamento', keys: ['forma_pagamento', 'pagamento', 'payment_method'] },
    { name: 'email_pessoal', keys: ['email_pessoal', 'email', 'e_mail_pessoal'] },
  ];

  const missingHeaders: string[] = [];
  for (const req of requiredAliases) {
    const found = req.keys.some((k) => idxMap[k] !== undefined);
    if (!found) {
      missingHeaders.push(req.name);
    }
  }

  if (missingHeaders.length > 0) {
    return {
      headers,
      rows: [],
      error: `Colunas obrigatórias ausentes no cabeçalho: ${missingHeaders.join(', ')}`,
    };
  }

  const rawRows: RawColaboradorRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.every((c) => !c)) continue;

    rawRows.push({
      linha: i + 1,
      // Obrigatórios
      nome_completo: getCol(cols, 'nome_completo', 'nome', 'full_name'),
      cpf: getCol(cols, 'cpf'),
      data_nascimento: getCol(cols, 'data_nascimento', 'nascimento', 'birth_date'),
      data_admissao: getCol(cols, 'data_admissao', 'admissao', 'admission_date'),
      tipo_contrato: getCol(cols, 'tipo_contrato', 'contrato', 'contract_type', 'regime'),
      cargo: getCol(cols, 'cargo', 'job_title', 'funcao'),
      departamento: getCol(cols, 'departamento', 'department', 'setor', 'area'),
      salario_base: getCol(cols, 'salario_base', 'salario', 'base_salary'),
      forma_pagamento: getCol(cols, 'forma_pagamento', 'pagamento', 'payment_method'),
      email_pessoal: getCol(cols, 'email_pessoal', 'email', 'e_mail_pessoal'),
      // Opcionais v1
      email_corporativo: getCol(cols, 'email_corporativo', 'corporate_email', 'email_corp') || undefined,
      matricula: getCol(cols, 'matricula', 'registration') || undefined,
      // Opcionais v2 — Contato e Endereço
      telefone: getCol(cols, 'telefone', 'phone', 'celular', 'whatsapp') || undefined,
      telefone_secundario: getCol(cols, 'telefone_secundario', 'telefone2', 'recado') || undefined,
      cep: getCol(cols, 'cep', 'address_zip_code', 'zip_code') || undefined,
      logradouro: getCol(cols, 'logradouro', 'rua', 'address_street', 'endereco') || undefined,
      numero: getCol(cols, 'numero', 'num', 'address_number') || undefined,
      complemento: getCol(cols, 'complemento', 'address_complement') || undefined,
      bairro: getCol(cols, 'bairro', 'address_neighborhood') || undefined,
      cidade: getCol(cols, 'cidade', 'address_city', 'municipio') || undefined,
      uf: getCol(cols, 'uf', 'estado', 'address_state') || undefined,
      // Opcionais v2 — Identificação Pessoal
      nome_social: getCol(cols, 'nome_social', 'social_name') || undefined,
      naturalidade: getCol(cols, 'naturalidade') || undefined,
      nacionalidade: getCol(cols, 'nacionalidade') || undefined,
      estado_civil: getCol(cols, 'estado_civil', 'marital_status') || undefined,
      sexo: getCol(cols, 'sexo', 'sex', 'genero') || undefined,
      raca_cor: getCol(cols, 'raca_cor', 'raca', 'etnia', 'ethnicity') || undefined,
      pcd: getCol(cols, 'pcd', 'deficiencia', 'is_pcd') || undefined,
      escolaridade: getCol(cols, 'escolaridade', 'education_level', 'instrucao') || undefined,
      // Opcionais v2 — Contrato Complementar & Horário
      tipo_jornada: getCol(cols, 'tipo_jornada', 'jornada', 'work_shift_type') || undefined,
      nivel: getCol(cols, 'nivel', 'senioridade', 'job_level') || undefined,
      horario_trabalho: getCol(cols, 'horario_trabalho', 'horario', 'escala', 'work_schedule') || undefined,
      cnpj: getCol(cols, 'cnpj') || undefined,
      razao_social: getCol(cols, 'razao_social') || undefined,
      data_pagamento: getCol(cols, 'data_pagamento', 'dia_pagamento') || undefined,
      banco_horas: getCol(cols, 'banco_horas', 'is_banco_horas') || undefined,
      // Opcionais v2 — Documentação
      rg: getCol(cols, 'rg') || undefined,
      rg_orgao_emissor: getCol(cols, 'rg_orgao_emissor', 'orgao_emissor') || undefined,
      rg_uf: getCol(cols, 'rg_uf') || undefined,
      pis: getCol(cols, 'pis', 'pis_pasep') || undefined,
      ctps_numero: getCol(cols, 'ctps_numero', 'ctps') || undefined,
      ctps_serie: getCol(cols, 'ctps_serie', 'serie_ctps') || undefined,
    });
  }

  return { headers, rows: rawRows };
}

export interface ExistingContext {
  existingCompanyCpfs?: Set<string>; // 11 digits
  existingCompanyMatriculas?: Set<string>; // trimmed lower
  existingCompanyEmails?: Set<string>; // corporate or personal email in company
  platformOccupiedEmails?: Set<string>; // checked via RPC check_emails_exist_batch
  // Estrutura Organizacional para Matching
  cargosAtivos?: Array<{ id: string; nome: string }>;
  departamentosAtivos?: Array<{ id: string; nome: string }>;
  niveisAtivos?: Array<{ id: string; nome: string }>;
  workSchedulesAtivos?: Array<{ id: string; nome: string; label?: string }>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateColaboradoresRows(
  rows: RawColaboradorRow[],
  context: ExistingContext = {}
): {
  valid: ValidatedColaboradorRow[];
  rejected: RejectedColaboradorRow[];
} {
  const valid: ValidatedColaboradorRow[] = [];
  const rejected: RejectedColaboradorRow[] = [];

  const seenCpfsInFile = new Map<string, number>();
  const seenEmailsInFile = new Map<string, number>();
  const seenMatriculasInFile = new Map<string, number>();

  const existingCompanyCpfs = context.existingCompanyCpfs || new Set<string>();
  const existingCompanyMatriculas = context.existingCompanyMatriculas || new Set<string>();
  const existingCompanyEmails = context.existingCompanyEmails || new Set<string>();
  const platformOccupiedEmails = context.platformOccupiedEmails || new Set<string>();
  const cargosList = context.cargosAtivos || [];
  const deptosList = context.departamentosAtivos || [];
  const niveisList = context.niveisAtivos || [];
  const wsList = context.workSchedulesAtivos || [];

  for (const row of rows) {
    const motivos: string[] = [];

    // 1. Nome completo
    const trimmedNome = (row.nome_completo || '').trim();
    if (!trimmedNome) {
      motivos.push('Nome completo é obrigatório');
    } else if (trimmedNome.length > 255) {
      motivos.push('Nome completo excede 255 caracteres');
    }

    // 2. CPF (Armadilha 1: Máscara estrita formatCPF)
    const cpfDigits = (row.cpf || '').replace(/\D/g, '');
    let formattedCpf = '';
    if (!cpfDigits) {
      motivos.push('CPF é obrigatório');
    } else if (cpfDigits.length !== 11) {
      motivos.push('CPF inválido (deve conter 11 dígitos)');
    } else {
      formattedCpf = formatCPF(cpfDigits);

      if (seenCpfsInFile.has(cpfDigits)) {
        motivos.push(`CPF duplicado na planilha (já visto na linha ${seenCpfsInFile.get(cpfDigits)})`);
      } else {
        seenCpfsInFile.set(cpfDigits, row.linha);
      }

      if (existingCompanyCpfs.has(cpfDigits)) {
        motivos.push('CPF já cadastrado nesta empresa');
      }
    }

    // 3. Data de nascimento (Armadilha 3: formatDateToISO local, PROIBIDO toISOString)
    const birthDate = parseDateBR(row.data_nascimento || '');
    let birthDateIso = '';
    if (!row.data_nascimento) {
      motivos.push('Data de nascimento é obrigatória');
    } else if (!birthDate) {
      motivos.push('Data de nascimento inválida (use o formato DD/MM/AAAA)');
    } else {
      birthDateIso = formatDateToISO(birthDate);
    }

    // 4. Data de admissão (Armadilha 3: formatDateToISO local, PROIBIDO toISOString)
    const admissionDate = parseDateBR(row.data_admissao || '');
    let admissionDateIso = '';
    if (!row.data_admissao) {
      motivos.push('Data de admissão é obrigatória');
    } else if (!admissionDate) {
      motivos.push('Data de admissão inválida (use o formato DD/MM/AAAA)');
    } else {
      admissionDateIso = formatDateToISO(admissionDate);
    }

    // 5. Tipo de contrato / Regime (Enum)
    const trimmedContract = (row.tipo_contrato || '').trim();
    let normalizedContract = 'CLT';
    if (!trimmedContract) {
      motivos.push('Tipo de contrato é obrigatório (ex.: CLT, PJ, Estágio)');
    } else {
      const match = matchEnum(trimmedContract, contractTypeOptions);
      if (match.matched) {
        normalizedContract = match.matched;
      } else {
        motivos.push(match.error || 'Tipo de contrato inválido');
      }
    }

    // 6. Cargo (Matching inteligente com Estrutura Organizacional)
    const trimmedCargo = (row.cargo || '').trim();
    let matchedCargoId: string | null = null;
    let matchedCargoNome: string | null = null;
    let cargoMatched = false;

    if (!trimmedCargo) {
      motivos.push('Cargo é obrigatório');
    } else if (trimmedCargo.length > 100) {
      motivos.push('Cargo excede 100 caracteres');
    } else {
      const normInputCargo = normalizeMatchingKey(trimmedCargo);
      const foundCargo = cargosList.find(
        (c) => normalizeMatchingKey(c.nome) === normInputCargo
      );
      if (foundCargo) {
        matchedCargoId = foundCargo.id;
        matchedCargoNome = foundCargo.nome;
        cargoMatched = true;
      }
    }

    // 7. Departamento (Matching informativo com departamentos)
    const trimmedDepto = (row.departamento || '').trim();
    let matchedDeptoNome: string | null = null;
    let deptoMatched = false;

    if (!trimmedDepto) {
      motivos.push('Departamento é obrigatório');
    } else if (trimmedDepto.length > 100) {
      motivos.push('Departamento excede 100 caracteres');
    } else {
      const normInputDepto = normalizeMatchingKey(trimmedDepto);
      const foundDepto = deptosList.find(
        (d) => normalizeMatchingKey(d.nome) === normInputDepto
      );
      if (foundDepto) {
        matchedDeptoNome = foundDepto.nome;
        deptoMatched = true;
      }
    }

    // 8. Salário base (parseCurrency aceita "R$ 3.500,50" e "3500,50")
    const rawSalario = (row.salario_base || '').trim();
    let numericSalario = 0;
    if (!rawSalario) {
      motivos.push('Salário base é obrigatório');
    } else {
      numericSalario = parseCurrency(rawSalario);
      if (numericSalario <= 0) {
        motivos.push('Salário base deve ser maior que zero');
      }
    }

    // 9. Forma de pagamento (Enum)
    const trimmedPag = (row.forma_pagamento || '').trim();
    let normalizedPag = 'Mensalista';
    if (!trimmedPag) {
      motivos.push('Forma de pagamento é obrigatória (ex.: Mensalista, Horista, Comissionista)');
    } else {
      const match = matchEnum(trimmedPag, paymentMethodOptions);
      if (match.matched) {
        normalizedPag = match.matched;
      } else {
        motivos.push(match.error || 'Forma de pagamento inválida');
      }
    }

    // 10. E-mail pessoal
    const emailPessoal = (row.email_pessoal || '').trim().toLowerCase();
    if (!emailPessoal) {
      motivos.push('E-mail pessoal é obrigatório');
    } else if (!EMAIL_REGEX.test(emailPessoal)) {
      motivos.push('E-mail pessoal em formato inválido');
    } else {
      if (seenEmailsInFile.has(emailPessoal)) {
        motivos.push(`E-mail pessoal duplicado na planilha (já visto na linha ${seenEmailsInFile.get(emailPessoal)})`);
      } else {
        seenEmailsInFile.set(emailPessoal, row.linha);
      }

      if (platformOccupiedEmails.has(emailPessoal)) {
        motivos.push('E-mail já cadastrado na plataforma ou em uso nesta empresa');
      } else if (existingCompanyEmails.has(emailPessoal)) {
        motivos.push('E-mail já cadastrado nesta empresa');
      }
    }

    // 11. E-mail corporativo (opcional)
    const emailCorp = (row.email_corporativo || '').trim().toLowerCase();
    if (emailCorp) {
      if (!EMAIL_REGEX.test(emailCorp)) {
        motivos.push('E-mail corporativo em formato inválido');
      } else if (existingCompanyEmails.has(emailCorp)) {
        motivos.push('E-mail corporativo já cadastrado nesta empresa');
      }
    }

    // 12. Matrícula (Armadilha 2: Opcional, string vazia explicitamente null)
    let matriculaFinal: string | null = null;
    const rawMatricula = (row.matricula || '').trim();
    if (rawMatricula) {
      matriculaFinal = rawMatricula;
      const matLower = rawMatricula.toLowerCase();
      if (seenMatriculasInFile.has(matLower)) {
        motivos.push(`Matrícula duplicada na planilha (já vista na linha ${seenMatriculasInFile.get(matLower)})`);
      } else {
        seenMatriculasInFile.set(matLower, row.linha);
      }

      if (existingCompanyMatriculas.has(matLower)) {
        motivos.push('Matrícula já cadastrada nesta empresa');
      }
    }

    // --- CAMPOS OPCIONAIS EXPANDIDOS (V2) ---

    // 13. Telefone Principal
    let phoneFinal: string | null = null;
    if (row.telefone && row.telefone.trim()) {
      const cleanPhone = row.telefone.replace(/\D/g, '');
      if (cleanPhone.length >= 10 && cleanPhone.length <= 13) {
        phoneFinal = formatPhoneBR(row.telefone);
      } else {
        motivos.push('Telefone inválido (deve conter DDD + número com 10 ou 11 dígitos)');
      }
    }

    // 14. Telefone Secundário
    let telSecundarioFinal: string | null = null;
    if (row.telefone_secundario && row.telefone_secundario.trim()) {
      const cleanSec = row.telefone_secundario.replace(/\D/g, '');
      if (cleanSec.length >= 10 && cleanSec.length <= 13) {
        telSecundarioFinal = formatPhoneBR(row.telefone_secundario);
      } else {
        motivos.push('Telefone secundário inválido (deve conter DDD + número com 10 ou 11 dígitos)');
      }
    }

    // 15. CEP
    let cepFinal: string | null = null;
    if (row.cep && row.cep.trim()) {
      const cleanCep = row.cep.replace(/\D/g, '');
      if (cleanCep.length === 8) {
        cepFinal = formatCEP(cleanCep);
      } else {
        motivos.push('CEP inválido (deve conter 8 dígitos)');
      }
    }

    // 16. Estado / UF
    let ufFinal: string | null = null;
    if (row.uf && row.uf.trim()) {
      ufFinal = normalizeUF(row.uf);
      if (!ufFinal) {
        motivos.push(`UF inválida ("${row.uf.trim()}"). Use a sigla oficial de 2 letras (ex.: SP, RJ, MG)`);
      }
    }

    // 17. Estado Civil (Enum)
    let maritalStatusFinal: string | null = null;
    if (row.estado_civil && row.estado_civil.trim()) {
      const match = matchEnum(row.estado_civil, maritalStatusOptions);
      if (match.matched) {
        maritalStatusFinal = match.matched;
      } else {
        motivos.push(match.error || 'Estado civil inválido');
      }
    }

    // 18. Sexo (Enum)
    let sexFinal: string | null = null;
    if (row.sexo && row.sexo.trim()) {
      const match = matchEnum(row.sexo, sexOptions);
      if (match.matched) {
        sexFinal = match.matched;
      } else {
        motivos.push(match.error || 'Sexo inválido');
      }
    }

    // 19. Etnia / Raça (Enum)
    let ethnicityFinal: string | null = null;
    if (row.raca_cor && row.raca_cor.trim()) {
      const match = matchEnum(row.raca_cor, ethnicityOptions);
      if (match.matched) {
        ethnicityFinal = match.matched;
      } else {
        motivos.push(match.error || 'Etnia/raça inválida');
      }
    }

    // 20. Escolaridade (Enum)
    let educationLevelFinal: string | null = null;
    if (row.escolaridade && row.escolaridade.trim()) {
      const match = matchEnum(row.escolaridade, educationLevelOptions);
      if (match.matched) {
        educationLevelFinal = match.matched;
      } else {
        motivos.push(match.error || 'Escolaridade inválida');
      }
    }

    // 21. Tipo de Jornada (Enum)
    let workShiftTypeFinal: string | null = null;
    if (row.tipo_jornada && row.tipo_jornada.trim()) {
      const match = matchEnum(row.tipo_jornada, workShiftTypeOptions);
      if (match.matched) {
        workShiftTypeFinal = match.matched;
      } else {
        motivos.push(match.error || 'Tipo de jornada inválido');
      }
    }

    // 22. Nível / Senioridade (Matching)
    let jobLevelFinal: string | null = null;
    let jobLevelMatched = false;
    if (row.nivel && row.nivel.trim()) {
      const normNivel = normalizeMatchingKey(row.nivel);
      const foundNivel = niveisList.find(
        (n) => normalizeMatchingKey(n.nome) === normNivel
      );
      if (foundNivel) {
        jobLevelFinal = foundNivel.nome;
        jobLevelMatched = true;
      } else {
        jobLevelFinal = row.nivel.trim();
      }
    }

    // 23. Horário de Trabalho / Escala (Matching)
    let workScheduleIdFinal: string | null = null;
    let workScheduleLabelFinal: string | null = null;
    let workScheduleMatched = false;
    if (row.horario_trabalho && row.horario_trabalho.trim()) {
      const normWs = normalizeMatchingKey(row.horario_trabalho);
      const foundWs = wsList.find(
        (ws) =>
          normalizeMatchingKey(ws.nome) === normWs ||
          (ws.label && normalizeMatchingKey(ws.label) === normWs)
      );
      if (foundWs) {
        workScheduleIdFinal = foundWs.id;
        workScheduleLabelFinal = foundWs.label || foundWs.nome;
        workScheduleMatched = true;
      } else {
        workScheduleLabelFinal = row.horario_trabalho.trim();
      }
    }

    // 24. CNPJ (PJ)
    let cnpjFinal: string | null = null;
    if (row.cnpj && row.cnpj.trim()) {
      const cleanCnpj = row.cnpj.replace(/\D/g, '');
      if (cleanCnpj.length === 14) {
        cnpjFinal = formatCNPJ(cleanCnpj);
      } else {
        motivos.push('CNPJ inválido (deve conter 14 dígitos)');
      }
    }

    // 25. Banco de Horas (Boolean)
    const isBancoHorasFinal = parseBooleanBR(row.banco_horas);

    // 26. Documentos (PIS, CTPS, RG) — preservando zeros à esquerda
    const pisFinal = row.pis ? row.pis.trim() : null;
    const ctpsNumeroFinal = row.ctps_numero ? row.ctps_numero.trim() : null;
    const ctpsSerieFinal = row.ctps_serie ? row.ctps_serie.trim() : null;
    const rgFinal = row.rg ? row.rg.trim() : null;

    if (motivos.length > 0) {
      rejected.push({ linha: row.linha, raw: row, motivos });
    } else {
      valid.push({
        linha: row.linha,
        full_name: trimmedNome,
        cpf: formattedCpf,
        cpf_raw: cpfDigits,
        birth_date_iso: birthDateIso,
        admission_date_iso: admissionDateIso,
        contract_type: normalizedContract,
        job_title: matchedCargoNome || trimmedCargo,
        department: matchedDeptoNome || trimmedDepto,
        base_salary: numericSalario,
        payment_method: normalizedPag,
        email_pessoal: emailPessoal,
        email_corporativo: emailCorp || null,
        matricula: matriculaFinal,
        // Matching
        cargo_id: matchedCargoId,
        cargo_matched: cargoMatched,
        cargo_nome_oficial: matchedCargoNome,
        departamento_matched: deptoMatched,
        departamento_nome_oficial: matchedDeptoNome,
        job_level: jobLevelFinal,
        job_level_matched: jobLevelMatched,
        work_schedule_id: workScheduleIdFinal,
        work_schedule: workScheduleLabelFinal,
        work_schedule_matched: workScheduleMatched,
        // Opcionais expandidos
        phone: phoneFinal,
        telefone_secundario: telSecundarioFinal,
        address_zip_code: cepFinal,
        address_street: row.logradouro ? row.logradouro.trim() : null,
        address_number: row.numero ? row.numero.trim() : null,
        address_complement: row.complemento ? row.complemento.trim() : null,
        address_neighborhood: row.bairro ? row.bairro.trim() : null,
        address_city: row.cidade ? row.cidade.trim() : null,
        address_state: ufFinal,
        social_name: row.nome_social ? row.nome_social.trim() : null,
        naturalidade: row.naturalidade ? row.naturalidade.trim() : null,
        nacionalidade: row.nacionalidade ? row.nacionalidade.trim() : 'Brasileira',
        marital_status: maritalStatusFinal,
        sex: sexFinal,
        ethnicity: ethnicityFinal,
        education_level: educationLevelFinal,
        work_shift_type: workShiftTypeFinal,
        cnpj: cnpjFinal,
        razao_social: row.razao_social ? row.razao_social.trim() : null,
        data_pagamento: row.data_pagamento ? row.data_pagamento.trim() : null,
        is_banco_horas: isBancoHorasFinal,
        // Documentos
        rg: rgFinal,
        pis: pisFinal,
        ctps_numero: ctpsNumeroFinal,
        ctps_serie: ctpsSerieFinal,
        raw: row,
      });
    }
  }

  return { valid, rejected };
}

/**
 * Re-avalia o matching de cargos para linhas válidas quando novos cargos
 * são criados assistidamente em lote no modal de importação.
 */
export function applyCargoMatching(
  rows: ValidatedColaboradorRow[],
  cargosAtivos: Array<{ id: string; nome: string }>
): ValidatedColaboradorRow[] {
  return rows.map((r) => {
    const normInputCargo = normalizeMatchingKey(r.raw.cargo);
    const foundCargo = cargosAtivos.find(
      (c) => normalizeMatchingKey(c.nome) === normInputCargo
    );
    if (foundCargo) {
      return {
        ...r,
        cargo_id: foundCargo.id,
        cargo_matched: true,
        cargo_nome_oficial: foundCargo.nome,
        job_title: foundCargo.nome,
      };
    }
    return r;
  });
}

export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

export function exportRejectedRowsToCSV(rejected: RejectedColaboradorRow[]): void {
  const headers = [
    'linha',
    'motivos_rejeicao',
    'nome_completo',
    'cpf',
    'data_nascimento',
    'data_admissao',
    'tipo_contrato',
    'cargo',
    'departamento',
    'salario_base',
    'forma_pagamento',
    'email_pessoal',
    'email_corporativo',
    'matricula',
    'telefone',
    'telefone_secundario',
    'cep',
    'logradouro',
    'numero',
    'complemento',
    'bairro',
    'cidade',
    'uf',
    'nome_social',
    'naturalidade',
    'nacionalidade',
    'estado_civil',
    'sexo',
    'raca_cor',
    'pcd',
    'escolaridade',
    'tipo_jornada',
    'nivel',
    'horario_trabalho',
    'cnpj',
    'razao_social',
    'data_pagamento',
    'banco_horas',
    'rg',
    'pis',
    'ctps_numero',
    'ctps_serie',
  ];

  const escapeCSV = (val?: string) => `"${(val || '').replace(/"/g, '""')}"`;

  const rows = rejected.map((r) => [
    r.linha,
    escapeCSV(r.motivos.join(' | ')),
    escapeCSV(r.raw.nome_completo),
    escapeCSV(r.raw.cpf),
    escapeCSV(r.raw.data_nascimento),
    escapeCSV(r.raw.data_admissao),
    escapeCSV(r.raw.tipo_contrato),
    escapeCSV(r.raw.cargo),
    escapeCSV(r.raw.departamento),
    escapeCSV(r.raw.salario_base),
    escapeCSV(r.raw.forma_pagamento),
    escapeCSV(r.raw.email_pessoal),
    escapeCSV(r.raw.email_corporativo),
    escapeCSV(r.raw.matricula),
    escapeCSV(r.raw.telefone),
    escapeCSV(r.raw.telefone_secundario),
    escapeCSV(r.raw.cep),
    escapeCSV(r.raw.logradouro),
    escapeCSV(r.raw.numero),
    escapeCSV(r.raw.complemento),
    escapeCSV(r.raw.bairro),
    escapeCSV(r.raw.cidade),
    escapeCSV(r.raw.uf),
    escapeCSV(r.raw.nome_social),
    escapeCSV(r.raw.naturalidade),
    escapeCSV(r.raw.nacionalidade),
    escapeCSV(r.raw.estado_civil),
    escapeCSV(r.raw.sexo),
    escapeCSV(r.raw.raca_cor),
    escapeCSV(r.raw.pcd),
    escapeCSV(r.raw.escolaridade),
    escapeCSV(r.raw.tipo_jornada),
    escapeCSV(r.raw.nivel),
    escapeCSV(r.raw.horario_trabalho),
    escapeCSV(r.raw.cnpj),
    escapeCSV(r.raw.razao_social),
    escapeCSV(r.raw.data_pagamento),
    escapeCSV(r.raw.banco_horas),
    escapeCSV(r.raw.rg),
    escapeCSV(r.raw.pis),
    escapeCSV(r.raw.ctps_numero),
    escapeCSV(r.raw.ctps_serie),
  ]);

  const csvContent =
    '\uFEFF' + [headers.join(';'), ...rows.map((cols) => cols.join(';'))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `colaboradores-rejeitados-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
