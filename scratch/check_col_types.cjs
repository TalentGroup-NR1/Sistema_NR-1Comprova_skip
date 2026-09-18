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

async function checkColTypes() {
  const res = await runQuery(`
    SELECT table_name, column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name IN ('denuncias', 'colaboradores')
    ORDER BY table_name, ordinal_position;
  `);
  console.log('Columns:');
  for (const row of res.data) {
    if (['id', 'titulo', 'mensagem', 'status', 'criado_em', 'anonimo', 'user_id', 'full_name', 'tipo', 'categoria_comportamento', 'origem_ofensa'].includes(row.column_name)) {
      console.log(`${row.table_name}.${row.column_name}: ${row.data_type} (${row.udt_name})`);
    }
  }
}

checkColTypes();
