const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://alneozvrsuwszlkisbyo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU3ODYxNywiZXhwIjoyMTAzMTU0NjE3fQ.2CPeRGjaioa89cy154rDnmWiyZtftroANjkcMcsf-xs'
);

async function run() {
  console.log('Testing RPC directly with service_role...');
  const { data, error } = await supabase.rpc('listar_denuncias_admin');
  console.log('Result with service_role:', { data, error });
}

run();
