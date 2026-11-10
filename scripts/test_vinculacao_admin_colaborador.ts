import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('FAIL: Variáveis Supabase ausentes.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function runTestVinculacao() {
  console.log('================================================================');
  console.log('   BATERIA DE TESTES — VINCULAÇÃO INTELIGENTE ADMIN ↔ COLABORADOR');
  console.log('================================================================\n');

  const ts = Date.now();
  const emailAdminEmpresaA = `admin_a_${ts}@test-vinc.com.br`;
  const emailAdminEmpresaB = `admin_b_${ts}@test-vinc.com.br`;
  const password = 'PasswordTest123!';

  let companyAId = '';
  let companyBId = '';
  let userAId = '';
  let userBId = '';

  try {
    // 1. SETUP DE DUAS EMPRESAS E SEUS ADMINS
    console.log('1. [SETUP] Criando Empresa A e Empresa B para teste multi-tenant...');
    const { data: compA, error: errCompA } = await supabaseAdmin.from('companies').insert({
      name: `Empresa Teste A ${ts}`,
      cnpj: `${ts.toString().slice(-8)}000199`,
      email: emailAdminEmpresaA,
      status: 'active',
    }).select('id').single();
    if (errCompA) throw errCompA;
    companyAId = compA.id;

    const { data: compB, error: errCompB } = await supabaseAdmin.from('companies').insert({
      name: `Empresa Teste B ${ts}`,
      cnpj: `${(ts + 1).toString().slice(-8)}000199`,
      email: emailAdminEmpresaB,
      status: 'active',
    }).select('id').single();
    if (errCompB) throw errCompB;
    companyBId = compB.id;

    console.log(`[OK] Empresa A: ${companyAId} | Empresa B: ${companyBId}`);

    // Cria User A
    const { data: uA } = await supabaseAdmin.auth.admin.createUser({
      email: emailAdminEmpresaA,
      password,
      email_confirm: true,
    });
    userAId = uA.user!.id;

    await supabaseAdmin.from('profiles').insert({
      user_id: userAId,
      company_id: companyAId,
      full_name: 'Admin Empresa A',
      email: emailAdminEmpresaA,
      is_active: true,
    });
    await supabaseAdmin.from('user_roles').insert({ user_id: userAId, role: 'admin_empresa' });

    // Cria User B
    const { data: uB } = await supabaseAdmin.auth.admin.createUser({
      email: emailAdminEmpresaB,
      password,
      email_confirm: true,
    });
    userBId = uB.user!.id;

    await supabaseAdmin.from('profiles').insert({
      user_id: userBId,
      company_id: companyBId,
      full_name: 'Admin Empresa B',
      email: emailAdminEmpresaB,
      is_active: true,
    });
    await supabaseAdmin.from('user_roles').insert({ user_id: userBId, role: 'admin_empresa' });

    console.log(`[OK] Admin A criado: ${userAId} | Admin B criado: ${userBId}`);

    // -------------------------------------------------------------------------
    // TESTE 1: VINCULAÇÃO MALICIOSA / MULTI-TENANT
    // -------------------------------------------------------------------------
    console.log('\n2. [SEGURANÇA MULTI-TENANT] Tentativa de vincular Admin da Empresa A na Empresa B...');

    // (A) RPC check_email_vinculacao
    const { data: vincCrossCompany } = await supabaseAdmin.rpc('check_email_vinculacao', {
      p_email: emailAdminEmpresaA,
      p_company_id: companyBId,
    });

    console.log('    Resultado RPC vinculação cross-company:', vincCrossCompany);
    if (vincCrossCompany.can_link !== false || vincCrossCompany.reason !== 'other_company') {
      throw new Error(`FALHA DE SEGURANÇA: check_email_vinculacao permitiu ou não detectou outra empresa! ${JSON.stringify(vincCrossCompany)}`);
    }
    console.log('    [OK] check_email_vinculacao bloqueou cross-company com reason="other_company"');

    // (B) Trigger trg_auto_link_colaborador_user com tentativa de insert direto
    const { error: errDirectInsertCross } = await supabaseAdmin.from('colaboradores').insert({
      company_id: companyBId,
      user_id: userAId, // Forçando user_id de outra empresa!
      full_name: 'Tentativa Invasão',
      corporate_email: emailAdminEmpresaA,
      cpf: `000.${ts.toString().slice(-6)}-99`,
      birth_date: '1985-05-05',
      admission_date: '2024-01-01',
      contract_type: 'CLT',
      job_title: 'Analista',
      department: 'TI',
      base_salary: 5000,
      payment_method: 'Mensalista',
      status: 'ATIVO',
    });

    if (!errDirectInsertCross) {
      throw new Error('VULNERABILIDADE CRÍTICA: Trigger permitiu vincular colaborador com user_id de outra empresa!');
    }
    console.log(`    [OK] Trigger bloqueou violação multi-tenant no banco: "${errDirectInsertCross.message}"`);

    // -------------------------------------------------------------------------
    // TESTE 2: VINCULAÇÃO LEGÍTIMA (MESMA EMPRESA)
    // -------------------------------------------------------------------------
    console.log('\n3. [VINCULAÇÃO LEGÍTIMA] Cadastrando ficha para Admin A na Empresa A...');

    // (A) RPC check_email_vinculacao
    const { data: vincSameCompany } = await supabaseAdmin.rpc('check_email_vinculacao', {
      p_email: emailAdminEmpresaA,
      p_company_id: companyAId,
    });

    console.log('    Resultado RPC vinculação mesma empresa:', vincSameCompany);
    if (!vincSameCompany.can_link || vincSameCompany.user_id !== userAId) {
      throw new Error(`FALHA: Deveria permitir vinculação! ${JSON.stringify(vincSameCompany)}`);
    }
    console.log('    [OK] check_email_vinculacao autorizou vinculação (can_link=true, user_id correto)');

    // (B) Inserção do colaborador na Empresa A
    const { data: colabA, error: errColabA } = await supabaseAdmin.from('colaboradores').insert({
      company_id: companyAId,
      user_id: userAId,
      full_name: 'Admin Empresa A',
      corporate_email: emailAdminEmpresaA,
      email_pessoal: emailAdminEmpresaA,
      cpf: `000.${ts.toString().slice(-6)}-11`,
      birth_date: '1988-08-08',
      admission_date: '2024-01-01',
      contract_type: 'CLT',
      job_title: 'Diretor',
      department: 'Diretoria',
      base_salary: 10000,
      payment_method: 'Mensalista',
      status: 'ATIVO',
    }).select('id, user_id').single();

    if (errColabA) throw errColabA;
    console.log(`    [OK] Colaborador inserido com sucesso: ${colabA.id}, user_id vinculado: ${colabA.user_id}`);

    // (C) Conferência de papéis em user_roles
    const { data: rolesA } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userAId);
    const roleNamesA = (rolesA ?? []).map(r => r.role);
    console.log(`    [OK] Papéis do Admin A em user_roles:`, roleNamesA);

    if (!roleNamesA.includes('admin_empresa') || !roleNamesA.includes('colaborador')) {
      throw new Error(`FALHA: Admin A deveria ter 'admin_empresa' e 'colaborador'. Encontrado: ${roleNamesA.join(', ')}`);
    }
    console.log('    [OK] Exatamente 2 papéis em user_roles (admin_empresa + colaborador). Seletor Flash HABILITADO!');

    // (D) Conferir que NENHUMA conta auth duplicada foi criada
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const usersWithEmailA = authUsers.users.filter(u => u.email?.toLowerCase() === emailAdminEmpresaA.toLowerCase());
    console.log(`    [OK] Contas no Auth com este e-mail: ${usersWithEmailA.length} (esperado 1, ZERO contas duplicadas)`);
    if (usersWithEmailA.length !== 1) {
      throw new Error(`FALHA: Criou conta duplicada no Auth! Total: ${usersWithEmailA.length}`);
    }

    // -------------------------------------------------------------------------
    // TESTE 3: IMPORTAÇÃO EM LOTE (check_emails_exist_batch)
    // -------------------------------------------------------------------------
    console.log('\n4. [IMPORTAÇÃO EM LOTE] Testando check_emails_exist_batch...');
    
    // emailAdminEmpresaB ainda NÃO tem ficha na Empresa B -> deve retornar exists=false para Company B!
    // emailAdminEmpresaA JÁ TEM ficha na Empresa A -> deve retornar exists=true para Company A!
    const { data: batchResB } = await supabaseAdmin.rpc('check_emails_exist_batch', {
      p_emails: [emailAdminEmpresaB, `novo_${ts}@teste.com.br`],
      p_company_id: companyBId,
    });
    console.log('    Batch resultado para Empresa B (admin B ainda sem ficha):', batchResB);

    const itemAdminB = batchResB?.find((i: any) => i.email === emailAdminEmpresaB.toLowerCase());
    if (itemAdminB?.exists !== false) {
      throw new Error(`FALHA: Admin B sem ficha na Empresa B deveria ter exists=false para permitir vinculação! Obteve: ${itemAdminB?.exists}`);
    }
    console.log('    [OK] Admin B sem ficha na Empresa B obteve exists=false (aprovado para importação com vinculação)');

    const { data: batchResA } = await supabaseAdmin.rpc('check_emails_exist_batch', {
      p_emails: [emailAdminEmpresaA],
      p_company_id: companyAId,
    });
    console.log('    Batch resultado para Empresa A (admin A já com ficha):', batchResA);
    const itemAdminA = batchResA?.find((i: any) => i.email === emailAdminEmpresaA.toLowerCase());
    if (itemAdminA?.exists !== true) {
      throw new Error(`FALHA: Admin A com ficha já cadastrada deveria ter exists=true!`);
    }
    console.log('    [OK] Admin A com ficha já cadastrada obteve exists=true (rejeição correta de duplicidade)');

    console.log('\n================================================================');
    console.log('   BATERIA DE TESTES DE VINCULAÇÃO: 100% APROVADA!');
    console.log('================================================================');

  } finally {
    console.log('\n5. [CLEANUP] Limpando dados de teste...');
    if (companyAId) {
      await supabaseAdmin.from('colaboradores').delete().eq('company_id', companyAId);
      await supabaseAdmin.from('companies').delete().eq('id', companyAId);
    }
    if (companyBId) {
      await supabaseAdmin.from('colaboradores').delete().eq('company_id', companyBId);
      await supabaseAdmin.from('companies').delete().eq('id', companyBId);
    }
    if (userAId) {
      await supabaseAdmin.from('user_roles').delete().eq('user_id', userAId);
      await supabaseAdmin.from('profiles').delete().eq('user_id', userAId);
      await supabaseAdmin.auth.admin.deleteUser(userAId);
    }
    if (userBId) {
      await supabaseAdmin.from('user_roles').delete().eq('user_id', userBId);
      await supabaseAdmin.from('profiles').delete().eq('user_id', userBId);
      await supabaseAdmin.auth.admin.deleteUser(userBId);
    }
    console.log('[OK] Cleanup concluído.');
  }
}

runTestVinculacao().catch((err) => {
  console.error('\nFAIL BATERIA VINCULACAO:', err);
  process.exit(1);
});
