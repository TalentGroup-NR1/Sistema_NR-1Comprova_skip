const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://alneozvrsuwszlkisbyo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU3ODYxNywiZXhwIjoyMTAzMTU0NjE3fQ.2CPeRGjaioa89cy154rDnmWiyZtftroANjkcMcsf-xs'
);

async function checkTables() {
  const candidateTables = [
    'denuncias',
    'fale_conosco',
    'relatos',
    'comportamentos_ofensivos',
    'notificacoes',
    'notifications',
    'admin_notifications'
  ];

  for (const t of candidateTables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table '${t}': NÃO EXISTE (error: ${error.message})`);
    } else {
      console.log(`Table '${t}': EXISTE. Sample keys:`, data.length > 0 ? Object.keys(data[0]) : 'Empty table');
    }
  }
}

checkTables();
