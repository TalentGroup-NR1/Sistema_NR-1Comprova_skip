const https = require('https');

const options = {
  hostname: 'alneozvrsuwszlkisbyo.supabase.co',
  path: '/rest/v1/',
  method: 'GET',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU3ODYxNywiZXhwIjoyMTAzMTU0NjE3fQ.2CPeRGjaioa89cy154rDnmWiyZtftroANjkcMcsf-xs'
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      const spec = JSON.parse(body);
      const denunciasDef = spec.definitions?.denuncias;
      console.log('Denuncias schema definition:', JSON.stringify(denunciasDef, null, 2));
      const notifDef = spec.definitions?.notifications;
      console.log('Notifications schema definition:', JSON.stringify(notifDef, null, 2));
    } catch (e) {
      console.error(e.message, body.slice(0, 200));
    }
  });
});
req.on('error', (e) => console.error(e));
req.end();
