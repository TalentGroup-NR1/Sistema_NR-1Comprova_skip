import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  console.error('FAIL: Variaveis Supabase ausentes.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
const TG_MAIS_COMPANY_ID = '4553d74e-90d6-4988-b529-853b8b8db993';

async function testEtapa1Live() {
  console.log('================================================================');
  console.log('   PROVA OBRIGATÓRIA ETAPA 1 — MODELO DE DADOS & ANTI-ESCALAÇÃO');
  console.log('================================================================\n');

  const ts = Date.now();
  const testEmail = `test_multirole_${ts}@test-tg.com.br`;
  const testPassword = 'PasswordTest123!';

  // 1. Criar usuário no Auth
  console.log('1. Criando usuário de teste no Auth...');
  const { data: userRes, error: errUser } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  });
  if (errUser || !userRes.user) {
    throw new Error(`Falha ao criar usuário: ${errUser?.message}`);
  }
  const testUserId = userRes.user.id;
  console.log(`[OK] Usuário criado: ${testUserId}`);

  try {
    // 2. Criar profile com is_active = true
    await supabaseAdmin.from('profiles').upsert({
      user_id: testUserId,
      company_id: TG_MAIS_COMPANY_ID,
      full_name: 'Usuário Teste Multi-Perfil',
      is_active: true,
    }, { onConflict: 'user_id' });

    // 3. Cadastrar apenas papel 'colaborador' em user_roles
    await supabaseAdmin.from('user_roles').insert({
      user_id: testUserId,
      role: 'colaborador',
    });

    await supabaseAdmin.from('user_companies').upsert({
      user_id: testUserId,
      company_id: TG_MAIS_COMPANY_ID,
      role: 'colaborador',
      is_default: true,
    }, { onConflict: 'user_id, company_id' });

    // 4. Autenticar como cliente comum (anon client + JWT do usuário)
    const userClient = createClient(supabaseUrl, anonKey);
    const { data: authData, error: errAuth } = await userClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (errAuth || !authData.session) {
      throw new Error(`Falha ao autenticar usuário de teste: ${errAuth?.message}`);
    }
    console.log('[OK] Sessão autenticada como usuário comum.');

    // 5. TESTE ANTI-ESCALAÇÃO: Colaborador comum tenta ativar 'admin_empresa'
    console.log('\n--- TESTE 1: Anti-Escalação (Colaborador tenta virar admin_empresa) ---');
    const { error: errEscalation } = await userClient.rpc('set_active_role', {
      p_role: 'admin_empresa',
    });

    if (!errEscalation) {
      throw new Error('FALHA DE SEGURANÇA: Colaborador conseguiu ativar admin_empresa sem possuir o papel!');
    }
    console.log(`[PASS] Escalação bloqueada com sucesso! Erro capturado: "${errEscalation.message}"`);

    // 6. Verificar que get_my_role() continua retornando 'colaborador'
    const { data: roleBefore } = await userClient.rpc('get_my_role');
    console.log(`[PASS] get_my_role() após tentativa de escalação: "${roleBefore}" (esperado: 'colaborador')`);
    if (roleBefore !== 'colaborador') {
      throw new Error(`Papel incorreto retornado: ${roleBefore}`);
    }

    // 7. Conceder o segundo papel 'admin_empresa' em user_roles
    console.log('\n--- TESTE 2: Usuário Multi-Papel (Possui colaborador E admin_empresa) ---');
    await supabaseAdmin.from('user_roles').insert({
      user_id: testUserId,
      role: 'admin_empresa',
    });
    console.log('[OK] Segundo papel (admin_empresa) adicionado a user_roles.');

    // 8. Chamar set_active_role('admin_empresa') agora deve ter sucesso
    const { error: errSuccessAdmin } = await userClient.rpc('set_active_role', {
      p_role: 'admin_empresa',
    });
    if (errSuccessAdmin) {
      throw new Error(`Falha ao ativar papel legítimo admin_empresa: ${errSuccessAdmin.message}`);
    }
    console.log('[PASS] set_active_role("admin_empresa") executada com SUCESSO.');

    // 9. Verificar que get_my_role() retorna 'admin_empresa'
    const { data: roleAsAdmin } = await userClient.rpc('get_my_role');
    console.log(`[PASS] get_my_role() após ativar admin_empresa: "${roleAsAdmin}" (esperado: 'admin_empresa')`);
    if (roleAsAdmin !== 'admin_empresa') {
      throw new Error(`Papel ativo não refletido em get_my_role: esperado 'admin_empresa', obteve '${roleAsAdmin}'`);
    }

    // 10. Alternar de volta para 'colaborador'
    const { error: errSuccessColab } = await userClient.rpc('set_active_role', {
      p_role: 'colaborador',
    });
    if (errSuccessColab) {
      throw new Error(`Falha ao alternar de volta para colaborador: ${errSuccessColab.message}`);
    }
    const { data: roleAsColab } = await userClient.rpc('get_my_role');
    console.log(`[PASS] get_my_role() após alternar para colaborador: "${roleAsColab}" (esperado: 'colaborador')`);
    if (roleAsColab !== 'colaborador') {
      throw new Error(`Papel ativo não refletido em get_my_role: esperado 'colaborador', obteve '${roleAsColab}'`);
    }

    // 11. TESTE DE DESLIGAMENTO: Criar registro em colaboradores e marcar DESLIGADO
    console.log('\n--- TESTE 3: Desligamento limpa active_role e bloqueia ambos os perfis ---');
    // Inserir registro em colaboradores
    const { data: colabInserted, error: errColab } = await supabaseAdmin.from('colaboradores').insert({
      company_id: TG_MAIS_COMPANY_ID,
      user_id: testUserId,
      full_name: 'Usuario Teste Multi-Perfil',
      email_pessoal: testEmail,
      cpf: `999.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}-99`,
      birth_date: '1990-01-01',
      admission_date: '2026-01-01',
      contract_type: 'CLT',
      job_title: 'Analista',
      department: 'RH',
      base_salary: 5000,
      payment_method: 'Mensalista',
      status: 'ATIVO',
    }).select('id').single();

    if (errColab || !colabInserted) {
      throw new Error(`Falha ao inserir colaborador de teste: ${errColab?.message}`);
    }

    // Definir active_role antes do desligamento
    await supabaseAdmin.from('profiles').update({ active_role: 'colaborador' }).eq('user_id', testUserId);

    // Desligar o colaborador
    const { error: errDesligar } = await supabaseAdmin.from('colaboradores').update({
      status: 'DESLIGADO',
      termination_date: '2026-10-21',
      tipo_desligamento: 'SEM_JUSTA_CAUSA',
      motivo_desligamento: 'Teste automatizado de blindagem',
    }).eq('id', colabInserted.id);

    if (errDesligar) {
      throw new Error(`Falha ao desligar colaborador: ${errDesligar.message}`);
    }

    // Verificar se sync_profile_is_active limpou active_role e marcou is_active = false
    const { data: profileAfterDesligamento } = await supabaseAdmin
      .from('profiles')
      .select('is_active, active_role')
      .eq('user_id', testUserId)
      .single();

    console.log(`[PASS] Profile após desligamento: is_active=${profileAfterDesligamento?.is_active}, active_role=${profileAfterDesligamento?.active_role}`);
    if (profileAfterDesligamento?.is_active !== false || profileAfterDesligamento?.active_role !== null) {
      throw new Error(`Desligamento não limpou active_role ou não desativou profile: ${JSON.stringify(profileAfterDesligamento)}`);
    }

    // Cleanup do registro de colaborador de teste
    await supabaseAdmin.from('colaboradores').delete().eq('id', colabInserted.id);

    console.log('\n================================================================');
    console.log('   TODOS OS TESTES DA ETAPA 1 PASSARAM COM SUCESSO (100% OK)');
    console.log('================================================================');
  } finally {
    // Limpeza do usuário de teste
    console.log('\nLimpando usuário de teste...');
    await supabaseAdmin.from('user_companies').delete().eq('user_id', testUserId);
    await supabaseAdmin.from('user_roles').delete().eq('user_id', testUserId);
    await supabaseAdmin.from('profiles').delete().eq('user_id', testUserId);
    await supabaseAdmin.auth.admin.deleteUser(testUserId);
    console.log('[OK] Usuário de teste removido.');
  }
}

testEtapa1Live().catch((err) => {
  console.error('\nFAIL TEST ETAPA 1:', err);
  process.exit(1);
});
