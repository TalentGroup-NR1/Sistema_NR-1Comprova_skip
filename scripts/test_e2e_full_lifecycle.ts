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
const anonClient = createClient(supabaseUrl, anonKey);
const TG_MAIS_COMPANY_ID = '4553d74e-90d6-4988-b529-853b8b8db993';

async function runE2EFullLifecycle() {
  console.log('================================================================');
  console.log('   PROVA OBRIGATORIA (i): E2E VIVO DO CICLO COMPLETO');
  console.log('   CADASTRO → LIBERAR ADMIN → LOGIN → DESLIGAR → REATIVAR');
  console.log('================================================================\n');

  const ts = Date.now();
  const testEmail = `e2e_colab_${ts}@test-tg.com.br`;
  const testPassword = 'PasswordE2E123!';

  // 0. Autenticar um admin da empresa para invocar finalize-colaborador-user
  const callerEmail = `caller_admin_${ts}@test-tg.com.br`;
  const callerPass = 'CallerPass123!';
  const { data: callerUserRes } = await supabaseAdmin.auth.admin.createUser({
    email: callerEmail,
    password: callerPass,
    email_confirm: true,
  });
  const callerId = callerUserRes.user!.id;
  await supabaseAdmin.from('profiles').upsert({
    user_id: callerId,
    company_id: TG_MAIS_COMPANY_ID,
    full_name: 'Caller Admin E2E',
    is_active: true,
  }, { onConflict: 'user_id' });
  await supabaseAdmin.from('user_roles').insert({
    user_id: callerId,
    role: 'admin_empresa',
  });
  const { data: sessionData } = await anonClient.auth.signInWithPassword({
    email: callerEmail,
    password: callerPass,
  });
  const callerJwt = sessionData.session!.access_token;
  console.log('[OK] Caller admin autenticado para o fluxo E2E.');

  let createdColabId: string | null = null;
  let createdUserId: string | null = null;

  try {
    // 1. Cadastrar colaboradora de teste pendente
    console.log('\n--- PASSO 1: Cadastrar colaboradora de teste na TG MAIS ---');
    const { data: newColab, error: errColab } = await supabaseAdmin
      .from('colaboradores')
      .insert({
        company_id: TG_MAIS_COMPANY_ID,
        full_name: `Colaboradora E2E Teste ${ts}`,
        email_pessoal: testEmail,
        cpf: `555.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}-55`,
        birth_date: '1993-07-25',
        admission_date: '2026-03-01',
        contract_type: 'CLT',
        job_title: 'Gerente Operacional',
        department: 'Operações',
        base_salary: 7500,
        payment_method: 'Mensalista',
        status: 'ATIVO',
      })
      .select()
      .single();

    if (errColab || !newColab) {
      throw new Error(`Falha ao cadastrar colaboradora: ${errColab?.message}`);
    }
    createdColabId = newColab.id;
    console.log(`[OK] Colaboradora cadastrada: ${createdColabId}`);

    // 2. Liberar acesso como "admin_empresa"
    console.log('\n--- PASSO 2: Liberar acesso como "admin_empresa" ---');
    const { data: fnData, error: fnErr } = await supabaseAdmin.functions.invoke(
      'finalize-colaborador-user',
      {
        body: {
          colaborador_id: createdColabId,
          role: 'admin_empresa',
        },
        headers: {
          Authorization: `Bearer ${callerJwt}`,
        },
      }
    );

    if (fnErr || fnData?.error) {
      throw new Error(`Erro ao liberar acesso: ${fnErr?.message || fnData?.error}`);
    }
    createdUserId = fnData?.user?.id;
    console.log(`[OK] Acesso liberado com sucesso. User ID: ${createdUserId}`);

    // 3. Verificar que user_roles E user_companies estão simultaneamente com admin_empresa
    console.log('\n--- PASSO 3: Validar papéis gravados no banco ---');
    const { data: roleRow } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', createdUserId)
      .single();

    const { data: companyRow } = await supabaseAdmin
      .from('user_companies')
      .select('role, company_id')
      .eq('user_id', createdUserId)
      .eq('company_id', TG_MAIS_COMPANY_ID)
      .single();

    console.log(`user_roles.role     = "${roleRow?.role}" (Esperado: admin_empresa)`);
    console.log(`user_companies.role = "${companyRow?.role}" (Esperado: admin_empresa)`);

    if (roleRow?.role !== 'admin_empresa' || companyRow?.role !== 'admin_empresa') {
      throw new Error('FALHA: Os papéis em user_roles e user_companies divergiram!');
    }
    console.log('[OK] Fidelidade de papéis comprovada.');

    // 4. Definir senha
    console.log('\n--- PASSO 4: Definindo senha para o usuário ---');
    await supabaseAdmin.auth.admin.updateUserById(createdUserId!, {
      password: testPassword,
    });
    console.log('[OK] Senha definida.');

    // 5. Login com a conta da colaboradora e validação de permissões de admin
    console.log('\n--- PASSO 5: Login e verificação de privilégios admin_empresa ---');
    const { data: colabLogin, error: errColabLogin } = await anonClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (errColabLogin || !colabLogin.session) {
      throw new Error(`Falha no login da colaboradora: ${errColabLogin?.message}`);
    }
    const colabJwt = colabLogin.session.access_token;
    console.log('[OK] Login efetuado com sucesso.');

    const colabClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${colabJwt}` } },
    });

    // Testar get_my_role() via RPC
    const { data: myRole } = await colabClient.rpc('get_my_role');
    console.log(`get_my_role() retornado = "${myRole}" (Esperado: admin_empresa)`);
    if (myRole !== 'admin_empresa') {
      throw new Error(`FALHA: get_my_role retornou ${myRole} em vez de admin_empresa!`);
    }

    // Testar has_company_access
    const { data: hasAccess } = await colabClient.rpc('has_company_access', {
      _company_id: TG_MAIS_COMPANY_ID,
    });
    console.log(`has_company_access(TG_MAIS) = ${hasAccess} (Esperado: true)`);
    if (!hasAccess) {
      throw new Error('FALHA: has_company_access retornou false para admin_empresa!');
    }

    // 6. Desligar colaboradora no módulo Demissões
    console.log('\n--- PASSO 6: Desligamento no módulo Demissões ---');
    const { error: errDesligar } = await supabaseAdmin
      .from('colaboradores')
      .update({
        status: 'DESLIGADO',
        termination_date: '2026-10-21',
        tipo_desligamento: 'SEM_JUSTA_CAUSA',
        motivo_desligamento: 'Desligamento teste E2E',
      })
      .eq('id', createdColabId);
    if (errDesligar) throw errDesligar;

    // Verificar corte imediato
    const { data: profCheck } = await supabaseAdmin
      .from('profiles')
      .select('is_active')
      .eq('user_id', createdUserId)
      .single();
    console.log(`profiles.is_active = ${profCheck?.is_active} (Esperado: false)`);

    // Tentar novo login
    const { error: errLoginDesligado } = await anonClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    console.log(`Tentativa de login após desligamento: ${errLoginDesligado?.message} (Esperado: User is banned)`);
    if (!errLoginDesligado) {
      throw new Error('FALHA: Usuário desligado conseguiu logar!');
    }

    // Tentar consulta com JWT pré-existente
    const { data: rowsJwtAntigo } = await colabClient
      .from('colaboradores')
      .select('id')
      .eq('company_id', TG_MAIS_COMPANY_ID);
    console.log(`Linhas retornadas com JWT antigo após desligamento = ${rowsJwtAntigo?.length ?? 0} (Esperado: 0)`);
    if (rowsJwtAntigo && rowsJwtAntigo.length > 0) {
      throw new Error('FALHA: JWT antigo ainda permitiu leitura após desligamento!');
    }
    console.log('[OK] Corte total e fail-closed confirmado.');

    // 7. Reativar colaboradora
    console.log('\n--- PASSO 7: Reativação da colaboradora ---');
    const { error: errReativar } = await supabaseAdmin
      .from('colaboradores')
      .update({
        status: 'ATIVO',
        termination_date: null,
      })
      .eq('id', createdColabId);
    if (errReativar) throw errReativar;

    // Tentar login novamente
    const { data: loginReativo, error: errLoginReativo } = await anonClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (errLoginReativo || !loginReativo.session) {
      throw new Error(`Falha no login após reativação: ${errLoginReativo?.message}`);
    }
    console.log('[OK] Login pós-reativação realizado com sucesso.');

    const reativadoClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${loginReativo.session.access_token}` } },
    });
    const { data: roleReativo } = await reativadoClient.rpc('get_my_role');
    console.log(`get_my_role() pós-reativação = "${roleReativo}" (Esperado: admin_empresa)`);
    if (roleReativo !== 'admin_empresa') {
      throw new Error(`FALHA: papel não restaurado corretamente: ${roleReativo}`);
    }
    console.log('[OK] Papel admin_empresa restaurado integralmente.');

  } finally {
    console.log('\n--- PASSO 8: Limpeza de dados de teste E2E ---');
    if (createdColabId) {
      await supabaseAdmin.from('colaboradores').update({ user_id: null }).eq('id', createdColabId);
      await supabaseAdmin.from('colaboradores').delete().eq('id', createdColabId);
    }
    if (createdUserId) {
      await supabaseAdmin.from('user_companies').delete().eq('user_id', createdUserId);
      await supabaseAdmin.from('user_roles').delete().eq('user_id', createdUserId);
      await supabaseAdmin.from('profiles').delete().eq('user_id', createdUserId);
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
    }
    if (callerId) {
      await supabaseAdmin.from('user_companies').delete().eq('user_id', callerId);
      await supabaseAdmin.from('user_roles').delete().eq('user_id', callerId);
      await supabaseAdmin.from('profiles').delete().eq('user_id', callerId);
      await supabaseAdmin.auth.admin.deleteUser(callerId);
    }
    console.log('[CLEANUP] Todos os dados de teste foram completamente removidos.');
  }

  console.log('\n================================================================');
  console.log('   PROVA OBRIGATÓRIA (i) CONCLUÍDA COM SUCESSO ABSOLUTO!');
  console.log('================================================================');
}

runE2EFullLifecycle().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
