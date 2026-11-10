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

async function testE2EEtapa3Live() {
  console.log('================================================================');
  console.log('   PROVA OBRIGATÓRIA (g) — E2E VIVO: PROPAGAÇÃO COMPLETA DO PAPEL ATIVO');
  console.log('================================================================\n');

  const ts = Date.now();
  const testEmail = `e2e_etapa3_${ts}@test-tg.com.br`;
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
      full_name: 'Usuário E2E Etapa 3',
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

    // 4. Papel inicial ativo (deve ser admin_empresa)
    const { data: roleInitial } = await userClient.rpc('get_my_role');
    console.log(`[OK] Papel inicial ativo (RPC get_my_role): "${roleInitial}"`);
    if (roleInitial !== 'admin_empresa') {
      throw new Error(`Esperado 'admin_empresa', obteve '${roleInitial}'`);
    }

    // 5. Testar Edge Function como admin_empresa
    console.log('\n3. Testando Edge Function send-pulse-reminder com papel ativo admin_empresa...');
    const token = loginData.session.access_token;
    const respAdmin = await fetch(`${supabaseUrl}/functions/v1/send-pulse-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ company_id: TG_MAIS_COMPANY_ID }),
    });

    console.log(`[OK] Resposta Edge Function com perfil ativo admin_empresa: HTTP ${respAdmin.status}`);
    // Status 200 = sucesso (autorizado)
    if (respAdmin.status === 403) {
      const errText = await respAdmin.text();
      throw new Error(`Edge Function retornou 403 inesperado para admin_empresa: ${errText}`);
    }

    // 6. Alternar para "Meu Perfil" (colaborador)
    console.log('\n4. Alternando para "Meu Perfil" (colaborador)...');
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

    // 8. Testar Edge Function como colaborador -> Deve ser barrada com 403!
    console.log('\n5. Testando Edge Function send-pulse-reminder no modo "Meu Perfil" (colaborador)...');
    const respColab = await fetch(`${supabaseUrl}/functions/v1/send-pulse-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ company_id: TG_MAIS_COMPANY_ID }),
    });

    console.log(`[OK] Resposta Edge Function como colaborador: HTTP ${respColab.status} (Esperado: 403)`);
    if (respColab.status !== 403) {
      throw new Error(`Esperado HTTP 403 para colaborador, mas obteve HTTP ${respColab.status}`);
    }

    // 9. Caso de Borda: Admin remove papel admin_empresa enquanto usuário estava nele
    console.log('\n6. Testando Caso de Borda: remoção de papel pelo admin com fallback seguro...');
    // Volta papel ativo para admin_empresa
    await userClient.rpc('set_active_role', { p_role: 'admin_empresa' });
    // Admin deleta admin_empresa de user_roles e atualiza vínculo para colaborador
    await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', testUserId)
      .eq('role', 'admin_empresa');
    await supabaseAdmin
      .from('user_companies')
      .update({ role: 'colaborador' })
      .eq('user_id', testUserId);

    // get_my_role() deve detectar que admin_empresa não é mais válido e fazer fallback para colaborador
    const { data: roleFallback, error: errFallback } = await userClient.rpc('get_my_role');
    console.log(`[OK] Fallback automático resolvido: "${roleFallback}" (Erro: ${errFallback?.message ?? 'nenhum'})`);
    if (roleFallback !== 'colaborador') {
      throw new Error(`Esperado fallback para 'colaborador', obteve '${roleFallback}'`);
    }

    console.log('\n================================================================');
    console.log('   PROVA OBRIGATÓRIA (g) E2E VIVO: TODOS OS PONTOS HOMOLOGADOS COM 100% SUCESSO!');
    console.log('================================================================');
  } finally {
    // 10. Limpar dados de teste
    console.log('\n7. Limpando dados de teste do banco de produção...');
    await supabaseAdmin.from('user_companies').delete().eq('user_id', testUserId);
    await supabaseAdmin.from('user_roles').delete().eq('user_id', testUserId);
    await supabaseAdmin.from('profiles').delete().eq('user_id', testUserId);
    await supabaseAdmin.auth.admin.deleteUser(testUserId);
    console.log('[OK] Dados de teste limpos com sucesso.');
  }
}

testE2EEtapa3Live().catch((err) => {
  console.error('\nFAIL E2E ETAPA 3 LIVE TEST:', err);
  process.exit(1);
});
