const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://alneozvrsuwszlkisbyo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU3ODYxNywiZXhwIjoyMTAzMTU0NjE3fQ.2CPeRGjaioa89cy154rDnmWiyZtftroANjkcMcsf-xs');

async function run() {
  const { data, error } = await supabase
    .from('beneficios')
    .select('id, nome, categoria, ativo')
    .eq('id', 'd38d9c92-92a3-40c0-a0e9-47e6b4c0f7d7');
    
  if (error) {
    console.error("Query failed:", error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}
run();
