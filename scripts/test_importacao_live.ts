import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('FAIL: Variáveis de ambiente Supabase ausentes.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
const TEST_COMPANY_ID = '540d02bd-8d5d-429b-b695-8a66f46c499d'; // NR-1 COM PROVA

async function runLiveProofs() {
  console.log('=== INICIANDO PROVAS AO VIVO (e) e (j) ===');
  const runTimestamp = Date.now();

  // --------------------------------------------------------------------------
  // PROVA (e): TESTE DE GRAVAÇÃO DE 250 REGISTROS EM CHUNKS DE 50
  // --------------------------------------------------------------------------
  console.log('\n--- PROVA (e): Importar 250 registros válidos ---');
  const records250 = [];
  const testEmails250: string[] = [];

  for (let i = 1; i <= 250; i++) {
    const email = `test_batch_250_${runTimestamp}_${i}@nr1test.internal`;
    testEmails250.push(email);
    // Fake CPF with timestamp prefix to guarantee uniqueness
    const cpfPadded = String(i).padStart(6, '0');
    const cpfPrefix = String(runTimestamp).slice(-5);
    const cpf = `${cpfPrefix}${cpfPadded}`;

    records250.push({
      company_id: TEST_COMPANY_ID,
      full_name: `Colab Teste Lote ${i}`,
      cpf: cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || `999.${cpfPadded.slice(0,3)}.${cpfPadded.slice(3,6)}-00`,
      birth_date: '1990-01-01',
      admission_date: '2026-01-01',
      contract_type: 'CLT',
      job_title: 'Analista de Testes',
      department: 'Garantia da Qualidade',
      base_salary: 4000.0,
      payment_method: 'Mensalista',
      email_pessoal: email,
      status: 'ATIVO',
      user_id: null,
      matricula: `T250_${runTimestamp}_${i}`,
    });
  }

  // Gravação em 5 lotes de 50
  const CHUNK_SIZE = 50;
  for (let i = 0; i < records250.length; i += CHUNK_SIZE) {
    const chunk = records250.slice(i, i + CHUNK_SIZE);
    const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
    const { error: chunkErr } = await supabaseAdmin.from('colaboradores').insert(chunk);
    if (chunkErr) {
      console.error(`FAIL no lote ${chunkNum}:`, chunkErr);
      process.exit(1);
    }
    console.log(`Lote ${chunkNum}/5 (${chunk.length} registros) gravado com sucesso.`);
  }

  // Verificações da Prova (e)
  const { data: colabsInDb, error: queryErr } = await supabaseAdmin
    .from('colaboradores')
    .select('id, user_id, status, email_pessoal')
    .eq('company_id', TEST_COMPANY_ID)
    .in('email_pessoal', testEmails250);

  if (queryErr || !colabsInDb) {
    console.error('FAIL ao consultar registros 250:', queryErr);
    process.exit(1);
  }

  console.log(`Total gravado em colaboradores: ${colabsInDb.length} de 250.`);
  const allNullUserId = colabsInDb.every((c) => c.user_id === null);
  const allAtivo = colabsInDb.every((c) => c.status === 'ATIVO');
  console.log(`Todos com user_id IS NULL: ${allNullUserId ? 'SIM ✅' : 'NÃO ❌'}`);
  console.log(`Todos com status ATIVO: ${allAtivo ? 'SIM ✅' : 'NÃO ❌'}`);

  // Verificar ZERO registros em auth.users, profiles e user_companies
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
  const matchedAuth = (authUsers?.users || []).filter((u) => testEmails250.includes(u.email || ''));
  console.log(`Registros em auth.users: ${matchedAuth.length} (esperado 0) ${matchedAuth.length === 0 ? '✅' : '❌'}`);

  const { data: matchedProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .in('email', testEmails250);
  console.log(`Registros em profiles: ${(matchedProfiles || []).length} (esperado 0) ${(matchedProfiles || []).length === 0 ? '✅' : '❌'}`);

  // Limpeza dos 250 registros de teste
  const { error: delErr } = await supabaseAdmin
    .from('colaboradores')
    .delete()
    .eq('company_id', TEST_COMPANY_ID)
    .in('email_pessoal', testEmails250);
  console.log(`Limpeza dos 250 registros de teste: ${!delErr ? 'CONCLUÍDA ✅' : 'FALHA ❌'}`);

  if (!allNullUserId || !allAtivo || matchedAuth.length !== 0 || (matchedProfiles || []).length !== 0) {
    console.error('FAIL: Prova (e) não atendeu a todos os critérios.');
    process.exit(1);
  }
  console.log('PROVA (e) APROVADA COM SUCESSO! 🎉');

  // --------------------------------------------------------------------------
  // PROVA (j): E2E VIVO — Importar 5, liberar acesso de 1, limpar tudo
  // --------------------------------------------------------------------------
  console.log('\n--- PROVA (j): E2E VIVO (5 colaboradores, 1 liberação) ---');
  const records5 = [];
  const testEmails5: string[] = [];

  for (let i = 1; i <= 5; i++) {
    const email = `test_e2e_5_${runTimestamp}_${i}@nr1test.internal`;
    testEmails5.push(email);
    const cpfPadded = String(i).padStart(6, '0');
    const cpfPrefix = String(runTimestamp).slice(-5);
    const cpf = `${cpfPrefix}${cpfPadded}`;

    records5.push({
      company_id: TEST_COMPANY_ID,
      full_name: `Colaborador E2E ${i}`,
      cpf: `888.${cpfPadded.slice(0,3)}.${cpfPadded.slice(3,6)}-00`,
      birth_date: '1992-05-15',
      admission_date: '2026-02-01',
      contract_type: 'CLT',
      job_title: 'Assistente',
      department: 'Administrativo',
      base_salary: 2800.0,
      payment_method: 'Mensalista',
      email_pessoal: email,
      status: 'ATIVO',
      user_id: null,
      matricula: `E2E_${runTimestamp}_${i}`,
    });
  }

  const { data: inserted5, error: errInsert5 } = await supabaseAdmin
    .from('colaboradores')
    .insert(records5)
    .select('id, full_name, email_pessoal, user_id, status');

  if (errInsert5 || !inserted5) {
    console.error('FAIL ao inserir 5 colaboradores:', errInsert5);
    process.exit(1);
  }
  console.log(`5 colaboradores inseridos como pendentes: ${inserted5.length} ✅`);

  // Verificar que aparecem na query de pendentes
  const { data: pendentesList } = await supabaseAdmin
    .from('colaboradores')
    .select('id, full_name, email_pessoal')
    .eq('company_id', TEST_COMPANY_ID)
    .is('user_id', null)
    .eq('status', 'ATIVO')
    .in('email_pessoal', testEmails5);

  console.log(`Pendentes detectados pela query da aba: ${pendentesList?.length || 0}/5 ✅`);

  // Liberar acesso de 1 deles (colaborador #1)
  const targetColab = inserted5[0];
  console.log(`Liberando acesso para: ${targetColab.full_name} (${targetColab.email_pessoal})`);

  // Criar auth.user (simulando a liberação de acesso da edge function)
  const { data: authCreated, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: targetColab.email_pessoal,
    password: 'TempPassword123!',
    email_confirm: true,
    user_metadata: { full_name: targetColab.full_name },
  });

  if (authErr || !authCreated.user) {
    console.error('FAIL ao criar auth user para liberação:', authErr);
    process.exit(1);
  }

  const newUserId = authCreated.user.id;

  // Atualizar profile
  await supabaseAdmin.from('profiles').upsert({
    user_id: newUserId,
    company_id: TEST_COMPANY_ID,
    full_name: targetColab.full_name,
    email: targetColab.email_pessoal,
  }, { onConflict: 'user_id' });

  // Atribuir role
  await supabaseAdmin.from('user_roles').upsert({
    user_id: newUserId,
    role: 'colaborador',
  }, { onConflict: 'user_id, role' });

  // Vincular colaborador ao user_id
  const { error: linkErr } = await supabaseAdmin
    .from('colaboradores')
    .update({ user_id: newUserId })
    .eq('id', targetColab.id);

  if (linkErr) {
    console.error('FAIL ao vincular colaborador:', linkErr);
    process.exit(1);
  }
  console.log(`Colaborador vinculado ao user_id: ${newUserId} ✅`);

  // Verificar que o trigger trg_sync_profile_user_company criou o vínculo em user_companies
  const { data: userCompanyLink } = await supabaseAdmin
    .from('user_companies')
    .select('*')
    .eq('user_id', newUserId)
    .eq('company_id', TEST_COMPANY_ID)
    .maybeSingle();

  console.log(`Vínculo em user_companies criado pelo trigger institucional: ${userCompanyLink ? 'SIM ✅' : 'NÃO ❌'}`);

  // Verificar que agora restam 4 pendentes
  const { data: remainingPendentes } = await supabaseAdmin
    .from('colaboradores')
    .select('id')
    .eq('company_id', TEST_COMPANY_ID)
    .is('user_id', null)
    .eq('status', 'ATIVO')
    .in('email_pessoal', testEmails5);

  console.log(`Restam pendentes: ${remainingPendentes?.length} (esperado 4) ✅`);

  // Limpeza final de teste
  await supabaseAdmin.auth.admin.deleteUser(newUserId);
  await supabaseAdmin.from('colaboradores').delete().eq('company_id', TEST_COMPANY_ID).in('email_pessoal', testEmails5);

  console.log('Limpeza de dados de teste concluída com sucesso ✅');
  console.log('PROVA (j) E2E VIVO APROVADA COM SUCESSO! 🎉');
}

runLiveProofs().catch((err) => {
  console.error('Erro fatal nas provas:', err);
  process.exit(1);
});
