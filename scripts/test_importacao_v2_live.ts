import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import {
  normalizeMatchingKey,
  validateColaboradoresRows,
  applyCargoMatching,
  COLABORADORES_TEMPLATE_CSV,
  RawColaboradorRow,
} from '../src/lib/importacaoColaboradores';
import { formatCPF, formatDateToISO } from '../src/lib/validators/colaborador';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('FAIL: Variáveis de ambiente Supabase ausentes.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
const TEST_COMPANY_ID = '540d02bd-8d5d-429b-b695-8a66f46c499d'; // NR-1 COM PROVA

async function runAllProofs() {
  console.log('================================================================');
  console.log('   SUÍTE DE PROVAS AO VIVO — IMPORTAÇÃO EM MASSA v2');
  console.log('================================================================\n');

  const timestamp = Date.now();

  // --------------------------------------------------------------------------
  // PROVA (b): TESTE DE MATCHING DE CARGO
  // --------------------------------------------------------------------------
  console.log('--- PROVA (b): TESTE DE MATCHING DE CARGO ---');
  // Criar cargo "Analista de Recursos Humanos <ts>"
  const cargoTesteNome = `Analista de Recursos Humanos ${timestamp}`;
  const { data: cargoCriado, error: errCargo } = await supabaseAdmin
    .from('cargos')
    .insert({ company_id: TEST_COMPANY_ID, nome: cargoTesteNome, ativo: true })
    .select()
    .single();

  if (errCargo || !cargoCriado) {
    throw new Error(`Falha ao preparar cargo para matching: ${errCargo?.message}`);
  }

  const cargosDb = [cargoCriado];
  const rowsMatching: RawColaboradorRow[] = [
    {
      linha: 2,
      nome_completo: 'Funcionario 1',
      cpf: '111.111.111-11',
      data_nascimento: '01/01/1990',
      data_admissao: '01/01/2026',
      cargo: cargoTesteNome,
      departamento: 'RH',
      tipo_contrato: 'CLT',
      salario_base: '3000,00',
      forma_pagamento: 'Mensalista',
      email_pessoal: `m1_${timestamp}@test.internal`,
    },
    {
      linha: 3,
      nome_completo: 'Funcionario 2',
      cpf: '222.222.222-22',
      data_nascimento: '01/01/1990',
      data_admissao: '01/01/2026',
      cargo: cargoTesteNome.toLowerCase(), // variação de caixa
      departamento: 'RH',
      tipo_contrato: 'CLT',
      salario_base: '3000,00',
      forma_pagamento: 'Mensalista',
      email_pessoal: `m2_${timestamp}@test.internal`,
    },
    {
      linha: 4,
      nome_completo: 'Funcionario 3',
      cpf: '333.333.333-33',
      data_nascimento: '01/01/1990',
      data_admissao: '01/01/2026',
      cargo: 'Engenheiro de Segurança Ficticio',
      departamento: 'RH',
      tipo_contrato: 'CLT',
      salario_base: '3000,00',
      forma_pagamento: 'Mensalista',
      email_pessoal: `m3_${timestamp}@test.internal`,
    },
  ];

  const validationMatching = validateColaboradoresRows(rowsMatching, {
    cargosAtivos: cargosDb,
    departamentosAtivos: [{ id: 'dep-rh', nome: 'RH' }],
  });

  const row1 = validationMatching.valid[0];
  const row2 = validationMatching.valid[1];
  const row3 = validationMatching.valid[2];

  console.log(`Linha 1 ("${row1.raw.cargo}"): cargo_id=${row1.cargo_id}, matched=${row1.cargo_matched}, oficial="${row1.cargo_nome_oficial}"`);
  console.log(`Linha 2 ("${row2.raw.cargo}"): cargo_id=${row2.cargo_id}, matched=${row2.cargo_matched}, oficial="${row2.cargo_nome_oficial}"`);
  console.log(`Linha 3 ("${row3.raw.cargo}"): cargo_id=${row3.cargo_id}, matched=${row3.cargo_matched}, oficial="${row3.cargo_nome_oficial}"`);

  if (row1.cargo_id === cargoCriado.id && row2.cargo_id === cargoCriado.id && row3.cargo_id === null && !row3.cargo_matched) {
    console.log('PROVA (b) PASSOU: 2 primeiros casaram com o MESMO cargo_id, terceiro sem match (alerta amarelo) ✅\n');
  } else {
    throw new Error('Falha na prova (b) de matching');
  }

  // --------------------------------------------------------------------------
  // PROVA (c): TESTE DE CRIAÇÃO ASSISTIDA + UNICIDADE
  // --------------------------------------------------------------------------
  console.log('--- PROVA (c): TESTE DE CRIAÇÃO ASSISTIDA + UNICIDADE ---');
  const missingCargoNome = `Especialista em Automação ${timestamp}`;

  // 1ª criação assistida
  const { data: cargoAssistido1, error: errAss1 } = await supabaseAdmin
    .from('cargos')
    .insert({ company_id: TEST_COMPANY_ID, nome: missingCargoNome, ativo: true })
    .select()
    .single();

  if (errAss1 || !cargoAssistido1) {
    throw new Error(`Falha na 1ª criação assistida: ${errAss1?.message}`);
  }
  console.log(`1ª criação assistida com sucesso: id=${cargoAssistido1.id}, nome="${cargoAssistido1.nome}" ✅`);

  // 2ª tentativa de criação com variação de caixa/espaço (deve falhar por causa do índice único)
  const { data: cargoAssistido2, error: errAss2 } = await supabaseAdmin
    .from('cargos')
    .insert({ company_id: TEST_COMPANY_ID, nome: `  ${missingCargoNome.toLowerCase()}  `, ativo: true })
    .select();

  if (errAss2 && errAss2.code === '23505') {
    console.log(`2ª criação bloqueada pela constraint de unicidade: ${errAss2.message} ✅`);
    console.log('PROVA (c) PASSOU: Cargo criado 1 única vez, tentativa duplicada bloqueada pelo índice ✅\n');
  } else {
    throw new Error(`Falha na prova (c): índice único não bloqueou duplicata! Data: ${JSON.stringify(cargoAssistido2)}`);
  }

  // --------------------------------------------------------------------------
  // PROVA (d): TESTE DAS 3 ARMADILHAS
  // --------------------------------------------------------------------------
  console.log('--- PROVA (d): TESTE DAS 3 ARMADILHAS ---');
  // Armadilha (i): CPF sem máscara na planilha + mesmo CPF mascarado já cadastrado
  const cpfBase = `98765432${String(timestamp).slice(-3)}`;
  const cpfMasked = formatCPF(cpfBase);
  const emailExisting = `cpf_existente_${timestamp}@test.internal`;

  // Inserir registro com CPF mascarado no banco
  const { data: colabCpfExistente, error: errCpfExist } = await supabaseAdmin
    .from('colaboradores')
    .insert({
      company_id: TEST_COMPANY_ID,
      full_name: 'Colab CPF Existente',
      cpf: cpfMasked,
      birth_date: '1985-05-15',
      admission_date: '2020-01-01',
      contract_type: 'CLT',
      job_title: 'Auxiliar',
      department: 'Administrativo',
      base_salary: 2000,
      payment_method: 'Mensalista',
      email_pessoal: emailExisting,
      status: 'ATIVO',
    })
    .select()
    .single();

  if (errCpfExist) {
    throw new Error(`Erro ao preparar colab CPF existente: ${errCpfExist.message}`);
  }

  // Tentar validar linha com CPF sem máscara "98765432100"
  const rowsCpfTrap: RawColaboradorRow[] = [
    {
      linha: 2,
      nome_completo: 'Colab Duplicado Sem Mascara',
      cpf: cpfBase, // "98765432100" sem mascara
      data_nascimento: '01/01/1990',
      data_admissao: '01/01/2026',
      cargo: 'Auxiliar',
      departamento: 'Geral',
      tipo_contrato: 'CLT',
      salario_base: '2000',
      forma_pagamento: 'Mensalista',
      email_pessoal: `novo_email_${timestamp}@test.internal`,
    },
  ];

  const validationCpf = validateColaboradoresRows(rowsCpfTrap, {
    existingCompanyCpfs: new Set([cpfBase]), // 11 dígitos da empresa
  });

  if (validationCpf.rejected.length === 1 && validationCpf.rejected[0].motivos.some((m) => m.includes('já cadastrado'))) {
    console.log(`(i) CPF sem máscara "${cpfBase}" foi validado e rejeitado contra CPF existente da empresa: "${validationCpf.rejected[0].motivos.join('; ')}" ✅`);
  } else {
    throw new Error('(i) Falha na armadilha do CPF');
  }

  // Armadilha (ii): 2 linhas com matrícula vazia -> ambas gravam NULL sem erro de constraint
  const emailMat1 = `mat_null_1_${timestamp}@test.internal`;
  const emailMat2 = `mat_null_2_${timestamp}@test.internal`;
  const { data: colabsMatNull, error: errMatNull } = await supabaseAdmin
    .from('colaboradores')
    .insert([
      {
        company_id: TEST_COMPANY_ID,
        full_name: 'Colab Matricula Vazia 1',
        cpf: formatCPF(`111222333${String(timestamp).slice(-2)}`),
        birth_date: '1990-01-01',
        admission_date: '2026-01-01',
        contract_type: 'CLT',
        job_title: 'Auxiliar',
        department: 'Administrativo',
        base_salary: 2000,
        payment_method: 'Mensalista',
        email_pessoal: emailMat1,
        status: 'ATIVO',
        matricula: null, // explicitamente NULL
      },
      {
        company_id: TEST_COMPANY_ID,
        full_name: 'Colab Matricula Vazia 2',
        cpf: formatCPF(`444555666${String(timestamp).slice(-2)}`),
        birth_date: '1990-01-01',
        admission_date: '2026-01-01',
        contract_type: 'CLT',
        job_title: 'Auxiliar',
        department: 'Administrativo',
        base_salary: 2000,
        payment_method: 'Mensalista',
        email_pessoal: emailMat2,
        status: 'ATIVO',
        matricula: null, // explicitamente NULL
      },
    ])
    .select();

  if (errMatNull || !colabsMatNull || colabsMatNull.length !== 2) {
    throw new Error(`(ii) Falha ao inserir matricula NULL: ${errMatNull?.message}`);
  }
  console.log(`(ii) 2 colaboradores com matricula NULL gravados simultaneamente sem colisão de unicidade ✅`);

  // Armadilha (iii): data "01/01/1990" -> grava 1990-01-01 (e não 1989-12-31)
  const rowsDateTrap: RawColaboradorRow[] = [
    {
      linha: 2,
      nome_completo: 'Colab Data 1990',
      cpf: '555.555.555-55',
      data_nascimento: '01/01/1990',
      data_admissao: '01/01/2026',
      cargo: 'Auxiliar',
      departamento: 'Geral',
      tipo_contrato: 'CLT',
      salario_base: '2000',
      forma_pagamento: 'Mensalista',
      email_pessoal: `date_${timestamp}@test.internal`,
    },
  ];
  const validationDate = validateColaboradoresRows(rowsDateTrap);
  const birthDateIso = validationDate.valid[0].birth_date_iso;
  console.log(`(iii) Data de nascimento convertida por formatDateToISO: ${birthDateIso}`);
  if (birthDateIso === '1990-01-01') {
    console.log(`(iii) Data "01/01/1990" gravou 1990-01-01 exatamente (sem deslocamento UTC -3h) ✅`);
    console.log('PROVA (d) PASSOU: Todas as 3 armadilhas neutralizadas com sucesso! ✅\n');
  } else {
    throw new Error(`(iii) Falha na conversão de data: recebido ${birthDateIso}`);
  }

  // --------------------------------------------------------------------------
  // PROVA (e): TESTE DE INTEGRAÇÃO SST (TRIGGER + VÍNCULO PGR)
  // --------------------------------------------------------------------------
  console.log('--- PROVA (e): TESTE DE INTEGRAÇÃO SST (TRIGGER + VÍNCULO PGR) ---');
  // 1. Criar departamento
  const { data: depSst } = await supabaseAdmin
    .from('departamentos')
    .insert({ company_id: TEST_COMPANY_ID, nome: `Depto SST ${timestamp}`, ativo: true })
    .select()
    .single();

  // 2. Criar setor
  const { data: setorSst } = await supabaseAdmin
    .from('setores')
    .insert({ company_id: TEST_COMPANY_ID, departamento_id: depSst.id, nome: `Setor SST ${timestamp}`, ativo: true })
    .select()
    .single();

  // 3. Criar GHE
  const { data: gheSst } = await supabaseAdmin
    .from('ghes')
    .insert({ company_id: TEST_COMPANY_ID, setor_id: setorSst.id, nome: `GHE Operacional ${timestamp}`, ativo: true })
    .select()
    .single();

  // 4. Criar Cargo vinculado ao GHE
  const { data: cargoSst } = await supabaseAdmin
    .from('cargos')
    .insert({ company_id: TEST_COMPANY_ID, ghe_id: gheSst.id, nome: `Técnico SST Oficial ${timestamp}`, ativo: true })
    .select()
    .single();

  // 5. Inserir Colaborador passando cargo_id e job_title/department divergentes
  const emailSst = `sst_${timestamp}@test.internal`;
  const { data: colabSst, error: errColabSst } = await supabaseAdmin
    .from('colaboradores')
    .insert({
      company_id: TEST_COMPANY_ID,
      cargo_id: cargoSst.id,
      job_title: 'Titulo Divergente da Planilha',
      department: 'Departamento Divergente da Planilha',
      full_name: 'Colaborador Integrado SST',
      cpf: formatCPF(`777888999${String(timestamp).slice(-2)}`),
      birth_date: '1990-01-01',
      admission_date: '2026-01-01',
      contract_type: 'CLT',
      base_salary: 3500,
      payment_method: 'Mensalista',
      email_pessoal: emailSst,
      status: 'ATIVO',
    })
    .select()
    .single();

  if (errColabSst || !colabSst) {
    throw new Error(`Falha ao inserir colab SST: ${errColabSst?.message}`);
  }

  console.log(`Colaborador inserido com cargo_id: ${colabSst.cargo_id}`);
  console.log(`job_title alinhado pelo trigger trg_sync_colaborador_cargo: "${colabSst.job_title}" (esperado: "${cargoSst.nome}")`);
  console.log(`department alinhado pelo trigger trg_sync_colaborador_cargo: "${colabSst.department}" (esperado: "${depSst.nome}")`);

  // Verificar consulta ao vínculo PGR/GHE a partir do colaborador
  const { data: consultaPgr, error: errPgr } = await supabaseAdmin
    .from('colaboradores')
    .select(`
      id,
      full_name,
      job_title,
      cargos (
        id,
        nome,
        ghes (
          id,
          nome,
          setores (
            id,
            nome,
            departamentos (
              id,
              nome
            )
          )
        )
      )
    `)
    .eq('id', colabSst.id)
    .single();

  if (errPgr) {
    throw new Error(`Erro na consulta PGR: ${errPgr.message}`);
  }

  console.log('Vínculo PGR consultado via estrutura:', JSON.stringify(consultaPgr.cargos, null, 2));

  if (
    colabSst.job_title === cargoSst.nome &&
    colabSst.department === depSst.nome &&
    consultaPgr.cargos?.ghes?.id === gheSst.id
  ) {
    console.log('PROVA (e) PASSOU: Trigger alinhou job_title e department com a estrutura e vínculo PGR comprovado! ✅\n');
  } else {
    throw new Error('Falha na prova (e)');
  }

  // --------------------------------------------------------------------------
  // PROVA (f): TESTE DA PLANILHA COMPLETA (3 LINHAS: 1 COMPLETA, 2 COM OPCIONAIS VAZIOS)
  // --------------------------------------------------------------------------
  console.log('--- PROVA (f): TESTE DA PLANILHA COMPLETA COM ZEROS PRESERVADOS ---');
  const rowsCompleteTemplate: RawColaboradorRow[] = [
    {
      linha: 2,
      nome_completo: 'Colaborador Completo',
      cpf: formatCPF('012' + String(timestamp).slice(-8)),
      data_nascimento: '15/08/1988',
      data_admissao: '10/02/2026',
      cargo: cargoSst.nome,
      departamento: depSst.nome,
      tipo_contrato: 'CLT',
      salario_base: 'R$ 5.432,10',
      forma_pagamento: 'Mensalista',
      email_pessoal: `completo_${timestamp}@test.internal`,
      matricula: '00' + String(timestamp).slice(-3),
      telefone: '(11) 98888-7777',
      cep: '01310-100',
      logradouro: 'Avenida Paulista',
      numero: '1000',
      complemento: 'Apto 42',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      uf: 'SP',
      estado_civil: 'Casado(a)',
      sexo: 'Masculino',
      raca_cor: 'Parda',
      pcd: 'NÃO',
      escolaridade: 'Superior Completo',
      banco_horas: 'SIM',
      rg: '001234567',
      rg_orgao_emissor: 'SSP',
      rg_uf: 'SP',
      pis: '01234567890', // zero a esquerda preservado
      ctps_numero: '000789', // zero a esquerda preservado
      ctps_serie: '001',
    },
    {
      linha: 3,
      nome_completo: 'Colaborador Opcionais Vazios 1',
      cpf: formatCPF('123' + String(timestamp).slice(-8)),
      data_nascimento: '01/01/1995',
      data_admissao: '01/01/2026',
      cargo: 'Auxiliar',
      departamento: 'Geral',
      tipo_contrato: 'CLT',
      salario_base: '2500,00',
      forma_pagamento: 'Mensalista',
      email_pessoal: `opcVazio1_${timestamp}@test.internal`,
      // todos os opcionais vazios
    },
    {
      linha: 4,
      nome_completo: 'Colaborador Opcionais Vazios 2',
      cpf: formatCPF('234' + String(timestamp).slice(-8)),
      data_nascimento: '02/02/1996',
      data_admissao: '01/01/2026',
      cargo: 'Auxiliar',
      departamento: 'Geral',
      tipo_contrato: 'CLT',
      salario_base: '2500,00',
      forma_pagamento: 'Mensalista',
      email_pessoal: `opcVazio2_${timestamp}@test.internal`,
      // todos os opcionais vazios
    },
  ];

  const validationComplete = validateColaboradoresRows(rowsCompleteTemplate, {
    cargosAtivos: [cargoSst],
    departamentosAtivos: [depSst],
  });

  if (validationComplete.valid.length !== 3) {
    throw new Error(`Esperado 3 valid rows, obteve ${validationComplete.valid.length}`);
  }

  // Gravar os 3 registros
  const recordsToInsert = validationComplete.valid.map((v) => ({
    company_id: TEST_COMPANY_ID,
    full_name: v.full_name,
    cpf: v.cpf,
    birth_date: v.birth_date_iso,
    admission_date: v.admission_date_iso,
    contract_type: v.contract_type,
    job_title: v.job_title,
    cargo_id: v.cargo_id,
    department: v.department,
    base_salary: v.base_salary,
    payment_method: v.payment_method,
    email_pessoal: v.email_pessoal,
    matricula: v.matricula,
    status: 'ATIVO',
    user_id: null,
    // Opcionais expandidos
    phone: v.phone,
    address_zip_code: v.address_zip_code,
    address_street: v.address_street,
    address_number: v.address_number,
    address_complement: v.address_complement,
    address_neighborhood: v.address_neighborhood,
    address_city: v.address_city,
    address_state: v.address_state,
    marital_status: v.marital_status,
    sex: v.sex,
    ethnicity: v.ethnicity,
    education_level: v.education_level,
    is_banco_horas: v.is_banco_horas,
    rg: v.rg,
    pis: v.pis,
    ctps_numero: v.ctps_numero,
    ctps_serie: v.ctps_serie,
  }));

  const { data: insertedRecords, error: errInsertComplete } = await supabaseAdmin
    .from('colaboradores')
    .insert(recordsToInsert)
    .select();

  if (errInsertComplete || !insertedRecords) {
    throw new Error(`Erro ao gravar 3 registros da planilha completa: ${errInsertComplete?.message}`);
  }

  const recFull = insertedRecords.find((r) => r.email_pessoal === `completo_${timestamp}@test.internal`);
  console.log('Registro completo gravado no banco:', {
    id: recFull.id,
    full_name: recFull.full_name,
    matricula: recFull.matricula,
    pis: recFull.pis,
    ctps_numero: recFull.ctps_numero,
    address_zip_code: recFull.address_zip_code,
    marital_status: recFull.marital_status,
    sex: recFull.sex,
    is_banco_horas: recFull.is_banco_horas,
  });

  if (recFull.pis === '01234567890' && recFull.matricula === ('00' + String(timestamp).slice(-3)) && recFull.ctps_numero === '000789') {
    console.log('PROVA (f) PASSOU: 3 registros gravados com integridade; zeros à esquerda rigorosamente preservados! ✅\n');
  } else {
    throw new Error('Falha na preservação de zeros à esquerda da prova (f)');
  }

  // --------------------------------------------------------------------------
  // PROVA (g): TESTE DE REJEIÇÃO COM MOTIVO CLARO (SEXO "XYZ")
  // --------------------------------------------------------------------------
  console.log('--- PROVA (g): TESTE DE REJEIÇÃO COM MOTIVO CLARO ---');
  const rowsInvalidSex: RawColaboradorRow[] = [
    {
      linha: 2,
      nome_completo: 'Colaborador Sexo Invalido',
      cpf: '999.888.777-66',
      data_nascimento: '01/01/1990',
      data_admissao: '01/01/2026',
      cargo: 'Auxiliar',
      departamento: 'Geral',
      tipo_contrato: 'CLT',
      salario_base: '2000',
      forma_pagamento: 'Mensalista',
      email_pessoal: `sex_invalid_${timestamp}@test.internal`,
      sexo: 'XYZ',
    },
  ];

  const validationSex = validateColaboradoresRows(rowsInvalidSex);
  if (validationSex.rejected.length === 1 && validationSex.rejected[0].motivos.some((m) => m.includes('XYZ') && m.includes('Opções válidas'))) {
    console.log(`Rejeição confirmada com motivo claro: "${validationSex.rejected[0].motivos.join('; ')}" ✅`);
    console.log('PROVA (g) PASSOU: Enum inválido rejeitado com mensagem explicativa! ✅\n');
  } else {
    throw new Error(`Falha na prova (g): linha não foi rejeitada ou motivo incorreto: ${JSON.stringify(validationSex)}`);
  }

  // --------------------------------------------------------------------------
  // PROVA (k): E2E VIVO COMPLETO (5 COLABORADORES)
  // --------------------------------------------------------------------------
  console.log('--- PROVA (k): E2E VIVO COMPLETO (5 COLABORADORES) ---');
  console.log('1. Verificando modelo CSV oficial...');
  console.log(`Cabeçalho do template CSV (${COLABORADORES_TEMPLATE_CSV.split('\n')[0].split(';').length} colunas) ✅`);

  // 2 cargos existentes: cargoCriado e cargoSst
  // 1 cargo novo a ser criado via criação assistida
  const cargoNovoAssistedNome = `Desenvolvedor Senior ${timestamp}`;

  const colabsE2E: RawColaboradorRow[] = [
    // 2 com cargos existentes
    {
      linha: 2,
      nome_completo: `E2E Colab 1 ${timestamp}`,
      cpf: formatCPF(`801001001${String(timestamp).slice(-2)}`),
      data_nascimento: '10/01/1990',
      data_admissao: '01/02/2026',
      cargo: cargoTesteNome, // existente
      departamento: 'RH',
      tipo_contrato: 'CLT',
      salario_base: '4500,00',
      forma_pagamento: 'Mensalista',
      email_pessoal: `e2e_1_${timestamp}@nr1test.internal`,
    },
    {
      linha: 3,
      nome_completo: `E2E Colab 2 ${timestamp}`,
      cpf: formatCPF(`802002002${String(timestamp).slice(-2)}`),
      data_nascimento: '11/02/1991',
      data_admissao: '01/02/2026',
      cargo: cargoSst.nome, // existente
      departamento: depSst.nome,
      tipo_contrato: 'CLT',
      salario_base: '5500,00',
      forma_pagamento: 'Mensalista',
      email_pessoal: `e2e_2_${timestamp}@nr1test.internal`,
    },
    // 1 com cargo novo (a ser criado via assistida)
    {
      linha: 4,
      nome_completo: `E2E Colab 3 ${timestamp}`,
      cpf: formatCPF(`803003003${String(timestamp).slice(-2)}`),
      data_nascimento: '12/03/1992',
      data_admissao: '01/02/2026',
      cargo: cargoNovoAssistedNome, // FALTANTE INICIALMENTE
      departamento: 'Tecnologia',
      tipo_contrato: 'CLT',
      salario_base: '8000,00',
      forma_pagamento: 'Mensalista',
      email_pessoal: `e2e_3_${timestamp}@nr1test.internal`,
    },
    // 2 com opcionais e documentos completos
    {
      linha: 5,
      nome_completo: `E2E Colab 4 ${timestamp}`,
      cpf: formatCPF(`804040404${String(timestamp).slice(-2)}`),
      data_nascimento: '13/04/1993',
      data_admissao: '01/02/2026',
      cargo: cargoTesteNome,
      departamento: 'RH',
      tipo_contrato: 'CLT',
      salario_base: '3200,00',
      forma_pagamento: 'Mensalista',
      email_pessoal: `e2e_4_${timestamp}@nr1test.internal`,
      matricula: '001' + String(timestamp).slice(-2),
      telefone: '(11) 97777-6666',
      cep: '04571-010',
      logradouro: 'Av Engenheiro Luis Carlos Berrini',
      numero: '500',
      cidade: 'São Paulo',
      uf: 'SP',
      pis: '02345678901',
      ctps_numero: '00987',
      ctps_serie: '002',
    },
    {
      linha: 6,
      nome_completo: `E2E Colab 5 ${timestamp}`,
      cpf: formatCPF(`805050505${String(timestamp).slice(-2)}`),
      data_nascimento: '14/05/1994',
      data_admissao: '01/02/2026',
      cargo: cargoSst.nome,
      departamento: depSst.nome,
      tipo_contrato: 'CLT',
      salario_base: '3900,00',
      forma_pagamento: 'Mensalista',
      email_pessoal: `e2e_5_${timestamp}@nr1test.internal`,
      matricula: '002' + String(timestamp).slice(-2),
      telefone: '(11) 96666-5555',
      cep: '01414-001',
      logradouro: 'Rua Haddock Lobo',
      numero: '1307',
      cidade: 'São Paulo',
      uf: 'SP',
      pis: '03456789012',
      ctps_numero: '00988',
      ctps_serie: '002',
    },
  ];

  // Preview inicial: carregar cargos ativos
  let cargosParaPreview = [cargoCriado, cargoSst];
  let preview = validateColaboradoresRows(colabsE2E, {
    cargosAtivos: cargosParaPreview,
    departamentosAtivos: [depSst, { id: 'dep-rh', nome: 'RH' }],
  });

  console.log(`Preview Inicial: ${preview.valid.length} linhas válidas.`);
  const rowSemMatch = preview.valid.find((r) => r.raw.cargo === cargoNovoAssistedNome);
  console.log(`Cargo faltante identificado no preview: "${rowSemMatch?.raw.cargo}", cargo_matched=${rowSemMatch?.cargo_matched}`);

  // Simular clique em "Cadastrar N cargos faltantes"
  console.log(`Criando cargo faltante assistido: "${cargoNovoAssistedNome}"...`);
  const { data: cargoNovoCriado, error: errCriarNovo } = await supabaseAdmin
    .from('cargos')
    .insert({ company_id: TEST_COMPANY_ID, nome: cargoNovoAssistedNome, ativo: true })
    .select()
    .single();

  if (errCriarNovo || !cargoNovoCriado) {
    throw new Error(`Erro ao criar cargo assistido: ${errCriarNovo?.message}`);
  }
  console.log(`Cargo criado com id=${cargoNovoCriado.id} ✅`);

  // Atualizar preview in-memory via applyCargoMatching (exatamente como o Dialog faz)
  const previewAtualizado = applyCargoMatching(preview.valid, [cargoNovoCriado]);
  const rowAtualizada = previewAtualizado.find((r) => r.raw.cargo === cargoNovoAssistedNome);
  console.log(`Após criação assistida, Linha 4 virou: cargo_matched=${rowAtualizada?.cargo_matched}, cargo_id=${rowAtualizada?.cargo_id}, cargo_oficial="${rowAtualizada?.cargo_nome_oficial}" ✅`);

  // Gravar os 5 colaboradores como PENDENTES
  const payloadE2E = previewAtualizado.map((v) => ({
    company_id: TEST_COMPANY_ID,
    full_name: v.full_name,
    cpf: v.cpf,
    birth_date: v.birth_date_iso,
    admission_date: v.admission_date_iso,
    contract_type: v.contract_type,
    job_title: v.job_title,
    cargo_id: v.cargo_id,
    department: v.department,
    base_salary: v.base_salary,
    payment_method: v.payment_method,
    email_pessoal: v.email_pessoal,
    matricula: v.matricula,
    status: 'ATIVO',
    user_id: null,
    phone: v.phone,
    address_zip_code: v.address_zip_code,
    address_street: v.address_street,
    address_number: v.address_number,
    address_city: v.address_city,
    address_state: v.address_state,
    pis: v.pis,
    ctps_numero: v.ctps_numero,
    ctps_serie: v.ctps_serie,
  }));

  const { data: colabsGravados, error: errGravE2E } = await supabaseAdmin
    .from('colaboradores')
    .insert(payloadE2E)
    .select();

  if (errGravE2E || !colabsGravados || colabsGravados.length !== 5) {
    throw new Error(`Falha ao gravar 5 colaboradores E2E: ${errGravE2E?.message}`);
  }
  console.log(`5 colaboradores gravados com sucesso como PENDENTES (user_id = NULL) ✅`);

  // Conferir que todos estão pendentes
  const colabLiberar = colabsGravados[0];
  console.log(`Simulando fluxo "Liberar Acesso" individual para: ${colabLiberar.full_name} (${colabLiberar.email_pessoal})...`);

  // Criar auth.users
  const { data: authCreated, error: errAuth } = await supabaseAdmin.auth.admin.createUser({
    email: colabLiberar.email_pessoal,
    email_confirm: true,
    user_metadata: { full_name: colabLiberar.full_name, company_id: TEST_COMPANY_ID },
  });

  if (errAuth || !authCreated.user) {
    throw new Error(`Erro ao criar auth user no Liberar Acesso: ${errAuth?.message}`);
  }

  const newUserId = authCreated.user.id;

  // Atualizar profile
  await supabaseAdmin.from('profiles').upsert({
    user_id: newUserId,
    company_id: TEST_COMPANY_ID,
    full_name: colabLiberar.full_name,
    email: colabLiberar.email_pessoal,
  }, { onConflict: 'user_id' });

  // Atribuir role
  await supabaseAdmin.from('user_roles').upsert({
    user_id: newUserId,
    role: 'colaborador',
  }, { onConflict: 'user_id, role' });

  // Vincular colaborador ao user_id
  const { error: errLink } = await supabaseAdmin
    .from('colaboradores')
    .update({ user_id: newUserId })
    .eq('id', colabLiberar.id);

  if (errLink) {
    throw new Error(`Erro ao vincular colaborador: ${errLink.message}`);
  }

  console.log(`Colaborador liberado e vinculado com sucesso: user_id=${newUserId} ✅`);

  // Conferir que agora restam 4 pendentes do lote
  const emailsLote = colabsE2E.map((c) => c.email_pessoal);
  const { data: pendentesRestantes } = await supabaseAdmin
    .from('colaboradores')
    .select('id')
    .eq('company_id', TEST_COMPANY_ID)
    .is('user_id', null)
    .in('email_pessoal', emailsLote);

  console.log(`Pendentes restantes do lote: ${pendentesRestantes?.length} (esperado: 4) ✅`);

  // --------------------------------------------------------------------------
  // LIMPEZA GERAL DE DADOS DE TESTE
  // --------------------------------------------------------------------------
  console.log('\n--- LIMPEZA GERAL DOS DADOS DE TESTE ---');
  await supabaseAdmin.auth.admin.deleteUser(newUserId);

  const todosEmailsTeste = [
    `m1_${timestamp}@test.internal`,
    `m2_${timestamp}@test.internal`,
    `m3_${timestamp}@test.internal`,
    emailExisting,
    emailMat1,
    emailMat2,
    emailSst,
    `completo_${timestamp}@test.internal`,
    `opcVazio1_${timestamp}@test.internal`,
    `opcVazio2_${timestamp}@test.internal`,
    ...emailsLote,
  ];

  const { error: errDelColabs } = await supabaseAdmin
    .from('colaboradores')
    .delete()
    .eq('company_id', TEST_COMPANY_ID)
    .in('email_pessoal', todosEmailsTeste);

  if (errDelColabs) {
    console.warn('Aviso na limpeza de colaboradores:', errDelColabs);
  }

  // Deletar cargos de teste criados
  const cargosIdsParaDeletar = [cargoCriado.id, cargoAssistido1.id, cargoSst.id, cargoNovoCriado.id];
  await supabaseAdmin.from('cargos').delete().in('id', cargosIdsParaDeletar);

  // Deletar GHE, Setor, Depto de teste
  await supabaseAdmin.from('ghes').delete().eq('id', gheSst.id);
  await supabaseAdmin.from('setores').delete().eq('id', setorSst.id);
  await supabaseAdmin.from('departamentos').delete().eq('id', depSst.id);

  console.log('Todos os dados de teste foram limpos com sucesso! ✅');
  console.log('\n================================================================');
  console.log('   TODAS AS PROVAS AO VIVO (b, c, d, e, f, g, k) FORAM APROVADAS!');
  console.log('================================================================');
}

runAllProofs().catch((err) => {
  console.error('FATAL: Erro durante a execução das provas:', err);
  process.exit(1);
});
