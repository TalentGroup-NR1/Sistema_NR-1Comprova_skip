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

async function execute() {
  const sql = fs.readFileSync('supabase/migrations/20260915204500_fix_listar_denuncias_admin_full_name.sql', 'utf8');
  console.log('Applying SQL fix...');
  const res = await runQuery(sql);
  console.log('Apply result:', res);

  // Now test with Ana Beatriz
  const adminClient = createClient(
    'https://alneozvrsuwszlkisbyo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU3ODYxNywiZXhwIjoyMTAzMTU0NjE3fQ.2CPeRGjaioa89cy154rDnmWiyZtftroANjkcMcsf-xs'
  );

  const { data: linkData } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'admin@horizontecontabil.com.br'
  });

  const { data: sessionData } = await adminClient.auth.verifyOtp({
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

  console.log('\nCalling listar_denuncias_admin as Ana Beatriz...');
  const { data: denuncias, error: errD } = await authedClient.rpc('listar_denuncias_admin');
  console.log('RPC result error:', errD);
  console.log('RPC result data length:', denuncias ? denuncias.length : null);
  console.log('RPC result data:', JSON.stringify(denuncias, null, 2));
}

execute();
