const fs = require('fs');
const https = require('https');

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

async function auditFunctionDef() {
  const res = await runQuery("SELECT pg_get_functiondef('listar_denuncias_admin()'::regprocedure);");
  console.log('Function definition res:', JSON.stringify(res, null, 2));
}

auditFunctionDef();
