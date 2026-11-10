import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('FAIL: Variaveis de ambiente ausentes.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
const TG_MAIS_COMPANY_ID = '4553d74e-90d6-4988-b529-853b8b8db993';

async function testEtapa1() {
  console.log('================================================================');
  console.log('   PROVA OBRIGATORIA ETAPA 1 — PAPEL & TRIGGER DE SINCRONIA');
  console.log('================================================================\n');

  const ts = Date.now();
  const testEmailSync = `test_sync_${ts}@test-tg.com.br`;
  const testPassword = 'TestPassword123!';

  // --------------------------------------------------------------------------
  // PROVA (b): TESTE DO TRIGGER DE SINCRONIA (user_roles -> user_companies)
  // --------------------------------------------------------------------------
  console.log('--- TESTE (b): TRIGGER DE SINCRONIA trg_sync_user_role_to_company ---');
  
  // 1. Criar usuario de teste
  const { data: userSyncRes, error: errSyncUser } = await supabaseAdmin.auth.admin.createUser({
    email: testEmailSync,
    password: testPassword,
    email_confirm: true,
  });
  if (errSyncUser || !userSyncRes.user) {
    throw new Error(`Falha ao criar userSync: ${errSyncUser?.message}`);
  }
  const syncUserId = userSyncRes.user.id;
  console.log(`[OK] Usuario criado para teste de trigger: ${syncUserId}`);

  try {
    // Inserir profile
    await supabaseAdmin.from('profiles').upsert({
      user_id: syncUserId,
      company_id: TG_MAIS_COMPANY_ID,
      full_name: 'Usuario Teste Sincronia',
      is_active: true,
    }, { onConflict: 'user_id' });

    // Inserir papel inicial 'colaborador' em user_roles
    await supabaseAdmin.from('user_roles').insert({
      user_id: syncUserId,
      role: 'colaborador',
    });

    // Verificar se user_companies foi sincronizado com 'colaborador'
    let { data: ucInitial } = await supabaseAdmin
      .from('user_companies')
      .select('role')
      .eq('user_id', syncUserId)
      .eq('company_id', TG_MAIS_COMPANY_ID)
      .single();
    console.log(`1. Papel inicial em user_companies: ${ucInitial?.role} (Esperado: colaborador)`);

    // Atualizar user_roles para 'admin_empresa'
    await supabaseAdmin
      .from('user_roles')
      .update({ role: 'admin_empresa' })
      .eq('user_id', syncUserId);

    let { data: ucAdmin } = await supabaseAdmin
      .from('user_companies')
      .select('role')
      .eq('user_id', syncUserId)
      .eq('company_id', TG_MAIS_COMPANY_ID)
      .single();
    console.log(`2. Apos update em user_roles -> admin_empresa: user_companies.role = ${ucAdmin?.role} (Esperado: admin_empresa)`);
    if (ucAdmin?.role !== 'admin_empresa') {
      throw new Error(`TRIGGER FALHOU: user_companies.role nao atualizou para admin_empresa!`);
    }

    // Atualizar user_roles para 'gestor_departamento'
    await supabaseAdmin
      .from('user_roles')
      .update({ role: 'gestor_departamento' })
      .eq('user_id', syncUserId);

    let { data: ucGestor } = await supabaseAdmin
      .from('user_companies')
      .select('role')
      .eq('user_id', syncUserId)
      .eq('company_id', TG_MAIS_COMPANY_ID)
      .single();
    console.log(`3. Apos update em user_roles -> gestor_departamento: user_companies.role = ${ucGestor?.role} (Esperado: gestor_departamento)`);
    if (ucGestor?.role !== 'gestor_departamento') {
      throw new Error(`TRIGGER FALHOU: user_companies.role nao atualizou para gestor_departamento!`);
    }

    // Atualizar user_roles para 'analista_rh'
    await supabaseAdmin
      .from('user_roles')
      .update({ role: 'analista_rh' })
      .eq('user_id', syncUserId);

    let { data: ucRH } = await supabaseAdmin
      .from('user_companies')
      .select('role')
      .eq('user_id', syncUserId)
      .eq('company_id', TG_MAIS_COMPANY_ID)
      .single();
    console.log(`4. Apos update em user_roles -> analista_rh: user_companies.role = ${ucRH?.role} (Esperado: analista_rh)`);
    if (ucRH?.role !== 'analista_rh') {
      throw new Error(`TRIGGER FALHOU: user_companies.role nao atualizou para analista_rh!`);
    }

    console.log('[PROVA b APROVADA]: Trigger de sincronia user_roles -> user_companies 100% funcional!\n');
  } finally {
    // Cleanup do usuario de sincronia
    await supabaseAdmin.from('user_companies').delete().eq('user_id', syncUserId);
    await supabaseAdmin.from('user_roles').delete().eq('user_id', syncUserId);
    await supabaseAdmin.from('profiles').delete().eq('user_id', syncUserId);
    await supabaseAdmin.auth.admin.deleteUser(syncUserId);
    console.log('[CLEANUP] Usuario de teste de trigger removido.');
  }

  // --------------------------------------------------------------------------
  // PROVA (a): TESTE DO PAPEL NO LIBERAR ACESSO (finalize-colaborador-user)
  // --------------------------------------------------------------------------
  console.log('\n--- TESTE (a): LIBERAR ACESSO COM finalize-colaborador-user ---');
  
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  const anonClient = createClient(supabaseUrl, anonKey);

  // Criar admin caller para simular a chamada da UI
  const callerEmail = `caller_admin_${ts}@test-tg.com.br`;
  const callerPass = 'CallerPass123!';
  const { data: callerRes, error: errCaller } = await supabaseAdmin.auth.admin.createUser({
    email: callerEmail,
    password: callerPass,
    email_confirm: true,
  });
  if (errCaller || !callerRes.user) {
    throw new Error(`Falha ao criar caller: ${errCaller?.message}`);
  }
  const callerId = callerRes.user.id;

  await supabaseAdmin.from('profiles').upsert({
    user_id: callerId,
    company_id: TG_MAIS_COMPANY_ID,
    full_name: 'Caller Admin Test',
    is_active: true,
  }, { onConflict: 'user_id' });

  await supabaseAdmin.from('user_roles').insert({
    user_id: callerId,
    role: 'admin_empresa',
  });

  const { data: sessionData, error: errLogin } = await anonClient.auth.signInWithPassword({
    email: callerEmail,
    password: callerPass,
  });
  if (errLogin || !sessionData.session) {
    throw new Error(`Falha no login do caller admin: ${errLogin?.message}`);
  }
  const callerJwt = sessionData.session.access_token;
  console.log('[OK] Caller admin autenticado com token JWT.');

  const rolesToTest = ['admin_empresa', 'gestor_departamento', 'analista_rh'] as const;

  try {
    for (const roleTest of rolesToTest) {
      console.log(`\n>> Testando Liberar Acesso com papel: "${roleTest}"`);
      const uniqueEmail = `test_colab_${roleTest}_${ts}@test-tg.com.br`;

      // 1. Cadastrar colaborador pendente na TG MAIS
      const { data: newColab, error: errColab } = await supabaseAdmin
        .from('colaboradores')
        .insert({
          company_id: TG_MAIS_COMPANY_ID,
          full_name: `Colab Teste ${roleTest}`,
          email_pessoal: uniqueEmail,
          cpf: `999.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}-99`,
          birth_date: '1990-01-01',
          admission_date: '2026-01-01',
          contract_type: 'CLT',
          job_title: 'Analista de RH',
          department: 'RH',
          base_salary: 3000,
          payment_method: 'Mensalista',
          status: 'ATIVO',
        })
        .select()
        .single();

      if (errColab || !newColab) {
        throw new Error(`Falha ao cadastrar colaborador: ${errColab?.message}`);
      }

      let createdUserId: string | null = null;

      try {
        // 2. Chamar finalize-colaborador-user como admin autenticado
        const { data: fnData, error: fnErr } = await supabaseAdmin.functions.invoke(
          'finalize-colaborador-user',
          {
            body: {
              colaborador_id: newColab.id,
              role: roleTest,
            },
            headers: {
              Authorization: `Bearer ${callerJwt}`,
            },
          }
        );

      if (fnErr) {
        if ('context' in fnErr && (fnErr as any).context) {
          try {
            const errBody = await (fnErr as any).context.json();
            console.error('Edge function error body:', errBody);
          } catch {
            const errText = await (fnErr as any).context.text();
            console.error('Edge function error text:', errText);
          }
        }
        throw new Error(`Erro ao invocar finalize-colaborador-user: ${fnErr.message}`);
      }
      if (fnData?.error) {
        throw new Error(`Erro retornado por finalize-colaborador-user: ${fnData.error}`);
      }

      createdUserId = fnData?.user?.id;
      console.log(`   [OK] finalize-colaborador-user retornou sucesso. User ID: ${createdUserId}`);

      // 3. Consultar user_roles E user_companies simultaneamente
      const { data: roleRows } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', createdUserId);

      const { data: ucRows } = await supabaseAdmin
        .from('user_companies')
        .select('role, company_id')
        .eq('user_id', createdUserId);

      const actualUserRole = roleRows?.[0]?.role;
      const actualCompanyRole = ucRows?.[0]?.role;

      console.log(`   user_roles.role     = "${actualUserRole}" (Esperado: "${roleTest}")`);
      console.log(`   user_companies.role = "${actualCompanyRole}" (Esperado: "${roleTest}")`);

      if (actualUserRole !== roleTest) {
        throw new Error(`Divergência em user_roles! Esperado: ${roleTest}, Obtido: ${actualUserRole}`);
      }
      if (actualCompanyRole !== roleTest) {
        throw new Error(`Divergência em user_companies! Esperado: ${roleTest}, Obtido: ${actualCompanyRole}`);
      }

      console.log(`   [PROVA APROVADA] Papel "${roleTest}" gravado com fidelidade absoluta em user_roles E user_companies simultaneamente!`);
    } finally {
      // Cleanup do colaborador e do usuario de teste
      if (createdUserId) {
        await supabaseAdmin.from('user_companies').delete().eq('user_id', createdUserId);
        await supabaseAdmin.from('user_roles').delete().eq('user_id', createdUserId);
        await supabaseAdmin.from('colaboradores').delete().eq('id', newColab.id);
        await supabaseAdmin.from('profiles').delete().eq('user_id', createdUserId);
        await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      } else {
        await supabaseAdmin.from('colaboradores').delete().eq('id', newColab.id);
      }
      console.log(`   [CLEANUP] Dados de teste para "${roleTest}" removidos.`);
    }
  }
  } finally {
    if (callerId) {
      await supabaseAdmin.from('user_companies').delete().eq('user_id', callerId);
      await supabaseAdmin.from('user_roles').delete().eq('user_id', callerId);
      await supabaseAdmin.from('profiles').delete().eq('user_id', callerId);
      await supabaseAdmin.auth.admin.deleteUser(callerId);
      console.log('[CLEANUP] Caller admin removido com sucesso.');
    }
  }

  console.log('\n================================================================');
  console.log('   TODAS AS PROVAS DA ETAPA 1 PASSARAM COM SUCESSO ABSOLUTO!');
  console.log('================================================================');
}

testEtapa1().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
