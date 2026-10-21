import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseColaboradoresCSV,
  validateColaboradoresRows,
  chunkArray,
  normalizeHeader,
  COLABORADORES_TEMPLATE_CSV,
  type RawColaboradorRow,
  type ExistingContext,
} from '../importacaoColaboradores';

describe('importacaoColaboradores: Módulo de Importação em Massa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Template CSV', () => {
    it('possui todas as colunas obrigatórias e 2 linhas de exemplo', () => {
      const { headers, rows, error } = parseColaboradoresCSV(COLABORADORES_TEMPLATE_CSV);
      expect(error).toBeUndefined();
      expect(headers).toContain('nome_completo');
      expect(headers).toContain('cpf');
      expect(headers).toContain('data_nascimento');
      expect(headers).toContain('data_admissao');
      expect(headers).toContain('tipo_contrato');
      expect(headers).toContain('cargo');
      expect(headers).toContain('departamento');
      expect(headers).toContain('salario_base');
      expect(headers).toContain('forma_pagamento');
      expect(headers).toContain('email_pessoal');
      expect(headers).toContain('email_corporativo');
      expect(headers).toContain('matricula');

      expect(rows.length).toBe(2);
      expect(rows[0].nome_completo).toBe('Maria da Silva');
      expect(rows[1].nome_completo).toBe('João Pereira Neto');
    });
  });

  describe('2. Parser de CSV e Delimitadores', () => {
    it('processa CSV com ponto e vírgula (;)', () => {
      const csv = `nome_completo;cpf;data_nascimento;data_admissao;tipo_contrato;cargo;departamento;salario_base;forma_pagamento;email_pessoal
Carlos Teste;123.456.789-01;10/01/1990;01/01/2026;CLT;Analista;TI;5000,00;Mensalista;carlos@teste.com`;
      const res = parseColaboradoresCSV(csv);
      expect(res.error).toBeUndefined();
      expect(res.rows.length).toBe(1);
      expect(res.rows[0].nome_completo).toBe('Carlos Teste');
      expect(res.rows[0].cargo).toBe('Analista');
    });

    it('processa CSV com vírgula (,) e aspas', () => {
      const csv = `"nome_completo","cpf","data_nascimento","data_admissao","tipo_contrato","cargo","departamento","salario_base","forma_pagamento","email_pessoal"
"Ana Souza, Silva","987.654.321-00","20/05/1995","01/02/2026","PJ","Consultora, Pleno","Consultoria","7000,00","Mensalista","ana@teste.com"`;
      const res = parseColaboradoresCSV(csv);
      expect(res.error).toBeUndefined();
      expect(res.rows.length).toBe(1);
      expect(res.rows[0].nome_completo).toBe('Ana Souza, Silva');
      expect(res.rows[0].cargo).toBe('Consultora, Pleno');
    });

    it('rejeita arquivo com colunas obrigatórias ausentes', () => {
      const csv = `nome_completo;cpf;cargo
Carlos;123;Analista`;
      const res = parseColaboradoresCSV(csv);
      expect(res.error).toBeDefined();
      expect(res.error).toContain('Colunas obrigatórias ausentes');
    });

    it('rejeita arquivo vazio', () => {
      const res = parseColaboradoresCSV('   ');
      expect(res.error).toBe('O arquivo CSV está vazio.');
    });
  });

  describe('3. Validações e Regras de Negócio (validateColaboradoresRows)', () => {
    const defaultContext: ExistingContext = {
      existingCompanyCpfs: new Set<string>(),
      existingCompanyMatriculas: new Set<string>(),
      existingCompanyEmails: new Set<string>(),
      platformOccupiedEmails: new Set<string>(),
    };

    it('aprova linha preenchida corretamente', () => {
      const rawRow: RawColaboradorRow = {
        linha: 2,
        nome_completo: 'Juliana Mendes',
        cpf: '111.222.333-44',
        data_nascimento: '12/03/1991',
        data_admissao: '01/03/2026',
        tipo_contrato: 'CLT',
        cargo: 'Gerente de Projetos',
        departamento: 'Operações',
        salario_base: '9.500,00',
        forma_pagamento: 'Mensalista',
        email_pessoal: 'juliana.mendes@email.com',
      };

      const { valid, rejected } = validateColaboradoresRows([rawRow], defaultContext);
      expect(rejected.length).toBe(0);
      expect(valid.length).toBe(1);
      expect(valid[0].full_name).toBe('Juliana Mendes');
      expect(valid[0].cpf).toBe('111.222.333-44');
      expect(valid[0].birth_date_iso).toBe('1991-03-12');
      expect(valid[0].admission_date_iso).toBe('2026-03-01');
      expect(valid[0].base_salary).toBe(9500);
    });

    it('PROVA (f) TESTE DE DUPLICIDADE: rejeita CPF já existente na empresa antes de tocar no banco', () => {
      const contextWithCpf: ExistingContext = {
        ...defaultContext,
        existingCompanyCpfs: new Set(['11122233344']),
      };

      const rawRow: RawColaboradorRow = {
        linha: 2,
        nome_completo: 'Juliana Mendes',
        cpf: '111.222.333-44',
        data_nascimento: '12/03/1991',
        data_admissao: '01/03/2026',
        tipo_contrato: 'CLT',
        cargo: 'Gerente',
        departamento: 'Operações',
        salario_base: '9.500,00',
        forma_pagamento: 'Mensalista',
        email_pessoal: 'juliana.mendes@email.com',
      };

      const { valid, rejected } = validateColaboradoresRows([rawRow], contextWithCpf);
      expect(valid.length).toBe(0);
      expect(rejected.length).toBe(1);
      expect(rejected[0].motivos).toContain('CPF já cadastrado nesta empresa');
    });

    it('detecta duplicidade de CPF e e-mail DENTRO da própria planilha', () => {
      const rows: RawColaboradorRow[] = [
        {
          linha: 2,
          nome_completo: 'Colaborador Um',
          cpf: '123.456.789-00',
          data_nascimento: '10/01/1990',
          data_admissao: '01/01/2026',
          tipo_contrato: 'CLT',
          cargo: 'Dev',
          departamento: 'TI',
          salario_base: '5000',
          forma_pagamento: 'Mensalista',
          email_pessoal: 'repetido@email.com',
        },
        {
          linha: 3,
          nome_completo: 'Colaborador Dois',
          cpf: '123.456.789-00', // Mesmo CPF
          data_nascimento: '12/02/1992',
          data_admissao: '01/02/2026',
          tipo_contrato: 'CLT',
          cargo: 'Dev',
          departamento: 'TI',
          salario_base: '5000',
          forma_pagamento: 'Mensalista',
          email_pessoal: 'repetido@email.com', // Mesmo e-mail
        },
      ];

      const { valid, rejected } = validateColaboradoresRows(rows, defaultContext);
      expect(valid.length).toBe(1);
      expect(rejected.length).toBe(1);
      expect(rejected[0].linha).toBe(3);
      expect(rejected[0].motivos.some((m) => m.includes('CPF duplicado na planilha'))).toBe(true);
      expect(rejected[0].motivos.some((m) => m.includes('E-mail pessoal duplicado na planilha'))).toBe(true);
    });

    it('rejeita e-mail pessoal já ocupado na plataforma (resultado RPC batch)', () => {
      const contextWithPlatformEmail: ExistingContext = {
        ...defaultContext,
        platformOccupiedEmails: new Set(['ativo.plataforma@email.com']),
      };

      const rawRow: RawColaboradorRow = {
        linha: 2,
        nome_completo: 'Colaborador Teste',
        cpf: '123.456.789-99',
        data_nascimento: '10/01/1990',
        data_admissao: '01/01/2026',
        tipo_contrato: 'CLT',
        cargo: 'Dev',
        departamento: 'TI',
        salario_base: '5000',
        forma_pagamento: 'Mensalista',
        email_pessoal: 'ativo.plataforma@email.com',
      };

      const { valid, rejected } = validateColaboradoresRows([rawRow], contextWithPlatformEmail);
      expect(valid.length).toBe(0);
      expect(rejected.length).toBe(1);
      expect(rejected[0].motivos).toContain(
        'E-mail já cadastrado na plataforma ou em uso nesta empresa'
      );
    });
  });

  describe('4. PROVA (d) TESTE DE PREVIEW: Planilha Simulada com 500 Linhas', () => {
    it('processa 500 linhas: 300 válidas, 100 com CPFs repetidos, 100 com campos faltando', () => {
      const simulatedRows: RawColaboradorRow[] = [];

      // 1. 300 Linhas Válidas (linhas 2 a 301)
      for (let i = 1; i <= 300; i++) {
        const cpfRaw = String(i).padStart(11, '0');
        simulatedRows.push({
          linha: i + 1,
          nome_completo: `Colaborador Valido ${i}`,
          cpf: cpfRaw,
          data_nascimento: '15/05/1990',
          data_admissao: '01/01/2026',
          tipo_contrato: 'CLT',
          cargo: `Cargo ${i}`,
          departamento: 'Operações',
          salario_base: '3.500,00',
          forma_pagamento: 'Mensalista',
          email_pessoal: `colaborador.valido.${i}@empresa.com.br`,
          matricula: `MAT-${i}`,
        });
      }

      // 2. 100 Linhas com CPFs Repetidos (linhas 302 a 401: repetem os CPFs 1 a 100)
      for (let i = 1; i <= 100; i++) {
        const cpfRepetido = String(i).padStart(11, '0');
        simulatedRows.push({
          linha: 301 + i,
          nome_completo: `Colaborador Repetido ${i}`,
          cpf: cpfRepetido, // Duplicado da primeira leva
          data_nascimento: '15/05/1990',
          data_admissao: '01/01/2026',
          tipo_contrato: 'CLT',
          cargo: 'Cargo Repetido',
          departamento: 'Operações',
          salario_base: '4.000,00',
          forma_pagamento: 'Mensalista',
          email_pessoal: `colaborador.repetido.${i}@empresa.com.br`,
        });
      }

      // 3. 100 Linhas com Campos Faltando/Inválidos (linhas 402 a 501)
      for (let i = 1; i <= 100; i++) {
        simulatedRows.push({
          linha: 401 + i,
          nome_completo: i % 2 === 0 ? '' : `Colaborador Invalido ${i}`, // Nome ausente em 50
          cpf: '123', // CPF com menos de 11 dígitos
          data_nascimento: 'data_errada', // Data inválida
          data_admissao: '01/01/2026',
          tipo_contrato: 'INVALIDO', // Tipo de contrato inválido
          cargo: '', // Cargo ausente
          departamento: '', // Departamento ausente
          salario_base: '0', // Salário zero
          forma_pagamento: 'DESCONHECIDA', // Forma de pagamento inválida
          email_pessoal: 'email_sem_arroba', // Formato de e-mail inválido
        });
      }

      expect(simulatedRows.length).toBe(500);

      const context: ExistingContext = {
        existingCompanyCpfs: new Set<string>(),
        existingCompanyMatriculas: new Set<string>(),
        existingCompanyEmails: new Set<string>(),
        platformOccupiedEmails: new Set<string>(),
      };

      const startTime = performance.now();
      const { valid, rejected } = validateColaboradoresRows(simulatedRows, context);
      const endTime = performance.now();

      // Separação correta
      expect(valid.length).toBe(300);
      expect(rejected.length).toBe(200);

      // Verificação dos motivos dos 100 repetidos
      for (let i = 0; i < 100; i++) {
        const item = rejected[i];
        expect(item.linha).toBe(302 + i);
        expect(item.motivos.some((m) => m.includes('CPF duplicado na planilha'))).toBe(true);
      }

      // Verificação dos 100 com dados inválidos
      for (let i = 100; i < 200; i++) {
        const item = rejected[i];
        expect(item.linha).toBe(402 + (i - 100));
        expect(item.motivos.length).toBeGreaterThanOrEqual(4);
        expect(item.motivos.some((m) => m.includes('CPF inválido'))).toBe(true);
      }

      // Performance: validação de 500 linhas deve rodar em menos de 100ms
      const durationMs = endTime - startTime;
      expect(durationMs).toBeLessThan(100);
    });
  });

  describe('5. Chunking para Gravação em Lote', () => {
    it('divide 250 registros em blocos de 50', () => {
      const items = Array.from({ length: 250 }, (_, i) => ({ id: i }));
      const chunks = chunkArray(items, 50);
      expect(chunks.length).toBe(5);
      chunks.forEach((chunk) => {
        expect(chunk.length).toBe(50);
      });
    });

    it('divide 235 registros em blocos de 50 com resto', () => {
      const items = Array.from({ length: 235 }, (_, i) => ({ id: i }));
      const chunks = chunkArray(items, 50);
      expect(chunks.length).toBe(5);
      expect(chunks[0].length).toBe(50);
      expect(chunks[4].length).toBe(35);
    });
  });
});
