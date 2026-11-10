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

async function testE2EMultiRoleLive() {
  console.log('================================================================');
  console.log('   PROVA OBRIGATÓRIA (h) — E2E VIVO: MULTI-PERFIL COMPLETO');
  console.log('================================================================\n');

  const ts = Date.now();
  const testEmail = `e2e_multirole_${ts}@test-tg.com.br`;
  const testPassword = 'PasswordTest123!';

  // 1. Criar usuário no Auth
  console.log('1. Criando usuário multi-perfil no Auth...');
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
    // 2. Criar profile e vínculos (admin_empresa + colaborador)
    await supabaseAdmin.from('profiles').upsert({
      user_id: testUserId,
      company_id: TG_MAIS_COMPANY_ID,
      full_name: 'Usuário E2E Multi-Papel',
      is_active: true,
    }, { onConflict: 'user_id' });

    // Outorgar AMBOS os papéis em user_roles
    await supabaseAdmin.from('user_roles').insert([
      { user_id: testUserId, role: 'admin_empresa' },
      { user_id: testUserId, role: 'colaborador' },
    ]);

    await supabaseAdmin.from('user_companies').upsert({
      user_id: testUserId,
      company_id: TG_MAIS_COMPANY_ID,
      role: 'admin_empresa',
      is_default: true,
    }, { onConflict: 'user_id, company_id' });

    // 3. Login real com credenciais
    console.log('2. Realizando login como usuário multi-perfil...');
    const userClient = createClient(supabaseUrl, anonKey);
    const { data: loginData, error: errLogin } = await userClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (errLogin || !loginData.session) {
      throw new Error(`Falha no login: ${errLogin?.message}`);
    }
    console.log('[OK] Login efetuado com sucesso.');

    // 4. Papel inicial (deve ser admin_empresa)
    const { data: roleInitial } = await userClient.rpc('get_my_role');
    console.log(`[OK] Papel inicial ativo: "${roleInitial}"`);
    if (roleInitial !== 'admin_empresa') {
      throw new Error(`Esperado 'admin_empresa', obteve '${roleInitial}'`);
    }

    // 5. Acessar Colaboradores como admin da empresa
    const { data: colabsAdmin, error: errColabAdmin } = await userClient
      .from('colaboradores')
      .select('id, full_name')
      .eq('company_id', TG_MAIS_COMPANY_ID)
      .limit(3);

    console.log(`[OK] Acesso a Colaboradores como Admin: ${colabsAdmin?.length ?? 0} registros encontrados. (Erro: ${errColabAdmin?.message ?? 'nenhum'})`);

    // 6. Alternar para "Meu Perfil" (colaborador)
    console.log('\n3. Alternando para "Meu Perfil" (colaborador)...');
    const { error: errSwitchColab } = await userClient.rpc('set_active_role', {
      p_role: 'colaborador',
    });
    if (errSwitchColab) {
      throw new Error(`Falha ao alternar para colaborador: ${errSwitchColab.message}`);
    }

    // 7. Validar que get_my_role() agora retorna 'colaborador'
    const { data: roleColab } = await userClient.rpc('get_my_role');
    console.log(`[OK] Papel ativo após alternância: "${roleColab}"`);
    if (roleColab !== 'colaborador') {
      throw new Error(`Esperado 'colaborador', obteve '${roleColab}'`);
    }

    // 8. Alternar de volta para "Perfil da Empresa" (admin_empresa)
    console.log('\n4. Alternando de volta para "Perfil da Empresa" (admin_empresa)...');
    const { error: errSwitchAdmin } = await userClient.rpc('set_active_role', {
      p_role: 'admin_empresa',
    });
    if (errSwitchAdmin) {
      throw new Error(`Falha ao alternar para admin_empresa: ${errSwitchAdmin.message}`);
    }

    const { data: roleRestored } = await userClient.rpc('get_my_role');
    console.log(`[OK] Papel ativo restaurado para Gestão: "${roleRestored}"`);
    if (roleRestored !== 'admin_empresa') {
      throw new Error(`Esperado 'admin_empresa', obteve '${roleRestored}'`);
    }

    console.log('\n================================================================');
    console.log('   PROVA (h) E2E VIVO: FLUXO COMPLETO VALIDADO COM SUCESSO!');
    console.log('================================================================');
  } finally {
    // 9. Limpar dados de teste
    console.log('\n5. Limpando dados de teste...');
    await supabaseAdmin.from('user_companies').delete().eq('user_id', testUserId);
    await supabaseAdmin.from('user_roles').delete().eq('user_id', testUserId);
    await supabaseAdmin.from('profiles').delete().eq('user_id', testUserId);
    await supabaseAdmin.auth.admin.deleteUser(testUserId);
    console.log('[OK] Dados de teste limpos com sucesso.');
  }
}

testE2EMultiRoleLive().catch((err) => {
  console.error('\nFAIL E2E LIVE TEST:', err);
  process.exit(1);
});
