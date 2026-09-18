const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://alneozvrsuwszlkisbyo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU3ODYxNywiZXhwIjoyMTAzMTU0NjE3fQ.2CPeRGjaioa89cy154rDnmWiyZtftroANjkcMcsf-xs');

async function run() {
  const { data: colabs } = await supabase.from('colaboradores').select('user_id').not('user_id', 'is', null);
  let c = 0;
  for (const row of colabs) {
    const { data: existing } = await supabase.from('user_roles').select('*').eq('user_id', row.user_id).eq('role', 'colaborador');
    if (!existing || existing.length === 0) {
      await supabase.from('user_roles').insert({ user_id: row.user_id, role: 'colaborador' });
      c++;
    }
  }
  console.log(`Roles adicionadas: ${c}`);
}
run();
