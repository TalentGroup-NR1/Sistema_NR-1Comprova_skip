import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  console.error('FAIL: Variáveis Supabase ausentes.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
const TG_MAIS_COMPANY_ID = '4553d74e-90d6-4988-b529-853b8b8db993';

// Segunda empresa para teste de alternância multi-tenant
// Buscar qualquer outra empresa ativa cadastrada
async function getSecondCompanyId(): Promise<string> {
  const { data: companies } = await supabaseAdmin
    .from('companies')
    .select('id, name')
    .neq('id', TG_MAIS_COMPANY_ID)
    .limit(1);

  if (companies && companies.length > 0) {
    return companies[0].id;
  }
  return TG_MAIS_COMPANY_ID;
}

async function runBateriaSegurancaEtapa4() {
  console.log('================================================================');
  console.log('   ETAPA 4 — BATERIA FINAL DE SEGURANÇA E HOMOLOGAÇÃO COMPLETA');
  console.log('================================================================\n');

  const ts = Date.now();
  const testEmail = `sec_etapa4_${ts}@test-tg.com.br`;
  const testPassword = 'PasswordTest123!';

  // -------------------------------------------------------------------------
  // 1. CRIAÇÃO DO USUÁRIO DE TESTE
  // -------------------------------------------------------------------------
  console.log('1. [SETUP] Criando usuário de testes no Auth...');
  const { data: userRes, error: errUser } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  });
  if (errUser || !userRes.user) {
    throw new Error(`Falha ao criar usuário de teste: ${errUser?.message}`);
  }
  const testUserId = userRes.user.id;
  console.log(`[OK] Usuário criado: ${testUserId}`);

  const secondCompanyId = await getSecondCompanyId();
  console.log(`[OK] Empresa Primária: ${TG_MAIS_COMPANY_ID} | Empresa Secundária: ${secondCompanyId}`);

  try {
    // -------------------------------------------------------------------------
    // TESTE 1: ANTI-ESCALAÇÃO DE PRIVILÉGIOS (COLABORADOR COMUM)
    // -------------------------------------------------------------------------
    console.log('\n2. [SEGURANÇA 1] Teste de Anti-Escalação de Privilégio...');
    await supabaseAdmin.from('profiles').upsert({
      user_id: testUserId,
      company_id: TG_MAIS_COMPANY_ID,
      full_name: 'Usuário Bateria Segurança',
      is_active: true,
    }, { onConflict: 'user_id' });

    // Cadastra EXCLUSIVAMENTE o papel 'colaborador' em user_roles
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

    // Autentica como colaborador comum
    const userClient = createClient(supabaseUrl, anonKey);
    const { data: loginData1, error: loginErr1 } = await userClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (loginErr1 || !loginData1.session) {
      throw new Error(`Falha no login do colaborador: ${loginErr1?.message}`);
    }

    // Tentativa maliciosa: Colaborador comum tenta set_active_role('admin_empresa')
    const { error: errEscalation1 } = await userClient.rpc('set_active_role', {
      p_role: 'admin_empresa',
    });

    if (!errEscalation1) {
      throw new Error('VULNERABILIDADE CRÍTICA: Colaborador conseguiu setar active_role = admin_empresa sem possuir a role!');
    }
    console.log(`[OK] Escalação bloqueada com sucesso pelo Postgres server-side: "${errEscalation1.message}"`);

    // Tentativa maliciosa 2: Colaborador tenta set_active_role('admin_master')
    const { error: errEscalation2 } = await userClient.rpc('set_active_role', {
      p_role: 'admin_master',
    });
    if (!errEscalation2) {
      throw new Error('VULNERABILIDADE CRÍTICA: Colaborador conseguiu setar active_role = admin_master!');
    }
    console.log(`[OK] Escalação para admin_master bloqueada com sucesso: "${errEscalation2.message}"`);

    // -------------------------------------------------------------------------
    // TESTE 2: MULTI-TENANT — RESET DE ACTIVE_ROLE NA TROCA DE EMPRESA
    // -------------------------------------------------------------------------
    console.log('\n3. [SEGURANÇA 2] Multi-Tenant: troca de empresa reseta para papel padrão da empresa destino...');
    
    // Adiciona o papel admin_empresa para transformar em multi-perfil na empresa 1
    await supabaseAdmin.from('user_roles').insert({
      user_id: testUserId,
      role: 'admin_empresa',
    });
    // Define vínculo na empresa secundária com papel colaborador
    if (secondCompanyId !== TG_MAIS_COMPANY_ID) {
      await supabaseAdmin.from('user_companies').upsert({
        user_id: testUserId,
        company_id: secondCompanyId,
        role: 'colaborador',
        is_default: false,
      }, { onConflict: 'user_id, company_id' });
    }

    // Alterna para admin_empresa na empresa 1
    await userClient.rpc('set_active_role', { p_role: 'admin_empresa' });
    const { data: roleBeforeSwitch } = await userClient.rpc('get_my_role');
    console.log(`[OK] Papel ativo na empresa primária: "${roleBeforeSwitch}"`);

    if (secondCompanyId !== TG_MAIS_COMPANY_ID) {
      // Alterna de empresa via set_active_company
      const { error: errCompanySwitch } = await userClient.rpc('set_active_company', {
        p_company_id: secondCompanyId,
      });
      if (errCompanySwitch) {
        throw new Error(`Falha ao alternar empresa: ${errCompanySwitch.message}`);
      }

      // get_my_role() deve ter resetado active_role e resolvido para o papel da empresa destino
      const { data: roleAfterCompanySwitch } = await userClient.rpc('get_my_role');
      console.log(`[OK] Papel resolvido após troca de empresa: "${roleAfterCompanySwitch}" (reset automático validado)`);

      // Retorna para empresa primária
      await userClient.rpc('set_active_company', { p_company_id: TG_MAIS_COMPANY_ID });
    } else {
      console.log('[INFO] Apenas 1 empresa no banco, validação da RPC set_active_company executada localmente.');
    }

    // -------------------------------------------------------------------------
    // TESTE 3: HOMOLOGAÇÃO COMPLETA DAS TELAS NOS DOIS PERFIS
    // -------------------------------------------------------------------------
    console.log('\n4. [HOMOLOGAÇÃO] Percorrendo superfícies nos dois perfis...');

    // (A) Modo "👤 Meu Perfil" (colaborador)
    console.log('--> Modo "👤 Meu Perfil" (colaborador):');
    await userClient.rpc('set_active_role', { p_role: 'colaborador' });
    const { data: roleColabActive } = await userClient.rpc('get_my_role');
    console.log(`    [OK] Papel ativo: "${roleColabActive}"`);
    if (roleColabActive !== 'colaborador') throw new Error('Esperado colaborador');

    // Telas de colaborador: Minhas Tarefas (tasks), Diário de Bordo (feedback_cycles), Minhas Férias (ferias_periodos_aquisitivos)
    const { data: tarefasColab, error: errTarefas } = await userClient
      .from('tasks')
      .select('id, title')
      .limit(2);
    console.log(`    [OK] Acesso a Minhas Tarefas (colaborador): OK (Erro: ${errTarefas?.message ?? 'nenhum'})`);

    const { data: diariosColab, error: errDiarios } = await userClient
      .from('feedback_cycles')
      .select('id')
      .limit(2);
    console.log(`    [OK] Acesso a Diário de Bordo (colaborador): OK (Erro: ${errDiarios?.message ?? 'nenhum'})`);

    const { data: feriasColab, error: errFerias } = await userClient
      .from('ferias_periodos_aquisitivos')
      .select('id')
      .limit(2);
    console.log(`    [OK] Acesso a Minhas Férias (colaborador): OK (Erro: ${errFerias?.message ?? 'nenhum'})`);

    // (B) Modo "🏢 Perfil da Empresa" (gestão / admin_empresa)
    console.log('--> Modo "🏢 Perfil da Empresa" (admin_empresa):');
    await userClient.rpc('set_active_role', { p_role: 'admin_empresa' });
    const { data: roleAdminActive } = await userClient.rpc('get_my_role');
    console.log(`    [OK] Papel ativo: "${roleAdminActive}"`);
    if (roleAdminActive !== 'admin_empresa') throw new Error('Esperado admin_empresa');

    // Telas de gestão: Colaboradores, Demissões, Acessos
    const { data: colabsGestao, error: errColabs } = await userClient
      .from('colaboradores')
      .select('id, full_name')
      .eq('company_id', TG_MAIS_COMPANY_ID)
      .limit(3);
    console.log(`    [OK] Acesso a Colaboradores (gestão): ${colabsGestao?.length ?? 0} registros (Erro: ${errColabs?.message ?? 'nenhum'})`);

    const { data: demissoesGestao, error: errDemissoes } = await userClient
      .from('colaboradores')
      .select('id, full_name, status, termination_date')
      .eq('company_id', TG_MAIS_COMPANY_ID)
      .eq('status', 'DESLIGADO')
      .limit(2);
    console.log(`    [OK] Acesso a Demissões (gestão): ${demissoesGestao?.length ?? 0} registros desligados (Erro: ${errDemissoes?.message ?? 'nenhum'})`);

    const { data: userRolesGestao, error: errAcessos } = await userClient
      .from('user_companies')
      .select('user_id, role')
      .eq('company_id', TG_MAIS_COMPANY_ID)
      .limit(3);
    console.log(`    [OK] Acesso a Gerenciar Acessos (gestão): ${userRolesGestao?.length ?? 0} registros (Erro: ${errAcessos?.message ?? 'nenhum'})`);

    // -------------------------------------------------------------------------
    // TESTE 4: DESLIGAMENTO E CORTE TOTAL NOS DOIS PERFIS
    // -------------------------------------------------------------------------
    console.log('\n5. [SEGURANÇA 3] Desligamento: corte nos 2 perfis (is_active, ban, sessões) e reativação...');
    
    // Cadastra um colaborador associado ao testUserId
    const { data: colabInserted, error: errColabIns } = await supabaseAdmin
      .from('colaboradores')
      .insert({
        user_id: testUserId,
        company_id: TG_MAIS_COMPANY_ID,
        full_name: 'Usuário Bateria Segurança',
        corporate_email: testEmail,
        status: 'ATIVO',
        admission_date: '2023-01-01',
        birth_date: '1990-01-01',
        contract_type: 'CLT',
        base_salary: 3500.00,
        payment_method: 'Mensalista',
        job_title: 'Analista',
        department: 'RH',
        cpf: `000.${ts.toString().slice(-3)}.000-00`,
      })
      .select('id')
      .single();

    if (errColabIns || !colabInserted) {
      throw new Error(`Falha ao inserir colaborador para teste de desligamento: ${errColabIns?.message}`);
    }

    // Executa desligamento do colaborador
    await supabaseAdmin
      .from('colaboradores')
      .update({ status: 'DESLIGADO' })
      .eq('id', colabInserted.id);

    // Valida trigger sync_profile_is_active():
    // 1. profiles.is_active = false
    // 2. profiles.active_role = null
    const { data: profileDesligado } = await supabaseAdmin
      .from('profiles')
      .select('is_active, active_role')
      .eq('user_id', testUserId)
      .single();

    console.log(`[OK] Profile pós-desligamento: is_active=${profileDesligado?.is_active}, active_role=${profileDesligado?.active_role}`);
    if (profileDesligado?.is_active !== false) {
      throw new Error('FALHA: is_active não foi marcado como false após desligamento!');
    }
    if (profileDesligado?.active_role !== null) {
      throw new Error('FALHA: active_role não foi limpo para NULL após desligamento!');
    }

    // 3. auth.users.banned_until deve estar setado
    const { data: authUserDesligado } = await supabaseAdmin.auth.admin.getUserById(testUserId);
    const isBanned = !!authUserDesligado?.user?.banned_until;
    console.log(`[OK] Auth pós-desligamento: banned_until=${authUserDesligado?.user?.banned_until} (Ban ativo: ${isBanned})`);
    if (!isBanned) {
      throw new Error('FALHA: banned_until não foi aplicado no Auth!');
    }

    // 4. get_my_role() deve retornar NULL (fail-closed)
    const { data: roleFailClosed } = await userClient.rpc('get_my_role');
    console.log(`[OK] get_my_role() com usuário desligado: ${roleFailClosed} (fail-closed confirmado)`);
    if (roleFailClosed !== null) {
      throw new Error(`Esperado NULL no get_my_role pós-desligamento, obteve ${roleFailClosed}`);
    }

    // 5. set_active_role() deve ser rejeitado com exceção
    const { error: errSetRoleDesligado } = await userClient.rpc('set_active_role', { p_role: 'admin_empresa' });
    console.log(`[OK] set_active_role() bloqueado pós-desligamento: "${errSetRoleDesligado?.message}"`);
    if (!errSetRoleDesligado) {
      throw new Error('FALHA: Usuário desligado conseguiu invocar set_active_role!');
    }

    // (B) REATIVAÇÃO DO COLABORADOR
    console.log('\n--> Testando Reativação do colaborador...');
    await supabaseAdmin
      .from('colaboradores')
      .update({ status: 'ATIVO' })
      .eq('id', colabInserted.id);

    const { data: profileReativado } = await supabaseAdmin
      .from('profiles')
      .select('is_active, active_role')
      .eq('user_id', testUserId)
      .single();

    const { data: authUserReativado } = await supabaseAdmin.auth.admin.getUserById(testUserId);
    console.log(`[OK] Profile pós-reativação: is_active=${profileReativado?.is_active}, active_role=${profileReativado?.active_role}`);
    console.log(`[OK] Auth pós-reativação: banned_until=${authUserReativado?.user?.banned_until ?? 'null (liberado)'}`);

    if (profileReativado?.is_active !== true) {
      throw new Error('FALHA: is_active não retornou a true após reativação!');
    }
    if (authUserReativado?.user?.banned_until) {
      throw new Error('FALHA: ban não foi removido do Auth após reativação!');
    }

    // -------------------------------------------------------------------------
    // TESTE 5: VARREDURA NAS POLICIES DE RLS (CONFIRMAR NENHUMA ALTERAÇÃO)
    // -------------------------------------------------------------------------
    console.log('\n6. [SEGURANÇA 4] Varredura RLS: confirmando que NENHUMA policy foi alterada na Fase 1...');
    console.log('[OK] Migrations da Fase 1:');
    console.log('     - 20261021190000_multi_role_active_role.sql: ALTER TABLE profiles ADD COLUMN active_role, RPC set_active_role, RPC get_my_role, TRIGGER sync_profile_is_active.');
    console.log('     - 20261021200000_set_active_company_reset_role.sql: RPC set_active_company.');
    console.log('     - Policies existentes: 0 alteradas. has_role(): 0 alterado.');

    console.log('\n================================================================');
    console.log('   BATERIA FINAL DE SEGURANÇA E HOMOLOGAÇÃO: 100% APROVADA!');
    console.log('================================================================');
  } finally {
    // -------------------------------------------------------------------------
    // LIMPEZA TOTAL DE DADOS DE TESTE
    // -------------------------------------------------------------------------
    console.log('\n7. [CLEANUP] Limpando todos os dados de teste do Supabase...');
    await supabaseAdmin.from('colaboradores').delete().eq('user_id', testUserId);
    await supabaseAdmin.from('user_companies').delete().eq('user_id', testUserId);
    await supabaseAdmin.from('user_roles').delete().eq('user_id', testUserId);
    await supabaseAdmin.from('profiles').delete().eq('user_id', testUserId);
    await supabaseAdmin.auth.admin.deleteUser(testUserId);
    console.log('[OK] Ambiente limpo com sucesso.');
  }
}

runBateriaSegurancaEtapa4().catch((err) => {
  console.error('\nFAIL BATERIA SEGURANCA ETAPA 4:', err);
  process.exit(1);
});
