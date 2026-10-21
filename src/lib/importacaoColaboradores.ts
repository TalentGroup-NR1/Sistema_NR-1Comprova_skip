import {
  formatCPF,
  parseDateBR,
  formatDateToISO,
  parseCurrency,
  contractTypeOptions,
  paymentMethodOptions,
} from '@/lib/validators/colaborador';

export interface RawColaboradorRow {
  linha: number;
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
  email_corporativo?: string;
  matricula?: string;
}

export interface ValidatedColaboradorRow {
  linha: number;
  full_name: string;
  cpf: string; // Formatted 000.000.000-00
  cpf_raw: string; // 11 digits
  birth_date_iso: string; // YYYY-MM-DD
  admission_date_iso: string; // YYYY-MM-DD
  contract_type: string;
  job_title: string;
  department: string;
  base_salary: number;
  payment_method: string;
  email_pessoal: string;
  email_corporativo: string | null;
  matricula: string | null;
  raw: RawColaboradorRow;
}

export interface RejectedColaboradorRow {
  linha: number;
  raw: RawColaboradorRow;
  motivos: string[];
}

export const COLABORADORES_TEMPLATE_CSV = `nome_completo;cpf;data_nascimento;data_admissao;tipo_contrato;cargo;departamento;salario_base;forma_pagamento;email_pessoal;email_corporativo;matricula
Maria da Silva;012.345.678-90;15/04/1992;01/02/2026;CLT;Analista de Recursos Humanos;Recursos Humanos;4500,00;Mensalista;maria.silva@exemplo.com.br;maria.silva@empresa.com.br;0010
João Pereira Neto;098.765.432-10;28/11/1988;15/01/2026;CLT;Engenheiro de Seguranca;Seguranca do Trabalho;7800,00;Mensalista;joao.neto@exemplo.com.br;joao.neto@empresa.com.br;0011
`;

export function downloadTemplateColaboradores(): void {
  // BOM \uFEFF ensures UTF-8 encoding is recognized by Excel
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
    // Skip empty lines
    if (cols.every((c) => !c)) continue;

    rawRows.push({
      linha: i + 1,
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
      email_corporativo: getCol(cols, 'email_corporativo', 'corporate_email', 'email_corp') || undefined,
      matricula: getCol(cols, 'matricula', 'registration') || undefined,
    });
  }

  return { headers, rows: rawRows };
}

