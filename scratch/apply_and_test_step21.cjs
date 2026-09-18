const fs = require('fs');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const token = fs.readFileSync('scratch/sb_token.txt', 'utf8').trim();

function runQuery(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    const req = https.request({
      hostname: 'api.supabase.com',
      path: '/v1/projects/alneozvrsuwszlkisbyo/database/query',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  // 1. Apply updated trigger migration
  const migrationSql = fs.readFileSync('supabase/migrations/20260915205500_trigger_notificar_nova_denuncia.sql', 'utf8');
  console.log('1. Applying updated trigger migration to remote database...');
  const resMigration = await runQuery(migrationSql);
  console.log('Migration apply status:', resMigration.status);

  // 2. Query proacl from pg_proc
  console.log('\n2. Checking proacl in pg_proc...');
  const resProacl = await runQuery("SELECT proname, proacl FROM pg_proc WHERE proname = 'trg_notificar_nova_denuncia';");
  console.log('pg_proc row:', JSON.stringify(resProacl.data, null, 2));

  // 3. Setup service role client
  const serviceClient = createClient(
    'https://alneozvrsuwszlkisbyo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU3ODYxNywiZXhwIjoyMTAzMTU0NjE3fQ.2CPeRGjaioa89cy154rDnmWiyZtftroANjkcMcsf-xs'
  );

  const companyId = '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4';

  // 4. Test sugestao
  console.log('\n3. Inserting test sugestao...');
  const { data: insSug, error: errSug } = await serviceClient
    .from('denuncias')
    .insert({
      company_id: companyId,
      titulo: 'Sugestão de melhoria no refeitório',
      mensagem: 'SENSITIVE_CORPO_SUGESTAO - Mensagem detalhada da sugestao',
      anonimo: false,
      user_id: null,
      tipo: 'sugestao'
    })
    .select('id, tipo, status, criado_em')
    .single();

  if (errSug) {
    console.error('Error inserting sugestao:', errSug);
    return;
  }
  console.log('Sugestao inserted:', insSug);

  // 5. Test duvida
  console.log('\n4. Inserting test duvida...');
  const { data: insDuv, error: errDuv } = await serviceClient
    .from('denuncias')
    .insert({
      company_id: companyId,
      titulo: 'Dúvida sobre fechamento de ponto',
      mensagem: 'SENSITIVE_CORPO_DUVIDA - Mensagem detalhada da duvida',
      anonimo: false,
      user_id: null,
      tipo: 'duvida'
    })
    .select('id, tipo, status, criado_em')
    .single();

  if (errDuv) {
    console.error('Error inserting duvida:', errDuv);
    return;
  }
  console.log('Duvida inserted:', insDuv);

  // 6. Fetch generated notifications
  console.log('\n5. Fetching generated notifications...');
  const { data: notifSug } = await serviceClient
    .from('notifications')
    .select('id, company_id, user_id, type, title, entity_type, entity_id, action_url, priority, is_read, created_at')
    .eq('entity_id', insSug.id);

  console.log('Notification for sugestao:');
  console.log(JSON.stringify(notifSug, null, 2));

  const { data: notifDuv } = await serviceClient
    .from('notifications')
    .select('id, company_id, user_id, type, title, entity_type, entity_id, action_url, priority, is_read, created_at')
    .eq('entity_id', insDuv.id);

  console.log('Notification for duvida:');
  console.log(JSON.stringify(notifDuv, null, 2));

  // 7. Cleanup
  console.log('\n6. Cleaning up test records...');
  const testIds = [insSug.id, insDuv.id];

  const { error: delNotifErr } = await serviceClient
    .from('notifications')
    .delete()
    .in('entity_id', testIds);
  console.log('Notifications delete error:', delNotifErr || 'NONE');

  const { error: delDenunciasErr } = await serviceClient
    .from('denuncias')
    .delete()
    .in('id', testIds);
  console.log('Denuncias delete error:', delDenunciasErr || 'NONE');

  // Verify 0 remaining
  const { data: remD } = await serviceClient.from('denuncias').select('id').in('id', testIds);
  const { data: remN } = await serviceClient.from('notifications').select('id').in('entity_id', testIds);
  console.log(`Remaining test records: denuncias=${remD.length} | notifications=${remN.length}`);
}

run();
