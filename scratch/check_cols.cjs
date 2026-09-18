const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://alneozvrsuwszlkisbyo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU3ODYxNywiZXhwIjoyMTAzMTU0NjE3fQ.2CPeRGjaioa89cy154rDnmWiyZtftroANjkcMcsf-xs');

async function run() {
  const { data, error } = await supabase.rpc('run_sql', { query: "select column_name, data_type from information_schema.columns where table_name='beneficios';" });
  if (error) {
    console.error("RPC failed:", error);
  } else {
    console.log("RPC returned:", data);
  }
}
run();