export interface ExistingContext {
  existingCompanyCpfs: Set<string>; // 11 digits
  existingCompanyMatriculas: Set<string>; // trimmed lower
  existingCompanyEmails: Set<string>; // corporate or personal email in company
  platformOccupiedEmails: Set<string>; // checked via RPC check_emails_exist_batch
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateColaboradoresRows(
  rows: RawColaboradorRow[],
  context: ExistingContext
): {
  valid: ValidatedColaboradorRow[];
  rejected: RejectedColaboradorRow[];
} {
  const valid: ValidatedColaboradorRow[] = [];
  const rejected: RejectedColaboradorRow[] = [];

  // Track duplicates inside the spreadsheet itself
  const seenCpfsInFile = new Map<string, number>(); // cpfDigits -> firstLine
  const seenEmailsInFile = new Map<string, number>(); // emailLower -> firstLine
  const seenMatriculasInFile = new Map<string, number>(); // matriculaLower -> firstLine

  const validContractTypes = new Set<string>(
    contractTypeOptions.map((c) => c.toLowerCase())
  );
  const validPaymentMethods = new Set<string>(
    paymentMethodOptions.map((p) => p.toLowerCase())
  );

  for (const row of rows) {
    const motivos: string[] = [];

    // 1. Nome completo
    const trimmedNome = (row.nome_completo || '').trim();
    if (!trimmedNome) {
      motivos.push('Nome completo é obrigatório');
    } else if (trimmedNome.length > 255) {
      motivos.push('Nome completo excede 255 caracteres');
    }

    // 2. CPF
    const cpfDigits = (row.cpf || '').replace(/\D/g, '');
    if (!cpfDigits) {
      motivos.push('CPF é obrigatório');
    } else if (cpfDigits.length !== 11) {
      motivos.push('CPF inválido (deve conter 11 dígitos)');
    } else {
      // Check duplicate in same file
      if (seenCpfsInFile.has(cpfDigits)) {
        motivos.push(`CPF duplicado na planilha (já visto na linha ${seenCpfsInFile.get(cpfDigits)})`);
      } else {
        seenCpfsInFile.set(cpfDigits, row.linha);
      }

      // Check duplicate in company
      if (context.existingCompanyCpfs.has(cpfDigits)) {
        motivos.push('CPF já cadastrado nesta empresa');
      }
    }

    // 3. Data de nascimento
    const birthDate = parseDateBR(row.data_nascimento || '');
    if (!row.data_nascimento) {
      motivos.push('Data de nascimento é obrigatória');
    } else if (!birthDate) {
      motivos.push('Data de nascimento inválida (use o formato DD/MM/AAAA)');
    }

    // 4. Data de admissão
    const admissionDate = parseDateBR(row.data_admissao || '');
    if (!row.data_admissao) {
      motivos.push('Data de admissão é obrigatória');
    } else if (!admissionDate) {
      motivos.push('Data de admissão inválida (use o formato DD/MM/AAAA)');
    }

    // 5. Tipo de contrato / Regime
    const trimmedContract = (row.tipo_contrato || '').trim();
    let normalizedContract = 'CLT';
    if (!trimmedContract) {
      motivos.push('Tipo de contrato é obrigatório (ex.: CLT, PJ, Estágio)');
    } else {
      const match = contractTypeOptions.find(
        (opt) => opt.toLowerCase() === trimmedContract.toLowerCase()
      );
      if (match) {
        normalizedContract = match;
      } else {
        motivos.push(
          `Tipo de contrato inválido ("${trimmedContract}"). Opções: ${contractTypeOptions.join(', ')}`
        );
      }
    }

    // 6. Cargo
    const trimmedCargo = (row.cargo || '').trim();
    if (!trimmedCargo) {
      motivos.push('Cargo é obrigatório');
    } else if (trimmedCargo.length > 100) {
      motivos.push('Cargo excede 100 caracteres');
    }

    // 7. Departamento
    const trimmedDepto = (row.departamento || '').trim();
    if (!trimmedDepto) {
      motivos.push('Departamento é obrigatório');
    } else if (trimmedDepto.length > 100) {
      motivos.push('Departamento excede 100 caracteres');
    }

    // 8. Salário base
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

    // 9. Forma de pagamento
    const trimmedPag = (row.forma_pagamento || '').trim();
    let normalizedPag = 'Mensalista';
    if (!trimmedPag) {
      motivos.push('Forma de pagamento é obrigatória (ex.: Mensalista, Horista, Comissionista)');
    } else {
      const match = paymentMethodOptions.find(
        (opt) => opt.toLowerCase() === trimmedPag.toLowerCase()
      );
      if (match) {
        normalizedPag = match;
      } else {
        motivos.push(
          `Forma de pagamento inválida ("${trimmedPag}"). Opções: ${paymentMethodOptions.join(', ')}`
        );
      }
    }

    // 10. E-mail pessoal
    const emailPessoal = (row.email_pessoal || '').trim().toLowerCase();
    if (!emailPessoal) {
      motivos.push('E-mail pessoal é obrigatório');
    } else if (!EMAIL_REGEX.test(emailPessoal)) {
      motivos.push('E-mail pessoal em formato inválido');
    } else {
      // Check duplicate in same file
      if (seenEmailsInFile.has(emailPessoal)) {
        motivos.push(`E-mail pessoal duplicado na planilha (já visto na linha ${seenEmailsInFile.get(emailPessoal)})`);
      } else {
        seenEmailsInFile.set(emailPessoal, row.linha);
      }

      // Check if occupied in platform/auth or pending
      if (context.platformOccupiedEmails.has(emailPessoal)) {
        motivos.push('E-mail já cadastrado na plataforma ou em uso nesta empresa');
      } else if (context.existingCompanyEmails.has(emailPessoal)) {
        motivos.push('E-mail já cadastrado nesta empresa');
      }
    }

    // 11. E-mail corporativo (opcional)
    const emailCorp = (row.email_corporativo || '').trim().toLowerCase();
    if (emailCorp) {
      if (!EMAIL_REGEX.test(emailCorp)) {
        motivos.push('E-mail corporativo em formato inválido');
      } else if (context.existingCompanyEmails.has(emailCorp)) {
        motivos.push('E-mail corporativo já cadastrado nesta empresa');
      }
    }

    // 12. Matrícula (opcional)
    const matricula = (row.matricula || '').trim();
    if (matricula) {
      const matLower = matricula.toLowerCase();
      if (seenMatriculasInFile.has(matLower)) {
        motivos.push(`Matrícula duplicada na planilha (já vista na linha ${seenMatriculasInFile.get(matLower)})`);
      } else {
        seenMatriculasInFile.set(matLower, row.linha);
      }

      if (context.existingCompanyMatriculas.has(matLower)) {
        motivos.push('Matrícula já cadastrada nesta empresa');
      }
    }

    if (motivos.length > 0) {
      rejected.push({ linha: row.linha, raw: row, motivos });
    } else {
      valid.push({
        linha: row.linha,
        full_name: trimmedNome,
        cpf: formatCPF(cpfDigits),
        cpf_raw: cpfDigits,
        birth_date_iso: formatDateToISO(birthDate!),
        admission_date_iso: formatDateToISO(admissionDate!),
        contract_type: normalizedContract,
        job_title: trimmedCargo,
        department: trimmedDepto,
        base_salary: numericSalario,
        payment_method: normalizedPag,
        email_pessoal: emailPessoal,
        email_corporativo: emailCorp || null,
        matricula: matricula || null,
        raw: row,
      });
    }
  }

  return { valid, rejected };
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
