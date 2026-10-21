import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('FAIL: Variaveis Supabase ausentes.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
const TG_MAIS_COMPANY_ID = '4553d74e-90d6-4988-b529-853b8b8db993';

async function testEtapa2() {
  console.log('================================================================');
  console.log('   PROVA OBRIGATORIA ETAPA 2 — BLOQUEIO DE EXCLUSAO (OPÇÃO B1)');
  console.log('================================================================\n');

  const ts = Date.now();

  // 1. Criar um colaborador PENDENTE (sem user_id)
  console.log('1. Criando colaborador pendente (sem user_id)...');
  const { data: colabPendente, error: errColabPendente } = await supabaseAdmin
    .from('colaboradores')
    .insert({
      company_id: TG_MAIS_COMPANY_ID,
      full_name: `Colab Pendente ${ts}`,
      email_pessoal: `pendente_${ts}@test.com`,
      cpf: `888.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}-88`,
      birth_date: '1992-05-10',
      admission_date: '2026-02-01',
      contract_type: 'CLT',
      job_title: 'Auxiliar Administrativo',
      department: 'Geral',
      base_salary: 2200,
      payment_method: 'Mensalista',
      status: 'ATIVO',
      user_id: null,
    })
    .select()
    .single();

  if (errColabPendente || !colabPendente) {
    throw new Error(`Falha ao criar colaborador pendente: ${errColabPendente?.message}`);
  }
  console.log(`[OK] Colaborador pendente criado: ${colabPendente.id} (user_id = null)`);

  // 2. Criar um colaborador COM ACESSO (user_id NOT NULL)
  console.log('\n2. Criando colaborador com acesso (user_id NOT NULL)...');
  // Cria usuario auth
  const { data: userAuth, error: errAuth } = await supabaseAdmin.auth.admin.createUser({
    email: `acesso_ativo_${ts}@test.com`,
    password: 'Password123!',
    email_confirm: true,
  });
  if (errAuth || !userAuth.user) {
    throw new Error(`Falha ao criar auth user: ${errAuth?.message}`);
  }
  const testUserId = userAuth.user.id;

  const { data: colabComAcesso, error: errColabComAcesso } = await supabaseAdmin
    .from('colaboradores')
    .insert({
      company_id: TG_MAIS_COMPANY_ID,
      full_name: `Colab Com Acesso ${ts}`,
      email_pessoal: `acesso_ativo_${ts}@test.com`,
      cpf: `777.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}-77`,
      birth_date: '1988-08-15',
      admission_date: '2026-01-10',
      contract_type: 'CLT',
      job_title: 'Assistente de DP',
      department: 'RH',
      base_salary: 2800,
      payment_method: 'Mensalista',
      status: 'ATIVO',
      user_id: testUserId,
    })
    .select()
    .single();

  if (errColabComAcesso || !colabComAcesso) {
    throw new Error(`Falha ao criar colaborador com acesso: ${errColabComAcesso?.message}`);
  }
  console.log(`[OK] Colaborador com acesso criado: ${colabComAcesso.id} (user_id = ${testUserId})`);

  try {
    // 3. TESTE A: Tentar excluir colaborador COM ACESSO diretamente no banco
    console.log('\n--- TESTE A: Tentativa de DELETE em colaborador COM ACESSO (user_id != null) ---');
    const { error: errDeleteComAcesso } = await supabaseAdmin
      .from('colaboradores')
      .delete()
      .eq('id', colabComAcesso.id);

    console.log('Mensagem de erro retornada pelo banco:', errDeleteComAcesso?.message);

    if (!errDeleteComAcesso) {
      throw new Error('FALHA: O banco permitiu a exclusão de um colaborador com user_id ativo!');
    }

    const expectedMsg = 'Este colaborador possui acesso ao sistema. Para encerrar o vínculo, realize o desligamento no módulo Demissões.';
    if (!errDeleteComAcesso.message.includes(expectedMsg)) {
      throw new Error(`FALHA: Mensagem inesperada: ${errDeleteComAcesso.message}`);
    }

    console.log('[PROVA PASSOU]: O trigger do banco bloqueou o DELETE com a mensagem exata de negócio!');

    // 4. TESTE B: Excluir colaborador PENDENTE (user_id IS NULL)
    console.log('\n--- TESTE B: Tentativa de DELETE em colaborador SEM ACESSO (user_id == null) ---');
    const { error: errDeletePendente } = await supabaseAdmin
      .from('colaboradores')
      .delete()
      .eq('id', colabPendente.id);

    if (errDeletePendente) {
      throw new Error(`FALHA: Colaborador pendente não pôde ser excluído: ${errDeletePendente.message}`);
    }

    // Verificar se foi realmente excluído do banco
    const { data: checkDeleted } = await supabaseAdmin
      .from('colaboradores')
      .select('id')
      .eq('id', colabPendente.id)
      .maybeSingle();

    if (checkDeleted) {
      throw new Error('FALHA: Colaborador pendente ainda existe no banco após DELETE!');
    }

    console.log('[PROVA PASSOU]: Colaborador sem acesso (pendente) foi excluído com sucesso!');
  } finally {
    // Cleanup do colaborador com acesso:
    // Primeiro removemos o vínculo user_id para permitir o cleanup do registro de teste
    await supabaseAdmin.from('colaboradores').update({ user_id: null }).eq('id', colabComAcesso.id);
    await supabaseAdmin.from('colaboradores').delete().eq('id', colabComAcesso.id);
    await supabaseAdmin.auth.admin.deleteUser(testUserId);
    console.log('\n[CLEANUP] Dados de teste da Etapa 2 limpos com sucesso.');
  }

  console.log('\n================================================================');
  console.log('   PROVAS DA ETAPA 2 PASSARAM COM SUCESSO ABSOLUTO!');
  console.log('================================================================');
}

testEtapa2().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
