const { createClient } = require('@supabase/supabase-js');
const anonClient = createClient(
  'https://alneozvrsuwszlkisbyo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1Nzg2MTcsImV4cCI6MjEwMzE1NDYxN30.0gxHjDOm3HrLhHGEhry2zVpiL8HC1SES96D69BccWoM'
);

async function testAnon() {
  console.log('Testing direct SELECT on denuncias with anon client:');
  const { data: selData, error: selErr } = await anonClient.from('denuncias').select('*').limit(1);
  console.log('SELECT:', { selData, selErr });

  console.log('\nTesting direct INSERT on denuncias with anon client:');
  const { data: insData, error: insErr } = await anonClient.from('denuncias').insert({
    titulo: 'teste',
    mensagem: 'teste',
    company_id: '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4'
  });
  console.log('INSERT:', { insData, insErr });
}

testAnon();
