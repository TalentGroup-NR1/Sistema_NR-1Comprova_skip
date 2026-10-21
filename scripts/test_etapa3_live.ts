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

async function testEtapa3() {
  console.log('================================================================');
  console.log('   PROVA OBRIGATORIA ETAPA 3 — BLINDAGEM DO DESLIGAMENTO');
  console.log('================================================================\n');

  const ts = Date.now();
  const testEmail = `desligamento_rls_${ts}@test-tg.com.br`;
  const testPassword = 'PasswordTest123!';

  // 1. Criar usuario no Auth
  console.log('1. Criando usuário de teste no Auth...');
  const { data: userRes, error: errUser } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  });
  if (errUser || !userRes.user) {
    throw new Error(`Falha ao criar usuario: ${errUser?.message}`);
  }
  const testUserId = userRes.user.id;
  console.log(`[OK] Usuário criado: ${testUserId}`);

  // 2. Criar profile e vínculo de empresa
  await supabaseAdmin.from('profiles').upsert({
    user_id: testUserId,
    company_id: TG_MAIS_COMPANY_ID,
    full_name: 'Usuario Teste Desligamento',
    is_active: true,
  }, { onConflict: 'user_id' });

  await supabaseAdmin.from('user_roles').insert({
    user_id: testUserId,
    role: 'analista_rh',
  });

  await supabaseAdmin.from('user_companies').upsert({
    user_id: testUserId,
    company_id: TG_MAIS_COMPANY_ID,
    role: 'analista_rh',
    is_default: true,
  }, { onConflict: 'user_id, company_id' });

  // 3. Criar registro de colaborador ATIVO
  const { data: colab, error: errColab } = await supabaseAdmin
    .from('colaboradores')
    .insert({
      company_id: TG_MAIS_COMPANY_ID,
      full_name: 'Colaborador Teste Desligamento',
      email_pessoal: testEmail,
      cpf: `666.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}-66`,
      birth_date: '1991-03-20',
      admission_date: '2026-01-15',
      contract_type: 'CLT',
      job_title: 'Analista de RH',
      department: 'RH',
      base_salary: 4000,
      payment_method: 'Mensalista',
      status: 'ATIVO',
      user_id: testUserId,
    })
    .select()
    .single();

  if (errColab || !colab) {
    throw new Error(`Falha ao criar colaborador: ${errColab?.message}`);
  }
  console.log(`[OK] Colaborador ativo criado: ${colab.id}`);

  // 4. Autenticar usuário para capturar o JWT ativo
  const { data: sessionData, error: errLogin } = await anonClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  if (errLogin || !sessionData.session) {
    throw new Error(`Falha no login: ${errLogin?.message}`);
  }
  const oldJwt = sessionData.session.access_token;
  console.log('[OK] Login inicial efetuado. JWT ativo capturado.');

  // Cliente autenticado com o JWT do colaborador
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${oldJwt}` } },
  });

  try {
    // 5. Testar consulta com JWT ANTES do desligamento (deve ter acesso aos colaboradores da empresa)
    console.log('\n--- TESTE 1: Consulta RLS com usuário ATIVO ---');
    const { data: rowsAtivo, error: errQueryAtivo } = await userClient
      .from('colaboradores')
      .select('id, full_name')
      .eq('company_id', TG_MAIS_COMPANY_ID)
      .limit(3);

    console.log(`Linhas retornadas (ativo): ${rowsAtivo?.length ?? 0}, Erro: ${errQueryAtivo?.message ?? 'nenhum'}`);
    if (!rowsAtivo || rowsAtivo.length === 0) {
      throw new Error('Usuário ativo deveria conseguir ler registros da empresa via RLS!');
    }
    console.log('[OK] Acesso RLS normal funcionando.');

    // 6. DESLIGAR O COLABORADOR (simula ação no módulo Demissões)
    console.log('\n--- TESTE 2: Desligando colaborador no sistema ---');
    const { error: errDesligar } = await supabaseAdmin
      .from('colaboradores')
      .update({
        status: 'DESLIGADO',
        termination_date: '2026-10-21',
        tipo_desligamento: 'SEM_JUSTA_CAUSA',
        motivo_desligamento: 'Iniciativa da empresa',
      })
      .eq('id', colab.id);

    if (errDesligar) {
      throw new Error(`Falha ao desligar colaborador: ${errDesligar.message}`);
    }

    // Verificar se o trigger desativou o profile e baniu no Auth
    const { data: profileCheck } = await supabaseAdmin
      .from('profiles')
      .select('is_active')
      .eq('user_id', testUserId)
      .single();

    const { data: authUserCheck } = await supabaseAdmin.auth.admin.getUserById(testUserId);

    console.log(`profiles.is_active após desligamento: ${profileCheck?.is_active} (Esperado: false)`);
    console.log(`auth.users.banned_until após desligamento: ${authUserCheck?.user?.banned_until ? 'SIM (banido)' : 'NÃO'} (Esperado: SIM)`);

    if (profileCheck?.is_active !== false) {
      throw new Error('Trigger falhou em definir profiles.is_active = false!');
    }
    if (!authUserCheck?.user?.banned_until) {
      throw new Error('Trigger falhou em aplicar ban_until no Auth!');
    }

    // 7. Testar consulta RLS com o JWT ANTIGO (deve ser rejeitado / fail-closed, retornando 0 linhas)
    console.log('\n--- TESTE 3: Tentativa de consulta RLS com JWT ANTIGO após desligamento ---');
    const { data: rowsDesligado, error: errQueryDesligado } = await userClient
      .from('colaboradores')
      .select('id, full_name')
      .eq('company_id', TG_MAIS_COMPANY_ID);

    console.log(`Linhas retornadas com JWT antigo após desligamento: ${rowsDesligado?.length ?? 0}`);
    if (rowsDesligado && rowsDesligado.length > 0) {
      throw new Error('VULNERABILIDADE: Colaborador desligado conseguiu ler dados da empresa com JWT antigo!');
    }
    console.log('[PROVA PASSOU]: JWT antigo foi REJEITADO pelo RLS (fail-closed, 0 registros retornados)!');

    // 8. Tentar novo login (deve ser rejeitado pelo ban no Auth)
    console.log('\n--- TESTE 4: Tentativa de novo login com colaborador desligado ---');
    const { error: errLoginDesligado } = await anonClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    console.log(`Erro ao tentar login desligado: ${errLoginDesligado?.message}`);
    if (!errLoginDesligado) {
      throw new Error('VULNERABILIDADE: Colaborador desligado conseguiu logar no sistema!');
    }
    console.log('[PROVA PASSOU]: Novo login BLOQUEADO com sucesso no Supabase Auth!');

    // 9. REATIVAR O COLABORADOR
    console.log('\n--- TESTE 5: Reativando colaborador no sistema ---');
    const { error: errReativar } = await supabaseAdmin
      .from('colaboradores')
      .update({
        status: 'ATIVO',
        termination_date: null,
      })
      .eq('id', colab.id);

    if (errReativar) {
      throw new Error(`Falha ao reativar colaborador: ${errReativar.message}`);
    }

    // Verificar se profile foi reativado e ban foi removido
    const { data: profileReativo } = await supabaseAdmin
      .from('profiles')
      .select('is_active')
      .eq('user_id', testUserId)
      .single();

    const { data: authUserReativo } = await supabaseAdmin.auth.admin.getUserById(testUserId);

    console.log(`profiles.is_active após reativação: ${profileReativo?.is_active} (Esperado: true)`);
    console.log(`auth.users.banned_until após reativação: ${authUserReativo?.user?.banned_until ? 'SIM' : 'NÃO (liberado)'} (Esperado: NÃO)`);

    if (profileReativo?.is_active !== true) {
      throw new Error('Trigger falhou em restaurar profiles.is_active = true!');
    }
    if (authUserReativo?.user?.banned_until) {
      throw new Error('Trigger falhou em remover o ban do Auth!');
    }

    // 10. Fazer login e testar consulta RLS restaurada
    console.log('\n--- TESTE 6: Login e consulta RLS após reativação ---');
    const { data: newSession, error: errNewLogin } = await anonClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (errNewLogin || !newSession.session) {
      throw new Error(`Falha no login após reativação: ${errNewLogin?.message}`);
    }

    const reativadoClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${newSession.session.access_token}` } },
    });

    const { data: rowsReativado } = await reativadoClient
      .from('colaboradores')
      .select('id, full_name')
      .eq('company_id', TG_MAIS_COMPANY_ID)
      .limit(3);

    console.log(`Linhas retornadas após reativação: ${rowsReativado?.length ?? 0}`);
    if (!rowsReativado || rowsReativado.length === 0) {
      throw new Error('Falha ao acessar registros após reativação!');
    }

    console.log('[PROVA PASSOU]: Acesso RLS e login restaurados com perfeição após reativação!');
  } finally {
    // Cleanup
    await supabaseAdmin.from('colaboradores').update({ user_id: null }).eq('id', colab.id);
    await supabaseAdmin.from('colaboradores').delete().eq('id', colab.id);
    await supabaseAdmin.from('user_companies').delete().eq('user_id', testUserId);
    await supabaseAdmin.from('user_roles').delete().eq('user_id', testUserId);
    await supabaseAdmin.from('profiles').delete().eq('user_id', testUserId);
    await supabaseAdmin.auth.admin.deleteUser(testUserId);
    console.log('\n[CLEANUP] Dados de teste da Etapa 3 limpos com sucesso.');
  }

  console.log('\n================================================================');
  console.log('   PROVAS DA ETAPA 3 PASSARAM COM SUCESSO ABSOLUTO!');
  console.log('================================================================');
}

testEtapa3().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
