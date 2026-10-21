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
const DANIELA_CORP_USER_ID = '70b5d861-0e86-4c8c-b056-7229f8222ef1';
const DANIELA_ORPHAN_USER_ID = 'a0d9a239-fa53-40d0-a4dd-3c7cb0b3f70c';

async function sanitizeRealCase() {
  console.log('================================================================');
  console.log('   SANEAMENTO DO CASO REAL (DANIELA - TG MAIS)');
  console.log('================================================================\n');

  // 1. Atualizar conta corporativa da Daniela para admin_empresa em user_companies
  console.log('1. Atualizando user_companies da conta corporativa para "admin_empresa"...');
  const { data: updateUcData, error: errUpdateUc } = await supabaseAdmin
    .from('user_companies')
    .update({
      role: 'admin_empresa',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', DANIELA_CORP_USER_ID)
    .eq('company_id', TG_MAIS_COMPANY_ID)
    .select();

  if (errUpdateUc) {
    throw new Error(`Falha ao atualizar user_companies: ${errUpdateUc.message}`);
  }
  console.log('[OK] user_companies atualizado:', updateUcData);

  // Também garantir app_metadata do auth.users alinhado com admin_empresa
  await supabaseAdmin.auth.admin.updateUserById(DANIELA_CORP_USER_ID, {
    app_metadata: { company_id: TG_MAIS_COMPANY_ID, role: 'admin_empresa' },
  });
  console.log('[OK] auth.users app_metadata alinhado para admin_empresa.');

  // 2. Limpeza da conta órfã (Hotmail)
  console.log('\n2. Limpando registros órfãos da conta Hotmail...');
  
  // Confirmação de ausência de vínculo de colaborador
  const { count: colabCount } = await supabaseAdmin
    .from('colaboradores')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', DANIELA_ORPHAN_USER_ID);

  if (colabCount && colabCount > 0) {
    throw new Error(`ABORTANDO: A conta órfã ainda possui colaboradores vinculados!`);
  }

  // Deletar user_companies
  const { error: errDelUc } = await supabaseAdmin
    .from('user_companies')
    .delete()
    .eq('user_id', DANIELA_ORPHAN_USER_ID);
  console.log('user_companies deletado:', errDelUc?.message || 'OK');

  // Deletar user_roles
  const { error: errDelUr } = await supabaseAdmin
    .from('user_roles')
    .delete()
    .eq('user_id', DANIELA_ORPHAN_USER_ID);
  console.log('user_roles deletado:', errDelUr?.message || 'OK');

  // Deletar profiles
  const { error: errDelProf } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('user_id', DANIELA_ORPHAN_USER_ID);
  console.log('profiles deletado:', errDelProf?.message || 'OK');

  // Deletar auth.users
  const { error: errDelAuth } = await supabaseAdmin.auth.admin.deleteUser(DANIELA_ORPHAN_USER_ID);
  console.log('auth.users deletado:', errDelAuth?.message || 'OK');

  // 3. Verificação final
  console.log('\n--- VERIFICAÇÃO FINAL APÓS SANEAMENTO ---');
  const { data: finalUc } = await supabaseAdmin
    .from('user_companies')
    .select('user_id, company_id, role')
    .eq('user_id', DANIELA_CORP_USER_ID);
  const { data: finalUr } = await supabaseAdmin
    .from('user_roles')
    .select('user_id, role')
    .eq('user_id', DANIELA_CORP_USER_ID);
  console.log('Conta corporativa Daniela:');
  console.log('  user_companies:', finalUc);
  console.log('  user_roles:    ', finalUr);

  const { data: orphanCheck } = await supabaseAdmin
    .from('profiles')
    .select('user_id')
    .eq('user_id', DANIELA_ORPHAN_USER_ID);
  console.log('Checagem conta órfã (deve ser vazia):', orphanCheck);

  console.log('\n================================================================');
  console.log('   SANEAMENTO DO CASO REAL CONCLUÍDO COM SUCESSO TOTAL!');
  console.log('================================================================');
}

sanitizeRealCase().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
