const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://alneozvrsuwszlkisbyo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU3ODYxNywiZXhwIjoyMTAzMTU0NjE3fQ.2CPeRGjaioa89cy154rDnmWiyZtftroANjkcMcsf-xs'
);

async function run() {
  console.log('Testing select nome_completo from colaboradores...');
  const { data, error } = await supabase.from('colaboradores').select('nome_completo').limit(1);
  console.log('nome_completo result:', { data, error });

  const { data: dataFull, error: errorFull } = await supabase.from('colaboradores').select('full_name').limit(1);
  console.log('full_name result:', { dataFull, errorFull });
}
run();
