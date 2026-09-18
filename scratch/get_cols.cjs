const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://alneozvrsuwszlkisbyo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU3ODYxNywiZXhwIjoyMTAzMTU0NjE3fQ.2CPeRGjaioa89cy154rDnmWiyZtftroANjkcMcsf-xs'
);

async function run() {
  const { data, error } = await supabase
    .from('denuncias')
    .select('*')
    .limit(1);
  console.log('denuncias keys:', Object.keys(data[0]));

  const { data: nData } = await supabase.from('notifications').select('*').limit(1);
  console.log('notifications keys:', Object.keys(nData[0]));

  const { data: anData } = await supabase.from('admin_notifications').select('*').limit(1);
  console.log('admin_notifications keys:', Object.keys(anData[0]));
}
run();
