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
  // 1. Apply trigger migration
  const migrationSql = fs.readFileSync('supabase/migrations/20260915205500_trigger_notificar_nova_denuncia.sql', 'utf8');
  console.log('1. Applying trigger migration to remote database...');
  const resMigration = await runQuery(migrationSql);
  console.log('Migration result:', resMigration);

  // 2. Setup clients
  const serviceClient = createClient(
    'https://alneozvrsuwszlkisbyo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU3ODYxNywiZXhwIjoyMTAzMTU0NjE3fQ.2CPeRGjaioa89cy154rDnmWiyZtftroANjkcMcsf-xs'
  );

  const companyId = '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4';

  // 3. Insert test denúncia
  console.log('\n2. Inserting test denuncia...');
  const testTitle = 'TESTE AUTOMATIZADO - Relato de ruído excessivo em setor fabril';
  const testMsg = 'SENSITIVE_BODY_DO_NOT_LEAK - Mensagem de teste interno para validação da trigger de notificações';
  
  const { data: insData, error: insErr } = await serviceClient
    .from('denuncias')
    .insert({
      company_id: companyId,
      titulo: testTitle,
      mensagem: testMsg,
      anonimo: true,
      user_id: null,
      tipo: 'denuncia',
      categoria_comportamento: 'bullying_assedio_moral',
      origem_ofensa: 'colegas_pares'
    })
    .select('id, tipo, status, created_at:criado_em')
    .single();

  if (insErr) {
    console.error('Error inserting test denuncia:', insErr);
    return;
  }
  const testDenunciaId = insData.id;
  console.log('Test denuncia inserted successfully:');
  console.log({
    id: insData.id,
    tipo: insData.tipo,
    status: insData.status,
    created_at: insData.created_at
  });

  // 4. Verify row created in notifications
  console.log('\n3. Verifying notification created for admin...');
  const { data: notifData, error: notifErr } = await serviceClient
    .from('notifications')
    .select('id, company_id, user_id, type, title, message, action_url, entity_type, entity_id, priority, is_read, created_at')
    .eq('entity_id', testDenunciaId);

  if (notifErr) {
    console.error('Error fetching notification:', notifErr);
  } else {
    console.log('Notification found in DB:');
    console.log(JSON.stringify(notifData, null, 2));
  }

  // 5. Authenticate as Ana Beatriz and check get_user_notifications
  console.log('\n4. Testing get_user_notifications as Ana Beatriz...');
  const { data: linkData } = await serviceClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'admin@horizontecontabil.com.br'
  });
  const { data: sessionData } = await serviceClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'email'
  });

  const authedClient = createClient(
    'https://alneozvrsuwszlkisbyo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1Nzg2MTcsImV4cCI6MjEwMzE1NDYxN30.0gxHjDOm3HrLhHGEhry2zVpiL8HC1SES96D69BccWoM',
    {
      global: {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        }
      }
    }
  );

  const { data: userNotifs, error: userNotifsErr } = await authedClient.rpc('get_user_notifications', { p_limit: 10 });
  console.log('get_user_notifications error:', userNotifsErr);
  console.log('Total notifications returned for admin:', userNotifs ? userNotifs.length : 0);
  const matched = userNotifs ? userNotifs.find(n => n.title === 'Nova denúncia recebida' && n.action_url === '/comportamentos-ofensivos') : null;
  console.log('Matched test notification in get_user_notifications:', matched ? {
    id: matched.id,
    type: matched.type,
    title: matched.title,
    action_url: matched.action_url,
    priority: matched.priority,
    is_read: matched.is_read,
    created_at: matched.created_at
  } : 'NOT FOUND');

  // 6. Clean up test records
  console.log('\n5. Cleaning up test records (denuncia + notifications)...');
  const { error: delNotifErr } = await serviceClient
    .from('notifications')
    .delete()
    .eq('entity_id', testDenunciaId);
  console.log('Notification delete error:', delNotifErr || 'NONE (Deleted successfully)');

  const { error: delDenunciaErr } = await serviceClient
    .from('denuncias')
    .delete()
    .eq('id', testDenunciaId);
  console.log('Denuncia delete error:', delDenunciaErr || 'NONE (Deleted successfully)');

  // Verify deletion
  const { data: checkD } = await serviceClient.from('denuncias').select('id').eq('id', testDenunciaId);
  const { data: checkN } = await serviceClient.from('notifications').select('id').eq('entity_id', testDenunciaId);
  console.log('Verification: remaining test denuncias:', checkD.length, 'remaining test notifications:', checkN.length);
}

run();
